"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */
const ENDPOINT = "/api/v1/hr/attendance/import";
const ALLOWED = ["rar", "zip", "pdf", "xls", "xlsx"];
const MAX_MB = 50;

const STAGES = [
  "Uploading and extracting archive",
  "Reading in and out punch records",
  "Syncing attendance and shift hours",
];

const fmt = (b) =>
  b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

// Normalizes API responses to component model
const normalize = (raw) => {
  const d = raw?.data ?? raw ?? {};
  const warnings = [];
  if (d.payslipWarning) warnings.push(d.payslipWarning);
  if (d.notice) warnings.push(d.notice);
  if (Array.isArray(d.warnings)) warnings.push(...d.warnings);

  return {
    period: d.period ?? d.periodLabel ?? "",
    matched: d.matchedStaffCount ?? d.matchedStaff ?? d.matched ?? 0,
    synced: d.totalRecordsImported ?? d.recordsSynced ?? d.synced ?? d.recordsImported ?? 0,
    unmatched: d.unmatchedStaff ?? d.unmatched ?? [],
    warnings,
    month: d.month,
    year: d.year,
  };
};

function useCountUp(target, run) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setV(target);
      return;
    }
    let raf;
    let t0;
    const tick = (t) => {
      t0 = t0 ?? t;
      const k = Math.min((t - t0) / 900, 1);
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return v;
}

/* ------------------------------------------------------------------ */
/*  Small pieces                                                       */
/* ------------------------------------------------------------------ */
const ArrowUp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

function DropCopy({ active }) {
  return (
    <>
      <span className="ibm-orb"><ArrowUp /></span>
      <span className="ibm-title">{active ? "Release to add it" : "Drop your biometric report here"}</span>
      <span className="ibm-sub">{active ? "Nothing is imported until you confirm" : "or click to browse your files"}</span>
      <span className="ibm-formats">.rar, .zip, .pdf, .xls or .xlsx, up to {MAX_MB} MB</span>
    </>
  );
}

