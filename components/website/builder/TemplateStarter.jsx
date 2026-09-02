'use client';

import { useState } from 'react';
import { X, Code2, LayoutTemplate, ChevronRight, ArrowRight, Loader2 } from 'lucide-react';


// ── Form auto-wiring snippet injected into every template ──────────────────
const FORM_SNIPPET = `
<script>
(function(){
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (form.tagName !== 'FORM') return;
    e.preventDefault();
    var data = Object.fromEntries(new FormData(form));
    fetch('/api/v1/website/leads', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(data)
    }).then(function() {
      form.innerHTML = '<div style="padding:24px;text-align:center;color:#16a34a;font-weight:600;font-size:15px;">✓ Thank you! We will contact you soon.</div>';
    }).catch(function() {
      alert('Something went wrong. Please try again.');
    });
  });
})();
</script>`;

// ── Inject form snippet before </body> or at end ──────────────────────────
function sanitizeHtmlImageAssets(html) {
    if (!html || typeof html !== 'string') return html;
    const defaultPlaceholderUrl = 'https://placehold.co/800x500?text=Upload+Photo';
    return html.replace(/<img\s+([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi, (match, beforeSrc, src, afterSrc) => {
        const lowerSrc = src.toLowerCase();
        if (lowerSrc.endsWith('.svg') || lowerSrc.includes('placehold.co') || lowerSrc.startsWith('data:image/svg+xml')) {
            return match;
        }
        return `<img ${beforeSrc}src="${defaultPlaceholderUrl}" ${afterSrc}>`;
    });
}

function prepareHtml(html) {
    const sanitized = sanitizeHtmlImageAssets(html.trim());
    if (sanitized.includes('</body>')) {
        return sanitized.replace('</body>', `${FORM_SNIPPET}</body>`);
    }
    return sanitized + FORM_SNIPPET;
}


// ── Curated Built-in Templates ────────────────────────────────────────────
const STARTER_TEMPLATES = [
    {
        id: 'classic-blue',
        name: 'Classic Blue',
        description: 'Clean & professional. Best for primary & secondary schools.',
        accent: '#2563eb',
        bg: 'linear-gradient(135deg,#1e3a8a,#2563eb)',
        html: `
<style>*{margin:0;padding:0;box-sizing:border-box;font-family:Inter,system-ui,sans-serif}</style>
<nav style="background:#ffffff;padding:16px 48px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 1px 3px rgba(0,0,0,0.08);position:sticky;top:0;z-index:100">
  <div style="font-size:22px;font-weight:800;color:#1e3a8a;letter-spacing:-0.5px">🏫 Delhi Public School</div>
  <div style="display:flex;gap:28px;align-items:center">
    <a href="#about" style="color:#475569;font-size:14px;font-weight:500;text-decoration:none">About</a>
    <a href="#programs" style="color:#475569;font-size:14px;font-weight:500;text-decoration:none">Programs</a>
    <a href="#faculty" style="color:#475569;font-size:14px;font-weight:500;text-decoration:none">Faculty</a>
    <a href="#contact" style="color:#475569;font-size:14px;font-weight:500;text-decoration:none">Contact</a>
    <a href="#contact" style="background:#2563eb;color:#fff;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none">Admissions</a>
  </div>
</nav>
<section style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 60%,#0891b2 100%);padding:100px 48px;text-align:center">
  <p style="color:#bfdbfe;font-size:13px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:18px">Est. 1985 · CBSE Affiliated · UDISE: 12345678</p>
  <h1 style="color:#ffffff;font-size:58px;font-weight:900;line-height:1.05;margin-bottom:22px;letter-spacing:-1.5px">Excellence in<br>Education Since 1985</h1>
  <p style="color:#bfdbfe;font-size:18px;max-width:580px;margin:0 auto 40px;line-height:1.7">Nurturing young minds with quality education, values, and skills for a bright future. Admissions open for 2025–26.</p>
  <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap">
    <a href="#contact" style="background:#ffffff;color:#1e3a8a;padding:15px 36px;border-radius:10px;font-size:16px;font-weight:700;text-decoration:none;display:inline-block">Apply for Admission</a>
    <a href="#about" style="border:2px solid rgba(255,255,255,0.4);color:#ffffff;padding:15px 36px;border-radius:10px;font-size:16px;font-weight:600;text-decoration:none;display:inline-block">Learn More →</a>
  </div>
</section>
<section id="about" style="padding:80px 48px;background:#f8fafc">
  <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center">
    <div>
      <p style="color:#2563eb;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px">About Our School</p>
      <h2 style="color:#0f172a;font-size:38px;font-weight:800;margin-bottom:18px;line-height:1.15;letter-spacing:-0.5px">A Legacy of Learning & Excellence</h2>
      <p style="color:#475569;font-size:16px;line-height:1.8;margin-bottom:16px">Founded in 1985, our institution has been a pillar of quality education in the region. We believe in holistic development — academics, sports, arts, and values go hand in hand.</p>
      <p style="color:#475569;font-size:16px;line-height:1.8;margin-bottom:28px">Our CBSE-affiliated curriculum is designed to prepare students for national and international competitive examinations while fostering creativity and critical thinking.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div style="background:#dbeafe;border-radius:12px;padding:20px;text-align:center"><div style="font-size:32px;font-weight:900;color:#1e3a8a">3,200+</div><div style="color:#3b82f6;font-size:13px;font-weight:600;margin-top:4px">Students Enrolled</div></div>
        <div style="background:#dcfce7;border-radius:12px;padding:20px;text-align:center"><div style="font-size:32px;font-weight:900;color:#166534">98%</div><div style="color:#22c55e;font-size:13px;font-weight:600;margin-top:4px">Board Pass Rate</div></div>
        <div style="background:#fef9c3;border-radius:12px;padding:20px;text-align:center"><div style="font-size:32px;font-weight:900;color:#854d0e">120+</div><div style="color:#eab308;font-size:13px;font-weight:600;margin-top:4px">Qualified Staff</div></div>
        <div style="background:#fce7f3;border-radius:12px;padding:20px;text-align:center"><div style="font-size:32px;font-weight:900;color:#9d174d">40+</div><div style="color:#ec4899;font-size:13px;font-weight:600;margin-top:4px">Years of Excellence</div></div>
      </div>
    </div>
    <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);border-radius:20px;height:420px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:rgba(255,255,255,0.6);font-size:14px;gap:8px">
      <div style="font-size:60px">🏫</div>
      <span>School Building Image</span>
    </div>
  </div>
</section>
<section id="programs" style="padding:80px 48px;background:#ffffff">
  <div style="text-align:center;margin-bottom:56px">
    <p style="color:#2563eb;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">What We Offer</p>
    <h2 style="color:#0f172a;font-size:38px;font-weight:800;letter-spacing:-0.5px;margin-bottom:14px">Our Programs</h2>
    <p style="color:#64748b;font-size:16px;max-width:520px;margin:0 auto;line-height:1.7">A comprehensive education for every stage of a child's journey.</p>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:28px;max-width:1100px;margin:0 auto">
    <div style="border:1px solid #e2e8f0;border-radius:16px;padding:36px 28px;transition:all 0.2s">
      <div style="width:56px;height:56px;background:#dbeafe;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:20px">🎒</div>
      <h3 style="color:#0f172a;font-size:19px;font-weight:700;margin-bottom:10px">Primary School</h3>
      <p style="color:#64748b;font-size:14px;line-height:1.7;margin-bottom:16px">Classes I–V. Play-based, activity-rich learning that builds curiosity and a love for knowledge.</p>
      <a href="#contact" style="color:#2563eb;font-size:13px;font-weight:700;text-decoration:none">Enquire Now →</a>
    </div>
    <div style="border:1px solid #e2e8f0;border-radius:16px;padding:36px 28px;background:#f8fafc">
      <div style="width:56px;height:56px;background:#dcfce7;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:20px">📚</div>
      <h3 style="color:#0f172a;font-size:19px;font-weight:700;margin-bottom:10px">Middle School</h3>
      <p style="color:#64748b;font-size:14px;line-height:1.7;margin-bottom:16px">Classes VI–VIII. Critical thinking, project work, and foundation-building for senior secondary.</p>
      <a href="#contact" style="color:#2563eb;font-size:13px;font-weight:700;text-decoration:none">Enquire Now →</a>
    </div>
    <div style="border:1px solid #e2e8f0;border-radius:16px;padding:36px 28px">
      <div style="width:56px;height:56px;background:#fef9c3;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:20px">🎓</div>
      <h3 style="color:#0f172a;font-size:19px;font-weight:700;margin-bottom:10px">Senior Secondary</h3>
      <p style="color:#64748b;font-size:14px;line-height:1.7;margin-bottom:16px">Classes IX–XII. Science, Commerce & Arts streams with board exam preparation.</p>
      <a href="#contact" style="color:#2563eb;font-size:13px;font-weight:700;text-decoration:none">Enquire Now →</a>
    </div>
  </div>
</section>
<section id="contact" style="padding:80px 48px;background:#f1f5f9">
  <div style="max-width:1000px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:start">
    <div>
      <h2 style="color:#0f172a;font-size:36px;font-weight:800;margin-bottom:16px;letter-spacing:-0.5px">Get in Touch</h2>
      <p style="color:#64748b;font-size:16px;line-height:1.7;margin-bottom:32px">We'd love to hear from you. Send us a message and our team will respond within 24 hours.</p>
      <div style="display:flex;flex-direction:column;gap:16px">
        <div style="display:flex;gap:14px;align-items:center"><span style="font-size:20px">📍</span><span style="color:#475569;font-size:14px">123 School Lane, Knowledge Nagar, Delhi - 110001</span></div>
        <div style="display:flex;gap:14px;align-items:center"><span style="font-size:20px">📞</span><span style="color:#475569;font-size:14px">+91 98765 43210</span></div>
        <div style="display:flex;gap:14px;align-items:center"><span style="font-size:20px">✉️</span><span style="color:#475569;font-size:14px">admissions@dpschool.edu.in</span></div>
      </div>
    </div>
    <form style="background:#ffffff;border-radius:16px;padding:36px;border:1px solid #e2e8f0" action="/api/v1/website/leads" method="POST">
      <div style="display:flex;flex-direction:column;gap:14px">
        <input name="name" placeholder="Parent / Student Name" required style="padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;outline:none;font-family:inherit" />
        <input name="email" type="email" placeholder="Email Address" required style="padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;outline:none;font-family:inherit" />
        <input name="phone" placeholder="Phone Number" style="padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;outline:none;font-family:inherit" />
        <select name="grade" style="padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;outline:none;font-family:inherit;color:#64748b">
          <option value="">Admission for Class...</option>
          <option>Class I</option><option>Class II</option><option>Class III</option>
          <option>Class IV</option><option>Class V</option><option>Class VI</option>
          <option>Class VII</option><option>Class VIII</option><option>Class IX</option>
          <option>Class X</option><option>Class XI</option><option>Class XII</option>
        </select>
        <textarea name="message" placeholder="Any questions or message..." rows="3" style="padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;outline:none;resize:none;font-family:inherit"></textarea>
        <button type="submit" style="background:#2563eb;color:#ffffff;padding:14px;border-radius:8px;font-size:15px;font-weight:600;border:none;cursor:pointer">Send Enquiry</button>
      </div>
    </form>
  </div>
</section>
<footer style="background:#0f172a;padding:56px 48px 28px">
  <div style="max-width:1100px;margin:0 auto">
    <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:40px;margin-bottom:40px">
      <div>
        <div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:12px">🏫 Delhi Public School</div>
        <p style="color:#94a3b8;font-size:14px;line-height:1.7;max-width:280px">Providing quality education and holistic development since 1985. CBSE Affiliated.</p>
      </div>
      <div>
        <div style="color:#fff;font-weight:700;font-size:13px;margin-bottom:14px;text-transform:uppercase;letter-spacing:1px">Quick Links</div>
        <div style="display:flex;flex-direction:column;gap:9px">
          <a href="#about" style="color:#94a3b8;font-size:14px;text-decoration:none">About Us</a>
          <a href="#programs" style="color:#94a3b8;font-size:14px;text-decoration:none">Programs</a>
          <a href="#contact" style="color:#94a3b8;font-size:14px;text-decoration:none">Admissions</a>
          <a href="#contact" style="color:#94a3b8;font-size:14px;text-decoration:none">Contact</a>
        </div>
      </div>
      <div>
        <div style="color:#fff;font-weight:700;font-size:13px;margin-bottom:14px;text-transform:uppercase;letter-spacing:1px">Contact</div>
        <div style="display:flex;flex-direction:column;gap:9px">
          <span style="color:#94a3b8;font-size:14px">+91 98765 43210</span>
          <span style="color:#94a3b8;font-size:14px">admissions@dpschool.edu.in</span>
          <span style="color:#94a3b8;font-size:14px">Delhi, India</span>
        </div>
      </div>
    </div>
    <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:20px;display:flex;justify-content:space-between;align-items:center">
      <span style="color:#475569;font-size:13px">© 2025 Delhi Public School. All rights reserved.</span>
      <span style="color:#475569;font-size:13px">Powered by Quantech IMS</span>
    </div>
  </div>
</footer>`
    },
    {
        id: 'bold-dark',
        name: 'Bold Dark',
        description: 'Modern & striking. Best for coaching institutes & vocational training.',
        accent: '#7c3aed',
        bg: 'linear-gradient(135deg,#0f0f1a,#1e1b4b)',
        html: `
<style>*{margin:0;padding:0;box-sizing:border-box;font-family:Inter,system-ui,sans-serif}</style>
<nav style="background:#0f0f1a;padding:18px 48px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.08);position:sticky;top:0;z-index:100">
  <div style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px">⚡ ProTech Academy</div>
  <div style="display:flex;gap:28px;align-items:center">
    <a href="#courses" style="color:rgba(255,255,255,0.6);font-size:14px;font-weight:500;text-decoration:none">Courses</a>
    <a href="#results" style="color:rgba(255,255,255,0.6);font-size:14px;font-weight:500;text-decoration:none">Results</a>
    <a href="#faculty" style="color:rgba(255,255,255,0.6);font-size:14px;font-weight:500;text-decoration:none">Faculty</a>
    <a href="#contact" style="background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none">Enroll Now</a>
  </div>
</nav>
<section style="background:#0f0f1a;padding:110px 48px;position:relative;overflow:hidden">
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 70% 50%,rgba(124,58,237,0.2) 0%,transparent 70%)"></div>
  <div style="position:relative;max-width:700px">
    <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.3);border-radius:100px;padding:6px 16px;margin-bottom:24px">
      <span style="width:7px;height:7px;background:#7c3aed;border-radius:50%;display:inline-block"></span>
      <span style="color:#a78bfa;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Admissions Open 2025–26</span>
    </div>
    <h1 style="color:#ffffff;font-size:64px;font-weight:900;line-height:1.02;letter-spacing:-2px;margin-bottom:24px">Crack JEE.<br><span style="background:linear-gradient(135deg,#7c3aed,#db2777);-webkit-background-clip:text;-webkit-text-fill-color:transparent">NEET. UPSC.</span></h1>
    <p style="color:rgba(255,255,255,0.6);font-size:18px;line-height:1.7;margin-bottom:40px;max-width:540px">India's fastest-growing coaching institute. 3000+ students placed in top colleges. Expert faculty. Proven results.</p>
    <div style="display:flex;gap:14px;flex-wrap:wrap">
      <a href="#contact" style="background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;padding:16px 36px;border-radius:10px;font-size:16px;font-weight:700;text-decoration:none">Get Free Counselling</a>
      <a href="#results" style="border:1px solid rgba(255,255,255,0.2);color:#fff;padding:16px 36px;border-radius:10px;font-size:16px;font-weight:600;text-decoration:none">View Results →</a>
    </div>
  </div>
</section>
<section id="results" style="background:#0f0f1a;padding:0 48px 80px">
  <div style="border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:48px;background:linear-gradient(135deg,rgba(124,58,237,0.1),rgba(219,39,119,0.08));max-width:1100px;margin:0 auto">
    <h2 style="color:#fff;font-size:32px;font-weight:800;text-align:center;margin-bottom:40px">Our Results Speak</h2>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:24px">
      <div style="text-align:center"><div style="font-size:48px;font-weight:900;background:linear-gradient(135deg,#7c3aed,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent">3200+</div><div style="color:#94a3b8;font-size:14px;margin-top:6px;font-weight:500">Students Placed</div></div>
      <div style="text-align:center"><div style="font-size:48px;font-weight:900;background:linear-gradient(135deg,#db2777,#f472b6);-webkit-background-clip:text;-webkit-text-fill-color:transparent">94%</div><div style="color:#94a3b8;font-size:14px;margin-top:6px;font-weight:500">Selection Rate</div></div>
      <div style="text-align:center"><div style="font-size:48px;font-weight:900;background:linear-gradient(135deg,#0891b2,#38bdf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent">AIR 1</div><div style="color:#94a3b8;font-size:14px;margin-top:6px;font-weight:500">State Topper</div></div>
      <div style="text-align:center"><div style="font-size:48px;font-weight:900;background:linear-gradient(135deg,#16a34a,#4ade80);-webkit-background-clip:text;-webkit-text-fill-color:transparent">15+</div><div style="color:#94a3b8;font-size:14px;margin-top:6px;font-weight:500">Years Coaching</div></div>
    </div>
  </div>
</section>
<section id="courses" style="background:#0a0a14;padding:80px 48px">
  <div style="text-align:center;margin-bottom:52px">
    <h2 style="color:#ffffff;font-size:38px;font-weight:800;letter-spacing:-0.5px;margin-bottom:12px">Our Programs</h2>
    <p style="color:rgba(255,255,255,0.5);font-size:16px">Choose your path to success</p>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;max-width:1100px;margin:0 auto">
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;transition:all 0.2s">
      <div style="font-size:36px;margin-bottom:16px">🔬</div>
      <h3 style="color:#fff;font-size:18px;font-weight:700;margin-bottom:10px">JEE / NEET</h3>
      <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.7;margin-bottom:20px">Comprehensive 2-year program covering Physics, Chemistry, Mathematics & Biology.</p>
      <a href="#contact" style="color:#a78bfa;font-size:13px;font-weight:700;text-decoration:none">Enroll Now →</a>
    </div>
    <div style="background:linear-gradient(135deg,rgba(124,58,237,0.15),rgba(219,39,119,0.1));border:1px solid rgba(124,58,237,0.3);border-radius:16px;padding:32px">
      <div style="font-size:36px;margin-bottom:16px">📋</div>
      <h3 style="color:#fff;font-size:18px;font-weight:700;margin-bottom:10px">UPSC / SSC</h3>
      <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.7;margin-bottom:20px">GS Foundation + Optional Subject coaching with test series and mentorship.</p>
      <a href="#contact" style="color:#a78bfa;font-size:13px;font-weight:700;text-decoration:none">Enroll Now →</a>
    </div>
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px">
      <div style="font-size:36px;margin-bottom:16px">💻</div>
      <h3 style="color:#fff;font-size:18px;font-weight:700;margin-bottom:10px">Crash Course</h3>
      <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.7;margin-bottom:20px">3-month intensive revision for board exams with mock tests and daily practice.</p>
      <a href="#contact" style="color:#a78bfa;font-size:13px;font-weight:700;text-decoration:none">Enroll Now →</a>
    </div>
  </div>
</section>
<section id="contact" style="background:#0f0f1a;padding:80px 48px">
  <div style="max-width:560px;margin:0 auto;text-align:center">
    <h2 style="color:#fff;font-size:38px;font-weight:800;margin-bottom:12px;letter-spacing:-0.5px">Book Free Counselling</h2>
    <p style="color:rgba(255,255,255,0.5);margin-bottom:36px;font-size:16px">Our expert counsellors will guide you to the right program.</p>
    <form style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:36px;text-align:left" action="/api/v1/website/leads" method="POST">
      <div style="display:flex;flex-direction:column;gap:14px">
        <input name="name" placeholder="Student Name" required style="padding:13px 16px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#fff;font-size:14px;outline:none;font-family:inherit" />
        <input name="phone" placeholder="Phone Number" style="padding:13px 16px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#fff;font-size:14px;outline:none;font-family:inherit" />
        <input name="email" type="email" placeholder="Email Address" style="padding:13px 16px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#fff;font-size:14px;outline:none;font-family:inherit" />
        <select name="course" style="padding:13px 16px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:rgba(255,255,255,0.6);font-size:14px;outline:none;font-family:inherit">
          <option value="">Select Program</option>
          <option>JEE Mains + Advanced</option>
          <option>NEET UG</option>
          <option>UPSC / IAS</option>
          <option>SSC / Banking</option>
          <option>Crash Course</option>
        </select>
        <button type="submit" style="background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;padding:14px;border-radius:8px;font-size:15px;font-weight:700;border:none;cursor:pointer">Book My Free Session</button>
      </div>
    </form>
  </div>
</section>
<footer style="background:#07070f;padding:32px 48px;text-align:center;border-top:1px solid rgba(255,255,255,0.06)">
  <div style="color:#fff;font-size:18px;font-weight:800;margin-bottom:8px">⚡ ProTech Academy</div>
  <p style="color:#475569;font-size:13px">© 2025 ProTech Academy. All rights reserved. | Powered by Quantech IMS</p>
</footer>`
    },
    {
        id: 'minimal-light',
        name: 'Minimal Light',
        description: 'Clean & airy. Best for colleges, universities & premium institutes.',
        accent: '#0f172a',
        bg: 'linear-gradient(135deg,#f8fafc,#e2e8f0)',
        html: `
<style>*{margin:0;padding:0;box-sizing:border-box;font-family:"DM Sans",Inter,system-ui,sans-serif}</style>
<nav style="background:#fff;padding:20px 64px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f1f5f9;position:sticky;top:0;z-index:100">
  <div style="font-size:20px;font-weight:800;color:#0f172a;letter-spacing:-0.5px">Sunrise College</div>
  <div style="display:flex;gap:32px;align-items:center">
    <a href="#about" style="color:#64748b;font-size:14px;font-weight:500;text-decoration:none">About</a>
    <a href="#programs" style="color:#64748b;font-size:14px;font-weight:500;text-decoration:none">Programs</a>
    <a href="#contact" style="color:#64748b;font-size:14px;font-weight:500;text-decoration:none">Contact</a>
    <a href="#contact" style="background:#0f172a;color:#fff;padding:10px 22px;border-radius:7px;font-size:14px;font-weight:600;text-decoration:none">Apply Now</a>
  </div>
</nav>
<section style="padding:120px 64px;background:#fff;max-width:1200px;margin:0 auto">
  <p style="color:#94a3b8;font-size:13px;font-weight:600;letter-spacing:3px;text-transform:uppercase;margin-bottom:20px">Autonomous College · Affiliated to Mumbai University</p>
  <h1 style="color:#0f172a;font-size:68px;font-weight:900;line-height:1.02;letter-spacing:-2.5px;max-width:800px;margin-bottom:28px">Where Bright Minds<br>Find Their Purpose.</h1>
  <p style="color:#64748b;font-size:18px;line-height:1.8;max-width:520px;margin-bottom:44px">A premier institution committed to academic excellence, research, and shaping tomorrow's leaders.</p>
  <div style="display:flex;gap:14px;flex-wrap:wrap">
    <a href="#contact" style="background:#0f172a;color:#fff;padding:15px 36px;border-radius:9px;font-size:15px;font-weight:700;text-decoration:none">Explore Admissions</a>
    <a href="#programs" style="color:#0f172a;padding:15px 36px;border-radius:9px;font-size:15px;font-weight:600;text-decoration:none;border:1.5px solid #e2e8f0">View Programs</a>
  </div>
</section>
<div style="height:1px;background:#f1f5f9;max-width:1100px;margin:0 auto"></div>
<section id="about" style="padding:100px 64px;background:#fff">
  <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center">
    <div style="background:#f8fafc;border-radius:16px;height:440px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:14px;flex-direction:column;gap:8px"><span style="font-size:48px">🏛️</span>Campus Image</div>
    <div>
      <p style="color:#94a3b8;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px">Est. 1972</p>
      <h2 style="color:#0f172a;font-size:40px;font-weight:800;line-height:1.1;letter-spacing:-1px;margin-bottom:20px">50 Years of Academic Excellence</h2>
      <p style="color:#64748b;font-size:16px;line-height:1.8;margin-bottom:20px">Sunrise College has been at the forefront of higher education for over five decades, producing graduates who lead in every sector — from government to industry, from arts to sciences.</p>
      <p style="color:#64748b;font-size:16px;line-height:1.8;margin-bottom:32px">Our autonomous curriculum blends traditional academic rigor with modern pedagogical approaches, including experiential learning, research projects, and industry collaborations.</p>
      <div style="display:flex;gap:32px">
        <div><div style="font-size:28px;font-weight:900;color:#0f172a">12,000+</div><div style="color:#94a3b8;font-size:13px;margin-top:4px">Alumni Worldwide</div></div>
        <div><div style="font-size:28px;font-weight:900;color:#0f172a">40+</div><div style="color:#94a3b8;font-size:13px;margin-top:4px">Departments</div></div>
        <div><div style="font-size:28px;font-weight:900;color:#0f172a">NAAC A+</div><div style="color:#94a3b8;font-size:13px;margin-top:4px">Accreditation</div></div>
      </div>
    </div>
  </div>
</section>
<section id="programs" style="padding:100px 64px;background:#f8fafc">
  <div style="max-width:1100px;margin:0 auto">
    <div style="margin-bottom:56px">
      <p style="color:#94a3b8;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px">What We Offer</p>
      <h2 style="color:#0f172a;font-size:40px;font-weight:800;letter-spacing:-1px">Academic Programs</h2>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px">
      <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #f1f5f9"><h3 style="color:#0f172a;font-size:17px;font-weight:700;margin-bottom:10px">Science & Technology</h3><p style="color:#64748b;font-size:14px;line-height:1.7">B.Sc. Physics, Chemistry, Mathematics, Computer Science. M.Sc. programs available.</p></div>
      <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #f1f5f9"><h3 style="color:#0f172a;font-size:17px;font-weight:700;margin-bottom:10px">Commerce & Management</h3><p style="color:#64748b;font-size:14px;line-height:1.7">B.Com, BMS, BAF, BBI. MBA & MMS programs. Industry tie-ups for placements.</p></div>
      <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #f1f5f9"><h3 style="color:#0f172a;font-size:17px;font-weight:700;margin-bottom:10px">Arts & Humanities</h3><p style="color:#64748b;font-size:14px;line-height:1.7">BA in English, History, Economics, Psychology, Sociology, Political Science.</p></div>
    </div>
  </div>
</section>
<section id="contact" style="padding:100px 64px;background:#fff">
  <div style="max-width:1000px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px">
    <div>
      <p style="color:#94a3b8;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px">Admissions</p>
      <h2 style="color:#0f172a;font-size:36px;font-weight:800;letter-spacing:-0.5px;margin-bottom:16px">Start Your Application</h2>
      <p style="color:#64748b;font-size:15px;line-height:1.7;margin-bottom:32px">Fill out the form and our admissions team will reach out to guide you through the process.</p>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div style="display:flex;gap:12px;align-items:flex-start"><span style="font-size:18px;margin-top:2px">📍</span><span style="color:#64748b;font-size:14px">14 College Road, Andheri West, Mumbai — 400 058</span></div>
        <div style="display:flex;gap:12px;align-items:center"><span style="font-size:18px">📞</span><span style="color:#64748b;font-size:14px">+91 22 2634 5678</span></div>
        <div style="display:flex;gap:12px;align-items:center"><span style="font-size:18px">✉️</span><span style="color:#64748b;font-size:14px">admissions@sunrisecollege.ac.in</span></div>
      </div>
    </div>
    <form style="display:flex;flex-direction:column;gap:14px" action="/api/v1/website/leads" method="POST">
      <input name="name" placeholder="Full Name" required style="padding:13px 16px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;outline:none;font-family:inherit;color:#0f172a" />
      <input name="email" type="email" placeholder="Email Address" required style="padding:13px 16px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;outline:none;font-family:inherit;color:#0f172a" />
      <input name="phone" placeholder="Phone Number" style="padding:13px 16px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;outline:none;font-family:inherit;color:#0f172a" />
      <select name="program" style="padding:13px 16px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;outline:none;font-family:inherit;color:#64748b">
        <option value="">Program of Interest</option>
        <option>B.Sc.</option><option>B.Com</option><option>BA</option>
        <option>BMS / BBA</option><option>M.Sc.</option><option>MBA</option>
      </select>
      <textarea name="message" placeholder="Tell us about yourself..." rows="3" style="padding:13px 16px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;outline:none;resize:none;font-family:inherit;color:#0f172a"></textarea>
      <button type="submit" style="background:#0f172a;color:#fff;padding:14px;border-radius:8px;font-size:15px;font-weight:700;border:none;cursor:pointer">Submit Application</button>
    </form>
  </div>
</section>
<footer style="background:#0f172a;padding:40px 64px;display:flex;justify-content:space-between;align-items:center">
  <div style="color:#fff;font-weight:800;font-size:17px">Sunrise College</div>
  <span style="color:#475569;font-size:13px">© 2025 Sunrise College. Powered by Quantech IMS</span>
</footer>`
    },
    {
        id: 'green-warm',
        name: 'Green & Warm',
        description: 'Friendly & welcoming. Perfect for primary schools & kindergartens.',
        accent: '#16a34a',
        bg: 'linear-gradient(135deg,#14532d,#16a34a)',
        html: `
<style>*{margin:0;padding:0;box-sizing:border-box;font-family:Inter,system-ui,sans-serif}</style>
<nav style="background:#fff;padding:16px 48px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 8px rgba(0,0,0,0.06);position:sticky;top:0;z-index:100">
  <div style="font-size:22px;font-weight:800;color:#14532d;letter-spacing:-0.5px">🌱 Little Sprouts School</div>
  <div style="display:flex;gap:24px;align-items:center">
    <a href="#about" style="color:#374151;font-size:14px;font-weight:500;text-decoration:none">About</a>
    <a href="#classes" style="color:#374151;font-size:14px;font-weight:500;text-decoration:none">Classes</a>
    <a href="#facilities" style="color:#374151;font-size:14px;font-weight:500;text-decoration:none">Facilities</a>
    <a href="#contact" style="background:#16a34a;color:#fff;padding:10px 22px;border-radius:50px;font-size:14px;font-weight:700;text-decoration:none">Admissions 2025</a>
  </div>
</nav>
<section style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);padding:100px 48px;text-align:center;position:relative;overflow:hidden">
  <div style="position:absolute;top:-20px;left:-20px;font-size:120px;opacity:0.06">🌿</div>
  <div style="position:absolute;bottom:-20px;right:-20px;font-size:120px;opacity:0.06">🌸</div>
  <div style="position:relative">
    <div style="background:#bbf7d0;display:inline-block;padding:8px 20px;border-radius:50px;color:#14532d;font-size:13px;font-weight:700;margin-bottom:20px">🎉 Enrolments Open for 2025–26</div>
    <h1 style="color:#14532d;font-size:56px;font-weight:900;line-height:1.1;margin-bottom:20px;letter-spacing:-1.5px">A Joyful Place to<br>Grow & Learn 🌟</h1>
    <p style="color:#166534;font-size:18px;max-width:560px;margin:0 auto 40px;line-height:1.7">We nurture young minds in a safe, creative, and loving environment. Because every child deserves the best start in life.</p>
    <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap">
      <a href="#contact" style="background:#16a34a;color:#fff;padding:15px 36px;border-radius:50px;font-size:16px;font-weight:700;text-decoration:none;box-shadow:0 4px 20px rgba(22,163,74,0.35)">Schedule a Visit</a>
      <a href="#classes" style="background:#fff;color:#16a34a;padding:15px 36px;border-radius:50px;font-size:16px;font-weight:600;text-decoration:none;border:2px solid #bbf7d0">Explore Classes</a>
    </div>
  </div>
</section>
<section id="classes" style="padding:80px 48px;background:#fff">
  <div style="text-align:center;margin-bottom:52px">
    <h2 style="color:#14532d;font-size:38px;font-weight:800;margin-bottom:12px;letter-spacing:-0.5px">Classes We Offer</h2>
    <p style="color:#6b7280;font-size:16px">Nurturing every stage of early childhood development</p>
  </div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px;max-width:1100px;margin:0 auto">
    <div style="background:#f0fdf4;border-radius:20px;padding:28px 20px;text-align:center;border:2px solid #bbf7d0">
      <div style="font-size:44px;margin-bottom:14px">🍼</div>
      <h3 style="color:#14532d;font-size:16px;font-weight:700;margin-bottom:6px">Playgroup</h3>
      <p style="color:#6b7280;font-size:13px">Age 1.5–2.5 yrs</p>
    </div>
    <div style="background:#fef9c3;border-radius:20px;padding:28px 20px;text-align:center;border:2px solid #fde68a">
      <div style="font-size:44px;margin-bottom:14px">🎨</div>
      <h3 style="color:#92400e;font-size:16px;font-weight:700;margin-bottom:6px">Nursery</h3>
      <p style="color:#6b7280;font-size:13px">Age 2.5–3.5 yrs</p>
    </div>
    <div style="background:#fce7f3;border-radius:20px;padding:28px 20px;text-align:center;border:2px solid #fbcfe8">
      <div style="font-size:44px;margin-bottom:14px">🔤</div>
      <h3 style="color:#9d174d;font-size:16px;font-weight:700;margin-bottom:6px">LKG</h3>
      <p style="color:#6b7280;font-size:13px">Age 3.5–4.5 yrs</p>
    </div>
    <div style="background:#dbeafe;border-radius:20px;padding:28px 20px;text-align:center;border:2px solid #bfdbfe">
      <div style="font-size:44px;margin-bottom:14px">📖</div>
      <h3 style="color:#1e3a8a;font-size:16px;font-weight:700;margin-bottom:6px">UKG</h3>
      <p style="color:#6b7280;font-size:13px">Age 4.5–5.5 yrs</p>
    </div>
  </div>
</section>
<section id="contact" style="padding:80px 48px;background:#f0fdf4">
  <div style="max-width:560px;margin:0 auto;text-align:center">
    <h2 style="color:#14532d;font-size:36px;font-weight:800;margin-bottom:12px">Schedule a School Visit</h2>
    <p style="color:#166534;font-size:16px;margin-bottom:36px">Come see our campus. We'd love to meet you and your little one! 🌸</p>
    <form style="background:#fff;border-radius:20px;padding:36px;text-align:left;box-shadow:0 4px 24px rgba(0,0,0,0.06)" action="/api/v1/website/leads" method="POST">
      <div style="display:flex;flex-direction:column;gap:14px">
        <input name="name" placeholder="Parent Name" required style="padding:13px 16px;border:1.5px solid #e2e8f0;border-radius:50px;font-size:14px;outline:none;font-family:inherit" />
        <input name="phone" placeholder="Phone Number" style="padding:13px 16px;border:1.5px solid #e2e8f0;border-radius:50px;font-size:14px;outline:none;font-family:inherit" />
        <input name="child_name" placeholder="Child's Name" style="padding:13px 16px;border:1.5px solid #e2e8f0;border-radius:50px;font-size:14px;outline:none;font-family:inherit" />
        <select name="class" style="padding:13px 16px;border:1.5px solid #e2e8f0;border-radius:50px;font-size:14px;outline:none;font-family:inherit;color:#6b7280">
          <option value="">Class Required</option>
          <option>Playgroup</option><option>Nursery</option><option>LKG</option><option>UKG</option>
        </select>
        <button type="submit" style="background:#16a34a;color:#fff;padding:14px;border-radius:50px;font-size:15px;font-weight:700;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(22,163,74,0.3)">Book Visit 🌟</button>
      </div>
    </form>
  </div>
</section>
<footer style="background:#14532d;padding:36px 48px;text-align:center">
  <div style="color:#fff;font-size:20px;font-weight:800;margin-bottom:8px">🌱 Little Sprouts School</div>
  <p style="color:rgba(255,255,255,0.6);font-size:13px">© 2025 Little Sprouts. All rights reserved. | Powered by Quantech IMS</p>
</footer>`
    },
    {
        id: 'maroon-gold',
        name: 'Maroon & Gold',
        description: 'Traditional & prestigious. Ideal for established schools & colleges.',
        accent: '#9f1239',
        bg: 'linear-gradient(135deg,#4c0519,#9f1239)',
        html: `
<style>*{margin:0;padding:0;box-sizing:border-box;font-family:Georgia,serif}</style>
<nav style="background:#4c0519;padding:16px 48px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100">
  <div style="font-size:20px;font-weight:700;color:#fbbf24;letter-spacing:-0.3px">⚜ St. Xavier's High School</div>
  <div style="display:flex;gap:28px;align-items:center">
    <a href="#about" style="color:rgba(255,255,255,0.8);font-size:14px;text-decoration:none">About</a>
    <a href="#academics" style="color:rgba(255,255,255,0.8);font-size:14px;text-decoration:none">Academics</a>
    <a href="#achievements" style="color:rgba(255,255,255,0.8);font-size:14px;text-decoration:none">Achievements</a>
    <a href="#contact" style="background:#fbbf24;color:#4c0519;padding:10px 22px;border-radius:6px;font-size:14px;font-weight:700;text-decoration:none">Admissions</a>
  </div>
</nav>
<div style="background:#fbbf24;padding:10px 48px;text-align:center">
  <p style="color:#4c0519;font-size:13px;font-weight:700;font-style:italic">"Veritas, Virtus, Vox" — Truth, Virtue, Voice · ICSE Affiliated · Established 1932</p>
</div>
<section style="background:linear-gradient(135deg,#4c0519 0%,#9f1239 100%);padding:100px 48px;text-align:center;position:relative">
  <div style="width:100px;height:2px;background:#fbbf24;margin:0 auto 28px"></div>
  <p style="color:#fcd34d;font-size:12px;font-weight:600;letter-spacing:4px;text-transform:uppercase;margin-bottom:20px">Serving Excellence Since 1932</p>
  <h1 style="color:#fff;font-size:58px;font-weight:700;line-height:1.1;margin-bottom:22px;letter-spacing:-1px">Where Tradition Meets<br><span style="color:#fbbf24">Modern Excellence</span></h1>
  <p style="color:rgba(255,255,255,0.75);font-size:17px;max-width:560px;margin:0 auto 44px;line-height:1.8">Over nine decades of academic excellence, moral leadership, and holistic development. A legacy built on discipline, dedication, and distinction.</p>
  <div style="width:100px;height:2px;background:#fbbf24;margin:0 auto 44px"></div>
  <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap">
    <a href="#contact" style="background:#fbbf24;color:#4c0519;padding:15px 36px;border-radius:6px;font-size:15px;font-weight:700;text-decoration:none">Apply for Admission</a>
    <a href="#about" style="border:2px solid rgba(255,255,255,0.4);color:#fff;padding:15px 36px;border-radius:6px;font-size:15px;font-weight:600;text-decoration:none">Our Story</a>
  </div>
</section>
<section id="achievements" style="background:#fbbf24;padding:28px 48px">
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:24px;max-width:1100px;margin:0 auto;text-align:center">
    <div><div style="font-size:36px;font-weight:900;color:#4c0519">92+</div><div style="color:#7c2d12;font-size:13px;font-weight:600;margin-top:4px">Years of Excellence</div></div>
    <div><div style="font-size:36px;font-weight:900;color:#4c0519">4,500+</div><div style="color:#7c2d12;font-size:13px;font-weight:600;margin-top:4px">Students</div></div>
    <div><div style="font-size:36px;font-weight:900;color:#4c0519">99%</div><div style="color:#7c2d12;font-size:13px;font-weight:600;margin-top:4px">Board Results</div></div>
    <div><div style="font-size:36px;font-weight:900;color:#4c0519">200+</div><div style="color:#7c2d12;font-size:13px;font-weight:600;margin-top:4px">Faculty Members</div></div>
  </div>
</section>
<section id="about" style="padding:80px 48px;background:#fffbf0">
  <div style="max-width:800px;margin:0 auto;text-align:center">
    <p style="color:#9f1239;font-size:12px;font-weight:600;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px">Our Heritage</p>
    <h2 style="color:#4c0519;font-size:38px;font-weight:700;margin-bottom:20px;line-height:1.2">A Proud Legacy of Shaping Leaders</h2>
    <p style="color:#4b5563;font-size:16px;line-height:1.9;margin-bottom:20px">Founded in 1932 by the Society of Jesus, St. Xavier's has been at the vanguard of quality education for over nine decades. Our alumni occupy prominent positions in government, judiciary, medicine, arts, and industry across the globe.</p>
    <p style="color:#4b5563;font-size:16px;line-height:1.9">We are proud to be consistently ranked among the top ICSE schools in the state, with an unwavering commitment to academic rigour, character formation, and service to society.</p>
  </div>
</section>
<section id="contact" style="padding:80px 48px;background:#4c0519">
  <div style="max-width:560px;margin:0 auto;text-align:center">
    <h2 style="color:#fbbf24;font-size:36px;font-weight:700;margin-bottom:12px">Admission Enquiry</h2>
    <p style="color:rgba(255,255,255,0.7);font-size:15px;margin-bottom:36px">Kindly fill in your details and our admissions office will contact you within 2 working days.</p>
    <form style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:36px;text-align:left" action="/api/v1/website/leads" method="POST">
      <div style="display:flex;flex-direction:column;gap:14px">
        <input name="name" placeholder="Parent / Guardian Name" required style="padding:12px 16px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:6px;color:#fff;font-size:14px;outline:none;font-family:inherit" />
        <input name="email" type="email" placeholder="Email Address" style="padding:12px 16px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:6px;color:#fff;font-size:14px;outline:none;font-family:inherit" />
        <input name="phone" placeholder="Phone Number" style="padding:12px 16px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:6px;color:#fff;font-size:14px;outline:none;font-family:inherit" />
        <select name="class" style="padding:12px 16px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:6px;color:rgba(255,255,255,0.7);font-size:14px;outline:none;font-family:inherit">
          <option value="">Admission for Class</option>
          <option>Pre-Primary</option><option>Class I–IV</option><option>Class V–VIII</option><option>Class IX–X</option>
        </select>
        <button type="submit" style="background:#fbbf24;color:#4c0519;padding:13px;border-radius:6px;font-size:15px;font-weight:700;border:none;cursor:pointer;font-family:Georgia,serif">Submit Enquiry</button>
      </div>
    </form>
  </div>
</section>
<footer style="background:#2d000f;padding:28px 48px;text-align:center">
  <p style="color:#fbbf24;font-size:16px;font-weight:700;margin-bottom:6px">⚜ St. Xavier's High School</p>
  <p style="color:rgba(255,255,255,0.4);font-size:12px">© 2025 St. Xavier's. All rights reserved. | Powered by Quantech IMS</p>
</footer>`
    },
    {
        id: 'modern-purple',
        name: 'Modern Purple',
        description: 'Vibrant & contemporary. Great for ed-tech & vocational institutes.',
        accent: '#6d28d9',
        bg: 'linear-gradient(135deg,#2e1065,#6d28d9)',
        html: `
<style>*{margin:0;padding:0;box-sizing:border-box;font-family:Inter,system-ui,sans-serif}</style>
<nav style="background:#fff;padding:16px 48px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 1px 0 #f1f5f9;position:sticky;top:0;z-index:100">
  <div style="font-size:21px;font-weight:900;background:linear-gradient(135deg,#6d28d9,#db2777);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-0.5px">🚀 Nexus Institute</div>
  <div style="display:flex;gap:28px;align-items:center">
    <a href="#programs" style="color:#374151;font-size:14px;font-weight:500;text-decoration:none">Programs</a>
    <a href="#about" style="color:#374151;font-size:14px;font-weight:500;text-decoration:none">About</a>
    <a href="#contact" style="color:#374151;font-size:14px;font-weight:500;text-decoration:none">Contact</a>
    <a href="#contact" style="background:linear-gradient(135deg,#6d28d9,#db2777);color:#fff;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none">Start Learning</a>
  </div>
</nav>
<section style="padding:110px 48px;background:#fff;position:relative;overflow:hidden">
  <div style="position:absolute;top:0;right:0;width:50%;height:100%;background:linear-gradient(135deg,#f5f3ff,#fdf2f8);border-radius:0 0 0 80px"></div>
  <div style="position:relative;max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center">
    <div>
      <div style="display:inline-flex;align-items:center;gap:8px;background:#f5f3ff;border-radius:100px;padding:6px 16px;margin-bottom:24px">
        <span style="color:#7c3aed;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Industry-Certified Courses</span>
      </div>
      <h1 style="color:#0f172a;font-size:56px;font-weight:900;line-height:1.05;letter-spacing:-2px;margin-bottom:22px">Skills That Get You Hired.</h1>
      <p style="color:#64748b;font-size:17px;line-height:1.8;margin-bottom:36px">Job-ready certificate programs in tech, design, and business. Learn from industry experts. Get placed in top companies.</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <a href="#contact" style="background:linear-gradient(135deg,#6d28d9,#db2777);color:#fff;padding:14px 32px;border-radius:9px;font-size:15px;font-weight:700;text-decoration:none">Explore Courses</a>
        <a href="#about" style="color:#6d28d9;padding:14px 32px;border-radius:9px;font-size:15px;font-weight:600;text-decoration:none;border:1.5px solid #ddd6fe">Our Story</a>
      </div>
      <div style="display:flex;gap:28px;margin-top:36px">
        <div><div style="font-size:26px;font-weight:900;color:#0f172a">5,000+</div><div style="color:#94a3b8;font-size:12px;margin-top:3px">Graduates Placed</div></div>
        <div style="width:1px;background:#e2e8f0"></div>
        <div><div style="font-size:26px;font-weight:900;color:#0f172a">92%</div><div style="color:#94a3b8;font-size:12px;margin-top:3px">Placement Rate</div></div>
        <div style="width:1px;background:#e2e8f0"></div>
        <div><div style="font-size:26px;font-weight:900;color:#0f172a">4.8★</div><div style="color:#94a3b8;font-size:12px;margin-top:3px">Student Rating</div></div>
      </div>
    </div>
    <div style="background:linear-gradient(135deg,#6d28d9,#db2777);border-radius:24px;height:400px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.5);font-size:14px;flex-direction:column;gap:8px"><span style="font-size:56px">🚀</span>Hero Image</div>
  </div>
</section>
<section id="programs" style="padding:80px 48px;background:#fafafa">
  <div style="text-align:center;margin-bottom:52px">
    <h2 style="color:#0f172a;font-size:38px;font-weight:800;letter-spacing:-0.5px;margin-bottom:12px">Our Programs</h2>
    <p style="color:#64748b;font-size:16px">Choose a skill. Build a career.</p>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;max-width:1100px;margin:0 auto">
    <div style="background:#fff;border-radius:16px;padding:32px;border:1.5px solid #f1f5f9;transition:all 0.2s">
      <div style="width:52px;height:52px;background:#f5f3ff;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:18px">💻</div>
      <h3 style="color:#0f172a;font-size:18px;font-weight:700;margin-bottom:10px">Full Stack Development</h3>
      <p style="color:#64748b;font-size:14px;line-height:1.7;margin-bottom:16px">HTML, CSS, JavaScript, React, Node.js, MongoDB. Build production-ready web apps. 4-month program.</p>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="color:#6d28d9;font-size:13px;font-weight:700">₹35,000</span>
        <a href="#contact" style="color:#6d28d9;font-size:13px;font-weight:700;text-decoration:none">Enroll →</a>
      </div>
    </div>
    <div style="background:linear-gradient(135deg,#f5f3ff,#fdf2f8);border-radius:16px;padding:32px;border:1.5px solid #ddd6fe">
      <div style="width:52px;height:52px;background:#ede9fe;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:18px">🎨</div>
      <h3 style="color:#0f172a;font-size:18px;font-weight:700;margin-bottom:10px">UI/UX Design</h3>
      <p style="color:#64748b;font-size:14px;line-height:1.7;margin-bottom:16px">Figma, user research, prototyping, design systems. Land your first design job in 3 months.</p>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="color:#6d28d9;font-size:13px;font-weight:700">₹28,000</span>
        <a href="#contact" style="color:#6d28d9;font-size:13px;font-weight:700;text-decoration:none">Enroll →</a>
      </div>
    </div>
    <div style="background:#fff;border-radius:16px;padding:32px;border:1.5px solid #f1f5f9">
      <div style="width:52px;height:52px;background:#fdf2f8;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:18px">📊</div>
      <h3 style="color:#0f172a;font-size:18px;font-weight:700;margin-bottom:10px">Data Analytics</h3>
      <p style="color:#64748b;font-size:14px;line-height:1.7;margin-bottom:16px">Excel, SQL, Python, Tableau. Analyze data, visualize insights, make decisions. 3-month program.</p>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="color:#6d28d9;font-size:13px;font-weight:700">₹30,000</span>
        <a href="#contact" style="color:#6d28d9;font-size:13px;font-weight:700;text-decoration:none">Enroll →</a>
      </div>
    </div>
  </div>
</section>
<section id="contact" style="padding:80px 48px;background:#fff">
  <div style="max-width:1000px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center">
    <div>
      <h2 style="color:#0f172a;font-size:36px;font-weight:800;letter-spacing:-0.5px;margin-bottom:16px">Ready to Begin?</h2>
      <p style="color:#64748b;font-size:16px;line-height:1.7;margin-bottom:32px">Drop us your details and our counsellor will call you within 2 hours to guide you to the right program.</p>
      <div style="background:linear-gradient(135deg,#f5f3ff,#fdf2f8);border-radius:16px;padding:24px">
        <div style="display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;gap:12px;align-items:center"><span style="font-size:18px">📞</span><span style="color:#475569;font-size:14px">+91 98765 43210</span></div>
          <div style="display:flex;gap:12px;align-items:center"><span style="font-size:18px">✉️</span><span style="color:#475569;font-size:14px">hello@nexusinstitute.in</span></div>
          <div style="display:flex;gap:12px;align-items:center"><span style="font-size:18px">📍</span><span style="color:#475569;font-size:14px">42 Tech Park, Koregaon, Pune — 411001</span></div>
        </div>
      </div>
    </div>
    <form style="background:#fafafa;border-radius:16px;padding:36px;border:1px solid #e2e8f0" action="/api/v1/website/leads" method="POST">
      <div style="display:flex;flex-direction:column;gap:14px">
        <input name="name" placeholder="Your Name" required style="padding:13px 16px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:14px;outline:none;font-family:inherit;background:#fff" />
        <input name="phone" placeholder="Phone Number" style="padding:13px 16px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:14px;outline:none;font-family:inherit;background:#fff" />
        <input name="email" type="email" placeholder="Email Address" style="padding:13px 16px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:14px;outline:none;font-family:inherit;background:#fff" />
        <select name="program" style="padding:13px 16px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:14px;outline:none;font-family:inherit;color:#64748b;background:#fff">
          <option value="">Program of Interest</option>
          <option>Full Stack Development</option>
          <option>UI/UX Design</option>
          <option>Data Analytics</option>
          <option>Other</option>
        </select>
        <button type="submit" style="background:linear-gradient(135deg,#6d28d9,#db2777);color:#fff;padding:14px;border-radius:9px;font-size:15px;font-weight:700;border:none;cursor:pointer">Get Free Counselling 🚀</button>
      </div>
    </form>
  </div>
</section>
<footer style="background:#0f172a;padding:32px 48px;display:flex;justify-content:space-between;align-items:center">
  <div style="font-size:18px;font-weight:800;background:linear-gradient(135deg,#a78bfa,#f472b6);-webkit-background-clip:text;-webkit-text-fill-color:transparent">🚀 Nexus Institute</div>
  <span style="color:#475569;font-size:13px">© 2025 Nexus Institute. Powered by Quantech IMS</span>
</footer>`
    }
];

const cardStyle = (selected, accent) => ({
    border: `2px solid ${selected ? accent : 'rgba(255,255,255,0.08)'}`,
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.15s',
    background: selected ? `${accent}18` : '#1e293b',
    outline: selected ? `2px solid ${accent}` : 'none',
    outlineOffset: '2px',
});

// ── Dynamic JSZip Loader ──────────────────────────────────────────────────
function loadJSZip() {

    return new Promise((resolve, reject) => {
        if (window.JSZip) return resolve(window.JSZip);
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = () => resolve(window.JSZip);
        script.onerror = () => reject(new Error('Failed to load ZIP processor.'));
        document.head.appendChild(script);
    });
}

// ── Universal Asset, FontAwesome & Multi-Page Link Processor ───────────────
function processTemplateAssetsAndLinks({ htmlFilesWithContent, combinedCss, imageMap, fontMap = {}, instituteCode }) {

    // 1. Extract all external <link> URLs (Google Fonts, CDN stylesheets, etc.) from all HTML files
    const externalFontAndCssUrls = [
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
    ];

    htmlFilesWithContent.forEach(item => {
        const linkMatches = item.content.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/gi) || [];
        linkMatches.forEach(tag => {
            const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
            if (hrefMatch && hrefMatch[1]) {
                const url = hrefMatch[1];
                if ((url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) && !externalFontAndCssUrls.includes(url)) {
                    externalFontAndCssUrls.push(url);
                }
            }
        });
    });

    // Generate @import statements so Google Fonts are NEVER lost regardless of where CSS is loaded
    const fontImports = externalFontAndCssUrls
        .map(url => `@import url("${url}");`)
        .join('\n');

    // Clean out local relative @import lines (e.g. @import "vendor.css"; @import "fonts.css";) since they are already inlined
    let cleanedCss = combinedCss.replace(/@import\s+(?:url\(['"]?(?!\s*https?:|\s*\/\/)[^'"]+['"]?\)|['"](?!\s*https?:|\s*\/\/)[^'"]+['"])\s*;/gi, '');

    // Replace all font file references (.woff, .woff2, .ttf, .otf, .eot) in CSS
    Object.keys(fontMap).forEach(fontKey => {
        const dataUrl = fontMap[fontKey];
        const filename = fontKey.split('/').pop();
        if (!filename) return;
        const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const fontPattern = new RegExp(`url\\(\\s*['"]?[^'")*]*?${escaped}(?:\\?[^'")]*)?['"]?\\s*\\)`, 'gi');
        cleanedCss = cleanedCss.replace(fontPattern, `url("${dataUrl}")`);
    });

    // 2. Replace all image references in CSS and HTML
    const replaceImages = (content) => {
        let res = content;
        Object.keys(imageMap).forEach(imgKey => {
            const dataUrl = imageMap[imgKey];
            const filename = imgKey.split('/').pop();
            if (!filename) return;
            const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            // Match all url(...) formats in CSS and style tags (including ../, ./, images/, etc.)
            const urlPattern = new RegExp(`url\\(\\s*['"]?[^'")*]*?${escaped}['"]?\\s*\\)`, 'gi');
            res = res.replace(urlPattern, `url("${dataUrl}")`);

            // Match all <img src="..."> formats
            const srcPattern = new RegExp(`src=\\s*['"][^'"]*?${escaped}['"]`, 'gi');
            res = res.replace(srcPattern, `src="${dataUrl}"`);

            // Match data-src
            const dataSrcPattern = new RegExp(`data-src=\\s*['"][^'"]*?${escaped}['"]`, 'gi');
            res = res.replace(dataSrcPattern, `data-src="${dataUrl}"`);
        });
        return res;
    };

    // Prepend Google Fonts @import rules to the combined stylesheet
    const processedCss = fontImports + '\n' + replaceImages(cleanedCss);

    // External link tags for HTML <head>
    const externalLinksHtml = externalFontAndCssUrls
        .map(url => `<link rel="stylesheet" href="${url}" />`)
        .join('\n');

    // 3. Build list of slugs for all pages in template
    const pageMap = {};
    htmlFilesWithContent.forEach(item => {
        const fname = item.path.split('/').pop().toLowerCase();
        const baseName = fname.replace('.html', '');
        const slug = baseName === 'index' ? 'index' : baseName.replace(/[^a-z0-9]+/g, '-');
        const title = baseName === 'index' ? 'Home' : baseName.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        pageMap[fname] = { slug, title, originalPath: item.path };
    });

    // 4. Process each HTML file and rewrite navigation links
    const processedPages = htmlFilesWithContent.map(item => {
        const fname = item.path.split('/').pop().toLowerCase();
        const { slug, title } = pageMap[fname] || { slug: 'index', title: 'Home' };

        let html = replaceImages(item.content);

        // Remove blocking preloader overlays (e.g. StyleShout #preloader, .loader-wrapper)
        html = html.replace(/<div[^>]*(?:id|class)=["'](?:preloader|loader-wrapper|page-loader|loader|s-loader)["'][^>]*>[\s\S]*?<\/div>/gi, '');

        // Rewrite links: href="menu.html" -> href="/website/CODE/menu"
        Object.keys(pageMap).forEach(targetFile => {
            const target = pageMap[targetFile];
            const targetUrl = target.slug === 'index'
                ? (instituteCode ? `/website/${instituteCode}` : '/')
                : (instituteCode ? `/website/${instituteCode}/${target.slug}` : `/${target.slug}`);

            const linkRegex = new RegExp(`href=\\s*['"](?:\\./)?(?:[a-zA-Z0-9_\\-\\s]+/)?${targetFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'gi');
            html = html.replace(linkRegex, `href="${targetUrl}"`);
        });

        // Hide preloader in CSS as well so editor canvas never gets covered
        const preloaderReset = `\n#preloader, .preloader, #loader, .loader-wrapper, #page-loader, .s-loader { display: none !important; opacity: 0 !important; visibility: hidden !important; }\n`;
        const headInjection = `${externalLinksHtml}\n<style>\n${preloaderReset}\n${processedCss}\n</style>`;
        if (html.includes('</head>')) {
            html = html.replace('</head>', `${headInjection}\n</head>`);
        } else if (html.includes('<body')) {
            html = html.replace('<body', `${headInjection}\n<body`);
        } else {
            html = headInjection + '\n' + html;
        }

        return {
            slug,
            title,
            path: item.path,
            html,
            css: preloaderReset + '\n' + processedCss
        };
    });

    const homePage = processedPages.find(p => p.slug === 'index') || processedPages[0];

    return {
        pages: processedPages,
        homeHtml: homePage ? homePage.html : '',
        homeCss: processedCss,
        cssCount: htmlFilesWithContent.length,
        imgCount: Object.keys(imageMap).length
    };
}


// ── Fast Client-Side Image Optimizer (Fallback) ───────────────────────────
function optimizeImage(file, maxDimension = 1400, quality = 0.82) {
    return new Promise((resolve) => {
        const lower = file.name ? file.name.toLowerCase() : '';
        // If SVG or small file (< 50KB), just read as dataURL directly
        if (lower.endsWith('.svg') || (file.size && file.size < 50 * 1024)) {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
            return;
        }

        const img = new Image();
        const blobUrl = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(blobUrl);
            let { width, height } = img;
            if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                    height = Math.round((height * maxDimension) / width);
                    width = maxDimension;
                } else {
                    width = Math.round((width * maxDimension) / height);
                    height = maxDimension;
                }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const format = lower.endsWith('.png') ? 'image/png' : 'image/jpeg';
            resolve(canvas.toDataURL(format, quality));
        };
        img.onerror = () => {
            URL.revokeObjectURL(blobUrl);
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
        };
        img.src = blobUrl;
    });
}

// ── Server-Side Image Upload with Fast Fallback ────────────────────────────
async function uploadTemplateImage(file) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileType', 'template-asset');
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });
        if (res.ok) {
            const data = await res.json();
            if (data.url) return data.url;
        }
    } catch (e) {
        console.warn('Image upload to server failed, using optimized base64 fallback:', e);
    }
    // Fallback: lightweight compressed thumbnail
    return await optimizeImage(file, 400, 0.5);
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function TemplateStarter({ onSelect, onSkip, isChangeMode = false, instituteCode = '' }) {

    const [tab, setTab] = useState('zip'); // 'zip' | 'gallery' | 'paste'
    const [selected, setSelected] = useState(null);
    const [pastedHtml, setPastedHtml] = useState('');
    const [pasteError, setPasteError] = useState('');

    // ── ZIP / Folder Upload State ──
    const [zipLoading, setZipLoading] = useState(false);
    const [zipError, setZipError] = useState('');
    const [zipData, setZipData] = useState(null); // { fileName, html, pages, cssCount, imgCount }
    const [isDragging, setIsDragging] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);



    // ── Recursive Directory Reader for Dropped Folders ──
    const readEntryTree = async (entry, path = '') => {
        const fullPath = path ? `${path}/${entry.name}` : entry.name;
        if (entry.isFile) {
            return new Promise((resolve) => {
                entry.file((file) => {
                    resolve([{ file, path: fullPath }]);
                }, () => resolve([]));
            });
        } else if (entry.isDirectory) {
            const dirReader = entry.createReader();
            const entries = [];
            const readEntries = () => new Promise((resolve) => {
                dirReader.readEntries((results) => {
                    if (results && results.length > 0) {
                        entries.push(...results);
                        readEntries().then(resolve);
                    } else {
                        resolve(entries);
                    }
                }, () => resolve(entries));
            });
            const subEntries = await readEntries();
            const nested = await Promise.all(subEntries.map(e => readEntryTree(e, fullPath)));
            return nested.flat();
        }
        return [];
    };

    // ── Process Uncompressed Files (from Folder drop or Folder picker) ──
    const processRawFiles = async (filesList, folderName = 'Template Folder') => {
        if (!filesList || filesList.length === 0) return;
        setZipLoading(true);
        setZipError('');
        setZipData(null);

        try {
            // 1. Read all HTML files
            const htmlFiles = filesList.filter(f => f.path.toLowerCase().endsWith('.html'));
            if (htmlFiles.length === 0) {
                throw new Error('No .html file found inside the folder.');
            }

            const htmlFilesWithContent = await Promise.all(
                htmlFiles.map(async item => ({
                    path: item.path,
                    content: await item.file.text()
                }))
            );

            // 2. Extract all CSS files
            let combinedCss = '';
            let cssCount = 0;
            const cssFiles = filesList.filter(f => f.path.toLowerCase().endsWith('.css'));
            for (const cf of cssFiles) {
                cssCount++;
                const cssText = await cf.file.text();
                combinedCss += `\n/* ── Inlined from ${cf.path} ── */\n` + cssText;
            }

            // 3. Extract and upload font files (.woff, .woff2, .ttf, .otf, .eot)
            const fontMap = {};
            const fontFiles = filesList.filter(f => {
                const lower = f.path.toLowerCase();
                return lower.endsWith('.woff') || lower.endsWith('.woff2') || lower.endsWith('.ttf') || lower.endsWith('.otf') || lower.endsWith('.eot');
            });

            for (const font of fontFiles) {
                const fontUrl = await uploadTemplateImage(font.file);
                if (fontUrl) {
                    fontMap[font.path] = fontUrl;
                    const fname = font.path.split('/').pop();
                    if (fname) fontMap[fname] = fontUrl;
                }
            }

            // 4. Extract and convert images with server upload
            const imageMap = {};
            const imgFiles = filesList.filter(f => {
                const lower = f.path.toLowerCase();
                return lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.svg') || lower.endsWith('.webp') || lower.endsWith('.gif');
            });

            for (const img of imgFiles) {
                const imgUrl = await uploadTemplateImage(img.file);
                if (imgUrl) {
                    imageMap[img.path] = imgUrl;
                    const fname = img.path.split('/').pop();
                    if (fname) imageMap[fname] = imgUrl;
                }
            }

            // 5. Process assets, FontAwesome & multi-page links
            const result = processTemplateAssetsAndLinks({
                htmlFilesWithContent,
                combinedCss,
                imageMap,
                fontMap,
                instituteCode
            });

            setZipData({
                fileName: folderName,
                html: result.homeHtml,
                pages: result.pages,
                mainHtmlPath: result.pages.find(p => p.slug === 'index')?.path || 'index.html',
                cssCount,
                imgCount: Object.keys(imageMap).length
            });
        } catch (err) {
            console.error('Folder parse error:', err);
            setZipError(err.message || 'Failed to process template folder.');
        } finally {
            setZipLoading(false);
        }
    };

    // ── Process ZIP File ──
    const processZipFile = async (file) => {
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.zip')) {
            setZipError('Please upload a valid .zip file or select a template folder.');
            return;
        }
        setZipLoading(true);
        setZipError('');
        setZipData(null);

        try {
            const JSZip = await loadJSZip();
            const zip = await JSZip.loadAsync(file);

            // 1. Read all HTML files in ZIP
            const htmlFileEntries = [];
            zip.forEach((relativePath, zipEntry) => {
                if (!zipEntry.dir && relativePath.toLowerCase().endsWith('.html')) {
                    htmlFileEntries.push({ path: relativePath, entry: zipEntry });
                }
            });

            if (htmlFileEntries.length === 0) {
                throw new Error('No .html file found inside the ZIP folder.');
            }

            const htmlFilesWithContent = await Promise.all(
                htmlFileEntries.map(async item => ({
                    path: item.path,
                    content: await item.entry.async('text')
                }))
            );

            // 2. Extract and inline all local CSS files
            let combinedCss = '';
            let cssCount = 0;
            const cssPromises = [];
            zip.forEach((relativePath, zipEntry) => {
                if (!zipEntry.dir && relativePath.toLowerCase().endsWith('.css')) {
                    cssCount++;
                    cssPromises.push(zipEntry.async('text').then(cssText => {
                        combinedCss += `\n/* ── Inlined from ${relativePath} ── */\n` + cssText;
                    }));
                }
            });
            await Promise.all(cssPromises);

            // 3. Extract and upload local font files (.woff, .woff2, .ttf, .otf, .eot)
            const fontMap = {};
            const fontPromises = [];
            zip.forEach((relativePath, zipEntry) => {
                if (zipEntry.dir) return;
                const lower = relativePath.toLowerCase();
                let mime = '';
                if (lower.endsWith('.woff2')) mime = 'font/woff2';
                else if (lower.endsWith('.woff')) mime = 'font/woff';
                else if (lower.endsWith('.ttf')) mime = 'font/ttf';
                else if (lower.endsWith('.otf')) mime = 'font/otf';
                else if (lower.endsWith('.eot')) mime = 'application/vnd.ms-fontobject';

                if (mime) {
                    fontPromises.push(
                        zipEntry.async('blob').then(async blob => {
                            const fontFile = new File([blob], relativePath.split('/').pop() || 'font', { type: mime });
                            const fontUrl = await uploadTemplateImage(fontFile);
                            if (fontUrl) {
                                fontMap[relativePath] = fontUrl;
                                const filename = relativePath.split('/').pop();
                                if (filename) fontMap[filename] = fontUrl;
                            }
                        })
                    );
                }
            });
            await Promise.all(fontPromises);


            // 4. Extract and map local images with server upload
            const imageMap = {};
            const imgPromises = [];
            zip.forEach((relativePath, zipEntry) => {
                if (zipEntry.dir) return;
                const lower = relativePath.toLowerCase();
                let mime = '';
                if (lower.endsWith('.png')) mime = 'image/png';
                else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mime = 'image/jpeg';
                else if (lower.endsWith('.svg')) mime = 'image/svg+xml';
                else if (lower.endsWith('.webp')) mime = 'image/webp';
                else if (lower.endsWith('.gif')) mime = 'image/gif';

                if (mime) {
                    imgPromises.push(
                        zipEntry.async('blob').then(async blob => {
                            const imgFile = new File([blob], relativePath.split('/').pop() || 'image', { type: mime });
                            const imgUrl = await uploadTemplateImage(imgFile);
                            if (imgUrl) {
                                imageMap[relativePath] = imgUrl;
                                const filename = relativePath.split('/').pop();
                                if (filename) imageMap[filename] = imgUrl;
                            }
                        })
                    );
                }
            });
            await Promise.all(imgPromises);



            // 5. Process assets, FontAwesome & multi-page links
            const result = processTemplateAssetsAndLinks({
                htmlFilesWithContent,
                combinedCss,
                imageMap,
                fontMap,
                instituteCode
            });

            setZipData({
                fileName: file.name,
                html: result.homeHtml,
                pages: result.pages,
                mainHtmlPath: result.pages.find(p => p.slug === 'index')?.path || 'index.html',
                cssCount,
                imgCount: Object.keys(imageMap).length
            });

        } catch (err) {
            console.error('ZIP parse error:', err);
            setZipError(err.message || 'Failed to extract template from ZIP.');
        } finally {
            setZipLoading(false);
        }
    };


    // ── Handle Universal Drop (Files or Folder) ──
    const handleUniversalDrop = async (e) => {
        e.preventDefault();
        setIsDragging(false);

        // Check if items contain directories
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            const item = e.dataTransfer.items[0];
            const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;

            if (entry && entry.isDirectory) {
                setZipLoading(true);
                const allFiles = await readEntryTree(entry);
                await processRawFiles(allFiles, entry.name);
                return;
            }
        }

        // Fallback to standard files (.zip or .html)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.name.toLowerCase().endsWith('.zip')) {
                processZipFile(file);
            } else if (file.name.toLowerCase().endsWith('.html')) {
                processRawFiles([{ file, path: file.name }], file.name);
            } else {
                setZipError('Please drop a .zip file or an uncompressed template folder.');
            }
        }
    };

    const handleConfirm = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            if (tab === 'zip') {
                if (!zipData?.html) return;
                await onSelect({
                    activePageHtml: prepareHtml(zipData.html),
                    pages: (zipData.pages || []).map(p => ({ ...p, html: prepareHtml(p.html) }))
                });
            } else if (tab === 'gallery') {
                if (!selected) return;
                const tpl = STARTER_TEMPLATES.find(t => t.id === selected);
                if (tpl) await onSelect(prepareHtml(tpl.html));
            } else {
                const html = pastedHtml.trim();
                if (!html) { setPasteError('Please paste some HTML first.'); return; }
                if (html.length < 50) { setPasteError('The HTML seems too short. Paste your full page code.'); return; }
                setPasteError('');
                await onSelect(prepareHtml(html));
            }
        } catch (err) {
            console.error('Template activation error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const canConfirm = !isSubmitting && (tab === 'zip' 
        ? !!zipData?.html 
        : (tab === 'gallery' ? !!selected : pastedHtml.trim().length > 50));


    return (
        <div style={{
            position: 'absolute', inset: 0, zIndex: 50,
            background: '#0f172a',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexShrink: 0,
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <LayoutTemplate size={18} color="#60a5fa" />
                        <h2 style={{ color: '#fff', fontSize: '17px', fontWeight: 800, margin: 0 }}>
                            {isChangeMode ? 'Change Website Template' : 'Choose a Starting Template'}
                        </h2>
                    </div>
                    <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
                        {isChangeMode
                            ? 'Upload a template folder/ZIP or pick a theme — current content will be replaced.'
                            : 'Upload any downloaded template folder or ZIP, or pick a pre-built school theme.'}
                    </p>
                </div>
                <button
                    onClick={onSkip}
                    style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, padding: '6px 10px', borderRadius: '8px' }}
                >
                    <X size={16} /> {isChangeMode ? 'Cancel' : 'Skip — Start Blank'}
                </button>
            </div>

            {/* Tabs */}
            <div style={{ padding: '14px 28px 0', display: 'flex', gap: '6px', flexShrink: 0 }}>
                {[
                    { id: 'zip', label: '📦 Upload ZIP or Folder (Recommended)' },
                    { id: 'gallery', label: '🎨 Prebuilt Gallery' },
                    { id: 'paste', label: '📋 Paste Raw HTML' },
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '8px 18px', borderRadius: '8px 8px 0 0',
                            border: 'none', fontSize: '13px', fontWeight: 600,
                            cursor: 'pointer',
                            background: tab === t.id ? '#1e293b' : 'transparent',
                            color: tab === t.id ? '#e2e8f0' : '#64748b',
                            borderBottom: tab === t.id ? '2px solid #3b82f6' : '2px solid transparent',
                            transition: 'all 0.15s',
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: '#1e293b' }}>
                
                {/* ── TAB 1: ZIP / Folder Upload ── */}
                {tab === 'zip' && (
                    <div style={{ maxWidth: '760px' }}>
                        <div style={{
                            background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                            borderRadius: '10px', padding: '14px 18px', marginBottom: '20px',
                        }}>
                            <p style={{ color: '#93c5fd', fontSize: '13px', fontWeight: 600, margin: '0 0 6px' }}>
                                💡 Download free school templates from:
                            </p>
                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                {[
                                    { name: 'BootstrapMade (Education)', url: 'https://bootstrapmade.com/bootstrap-education-website-templates/' },
                                    { name: 'HTML5 UP', url: 'https://html5up.net' },
                                    { name: 'Free-CSS', url: 'https://www.free-css.com/free-css-templates' },
                                    { name: 'ThemeWagon', url: 'https://themewagon.com/theme_tag/free/' },
                                ].map(site => (
                                    <a key={site.name} href={site.url} target="_blank" rel="noopener noreferrer"
                                        style={{ color: '#60a5fa', fontSize: '12px', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        {site.name} <ChevronRight size={11} />
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Dropzone */}
                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleUniversalDrop}
                            style={{
                                border: `2px dashed ${isDragging ? '#3b82f6' : 'rgba(255,255,255,0.15)'}`,
                                borderRadius: '16px',
                                padding: '44px 24px',
                                textAlign: 'center',
                                background: isDragging ? 'rgba(59,130,246,0.06)' : '#0f172a',
                                transition: 'all 0.2s',
                                position: 'relative'
                            }}
                        >
                            {zipLoading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '40px', height: '40px', border: '3px solid rgba(59,130,246,0.3)',
                                        borderTopColor: '#3b82f6', borderRadius: '50%',
                                        animation: 'spin 1s linear infinite'
                                    }} />
                                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                                    <p style={{ color: '#93c5fd', fontSize: '14px', fontWeight: 600, margin: 0 }}>
                                        Reading files, inlining stylesheets and resolving images...
                                    </p>
                                </div>
                            ) : zipData ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                    <div style={{
                                        width: '48px', height: '48px', borderRadius: '50%', background: '#16a34a22',
                                        color: '#4ade80', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        marginBottom: '4px'
                                    }}>✓</div>
                                    <h3 style={{ color: '#f8fafc', fontSize: '16px', fontWeight: 700, margin: 0 }}>
                                        {zipData.fileName}
                                    </h3>
                                    <div style={{ display: 'flex', gap: '14px', color: '#94a3b8', fontSize: '12px', marginTop: '6px' }}>
                                        <span>📄 {zipData.mainHtmlPath}</span>
                                        <span>🎨 {zipData.cssCount} CSS files merged</span>
                                        <span>🖼️ {zipData.imgCount} images embedded</span>
                                    </div>
                                    <p style={{ color: '#38bdf8', fontSize: '13px', fontWeight: 600, marginTop: '8px' }}>
                                        Ready! Click "Start Editing →" below to open in visual builder.
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ fontSize: '44px', marginBottom: '12px' }}>📁</div>
                                    <h3 style={{ color: '#f8fafc', fontSize: '16px', fontWeight: 700, margin: '0 0 18px' }}>
                                        Drag & Drop your Template Folder or .ZIP here
                                    </h3>
                                    
                                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                        {/* Select Folder Button */}
                                        <label style={{
                                            background: '#2563eb', color: '#fff', padding: '9px 20px',
                                            borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                                            display: 'inline-flex', alignItems: 'center', gap: '6px'
                                        }}>
                                            📁 Select Folder
                                            <input
                                                type="file"
                                                webkitdirectory=""
                                                directory=""
                                                multiple
                                                style={{ display: 'none' }}
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files.length > 0) {
                                                        const rawFiles = Array.from(e.target.files).map(file => ({
                                                            file,
                                                            path: file.webkitRelativePath || file.name
                                                        }));
                                                        const folderName = rawFiles[0]?.path.split('/')[0] || 'Template Folder';
                                                        processRawFiles(rawFiles, folderName);
                                                    }
                                                }}
                                            />
                                        </label>

                                        {/* Select ZIP Button */}
                                        <label style={{
                                            background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)',
                                            color: '#e2e8f0', padding: '9px 20px', borderRadius: '8px',
                                            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                                            display: 'inline-flex', alignItems: 'center', gap: '6px'
                                        }}>
                                            📦 Select .ZIP File
                                            <input
                                                type="file"
                                                accept=".zip"
                                                style={{ display: 'none' }}
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        processZipFile(e.target.files[0]);
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>

                        {zipError && (
                            <div style={{ background: '#ef44441a', border: '1px solid #ef444444', borderRadius: '8px', padding: '12px 16px', marginTop: '14px', color: '#f87171', fontSize: '13px' }}>
                                ⚠️ {zipError}
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB 2: Gallery ── */}
                {tab === 'gallery' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', maxWidth: '1100px' }}>
                        {STARTER_TEMPLATES.map(tpl => (
                            <div
                                key={tpl.id}
                                onClick={() => setSelected(tpl.id)}
                                style={cardStyle(selected === tpl.id, tpl.accent)}
                            >
                                <div style={{
                                    height: '140px', background: tpl.bg,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    position: 'relative', overflow: 'hidden',
                                }}>
                                    <div style={{ position: 'absolute', inset: 0, padding: '12px' }}>
                                        <div style={{ background: 'rgba(255,255,255,0.15)', height: '8px', borderRadius: '4px', width: '60%', marginBottom: '8px' }} />
                                        <div style={{ background: 'rgba(255,255,255,0.08)', height: '5px', borderRadius: '3px', width: '80%', marginBottom: '5px' }} />
                                        <div style={{ background: 'rgba(255,255,255,0.08)', height: '5px', borderRadius: '3px', width: '70%', marginBottom: '12px' }} />
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <div style={{ background: 'rgba(255,255,255,0.25)', height: '20px', borderRadius: '4px', width: '80px' }} />
                                            <div style={{ background: 'rgba(255,255,255,0.1)', height: '20px', borderRadius: '4px', width: '70px' }} />
                                        </div>
                                    </div>
                                    {selected === tpl.id && (
                                        <div style={{
                                            position: 'absolute', inset: 0,
                                            background: `${tpl.accent}40`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <div style={{
                                                background: tpl.accent, borderRadius: '50%', width: '32px', height: '32px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                                                fontWeight: 900, fontSize: '16px',
                                            }}>✓</div>
                                        </div>
                                    )}
                                </div>
                                <div style={{ padding: '14px 16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: tpl.accent, flexShrink: 0 }} />
                                        <span style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 700 }}>{tpl.name}</span>
                                    </div>
                                    <p style={{ color: '#64748b', fontSize: '12px', lineHeight: '1.6', margin: 0 }}>{tpl.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── TAB 3: Paste HTML ── */}
                {tab === 'paste' && (
                    <div style={{ maxWidth: '720px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px 18px', marginBottom: '18px' }}>
                            <p style={{ color: '#94a3b8', fontSize: '12px', lineHeight: '1.7', margin: 0 }}>
                                <strong style={{ color: '#e2e8f0' }}>How to use:</strong> Open <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: '3px' }}>index.html</code> in a text editor → select all → paste below. Contact forms will be auto-wired to IMS.
                            </p>
                        </div>

                        <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Paste full HTML here
                        </label>
                        <textarea
                            value={pastedHtml}
                            onChange={e => { setPastedHtml(e.target.value); setPasteError(''); }}
                            placeholder={`<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <!-- Paste your full template HTML here -->\n</head>\n<body>\n  <!-- ... -->\n</body>\n</html>`}
                            style={{
                                width: '100%', height: '320px',
                                background: '#0f172a', border: `1px solid ${pasteError ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                                borderRadius: '10px', padding: '16px',
                                color: '#e2e8f0', fontSize: '12px', fontFamily: 'Menlo, Monaco, Consolas, monospace',
                                lineHeight: '1.6', outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                            }}
                        />
                        {pasteError && (
                            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px', fontWeight: 500 }}>{pasteError}</p>
                        )}
                        {pastedHtml.trim().length > 50 && (
                            <p style={{ color: '#4ade80', fontSize: '12px', marginTop: '8px', fontWeight: 600 }}>
                                ✓ {pastedHtml.length.toLocaleString()} characters detected — ready to load.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Footer CTA */}
            <div style={{
                padding: '16px 28px', borderTop: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#0f172a', flexShrink: 0,
            }}>
                <p style={{ color: '#475569', fontSize: '12px', margin: 0 }}>
                    {tab === 'zip'
                        ? (zipData ? `✓ "${zipData.fileName}" processed and ready` : 'Upload a folder or .zip template to continue')
                        : (tab === 'gallery'
                            ? (selected ? `✓ "${STARTER_TEMPLATES.find(t => t.id === selected)?.name}" selected` : 'Select a template to continue')
                            : 'You can edit every element after loading')}
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={onSkip}
                        disabled={isSubmitting}
                        style={{
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#94a3b8',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            opacity: isSubmitting ? 0.5 : 1
                        }}
                    >
                        {isChangeMode ? 'Cancel' : 'Start Blank'}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!canConfirm || isSubmitting}
                        style={{
                            background: canConfirm && !isSubmitting ? '#2563eb' : '#1e293b',
                            color: canConfirm && !isSubmitting ? '#fff' : '#64748b',
                            border: 'none',
                            padding: '10px 24px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: canConfirm && !isSubmitting ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.15s',
                            opacity: isSubmitting ? 0.8 : 1,
                        }}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                                Loading Template...
                            </>
                        ) : (
                            <>
                                Start Editing <ArrowRight size={14} />
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}


