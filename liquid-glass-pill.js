/*!
 * liquid-glass-pill.js
 * Refraction + rim light + moving glint for ONE pill-shaped element.
 * No dependencies. Chromium gets real refraction; everything else gets rim + glint.
 *
 * Usage:  liquidGlass(document.querySelector('.org'));
 *    or:  <span class="org" data-liquid-glass>…</span>
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var uid = 0;

  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

  var DEFAULTS = {
    bezel: 0.28,       // x height. Width of the "bent edge" zone.
    strength: 0.07,    // x height. Extra inward pull at the very edge. Keep curve*strength/bezel < 1 or edges fold over.
    curve: 1.2,        // Bezel falloff exponent. Higher = tighter, sharper edge.
    magnify: 0.06,     // Centre magnification. 0.06 is about 1.06x.
    lightDeg: -135,    // Direction TO the light in screen coords. -135 = top-left.
    bounce: 0.75,      // Rim strength on the side opposite the light (0..1).
    rimWidth: 2.2,     // px, crisp rim line.
    rimStrength: 1,
    smooth: 0.4,       // px blur after displacement; hides feDisplacementMap's stair-stepping (0 = off)
    refraction: 'auto',// 'auto' | false (force the non-Chromium fallback)
    motion: true,
    freeze: null       // number 0..1 pins the glint (for screenshots / tests)
  };

  /* iOS browsers (including Chrome and Edge on iOS) are WebKit and ignore
     backdrop-filter: url(). Firefox and Safari desktop also ignore it. */
  function supportsRefraction() {
    var ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) return false;
    return /Chrome\/|Chromium\/|Edg\//.test(ua);
  }

  /* One pass over the pixels builds BOTH maps from the same signed-distance field:
       map  - opaque RGB. R = x displacement, G = y displacement, 128 = neutral.
       spec - white RGBA rim. Brightness depends on how the edge faces the light. */
  function buildMaps(w, h, o, dpr) {
    var r = h / 2;                        // pill: radius is half the height
    var hx = w / 2 - r, hy = h / 2 - r;   // half-extent of the inner rectangle
    var bezel = o.bezel * h, strength = o.strength * h;
    var lx = Math.cos(o.lightDeg * Math.PI / 180);
    var ly = Math.sin(o.lightDeg * Math.PI / 180);

    var Wd = Math.round(w * dpr), Hd = Math.round(h * dpr);   // map resolution in device px
    var n = Wd * Hd;
    var dxA = new Float32Array(n), dyA = new Float32Array(n);
    var spec = new Uint8ClampedArray(n * 4);
    var maxD = 1;

    for (var y = 0; y < Hd; y++) {
      for (var x = 0; x < Wd; x++) {
        var px = (x + 0.5) / dpr - w / 2, py = (y + 0.5) / dpr - h / 2;   // CSS px from the centre
        var qx = Math.abs(px) - hx, qy = Math.abs(py) - hy;
        var ox = Math.max(qx, 0), oy = Math.max(qy, 0);
        var outside = Math.sqrt(ox * ox + oy * oy);
        var sdf = outside + Math.min(Math.max(qx, qy), 0) - r;
        var depth = -sdf;                 // distance from the edge, > 0 inside
        if (depth <= 0) continue;         // outside the pill: neutral, no rim

        var nx, ny;                       // outward normal
        if (outside > 0) {
          nx = (px < 0 ? -1 : 1) * ox / outside;
          ny = (py < 0 ? -1 : 1) * oy / outside;
        } else if (qx > qy) { nx = px < 0 ? -1 : 1; ny = 0; }
        else { nx = 0; ny = py < 0 ? -1 : 1; }

        /* Refraction: sample from further INSIDE than where we draw.
           bezel term = strong at the edge, fades to 0 at depth = bezel.
           magnify term = pulls every pixel a little toward the centre. */
        var t = clamp(depth / bezel, 0, 1);
        var bez = strength * Math.pow(1 - t, o.curve);
        var dx = -nx * bez - o.magnify * px;
        var dy = -ny * bez - o.magnify * py;
        var i = y * Wd + x;
        dxA[i] = dx; dyA[i] = dy;
        var m = Math.max(Math.abs(dx), Math.abs(dy));
        if (m > maxD) maxD = m;

        /* Rim: crisp line + soft falloff, lit by edge orientation. */
        var facing = nx * lx + ny * ly;
        var dir = Math.pow(Math.max(0, facing), 1.1) + o.bounce * Math.pow(Math.max(0, -facing), 1.1);
        var crisp = Math.pow(clamp(1 - depth / o.rimWidth, 0, 1), 1.4);
        var soft = Math.exp(-depth / (o.rimWidth * 3.2)) * 0.3;
        /* faint second arc just inside the rim: the "bevel" a thick glass edge shows */
        var inner = Math.exp(-Math.pow((depth - o.rimWidth * 2.6) / (o.rimWidth * 0.9), 2)) * 0.35;
        var a = clamp((crisp + soft + inner) * dir, 0, 1) * clamp(depth * dpr, 0, 1) * o.rimStrength;
        spec[i * 4] = 255; spec[i * 4 + 1] = 255; spec[i * 4 + 2] = 255; spec[i * 4 + 3] = a * 255;
      }
    }

    /* Encode. feDisplacementMap: shift = scale * (C - 0.5), so C = 0.5 + shift / scale. */
    var scale = 2 * maxD;
    var map = new Uint8ClampedArray(n * 4);
    for (var k = 0; k < n; k++) {
      map[k * 4] = 255 * (0.5 + dxA[k] / scale);
      map[k * 4 + 1] = 255 * (0.5 + dyA[k] / scale);
      map[k * 4 + 2] = 128;
      map[k * 4 + 3] = 255;              // must be opaque or premultiplication corrupts R/G
    }
    return { map: toURL(Wd, Hd, map), spec: toURL(Wd, Hd, spec), scale: scale };
  }

  function toURL(w, h, data) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').putImageData(new ImageData(data, w, h), 0, 0);
    return c.toDataURL('image/png');
  }

  function liquidGlass(el, opts) {
    if (el.__lg) return el.__lg;                       // idempotent (React strict mode, double init)
    var o = Object.assign({}, DEFAULTS, opts || {});
    var refract = o.refraction === 'auto' ? supportsRefraction() : !!o.refraction;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var animate = o.motion && !reduce && o.freeze == null;

    function layer(cls) {
      var s = document.createElement('span');
      s.className = cls;
      s.setAttribute('aria-hidden', 'true');
      el.appendChild(s);
      return s;
    }
    var lens = layer('lg-lens');
    var rim = layer('lg-rim');
    var hot = layer('lg-rim lg-rim-hot');
    var glint = layer('lg-glint');

    /* ---------- build / rebuild maps whenever the size changes ---------- */
    var W = 0, H = 0, D = 0, svg = null, rebuildQueued = false;
    var dispNode = null, baseScale = 0, kNow = 1;   // kNow multiplies refraction strength (1 = resting)
    function setK(k) {
      kNow = k;
      if (dispNode) dispNode.setAttribute('scale', (baseScale * k).toFixed(2));
    }

    function rebuild() {
      rebuildQueued = false;
      var w = lens.offsetWidth, h = lens.offsetHeight;
      var d = Math.min(window.devicePixelRatio || 1, 2);
      if (!w || !h || (w === W && h === H && d === D)) return;
      W = w; H = h; D = d;
      var m = buildMaps(w, h, o, d);
      rim.style.backgroundImage = hot.style.backgroundImage = 'url(' + m.spec + ')';
      glint.style.setProperty('--lg-bw', Math.round(w * 0.34) + 'px');
      paint();
      if (!refract) return;

      /* A fresh filter id per build avoids Chrome reusing a stale cached filter. */
      var id = 'lg-' + (++uid);
      var next = document.createElementNS(NS, 'svg');
      next.setAttribute('width', '0');
      next.setAttribute('height', '0');
      next.setAttribute('aria-hidden', 'true');
      /* Do NOT use display:none on this svg: filters inside it stop resolving. */
      next.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
      next.innerHTML =
        '<filter id="' + id + '" x="0" y="0" width="' + w + '" height="' + h + '"' +
        ' filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">' +
        '<feImage href="' + m.map + '" x="0" y="0" width="' + w + '" height="' + h + '"' +
        ' preserveAspectRatio="none" result="map"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="map" scale="' + m.scale.toFixed(2) + '"' +
        ' xChannelSelector="R" yChannelSelector="G" result="disp"/>' +
        (o.smooth > 0 ? '<feGaussianBlur in="disp" stdDeviation="' + o.smooth + '"/>' : '') +
        '</filter>';
      document.body.appendChild(next);
      dispNode = next.querySelector('feDisplacementMap');
      baseScale = m.scale;
      setK(kNow);
      var v = 'url(#' + id + ') saturate(1.15)';
      lens.style.backdropFilter = v;
      lens.style.webkitBackdropFilter = v;
      var old = svg; svg = next;
      if (old) requestAnimationFrame(function () { old.remove(); });
    }
    function queueRebuild() {
      if (!rebuildQueued) { rebuildQueued = true; requestAnimationFrame(rebuild); }
    }

    /* ---------- glint position ---------- */
    var p = o.freeze != null ? o.freeze : 0.3;   // 0 = off the left edge, 1 = off the right

    function paint() {
      if (!W) return;
      var bw = W * 0.34;
      var left = -bw + p * (W + bw);
      glint.style.setProperty('--lg-x', left.toFixed(1) + 'px');
      el.style.setProperty('--lg-c', (((left + bw / 2) / W) * 100).toFixed(1) + '%');
    }

    var mode = 'idle', raf = 0, t0 = 0, from = 0, to = 1, dur = 1200, target = p;
    function loop(now) {
      raf = 0;
      if (mode === 'sweep') {
        var t = clamp((now - t0) / dur, 0, 1);
        p = from + (to - from) * ease(t);
        paint();
        if (t < 1) raf = requestAnimationFrame(loop); else mode = 'idle';
      } else if (mode === 'follow') {
        p += (target - p) * 0.16;
        paint();
        if (Math.abs(target - p) > 0.002) raf = requestAnimationFrame(loop);
      }
    }
    function start() { if (!raf) raf = requestAnimationFrame(loop); }
    function sweep(f, t, d) { mode = 'sweep'; from = f; to = t; dur = d; t0 = performance.now(); start(); }

    var inView = true, idleT = 0, timers = [], cleanups = [];
    if (animate) {
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (e) { inView = e[0].isIntersecting; });
        io.observe(el);
        cleanups.push(function () { io.disconnect(); });
      }
      /* Intro: one sweep right after the wipe-in animation finishes. */
      var introDone = false;
      var intro = function () {
        if (introDone) return; introDone = true;
        timers.push(setTimeout(function () { sweep(0, 1, 1300); }, 150));
      };
      /* Liquid materialize: refraction starts heavily distorted, then wobbles and settles
         like a drop of liquid finding its shape. Starts when the pill's reveal starts. */
      var matRaf = 0;
      function materialize() {
        if (!refract) return;
        var t0 = performance.now();
        (function frame(now) {
          var t = (now - t0) / 1000;
          if (t >= 1.3) { setK(1); return; }
          setK(1 + 2.0 * Math.exp(-t / 0.28) * Math.cos(2 * Math.PI * 2.2 * t));
          matRaf = requestAnimationFrame(frame);
        })(t0);
      }
      var onStart = function (e) { if (e.animationName === 'wipePill') materialize(); };
      el.addEventListener('animationstart', onStart);
      cleanups.push(function () { el.removeEventListener('animationstart', onStart); cancelAnimationFrame(matRaf); });
      var onEnd = function (e) { if (e.animationName === 'pillSettle') intro(); };
      el.addEventListener('animationend', onEnd);
      cleanups.push(function () { el.removeEventListener('animationend', onEnd); });
      timers.push(setTimeout(intro, 2200));   // fallback if the animation name differs

      /* Idle: a sweep every ~7s while visible. */
      timers.push(setInterval(function () {
        if (mode === 'idle' && inView && !document.hidden) sweep(0, 1, 1300);
      }, 7000));

      /* Pointer: the glint follows the cursor. Over the pill = local x; elsewhere = page x. */
      var onMove = function (e) {
        if (e.pointerType === 'touch' || !inView) return;
        var r = el.getBoundingClientRect();
        var near = e.clientX > r.left - 40 && e.clientX < r.right + 40 &&
                   e.clientY > r.top - 60 && e.clientY < r.bottom + 60;
        target = near ? clamp((e.clientX - r.left) / r.width, 0, 1)
                      : 0.15 + 0.7 * (e.clientX / window.innerWidth);
        mode = 'follow'; start();
        clearTimeout(idleT);
        idleT = setTimeout(function () { if (mode === 'follow') mode = 'idle'; }, 2500);
      };
      window.addEventListener('pointermove', onMove, { passive: true });
      cleanups.push(function () { window.removeEventListener('pointermove', onMove); });
    }

    /* ---------- go ---------- */
    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(queueRebuild);
      ro.observe(el);
      cleanups.push(function () { ro.disconnect(); });
    }
    window.addEventListener('resize', queueRebuild);   // also catches browser zoom (dpr change)
    cleanups.push(function () { window.removeEventListener('resize', queueRebuild); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueRebuild);
    rebuild();

    var api = {
      rebuild: queueRebuild,
      setGlint: function (v) { p = v; paint(); },
      refracting: refract,
      destroy: function () {
        cleanups.forEach(function (fn) { fn(); });
        timers.forEach(function (id) { clearTimeout(id); clearInterval(id); });
        clearTimeout(idleT);
        if (raf) cancelAnimationFrame(raf);
        [lens, rim, hot, glint].forEach(function (n) { n.remove(); });
        if (svg) svg.remove();
        delete el.__lg;
      }
    };
    el.__lg = api;
    return api;
  }

  window.liquidGlass = liquidGlass;
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-liquid-glass]').forEach(function (el) { liquidGlass(el); });
  });
})();