function Stat({ value, label, run }) {
  const v = useCountUp(value, run);
  return (
    <div className="ibm-stat">
      <b>{v.toLocaleString("en-IN")}</b>
      <span>{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function ImportBiometricModal({
  open,
  isOpen,
  onClose,
  onImported,
  onSuccess,
  onAssignStaff,
  onGoToPayslips,
  month,
  year,
}) {
  const isModalOpen = open ?? isOpen ?? false;

  const [file, setFile] = useState(null);
  const [overwrite, setOverwrite] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | working | done
  const [progress, setProgress] = useState(0);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [dragging, setDragging] = useState(false);

  const zoneRef = useRef(null);
  const inputRef = useRef(null);
  const xhrRef = useRef(null);
  const timerRef = useRef(null);
  const depth = useRef(0);

  const reset = useCallback(() => {
    xhrRef.current?.abort();
    clearTimeout(timerRef.current);
    setFile(null);
    setOverwrite(false);
    setPhase("idle");
    setProgress(0);
    setUploaded(false);
    setError("");
    setResult(null);
    setDragging(false);
    depth.current = 0;
  }, []);

  const close = useCallback(() => {
    reset();
    onClose?.();
  }, [reset, onClose]);

  useEffect(() => {
    if (isModalOpen) reset();
  }, [isModalOpen, reset]);

  useEffect(() => {
    if (!isModalOpen) return;
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isModalOpen, close]);

  // After the upload finishes the server gives no live progress, so ease toward 92%
  useEffect(() => {
    if (phase !== "working" || !uploaded) return;
    const id = setInterval(() => setProgress((p) => (p >= 92 ? p : p + (92 - p) * 0.05)), 180);
    return () => clearInterval(id);
  }, [phase, uploaded]);

  const setOrigin = (e) => {
    const z = zoneRef.current;
    if (!z) return;
    if (!e.clientX && !e.clientY) {
      z.style.setProperty("--x", "50%");
      z.style.setProperty("--y", "50%");
      return;
    }
    const r = z.getBoundingClientRect();
    z.style.setProperty("--x", `${e.clientX - r.left}px`);
    z.style.setProperty("--y", `${e.clientY - r.top}px`);
  };

  const pick = (list) => {
    setError("");
    if (!list || !list.length) return;
    if (list.length > 1) return setError("Add one file at a time. Put several files in a .zip first.");
    const f = list[0];
    const ext = f.name.split(".").pop().toLowerCase();
    if (!ALLOWED.includes(ext)) return setError(`${f.name} isn’t supported. Use .rar, .zip, .pdf, .xls or .xlsx.`);
    if (f.size === 0) return setError("That file is empty.");
    if (f.size > MAX_MB * 1048576) return setError(`That file is ${fmt(f.size)}. The limit is ${MAX_MB} MB.`);
    setFile(f);
  };

  const zone = {
    onClick: (e) => {
      if (file || phase !== "idle") return;
      setOrigin(e);
      inputRef.current?.click();
    },
    onKeyDown: (e) => {
      if (!file && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        setOrigin({ clientX: 0, clientY: 0 });
        inputRef.current?.click();
      }
    },
    onDragEnter: (e) => {
      e.preventDefault();
      if (phase !== "idle") return;
      depth.current += 1;
      if (depth.current === 1) {
        setOrigin(e);
        setDragging(true);
      }
    },
    onDragOver: (e) => e.preventDefault(),
    onDragLeave: (e) => {
      depth.current -= 1;
      if (depth.current <= 0) {
        depth.current = 0;
        setOrigin(e);
        setDragging(false);
      }
    },
    onDrop: (e) => {
      e.preventDefault();
      depth.current = 0;
      setDragging(false);
      if (phase !== "idle") return;
      setOrigin(e);
      pick(e.dataTransfer.files);
    },
  };

  const fail = (msg) => {
    setPhase("idle");
    setProgress(0);
    setUploaded(false);
    setError(msg);
  };

  const upload = () => {
    if (!file || phase !== "idle") return;
    setError("");
    setPhase("working");
    setProgress(0);
    setUploaded(false);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("overwriteManual", String(overwrite));
    if (month) fd.append("month", String(month));
    if (year) fd.append("year", String(year));

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("POST", ENDPOINT);
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress((e.loaded / e.total) * 40);
    xhr.upload.onload = () => {
      setProgress(40);
      setUploaded(true);
    };
    xhr.onload = () => {
      let body = {};
      try { body = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status >= 200 && xhr.status < 300) {
        setProgress(100);
        const r = normalize(body);
        timerRef.current = setTimeout(() => {
          setResult(r);
          setPhase("done");
          onImported?.(r);
          onSuccess?.(r);
        }, 550);
      } else {
        fail(body.error || body.message || `The import failed (error ${xhr.status}).`);
      }
    };
    xhr.onerror = () => fail("The connection dropped. Check your network and try again.");
    xhr.send(fd);
  };

  const goPayslips = () => {
    if (onGoToPayslips) return onGoToPayslips(result);
    const m = result?.month || month;
    const y = result?.year || year;
    const q = m && y ? `?month=${m}&year=${y}` : "";
    window.location.href = `/admin/hr/payslips${q}`;
  };

  if (!isModalOpen) return null;

  const working = phase === "working";
  const stage = progress < 40 ? 0 : progress < 68 ? 1 : 2;
  const ext = file ? file.name.split(".").pop().toLowerCase() : "";

  return (
    <div className="ibm-root" role="dialog" aria-modal="true" aria-labelledby="ibm-h">
      <style>{CSS}</style>
      <div className="ibm-backdrop" onClick={close} />

      <div className="ibm-panel">
        <div className="ibm-inner">
          {phase !== "done" ? (
            <>
              <header className="ibm-head">
                <div>
                  <h2 id="ibm-h">Import biometric attendance</h2>
                  <p>Staff are matched by biometric ID first, then by name.</p>
                </div>
                <button className="ibm-x" onClick={close} aria-label="Close">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              </header>

              <div className="ibm-body">
                <input
                  ref={inputRef}
                  type="file"
                  hidden
                  accept=".rar,.zip,.pdf,.xls,.xlsx"
                  onChange={(e) => {
                    pick(e.target.files);
                    e.target.value = "";
                  }}
                />

                <div
                  ref={zoneRef}
                  className="ibm-zone"
                  data-drag={dragging}
                  data-file={!!file}
                  role="button"
                  tabIndex={file ? -1 : 0}
                  aria-label="Choose a biometric report to import"
                  {...zone}
                >
                  <div className="ibm-layer ibm-idle"><DropCopy /></div>
                  <div className="ibm-layer ibm-ink" aria-hidden="true"><DropCopy active /></div>

                  <div className="ibm-layer ibm-filelayer">
                    {file && (
                      <>
                        <span className="ibm-ext">{ext}</span>
                        <span className="ibm-fname" title={file.name}>{file.name}</span>
                        <span className="ibm-sub">{fmt(file.size)} ready to import</span>
                        <button
                          className="ibm-link"
                          disabled={working}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOrigin(e);
                            setFile(null);
                            setError("");
                          }}
                        >
                          Choose a different file
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <p className="ibm-error" role="alert" data-on={!!error}>
                  <span>{error}</span>
                </p>

                <div className="ibm-work" data-on={working}>
                  <div>
                    <div className="ibm-stages" aria-live="polite">
                      <div className="ibm-stage-col" style={{ "--s": stage }}>
                        {STAGES.map((s) => <span key={s}>{s}</span>)}
                      </div>
                    </div>
                    <div className="ibm-track"><i style={{ "--p": progress / 100 }} /></div>
                  </div>
                </div>

                <label className="ibm-check">
                  <input type="checkbox" checked={overwrite} disabled={working} onChange={(e) => setOverwrite(e.target.checked)} />
                  <span>
                    Also replace days I’ve edited by hand
                    <small>Off by default, so your manual corrections are kept.</small>
                  </span>
                </label>
              </div>

              <footer className="ibm-foot">
                <button className="ibm-btn" onClick={close}>{working ? "Stop" : "Cancel"}</button>
                <button className="ibm-btn ibm-primary" disabled={!file || working} onClick={upload}>
                  {working ? "Syncing" : "Upload and sync"}
                </button>
              </footer>
            </>
          ) : (
            <div className="ibm-result">
              <div className="ibm-done-head">
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
                  <circle className="ibm-c1" cx="22" cy="22" r="20" />
                  <path className="ibm-c2" d="M13 23l7 7 12-14" />
                </svg>
                <div>
                  <h2 id="ibm-h">{result.period ? `${result.period} imported` : "Attendance imported"}</h2>
                  <p>Punches are in. Review the payslips whenever you’re ready.</p>
                </div>
              </div>

              <div className="ibm-stats">
                <Stat value={result.matched} label="staff matched" run />
                <Stat value={result.synced} label="days synced" run />
                <Stat value={result.unmatched.length} label="not matched" run />
              </div>

              {result.unmatched.length > 0 && (
                <div className="ibm-unm">
                  <p>These codes didn’t match anyone. Assign them, then import again.</p>
                  <ul>
                    {result.unmatched.map((u, i) => {
                      const code = typeof u === "object" ? u.code ?? u.empCode : "";
                      const name = typeof u === "object" ? u.name ?? u.empName : String(u);
                      const reason = typeof u === "object" ? u.reason : "";
                      return (
                        <li key={i}>
                          <span className="ibm-code">{code}</span>
                          <span className="ibm-uname" title={reason ? `${name} - ${reason}` : name}>
                            {name} {reason && <small style={{ color: "#b45309", marginLeft: "6px" }}>({reason})</small>}
                          </span>
                          {onAssignStaff && <button className="ibm-link" onClick={() => onAssignStaff(u)}>Assign</button>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {result.warnings.length > 0 && (
                <ul className="ibm-warn">
                  {result.warnings.map((w, i) => <li key={i}>{typeof w === "string" ? w : w.message}</li>)}
                </ul>
              )}

              <footer className="ibm-foot">
                <button className="ibm-btn" onClick={close}>Close</button>
                <button className="ibm-btn ibm-primary" onClick={goPayslips}>Go to payslip generation</button>
              </footer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles (scoped with the ibm- prefix, no Tailwind needed)           */
/* ------------------------------------------------------------------ */
const CSS = `
.ibm-root{--accent:#4f46e5;--ink:#14141f;--muted:#6c6c7d;--line:#e8e8ef;--tint:#f4f3ff;--ease:cubic-bezier(.22,1,.36,1);
  position:fixed;inset:0;z-index:80;display:grid;place-items:center;padding:16px;color:var(--ink);font-family:inherit}
.ibm-backdrop{position:absolute;inset:0;background:rgba(15,23,42,0.45);animation:ibm-fade .2s ease both}
.ibm-panel{position:relative;width:min(520px,100%);max-height:calc(100vh - 32px);overflow:auto;background:#fff;border-radius:20px;
  box-shadow:0 30px 80px -24px rgba(20,20,60,.4),0 0 0 1px rgba(20,20,40,.06);animation:ibm-pop .35s var(--ease) both}
.ibm-inner{animation:ibm-wipe .75s var(--ease) both}
@keyframes ibm-fade{from{opacity:0}}
@keyframes ibm-pop{from{opacity:0;transform:translateY(10px) scale(.98)}}
@keyframes ibm-wipe{from{clip-path:inset(0 0 100% 0)}to{clip-path:inset(0 0 0 0)}}

.ibm-head{display:flex;justify-content:space-between;gap:16px;padding:22px 24px 0}
.ibm-head h2,.ibm-done-head h2{margin:0;font-size:17px;font-weight:600;letter-spacing:-.01em}
.ibm-head p,.ibm-done-head p{margin:4px 0 0;font-size:13px;color:var(--muted)}
.ibm-x{width:32px;height:32px;border-radius:50%;border:0;background:transparent;color:var(--muted);cursor:pointer;display:grid;place-items:center;transition:background .2s,color .2s}
.ibm-x:hover{background:#f1f1f6;color:var(--ink)}
.ibm-body{padding:18px 24px 4px}

/* dropzone */
.ibm-zone{--x:50%;--y:50%;position:relative;height:216px;border-radius:16px;background:#fafafd;cursor:pointer;overflow:hidden;outline:none;
  box-shadow:inset 0 0 0 1.5px var(--line);transition:box-shadow .25s}
.ibm-zone:hover,.ibm-zone:focus-visible{box-shadow:inset 0 0 0 1.5px #c9c6f7}
.ibm-zone:focus-visible{box-shadow:inset 0 0 0 2px var(--accent)}
.ibm-zone[data-file="true"]{cursor:default}
.ibm-layer{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:24px;text-align:center}
.ibm-orb{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;margin-bottom:10px;background:#fff;color:var(--accent);box-shadow:0 0 0 1px var(--line)}
.ibm-title{font-size:15px;font-weight:600;letter-spacing:-.01em}
.ibm-sub{font-size:13px;color:var(--muted)}
.ibm-formats{margin-top:10px;font-size:12px;color:#9a9aab}

/* layer 2: ink that floods from the cursor and inverts the copy */
.ibm-ink{background:var(--accent);color:#fff;pointer-events:none;clip-path:circle(0% at var(--x) var(--y));
  transition:clip-path .7s var(--ease)}
.ibm-zone[data-drag="true"] .ibm-ink{clip-path:circle(150% at var(--x) var(--y))}
.ibm-ink .ibm-orb{background:rgba(255,255,255,.14);color:#fff;box-shadow:0 0 0 1px rgba(255,255,255,.35)}
.ibm-ink .ibm-sub,.ibm-ink .ibm-formats{color:rgba(255,255,255,.75)}
.ibm-zone[data-drag="true"] .ibm-ink .ibm-orb{animation:ibm-lift 1s ease-in-out infinite}
@keyframes ibm-lift{50%{transform:translateY(-5px)}}

/* layer 3: file card that blooms from the drop point */
.ibm-filelayer{background:var(--tint);pointer-events:none;clip-path:circle(0% at var(--x) var(--y));transition:clip-path .7s var(--ease)}
.ibm-zone[data-file="true"] .ibm-filelayer{clip-path:circle(150% at var(--x) var(--y));pointer-events:auto}
.ibm-ext{min-width:52px;padding:7px 12px;margin-bottom:10px;border-radius:10px;background:var(--accent);color:#fff;font-size:13px;font-weight:600}
.ibm-fname{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px;font-weight:600}
.ibm-link{margin-top:12px;border:0;background:none;padding:0;color:var(--accent);font:inherit;font-size:13px;font-weight:500;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.ibm-link:disabled{opacity:.4;cursor:default}

/* error line slides open */
.ibm-error{display:grid;grid-template-rows:0fr;margin:0;transition:grid-template-rows .4s var(--ease)}
.ibm-error[data-on="true"]{grid-template-rows:1fr}
.ibm-error span{overflow:hidden;min-height:0;font-size:13px;color:#b42318}
.ibm-error[data-on="true"] span{padding-top:10px}

/* progress: stage text slides through a soft mask, bar is scaled not resized */
.ibm-work{display:grid;grid-template-rows:0fr;transition:grid-template-rows .5s var(--ease)}
.ibm-work[data-on="true"]{grid-template-rows:1fr}
.ibm-work>div{overflow:hidden;min-height:0}
.ibm-stages{height:28px;margin-top:16px;overflow:hidden;font-size:13px;color:var(--ink);
  -webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 30%,#000 70%,transparent 100%);
  mask-image:linear-gradient(to bottom,transparent 0,#000 30%,#000 70%,transparent 100%)}
.ibm-stage-col{display:flex;flex-direction:column;transform:translateY(calc(var(--s) * -28px));transition:transform .6s var(--ease)}
.ibm-stage-col span{height:28px;line-height:28px;flex:none}
.ibm-track{height:3px;margin-top:4px;border-radius:3px;background:var(--line);overflow:hidden}
.ibm-track i{display:block;height:100%;background:var(--accent);transform-origin:left;transform:scaleX(var(--p));transition:transform .25s linear}

.ibm-check{display:flex;gap:10px;align-items:flex-start;margin-top:18px;font-size:13px;cursor:pointer}
.ibm-check input{margin-top:2px;accent-color:var(--accent)}
.ibm-check small{display:block;margin-top:2px;color:var(--muted);font-size:12px}

.ibm-foot{display:flex;justify-content:flex-end;gap:8px;padding:18px 24px 22px}
.ibm-btn{height:36px;padding:0 16px;border-radius:10px;border:1px solid var(--line);background:#fff;font:inherit;font-size:13px;font-weight:500;color:var(--ink);cursor:pointer;transition:background .2s,transform .15s,opacity .2s}
.ibm-btn:hover{background:#f6f6fa}
.ibm-btn:active{transform:scale(.97)}
.ibm-primary{border-color:transparent;background:var(--accent);color:#fff}
.ibm-primary:hover{background:#4339d6}
.ibm-primary:disabled{opacity:.4;cursor:not-allowed;transform:none}
.ibm-btn:focus-visible,.ibm-x:focus-visible,.ibm-link:focus-visible{outline:2px solid var(--accent);outline-offset:2px}

/* result view */
.ibm-result{padding-top:24px}
.ibm-done-head{display:flex;gap:14px;align-items:center;padding:0 24px}
.ibm-c1,.ibm-c2{stroke:var(--accent);stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
.ibm-c1{stroke-dasharray:126;stroke-dashoffset:126;animation:ibm-draw .7s .15s var(--ease) forwards}
.ibm-c2{stroke-dasharray:30;stroke-dashoffset:30;animation:ibm-draw .45s .6s var(--ease) forwards}
@keyframes ibm-draw{to{stroke-dashoffset:0}}
.ibm-stats{display:grid;grid-template-columns:repeat(3,1fr);margin:22px 24px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.ibm-stat{padding:16px 0 16px 16px;display:flex;flex-direction:column;gap:2px}
.ibm-stat+.ibm-stat{border-left:1px solid var(--line)}
.ibm-stat:first-child{padding-left:0}
.ibm-stat b{font-size:28px;font-weight:600;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.ibm-stat span{font-size:12px;color:var(--muted)}
.ibm-unm{margin:18px 24px 0}
.ibm-unm p{margin:0 0 6px;font-size:13px;color:var(--muted)}
.ibm-unm ul{list-style:none;margin:0;padding:0;max-height:148px;overflow:auto}
.ibm-unm li{display:flex;align-items:center;gap:12px;height:38px;border-bottom:1px solid var(--line);font-size:13px}
.ibm-code{width:56px;color:var(--muted);font-variant-numeric:tabular-nums}
.ibm-uname{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ibm-unm .ibm-link{margin:0}
.ibm-warn{margin:14px 24px 0;padding-left:18px;font-size:12px;color:#8a5a00}

@media (max-width:480px){.ibm-zone{height:190px}.ibm-stat b{font-size:24px}}
@media (prefers-reduced-motion:reduce){
  .ibm-root *,.ibm-root *::before,.ibm-root *::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
}
`;
