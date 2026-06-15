'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '@/contexts/ToastContext';
import {
    Save, Globe, Undo2, Redo2, Monitor, Tablet, Smartphone,
    Layers, Puzzle, Paintbrush, Settings2, Plus, Trash2, FileText,
    ChevronDown, Eye, Code2, X
} from 'lucide-react';

// ─── School Block Templates ────────────────────────────────────────────────
const SCHOOL_BLOCKS = [
    {
        id: 'navbar-classic',
        label: 'Navbar — Classic',
        category: 'Navigation',
        content: `<nav style="display:flex;align-items:center;justify-content:space-between;padding:16px 40px;background:#ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.1);font-family:Inter,sans-serif;">
  <div style="font-size:22px;font-weight:800;color:#1e293b;letter-spacing:-0.5px;">SchoolName</div>
  <div style="display:flex;gap:32px;align-items:center;">
    <a href="#" style="color:#475569;font-size:14px;font-weight:500;text-decoration:none;">About</a>
    <a href="#" style="color:#475569;font-size:14px;font-weight:500;text-decoration:none;">Admissions</a>
    <a href="#" style="color:#475569;font-size:14px;font-weight:500;text-decoration:none;">Programs</a>
    <a href="#" style="color:#475569;font-size:14px;font-weight:500;text-decoration:none;">Contact</a>
  </div>
  <a href="#" style="background:#2563eb;color:#fff;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">Apply Now</a>
</nav>`
    },
    {
        id: 'navbar-centered',
        label: 'Navbar — Centered',
        category: 'Navigation',
        content: `<nav style="padding:20px 40px;background:#ffffff;border-bottom:1px solid #e2e8f0;font-family:Inter,sans-serif;text-align:center;">
  <div style="font-size:24px;font-weight:800;color:#1e293b;margin-bottom:12px;">SchoolName</div>
  <div style="display:flex;gap:32px;align-items:center;justify-content:center;">
    <a href="#" style="color:#475569;font-size:14px;font-weight:500;text-decoration:none;">Home</a>
    <a href="#" style="color:#475569;font-size:14px;font-weight:500;text-decoration:none;">About</a>
    <a href="#" style="color:#475569;font-size:14px;font-weight:500;text-decoration:none;">Admissions</a>
    <a href="#" style="color:#475569;font-size:14px;font-weight:500;text-decoration:none;">Programs</a>
    <a href="#" style="color:#475569;font-size:14px;font-weight:500;text-decoration:none;">Contact</a>
    <a href="#" style="background:#2563eb;color:#fff;padding:8px 20px;border-radius:6px;font-size:13px;font-weight:600;text-decoration:none;">Apply Now</a>
  </div>
</nav>`
    },
    {
        id: 'navbar-transparent',
        label: 'Navbar — Transparent',
        category: 'Navigation',
        content: `<nav style="display:flex;align-items:center;justify-content:space-between;padding:20px 48px;background:rgba(255,255,255,0.1);backdrop-filter:blur(12px);font-family:Inter,sans-serif;position:relative;">
  <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">SchoolName</div>
  <div style="display:flex;gap:32px;align-items:center;">
    <a href="#" style="color:rgba(255,255,255,0.85);font-size:14px;font-weight:500;text-decoration:none;">About</a>
    <a href="#" style="color:rgba(255,255,255,0.85);font-size:14px;font-weight:500;text-decoration:none;">Programs</a>
    <a href="#" style="color:rgba(255,255,255,0.85);font-size:14px;font-weight:500;text-decoration:none;">Contact</a>
  </div>
  <a href="#" style="border:2px solid #fff;color:#fff;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">Apply Now</a>
</nav>`
    },
    {
        id: 'hero-centered',
        label: 'Hero — Centered',
        category: 'Hero',
        content: `<section style="background:linear-gradient(135deg,#1e293b 0%,#1e40af 100%);padding:120px 40px;text-align:center;font-family:Inter,sans-serif;">
  <p style="color:#93c5fd;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px;">Welcome to</p>
  <h1 style="color:#ffffff;font-size:56px;font-weight:800;line-height:1.1;margin:0 0 20px;letter-spacing:-1px;">Excellence in Education</h1>
  <p style="color:#cbd5e1;font-size:18px;max-width:600px;margin:0 auto 40px;line-height:1.7;">Empowering the next generation of leaders through world-class education, hands-on training, and a vibrant campus culture.</p>
  <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;">
    <a href="#" style="background:#2563eb;color:#fff;padding:14px 32px;border-radius:10px;font-size:16px;font-weight:600;text-decoration:none;">Explore Programs</a>
    <a href="#" style="border:2px solid rgba(255,255,255,0.3);color:#fff;padding:14px 32px;border-radius:10px;font-size:16px;font-weight:600;text-decoration:none;">Learn More</a>
  </div>
</section>`
    },
    {
        id: 'hero-split',
        label: 'Hero — Split',
        category: 'Hero',
        content: `<section style="display:flex;align-items:center;gap:60px;padding:80px 60px;background:#f8fafc;font-family:Inter,sans-serif;min-height:520px;">
  <div style="flex:1;">
    <p style="color:#2563eb;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;">Top Ranked Institution</p>
    <h1 style="color:#0f172a;font-size:48px;font-weight:800;line-height:1.1;margin:0 0 20px;letter-spacing:-1px;">Shape Your Future With Us</h1>
    <p style="color:#64748b;font-size:17px;line-height:1.7;margin:0 0 36px;">Join thousands of students who have transformed their careers through our industry-aligned programs.</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap;">
      <a href="#" style="background:#2563eb;color:#fff;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:600;text-decoration:none;">Get Started</a>
      <a href="#" style="color:#2563eb;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:600;text-decoration:none;border:2px solid #2563eb;">View Courses</a>
    </div>
  </div>
  <div style="flex:1;background:linear-gradient(135deg,#1e40af,#7c3aed);border-radius:20px;height:380px;display:flex;align-items:center;justify-content:center;">
    <span style="color:rgba(255,255,255,0.4);font-size:14px;">Hero Image</span>
  </div>
</section>`
    },
    {
        id: 'hero-gradient',
        label: 'Hero — Gradient Bold',
        category: 'Hero',
        content: `<section style="background:linear-gradient(120deg,#7c3aed 0%,#2563eb 50%,#0891b2 100%);padding:100px 40px;text-align:center;font-family:Inter,sans-serif;position:relative;overflow:hidden;">
  <div style="position:absolute;inset:0;background:url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><circle cx=\"20\" cy=\"20\" r=\"40\" fill=\"rgba(255,255,255,0.03)\"/><circle cx=\"80\" cy=\"80\" r=\"60\" fill=\"rgba(255,255,255,0.03)\"/></svg>');"></div>
  <p style="color:rgba(255,255,255,0.7);font-size:13px;font-weight:600;letter-spacing:3px;text-transform:uppercase;margin:0 0 20px;position:relative;">Admissions Open 2024–25</p>
  <h1 style="color:#ffffff;font-size:60px;font-weight:900;line-height:1.05;margin:0 0 24px;letter-spacing:-2px;position:relative;">Build the Future.<br>Start Here.</h1>
  <p style="color:rgba(255,255,255,0.8);font-size:18px;max-width:560px;margin:0 auto 44px;line-height:1.7;position:relative;">Award-winning faculty. State-of-the-art facilities. 95% placement rate.</p>
  <a href="#" style="background:#ffffff;color:#7c3aed;padding:16px 40px;border-radius:50px;font-size:16px;font-weight:700;text-decoration:none;position:relative;display:inline-block;">Apply for Admission →</a>
</section>`
    },
    {
        id: 'features-grid',
        label: 'Features Grid',
        category: 'Sections',
        content: `<section style="padding:80px 40px;background:#ffffff;font-family:Inter,sans-serif;">
  <div style="text-align:center;margin-bottom:56px;">
    <h2 style="color:#0f172a;font-size:36px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;">Why Choose Us?</h2>
    <p style="color:#64748b;font-size:16px;max-width:520px;margin:0 auto;line-height:1.7;">Experience excellence in education with modern facilities and expert faculty.</p>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:32px;max-width:1100px;margin:0 auto;">
    <div style="padding:36px 28px;background:#f8fafc;border-radius:16px;border:1px solid #e2e8f0;">
      <div style="width:52px;height:52px;background:#dbeafe;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;font-size:24px;">🎓</div>
      <h3 style="color:#0f172a;font-size:18px;font-weight:700;margin:0 0 10px;">Expert Faculty</h3>
      <p style="color:#64748b;font-size:14px;line-height:1.7;margin:0;">Learn from industry professionals with decades of real-world experience.</p>
    </div>
    <div style="padding:36px 28px;background:#f8fafc;border-radius:16px;border:1px solid #e2e8f0;">
      <div style="width:52px;height:52px;background:#dcfce7;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;font-size:24px;">🏛️</div>
      <h3 style="color:#0f172a;font-size:18px;font-weight:700;margin:0 0 10px;">Modern Campus</h3>
      <p style="color:#64748b;font-size:14px;line-height:1.7;margin:0;">State-of-the-art labs, classrooms and sports facilities for holistic growth.</p>
    </div>
    <div style="padding:36px 28px;background:#f8fafc;border-radius:16px;border:1px solid #e2e8f0;">
      <div style="width:52px;height:52px;background:#fef9c3;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;font-size:24px;">🌍</div>
      <h3 style="color:#0f172a;font-size:18px;font-weight:700;margin:0 0 10px;">Global Recognition</h3>
      <p style="color:#64748b;font-size:14px;line-height:1.7;margin:0;">Certificates recognized by top universities and employers worldwide.</p>
    </div>
  </div>
</section>`
    },
    {
        id: 'placement-stats',
        label: 'Placement Stats',
        category: 'Sections',
        content: `<section style="padding:80px 40px;background:linear-gradient(135deg,#0f172a,#1e3a8a);font-family:Inter,sans-serif;">
  <div style="text-align:center;margin-bottom:56px;">
    <h2 style="color:#ffffff;font-size:36px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;">Our Placement Success</h2>
    <p style="color:#93c5fd;font-size:16px;margin:0;">Numbers that speak for themselves</p>
  </div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:24px;max-width:1000px;margin:0 auto;">
    <div style="text-align:center;padding:32px 20px;background:rgba(255,255,255,0.05);border-radius:16px;border:1px solid rgba(255,255,255,0.1);">
      <div style="font-size:42px;font-weight:900;color:#60a5fa;margin-bottom:8px;">95%</div>
      <div style="color:#cbd5e1;font-size:14px;font-weight:500;">Placement Rate</div>
    </div>
    <div style="text-align:center;padding:32px 20px;background:rgba(255,255,255,0.05);border-radius:16px;border:1px solid rgba(255,255,255,0.1);">
      <div style="font-size:42px;font-weight:900;color:#34d399;margin-bottom:8px;">200+</div>
      <div style="color:#cbd5e1;font-size:14px;font-weight:500;">Hiring Partners</div>
    </div>
    <div style="text-align:center;padding:32px 20px;background:rgba(255,255,255,0.05);border-radius:16px;border:1px solid rgba(255,255,255,0.1);">
      <div style="font-size:42px;font-weight:900;color:#f472b6;margin-bottom:8px;">4.5L</div>
      <div style="color:#cbd5e1;font-size:14px;font-weight:500;">Avg. Package</div>
    </div>
    <div style="text-align:center;padding:32px 20px;background:rgba(255,255,255,0.05);border-radius:16px;border:1px solid rgba(255,255,255,0.1);">
      <div style="font-size:42px;font-weight:900;color:#fbbf24;margin-bottom:8px;">50+</div>
      <div style="color:#cbd5e1;font-size:14px;font-weight:500;">Certifications</div>
    </div>
  </div>
</section>`
    },
    {
        id: 'faculty-cards',
        label: 'Faculty Cards',
        category: 'Sections',
        content: `<section style="padding:80px 40px;background:#f8fafc;font-family:Inter,sans-serif;">
  <div style="text-align:center;margin-bottom:56px;">
    <h2 style="color:#0f172a;font-size:36px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;">Our Expert Faculty</h2>
    <p style="color:#64748b;font-size:16px;max-width:500px;margin:0 auto;">Meet the dedicated professionals shaping the future of our students.</p>
  </div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:24px;max-width:1100px;margin:0 auto;">
    <div style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;text-align:center;padding-bottom:28px;">
      <div style="height:160px;background:linear-gradient(135deg,#dbeafe,#e0e7ff);display:flex;align-items:center;justify-content:center;font-size:48px;">👩‍🏫</div>
      <div style="padding:20px 16px 0;">
        <h3 style="color:#0f172a;font-size:16px;font-weight:700;margin:0 0 4px;">Dr. Sarah Wilson</h3>
        <p style="color:#2563eb;font-size:13px;font-weight:600;margin:0 0 4px;">Principal</p>
        <p style="color:#94a3b8;font-size:12px;margin:0;">Administration</p>
      </div>
    </div>
    <div style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;text-align:center;padding-bottom:28px;">
      <div style="height:160px;background:linear-gradient(135deg,#dcfce7,#d1fae5);display:flex;align-items:center;justify-content:center;font-size:48px;">👨‍🏫</div>
      <div style="padding:20px 16px 0;">
        <h3 style="color:#0f172a;font-size:16px;font-weight:700;margin:0 0 4px;">Mr. James Kumar</h3>
        <p style="color:#16a34a;font-size:13px;font-weight:600;margin:0 0 4px;">Sr. Teacher</p>
        <p style="color:#94a3b8;font-size:12px;margin:0;">Mathematics</p>
      </div>
    </div>
    <div style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;text-align:center;padding-bottom:28px;">
      <div style="height:160px;background:linear-gradient(135deg,#fef9c3,#fef3c7);display:flex;align-items:center;justify-content:center;font-size:48px;">👩‍🔬</div>
      <div style="padding:20px 16px 0;">
        <h3 style="color:#0f172a;font-size:16px;font-weight:700;margin:0 0 4px;">Ms. Priya Sharma</h3>
        <p style="color:#d97706;font-size:13px;font-weight:600;margin:0 0 4px;">Teacher</p>
        <p style="color:#94a3b8;font-size:12px;margin:0;">Science</p>
      </div>
    </div>
    <div style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;text-align:center;padding-bottom:28px;">
      <div style="height:160px;background:linear-gradient(135deg,#fce7f3,#fbcfe8);display:flex;align-items:center;justify-content:center;font-size:48px;">👨‍💻</div>
      <div style="padding:20px 16px 0;">
        <h3 style="color:#0f172a;font-size:16px;font-weight:700;margin:0 0 4px;">Mr. Rahul Verma</h3>
        <p style="color:#db2777;font-size:13px;font-weight:600;margin:0 0 4px;">HOD</p>
        <p style="color:#94a3b8;font-size:12px;margin:0;">Computer Science</p>
      </div>
    </div>
  </div>
</section>`
    },
    {
        id: 'testimonials',
        label: 'Testimonials',
        category: 'Sections',
        content: `<section style="padding:80px 40px;background:#ffffff;font-family:Inter,sans-serif;">
  <div style="text-align:center;margin-bottom:56px;">
    <h2 style="color:#0f172a;font-size:36px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;">What Students Say</h2>
    <p style="color:#64748b;font-size:16px;">Hear from our alumni and students about their journey.</p>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:1100px;margin:0 auto;">
    <div style="padding:32px;background:#f8fafc;border-radius:16px;border:1px solid #e2e8f0;">
      <div style="color:#fbbf24;font-size:20px;margin-bottom:16px;">★★★★★</div>
      <p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 24px;">"The best learning experience I've ever had. The faculty is incredible and the campus life is amazing!"</p>
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:40px;height:40px;background:linear-gradient(135deg,#2563eb,#7c3aed);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;">A</div>
        <div><div style="color:#0f172a;font-weight:700;font-size:14px;">Alex Johnson</div><div style="color:#94a3b8;font-size:12px;">Graduate, 2023</div></div>
      </div>
    </div>
    <div style="padding:32px;background:#f8fafc;border-radius:16px;border:1px solid #e2e8f0;">
      <div style="color:#fbbf24;font-size:20px;margin-bottom:16px;">★★★★★</div>
      <p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 24px;">"State-of-the-art facilities and a very supportive environment. Got placed in a top company!"</p>
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:40px;height:40px;background:linear-gradient(135deg,#16a34a,#0891b2);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;">M</div>
        <div><div style="color:#0f172a;font-weight:700;font-size:14px;">Maria Garcia</div><div style="color:#94a3b8;font-size:12px;">Student, CSE</div></div>
      </div>
    </div>
    <div style="padding:32px;background:#f8fafc;border-radius:16px;border:1px solid #e2e8f0;">
      <div style="color:#fbbf24;font-size:20px;margin-bottom:16px;">★★★★★</div>
      <p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 24px;">"The practical approach to learning here is unmatched. I feel job-ready after every semester."</p>
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:40px;height:40px;background:linear-gradient(135deg,#d97706,#dc2626);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;">R</div>
        <div><div style="color:#0f172a;font-weight:700;font-size:14px;">Rahul Patel</div><div style="color:#94a3b8;font-size:12px;">Alumni, Mech Eng</div></div>
      </div>
    </div>
  </div>
</section>`
    },
    {
        id: 'gallery',
        label: 'Gallery',
        category: 'Sections',
        content: `<section style="padding:80px 40px;background:#0f172a;font-family:Inter,sans-serif;">
  <div style="text-align:center;margin-bottom:56px;">
    <h2 style="color:#ffffff;font-size:36px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;">Life at Campus</h2>
    <p style="color:#94a3b8;font-size:16px;">A glimpse into our vibrant campus and student activities.</p>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;max-width:1100px;margin:0 auto;">
    <div style="background:linear-gradient(135deg,#1e40af,#7c3aed);border-radius:12px;height:200px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.5);font-size:13px;">Main Campus</div>
    <div style="background:linear-gradient(135deg,#065f46,#0891b2);border-radius:12px;height:200px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.5);font-size:13px;">Science Lab</div>
    <div style="background:linear-gradient(135deg,#7c2d12,#b45309);border-radius:12px;height:200px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.5);font-size:13px;">Library</div>
    <div style="background:linear-gradient(135deg,#4c1d95,#be185d);border-radius:12px;height:200px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.5);font-size:13px;">Sports Ground</div>
    <div style="background:linear-gradient(135deg,#134e4a,#1e3a8a);border-radius:12px;height:200px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.5);font-size:13px;">Auditorium</div>
    <div style="background:linear-gradient(135deg,#7f1d1d,#78350f);border-radius:12px;height:200px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.5);font-size:13px;">Cafeteria</div>
  </div>
</section>`
    },
    {
        id: 'contact-form',
        label: 'Contact Form',
        category: 'Sections',
        content: `<section style="padding:80px 40px;background:#f8fafc;font-family:Inter,sans-serif;">
  <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:start;">
    <div>
      <h2 style="color:#0f172a;font-size:36px;font-weight:800;margin:0 0 16px;letter-spacing:-0.5px;">Get in Touch</h2>
      <p style="color:#64748b;font-size:16px;line-height:1.7;margin:0 0 40px;">Have questions about admissions, programs, or campus life? We're here to help.</p>
      <div style="display:flex;flex-direction:column;gap:20px;">
        <div style="display:flex;align-items:center;gap:16px;">
          <div style="width:44px;height:44px;background:#dbeafe;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">📍</div>
          <div><div style="color:#0f172a;font-weight:600;font-size:14px;margin-bottom:2px;">Address</div><div style="color:#64748b;font-size:14px;">123 Education Square, Knowledge City</div></div>
        </div>
        <div style="display:flex;align-items:center;gap:16px;">
          <div style="width:44px;height:44px;background:#dcfce7;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">📞</div>
          <div><div style="color:#0f172a;font-weight:600;font-size:14px;margin-bottom:2px;">Phone</div><div style="color:#64748b;font-size:14px;">+91 98765 43210</div></div>
        </div>
        <div style="display:flex;align-items:center;gap:16px;">
          <div style="width:44px;height:44px;background:#fef9c3;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">✉️</div>
          <div><div style="color:#0f172a;font-weight:600;font-size:14px;margin-bottom:2px;">Email</div><div style="color:#64748b;font-size:14px;">info@school.edu</div></div>
        </div>
      </div>
    </div>
    <div style="background:#ffffff;border-radius:16px;padding:36px;border:1px solid #e2e8f0;">
      <div style="display:flex;flex-direction:column;gap:16px;">
        <input placeholder="Your Name" style="width:100%;padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;" />
        <input placeholder="Email Address" style="width:100%;padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;" />
        <input placeholder="Phone Number" style="width:100%;padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;" />
        <textarea placeholder="Your message..." rows="4" style="width:100%;padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;outline:none;resize:none;box-sizing:border-box;font-family:Inter,sans-serif;"></textarea>
        <button style="background:#2563eb;color:#fff;padding:14px;border-radius:8px;font-size:15px;font-weight:600;border:none;cursor:pointer;">Send Message</button>
      </div>
    </div>
  </div>
</section>`
    },
    {
        id: 'footer',
        label: 'Footer',
        category: 'Footer',
        content: `<footer style="background:#0f172a;padding:64px 40px 32px;font-family:Inter,sans-serif;">
  <div style="max-width:1100px;margin:0 auto;">
    <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px;margin-bottom:48px;">
      <div>
        <div style="font-size:22px;font-weight:800;color:#ffffff;margin-bottom:16px;">SchoolName</div>
        <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 24px;max-width:260px;">Empowering the next generation through quality education and hands-on training.</p>
        <div style="display:flex;gap:12px;">
          <a href="#" style="width:36px;height:36px;background:rgba(255,255,255,0.1);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#94a3b8;text-decoration:none;font-size:16px;">f</a>
          <a href="#" style="width:36px;height:36px;background:rgba(255,255,255,0.1);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#94a3b8;text-decoration:none;font-size:16px;">in</a>
          <a href="#" style="width:36px;height:36px;background:rgba(255,255,255,0.1);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#94a3b8;text-decoration:none;font-size:16px;">ig</a>
        </div>
      </div>
      <div>
        <div style="color:#ffffff;font-weight:700;font-size:14px;margin-bottom:16px;letter-spacing:0.5px;">Quick Links</div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <a href="#" style="color:#94a3b8;font-size:14px;text-decoration:none;">Home</a>
          <a href="#" style="color:#94a3b8;font-size:14px;text-decoration:none;">About Us</a>
          <a href="#" style="color:#94a3b8;font-size:14px;text-decoration:none;">Admissions</a>
          <a href="#" style="color:#94a3b8;font-size:14px;text-decoration:none;">Courses</a>
        </div>
      </div>
      <div>
        <div style="color:#ffffff;font-weight:700;font-size:14px;margin-bottom:16px;letter-spacing:0.5px;">Programs</div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <a href="#" style="color:#94a3b8;font-size:14px;text-decoration:none;">Engineering</a>
          <a href="#" style="color:#94a3b8;font-size:14px;text-decoration:none;">Management</a>
          <a href="#" style="color:#94a3b8;font-size:14px;text-decoration:none;">Arts & Science</a>
          <a href="#" style="color:#94a3b8;font-size:14px;text-decoration:none;">Vocational</a>
        </div>
      </div>
      <div>
        <div style="color:#ffffff;font-weight:700;font-size:14px;margin-bottom:16px;letter-spacing:0.5px;">Contact</div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <span style="color:#94a3b8;font-size:14px;">+91 98765 43210</span>
          <span style="color:#94a3b8;font-size:14px;">info@school.edu</span>
          <span style="color:#94a3b8;font-size:14px;">123 Education Sq.</span>
        </div>
      </div>
    </div>
    <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:24px;display:flex;align-items:center;justify-content:space-between;">
      <span style="color:#64748b;font-size:13px;">© 2024 SchoolName. All rights reserved.</span>
      <span style="color:#64748b;font-size:13px;">Powered by IMS</span>
    </div>
  </div>
</footer>`
    },
    {
        id: 'notices-ticker',
        label: 'Notices Ticker',
        category: 'Sections',
        content: `<div style="background:#1e40af;padding:12px 40px;display:flex;align-items:center;gap:20px;font-family:Inter,sans-serif;overflow:hidden;">
  <span style="background:#ffffff;color:#1e40af;font-size:11px;font-weight:800;padding:4px 10px;border-radius:4px;white-space:nowrap;letter-spacing:0.5px;">NOTICE</span>
  <div style="color:#bfdbfe;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
    📢 Admissions open for 2024–25 session &nbsp;|&nbsp; 🎓 Annual Day celebration on 15th March &nbsp;|&nbsp; 📋 Fee payment deadline extended to 31st March
  </div>
</div>`
    },
    {
        id: 'cta-banner',
        label: 'CTA Banner',
        category: 'Sections',
        content: `<section style="background:linear-gradient(135deg,#2563eb,#7c3aed);padding:60px 40px;text-align:center;font-family:Inter,sans-serif;">
  <h2 style="color:#ffffff;font-size:36px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;">Ready to Begin Your Journey?</h2>
  <p style="color:rgba(255,255,255,0.8);font-size:16px;max-width:520px;margin:0 auto 32px;line-height:1.7;">Join thousands of students who chose excellence. Apply today and take the first step.</p>
  <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;">
    <a href="#" style="background:#ffffff;color:#2563eb;padding:14px 32px;border-radius:10px;font-size:16px;font-weight:700;text-decoration:none;">Apply Now</a>
    <a href="#" style="border:2px solid rgba(255,255,255,0.5);color:#fff;padding:14px 32px;border-radius:10px;font-size:16px;font-weight:600;text-decoration:none;">Download Brochure</a>
  </div>
</section>`
    },
    {
        id: 'blank-section',
        label: 'Blank Section',
        category: 'Layout',
        content: `<section style="padding:80px 40px;background:#ffffff;min-height:200px;font-family:Inter,sans-serif;"></section>`
    },
    {
        id: 'two-column',
        label: 'Two Column Row',
        category: 'Layout',
        content: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;padding:60px 40px;background:#ffffff;font-family:Inter,sans-serif;">
  <div style="background:#f1f5f9;border-radius:12px;padding:40px;min-height:200px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:14px;">Column 1 — click to edit</div>
  <div style="background:#f1f5f9;border-radius:12px;padding:40px;min-height:200px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:14px;">Column 2 — click to edit</div>
</div>`
    },
    {
        id: 'text-block',
        label: 'Text Block',
        category: 'Layout',
        content: `<div style="padding:60px 40px;background:#ffffff;font-family:Inter,sans-serif;max-width:800px;margin:0 auto;">
  <h2 style="color:#0f172a;font-size:32px;font-weight:800;margin:0 0 16px;letter-spacing:-0.5px;">Section Heading</h2>
  <p style="color:#475569;font-size:16px;line-height:1.8;margin:0 0 16px;">This is a paragraph of text. Click to edit and add your own content. You can change the font, size, color and more using the styles panel on the right.</p>
  <p style="color:#475569;font-size:16px;line-height:1.8;margin:0;">Add as many text blocks as you need to tell your story clearly and compellingly.</p>
</div>`
    }
];

// ─── Custom GrapesJS Panel UI ─────────────────────────────────────────────
const GRAPES_STYLES = `
  .gjs-editor { font-family: Inter, sans-serif; }
  .gjs-pn-panels { background: #0f172a; }
  .gjs-pn-panel { background: transparent; border: none; }
  .gjs-pn-options, .gjs-pn-views { background: #1e293b; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .gjs-pn-btn { color: #94a3b8; border-radius: 6px; padding: 6px 8px; transition: all 0.15s; }
  .gjs-pn-btn:hover, .gjs-pn-btn.gjs-pn-active { color: #ffffff; background: rgba(255,255,255,0.08); }
  .gjs-one-bg { background: #0f172a; }
  .gjs-two-color { color: #94a3b8; }
  .gjs-three-bg { background: #1e293b; }
  .gjs-four-color, .gjs-four-color-h:hover { color: #60a5fa; }
  .gjs-block-category .gjs-title { background: #1e293b; color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid rgba(255,255,255,0.05); padding: 10px 14px; }
  .gjs-blocks-c { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 8px !important; padding: 12px !important; max-height: none !important; }
  .gjs-block { background: #1e293b; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; color: #cbd5e1; font-size: 11px; padding: 12px 8px; text-align: center; transition: all 0.15s; width: 100% !important; max-width: none !important; min-height: 75px !important; margin: 0 !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; }
  .gjs-block:hover { background: #243448; border-color: #3b82f6; color: #ffffff; }
  .gjs-block__media { font-size: 24px; margin-bottom: 6px; }
  .gjs-layer { background: transparent; border-bottom: 1px solid rgba(255,255,255,0.04); color: #94a3b8; font-size: 12px; }
  .gjs-layer:hover { background: rgba(255,255,255,0.04); }
  .gjs-layer.gjs-selected { background: rgba(59,130,246,0.15); color: #60a5fa; }
  .gjs-layer__name { font-size: 12px; }
  .gjs-clm-tags { background: #1e293b; }
  .gjs-trt-trait__label { color: #94a3b8; font-size: 12px; }
  .gjs-trt-trait .gjs-field { background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #e2e8f0; font-size: 12px; }
  .gjs-field input, .gjs-field select, .gjs-field textarea { background: transparent; color: #e2e8f0; font-size: 12px; }
  .gjs-sm-sector { border-bottom: 1px solid rgba(255,255,255,0.05); }
  .gjs-sm-sector-title { background: #1e293b; color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 10px 14px; }
  .gjs-sm-property { color: #94a3b8; font-size: 12px; }
  .gjs-sm-property .gjs-sm-label { color: #64748b; font-size: 11px; }
  .gjs-field-color-picker { border-radius: 4px; }
  .gjs-toolbar { background: #1e40af; border-radius: 6px; }
  .gjs-toolbar-item { color: #ffffff; }
  .gjs-resizer-h { border-color: #3b82f6; }
  .gjs-selected { outline: 2px solid #3b82f6 !important; outline-offset: 1px; }
  .gjs-hovered { outline: 1px dashed rgba(59,130,246,0.5) !important; outline-offset: 1px; }
  .gjs-frame-wrapper { background: #0f172a; }
  .gjs-cv-canvas { background: #1a2744; }
  .gjs-badge { background: #1e40af; border-radius: 4px; color: #fff; font-size: 10px; }

  /* CodeMirror Custom Styles */
  .CodeMirror {
    font-family: Menlo, Monaco, Consolas, "Fira Code", monospace !important;
    font-size: 13px !important;
    line-height: 1.5 !important;
    background: #0f172a !important;
  }
  .cm-s-hopscotch.CodeMirror {
    background: #0f172a !important;
    color: #e2e8f0 !important;
  }
  .cm-s-hopscotch .CodeMirror-gutters {
    background: #0f172a !important;
    border-right: 1px solid rgba(255,255,255,0.08) !important;
  }
  .cm-s-hopscotch .CodeMirror-linenumber {
    color: #475569 !important;
  }
  .cm-s-hopscotch .CodeMirror-cursor {
    border-left: 2px solid #60a5fa !important;
  }
  .cm-s-hopscotch .CodeMirror-activeline-background {
    background: rgba(255, 255, 255, 0.03) !important;
  }
  .CodeMirror-wrap {
    word-break: break-word;
  }
`;

export default function GrapesEditor({
    initialSections,
    onSave,
    pages = [],
    activePage,
    onCreatePage,
    onDeletePage,
    onSwitchPage,
    instituteCode,
    pageSlug,
    initialConfig,
}) {
    const editorRef = useRef(null);
    const gjsInstance = useRef(null);
    const toast = useToast();
    const [leftPanel, setLeftPanel] = useState('blocks'); // blocks | layers
    const [rightPanel, setRightPanel] = useState('styles'); // styles | traits
    const [device, setDevice] = useState('desktop');
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [showPageMenu, setShowPageMenu] = useState(false);
    const [showNewPage, setShowNewPage] = useState(false);
    const [newPageTitle, setNewPageTitle] = useState('');
    const [newPageSlug, setNewPageSlug] = useState('');

    // ── Init GrapesJS ────────────────────────────────────────────────────
    useEffect(() => {
        if (!editorRef.current || gjsInstance.current) return;

        let active = true;
        let gjs;
        const loadGrapes = async () => {
            // Helper to dynamically load external scripts & stylesheets
            const loadStyle = (url, id) => {
                return new Promise((resolve) => {
                    if (document.getElementById(id)) return resolve();
                    const link = document.createElement('link');
                    link.id = id;
                    link.rel = 'stylesheet';
                    link.href = url;
                    link.onload = () => resolve();
                    link.onerror = () => resolve();
                    document.head.appendChild(link);
                });
            };

            const loadScript = (url, id) => {
                return new Promise((resolve) => {
                    if (document.getElementById(id)) return resolve();
                    const script = document.createElement('script');
                    script.id = id;
                    script.src = url;
                    script.onload = () => resolve();
                    script.onerror = () => resolve();
                    document.head.appendChild(script);
                });
            };

            // Load CodeMirror & js-beautify assets in parallel
            await Promise.all([
                loadStyle('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css', 'cm-css'),
                loadStyle('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/theme/hopscotch.min.css', 'cm-theme-hopscotch'),
            ]);

            // Load core CodeMirror script
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js', 'cm-js');

            // Load modes & beautifier scripts in parallel
            await Promise.all([
                loadScript('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/xml/xml.min.js', 'cm-mode-xml'),
                loadScript('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/javascript/javascript.min.js', 'cm-mode-js'),
                loadScript('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/css/css.min.js', 'cm-mode-css'),
                loadScript('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/htmlmixed/htmlmixed.min.js', 'cm-mode-htmlmixed'),
                loadScript('https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.15.4/beautify.min.js', 'beautify-js'),
                loadScript('https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.15.4/beautify-css.min.js', 'beautify-css'),
                loadScript('https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.15.4/beautify-html.min.js', 'beautify-html'),
            ]);

            const { default: grapesjs } = await import('grapesjs');

            if (!active) return;

            // Inject styles
            const styleEl = document.createElement('style');
            styleEl.textContent = GRAPES_STYLES;
            document.head.appendChild(styleEl);

            // Clear custom panel containers to prevent duplicates (e.g. under StrictMode / hot-reloads)
            ['#gjs-blocks-panel', '#gjs-layers-panel', '#gjs-styles-panel', '#gjs-traits-panel'].forEach(id => {
                const el = document.querySelector(id);
                if (el) el.innerHTML = '';
            });

            // ── Also inject GrapesJS default CSS ────────────────────────
            if (!document.getElementById('gjs-css')) {
                const link = document.createElement('link');
                link.id = 'gjs-css';
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/grapesjs/dist/css/grapes.min.css';
                document.head.appendChild(link);
            }

            gjs = grapesjs.init({
                container: editorRef.current,
                height: '100%',
                width: 'auto',
                avoidInlineStyle: false,
                storageManager: false,
                noticeOnUnload: false,
                fromElement: false,

                panels: { defaults: [] }, // we use custom panels

                deviceManager: {
                    devices: [
                        { name: 'Desktop', width: '' },
                        { name: 'Tablet', width: '768px' },
                        { name: 'Mobile', width: '375px' },
                    ]
                },

                layerManager: {
                    appendTo: '#gjs-layers-panel',
                },
                selectorManager: {
                    appendTo: '#gjs-styles-panel',
                    componentFirst: true,
                },
                blockManager: {
                    appendTo: '#gjs-blocks-panel',
                    blocks: [],
                },
                styleManager: {
                    appendTo: '#gjs-styles-panel',
                    sectors: [
                        {
                            name: 'Layout',
                            open: true,
                            properties: [
                                { property: 'display', type: 'select', options: [{ value: 'block', name: 'Block' }, { value: 'flex', name: 'Flex' }, { value: 'grid', name: 'Grid' }, { value: 'inline-block', name: 'Inline Block' }] },
                                { property: 'flex-direction', type: 'select', options: [{ value: 'row' }, { value: 'column' }, { value: 'row-reverse' }, { value: 'column-reverse' }] },
                                { property: 'align-items', type: 'select', options: [{ value: 'flex-start', name: 'Start' }, { value: 'center', name: 'Center' }, { value: 'flex-end', name: 'End' }, { value: 'stretch', name: 'Stretch' }] },
                                { property: 'justify-content', type: 'select', options: [{ value: 'flex-start', name: 'Start' }, { value: 'center', name: 'Center' }, { value: 'flex-end', name: 'End' }, { value: 'space-between', name: 'Space Between' }, { value: 'space-around', name: 'Space Around' }] },
                                { property: 'gap', type: 'integer', units: ['px', 'em', 'rem'] },
                            ]
                        },
                        {
                            name: 'Spacing',
                            open: false,
                            properties: [
                                { property: 'padding-top', type: 'integer', units: ['px', 'em', '%'] },
                                { property: 'padding-right', type: 'integer', units: ['px', 'em', '%'] },
                                { property: 'padding-bottom', type: 'integer', units: ['px', 'em', '%'] },
                                { property: 'padding-left', type: 'integer', units: ['px', 'em', '%'] },
                                { property: 'margin-top', type: 'integer', units: ['px', 'em', '%'] },
                                { property: 'margin-bottom', type: 'integer', units: ['px', 'em', '%'] },
                            ]
                        },
                        {
                            name: 'Size',
                            open: false,
                            properties: [
                                { property: 'width', type: 'integer', units: ['px', '%', 'vw', 'em'] },
                                { property: 'height', type: 'integer', units: ['px', '%', 'vh', 'em'] },
                                { property: 'max-width', type: 'integer', units: ['px', '%', 'vw'] },
                                { property: 'min-height', type: 'integer', units: ['px', 'vh'] },
                            ]
                        },
                        {
                            name: 'Typography',
                            open: false,
                            properties: [
                                { property: 'font-family', type: 'select', options: [{ value: 'Inter, sans-serif', name: 'Inter' }, { value: 'Georgia, serif', name: 'Georgia' }, { value: 'Courier New, monospace', name: 'Courier' }] },
                                { property: 'font-size', type: 'integer', units: ['px', 'em', 'rem', 'vw'] },
                                { property: 'font-weight', type: 'select', options: [{ value: '300', name: 'Light' }, { value: '400', name: 'Regular' }, { value: '500', name: 'Medium' }, { value: '600', name: 'Semi Bold' }, { value: '700', name: 'Bold' }, { value: '800', name: 'Extra Bold' }, { value: '900', name: 'Black' }] },
                                { property: 'line-height', type: 'integer', units: ['', 'px', 'em'] },
                                { property: 'letter-spacing', type: 'integer', units: ['px', 'em'] },
                                { property: 'text-align', type: 'radio', options: [{ value: 'left', title: 'Left' }, { value: 'center', title: 'Center' }, { value: 'right', title: 'Right' }] },
                                { property: 'color', type: 'color' },
                                { property: 'text-decoration', type: 'select', options: [{ value: 'none' }, { value: 'underline' }, { value: 'line-through' }] },
                            ]
                        },
                        {
                            name: 'Background',
                            open: false,
                            properties: [
                                { property: 'background-color', type: 'color' },
                                { property: 'background-image', type: 'text' },
                                { property: 'background-size', type: 'select', options: [{ value: 'auto' }, { value: 'cover' }, { value: 'contain' }] },
                                { property: 'background-position', type: 'select', options: [{ value: 'center' }, { value: 'top' }, { value: 'bottom' }, { value: 'left' }, { value: 'right' }] },
                            ]
                        },
                        {
                            name: 'Border & Shadow',
                            open: false,
                            properties: [
                                { property: 'border-radius', type: 'integer', units: ['px', '%', 'em'] },
                                { property: 'border-width', type: 'integer', units: ['px'] },
                                { property: 'border-style', type: 'select', options: [{ value: 'none' }, { value: 'solid' }, { value: 'dashed' }, { value: 'dotted' }] },
                                { property: 'border-color', type: 'color' },
                                { property: 'box-shadow', type: 'text' },
                                { property: 'opacity', type: 'slider', min: 0, max: 1, step: 0.01 },
                            ]
                        },
                    ]
                },
                traitManager: {
                    appendTo: '#gjs-traits-panel',
                },

                canvas: {
                    styles: [
                        'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap'
                    ]
                },

                assetManager: {
                    assets: [],
                    async upload(files) {
                        try {
                            const formData = new FormData();
                            formData.append('file', files[0]);
                            formData.append('fileType', 'website-media');

                            const response = await fetch('/api/upload', {
                                method: 'POST',
                                body: formData
                            });
                            const data = await response.json();
                            if (response.ok && data.url) {
                                return {
                                    data: [data.url]
                                };
                            } else {
                                throw new Error(data.error || 'Upload failed');
                            }
                        } catch (err) {
                            console.error('Image upload error:', err);
                            alert('Failed to upload image: ' + err.message);
                            throw err;
                        }
                    },
                    uploadText: 'Drop image or click to upload',
                    addBtnText: 'Add image URL',
                },
            });

            // ── Register blocks ──────────────────────────────────────────
            const bm = gjs.BlockManager;
            SCHOOL_BLOCKS.forEach(block => {
                if (!bm.get(block.id)) {
                    bm.add(block.id, {
                        label: block.label,
                        category: block.category,
                        content: block.content,
                        media: BLOCK_ICONS[block.id] || '📦',
                        attributes: { class: 'gjs-block-custom' }
                    });
                }
            });

            // ── Register custom code editor command ──────────────────────
            gjs.Commands.add('custom-open-code', {
                run(editor) {
                    const modal = editor.Modal;
                    const html = editor.getHtml();
                    const css = editor.getCss();
                    
                    const container = document.createElement('div');
                    container.style.display = 'flex';
                    container.style.flexDirection = 'column';
                    container.style.gap = '16px';
                    container.style.padding = '8px';
                    container.style.color = '#e2e8f0';
                    container.style.fontFamily = 'Inter, sans-serif';
                    container.style.height = 'calc(100vh - 250px)';
                    container.style.minHeight = '400px';

                    const grid = document.createElement('div');
                    grid.style.display = 'grid';
                    grid.style.gridTemplateColumns = '1fr 1fr';
                    grid.style.gap = '16px';
                    grid.style.flex = '1';
                    grid.style.overflow = 'hidden';

                    // HTML Panel
                    const htmlPanel = document.createElement('div');
                    htmlPanel.style.display = 'flex';
                    htmlPanel.style.flexDirection = 'column';
                    htmlPanel.style.gap = '6px';
                    htmlPanel.style.height = '100%';
                    
                    const htmlLabel = document.createElement('label');
                    htmlLabel.textContent = 'HTML Code';
                    htmlLabel.style.fontSize = '12px';
                    htmlLabel.style.fontWeight = '700';
                    htmlLabel.style.color = '#94a3b8';
                    
                    const htmlContainer = document.createElement('div');
                    htmlContainer.style.width = '100%';
                    htmlContainer.style.flex = '1';
                    htmlContainer.style.border = '1px solid rgba(255,255,255,0.1)';
                    htmlContainer.style.borderRadius = '8px';
                    htmlContainer.style.overflow = 'hidden';
                    htmlContainer.style.position = 'relative';

                    const htmlTextarea = document.createElement('textarea');
                    htmlTextarea.style.width = '100%';
                    htmlTextarea.style.height = '100%';
                    htmlTextarea.style.border = 'none';
                    htmlTextarea.style.resize = 'none';
                    htmlTextarea.style.background = '#0f172a';
                    htmlTextarea.style.color = '#e2e8f0';
                    htmlTextarea.style.fontFamily = 'monospace';
                    htmlTextarea.style.outline = 'none';
                    htmlTextarea.style.padding = '8px';
                    htmlContainer.appendChild(htmlTextarea);

                    htmlPanel.appendChild(htmlLabel);
                    htmlPanel.appendChild(htmlContainer);

                    // CSS Panel
                    const cssPanel = document.createElement('div');
                    cssPanel.style.display = 'flex';
                    cssPanel.style.flexDirection = 'column';
                    cssPanel.style.gap = '6px';
                    cssPanel.style.height = '100%';

                    const cssLabel = document.createElement('label');
                    cssLabel.textContent = 'CSS Code';
                    cssLabel.style.fontSize = '12px';
                    cssLabel.style.fontWeight = '700';
                    cssLabel.style.color = '#94a3b8';

                    const cssContainer = document.createElement('div');
                    cssContainer.style.width = '100%';
                    cssContainer.style.flex = '1';
                    cssContainer.style.border = '1px solid rgba(255,255,255,0.1)';
                    cssContainer.style.borderRadius = '8px';
                    cssContainer.style.overflow = 'hidden';
                    cssContainer.style.position = 'relative';

                    const cssTextarea = document.createElement('textarea');
                    cssTextarea.style.width = '100%';
                    cssTextarea.style.height = '100%';
                    cssTextarea.style.border = 'none';
                    cssTextarea.style.resize = 'none';
                    cssTextarea.style.background = '#0f172a';
                    cssTextarea.style.color = '#e2e8f0';
                    cssTextarea.style.fontFamily = 'monospace';
                    cssTextarea.style.outline = 'none';
                    cssTextarea.style.padding = '8px';
                    cssContainer.appendChild(cssTextarea);

                    cssPanel.appendChild(cssLabel);
                    cssPanel.appendChild(cssContainer);

                    grid.appendChild(htmlPanel);
                    grid.appendChild(cssPanel);

                    const btnRow = document.createElement('div');
                    btnRow.style.display = 'flex';
                    btnRow.style.justifyContent = 'flex-end';
                    btnRow.style.gap = '12px';

                    const cancelBtn = document.createElement('button');
                    cancelBtn.textContent = 'Cancel';
                    cancelBtn.style.background = 'transparent';
                    cancelBtn.style.border = '1px solid rgba(255,255,255,0.1)';
                    cancelBtn.style.color = '#94a3b8';
                    cancelBtn.style.padding = '8px 16px';
                    cancelBtn.style.borderRadius = '6px';
                    cancelBtn.style.fontSize = '12px';
                    cancelBtn.style.cursor = 'pointer';
                    cancelBtn.onclick = () => modal.close();

                    const applyBtn = document.createElement('button');
                    applyBtn.textContent = 'Apply Changes';
                    applyBtn.style.background = '#2563eb';
                    applyBtn.style.border = 'none';
                    applyBtn.style.color = '#ffffff';
                    applyBtn.style.padding = '8px 20px';
                    applyBtn.style.borderRadius = '6px';
                    applyBtn.style.fontSize = '12px';
                    applyBtn.style.fontWeight = '600';
                    applyBtn.style.cursor = 'pointer';

                    btnRow.appendChild(cancelBtn);
                    btnRow.appendChild(applyBtn);

                    container.appendChild(grid);
                    container.appendChild(btnRow);

                    modal.setTitle('Edit HTML & CSS Code');
                    modal.setContent(container);
                    modal.open();

                    // Format code using js-beautify if loaded
                    const formattedHtml = window.html_beautify ? window.html_beautify(html, {
                        indent_size: 2,
                        indent_char: ' ',
                        max_preserve_newlines: 1,
                        preserve_newlines: true,
                        indent_scripts: 'normal',
                        end_with_newline: false,
                        wrap_line_length: 0,
                        indent_inner_html: true,
                    }) : html;

                    const formattedCss = window.css_beautify ? window.css_beautify(css, {
                        indent_size: 2,
                        indent_char: ' ',
                        max_preserve_newlines: 1,
                        preserve_newlines: true,
                        end_with_newline: false
                    }) : css;

                    // Initialize CodeMirror viewers using GrapesJS's CodeManager
                    const codeViewer = editor.CodeManager.getViewer('CodeMirror');
                    
                    const viewerHtml = codeViewer.clone();
                    viewerHtml.set({
                        codeName: 'htmlmixed',
                        readOnly: 0,
                        theme: 'hopscotch',
                        autoBeautify: true,
                        autoCloseTags: true,
                        autoCloseBrackets: true,
                        lineWrapping: true,
                        lineNumbers: true,
                        styleActiveLine: true,
                        smartIndent: true,
                        indentWithTabs: true,
                    });
                    viewerHtml.init(htmlTextarea);
                    viewerHtml.setContent(formattedHtml);

                    const viewerCss = codeViewer.clone();
                    viewerCss.set({
                        codeName: 'css',
                        readOnly: 0,
                        theme: 'hopscotch',
                        autoBeautify: true,
                        autoCloseBrackets: true,
                        lineWrapping: true,
                        lineNumbers: true,
                        styleActiveLine: true,
                        smartIndent: true,
                        indentWithTabs: true,
                    });
                    viewerCss.init(cssTextarea);
                    viewerCss.setContent(formattedCss);

                    // Set height for CodeMirror elements inside containers to fill them
                    setTimeout(() => {
                        const cmElements = container.querySelectorAll('.CodeMirror');
                        cmElements.forEach(el => {
                            el.style.height = '100%';
                        });
                    }, 50);

                    applyBtn.onclick = () => {
                        const newHtml = viewerHtml.editor ? viewerHtml.editor.getValue() : viewerHtml.getContent();
                        const newCss = viewerCss.editor ? viewerCss.editor.getValue() : viewerCss.getContent();
                        editor.setComponents(newHtml);
                        editor.setStyle(newCss);
                        modal.close();
                    };
                }
            });

            // ── Load existing content ────────────────────────────────────
            const gjsData = activePage?.draftContent?.gjsData || activePage?.liveContent?.gjsData;
            if (gjsData) {
                gjs.loadProjectData(gjsData);
            } else if (initialSections && initialSections.length > 0) {
                // Legacy sections — render a notice
                gjs.setComponents(`
                    <div style="padding:40px;text-align:center;font-family:Inter,sans-serif;color:#64748b;">
                        <p style="font-size:18px;font-weight:600;color:#0f172a;margin-bottom:8px;">Canvas is empty</p>
                        <p style="font-size:14px;">Drag blocks from the left panel to start building your page.</p>
                    </div>
                `);
            }

            // ── Style Helper inside canvas iframe on load ─────────────────
            gjs.on('load', () => {
                const doc = gjs.Canvas.getDocument();
                if (doc) {
                    const style = doc.createElement('style');
                    style.innerHTML = `
                        /* Helper to display transparent elements inside editor */
                        nav[style*="rgba(255,255,255,0.1)"] {
                            background-color: #1e293b !important;
                            border: 1px dashed #3b82f6 !important;
                        }
                        /* Helper to ensure empty sections/containers have visual height */
                        section:empty, div:empty {
                            min-height: 80px !important;
                            outline: 1px dashed rgba(59, 130, 246, 0.5) !important;
                            background: rgba(59, 130, 246, 0.05) !important;
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                        }
                        section:empty::after, div:empty::after {
                            content: "Empty Canvas Section — drag elements here" !important;
                            color: #94a3b8 !important;
                            font-size: 13px !important;
                            font-family: Inter, sans-serif !important;
                        }
                    `;
                    doc.head.appendChild(style);
                }
            });

            if (!active) {
                gjs.destroy();
                return;
            }

            gjsInstance.current = gjs;
        };

        loadGrapes();

        return () => {
            active = false;
            if (gjsInstance.current) {
                gjsInstance.current.destroy();
                gjsInstance.current = null;
            }
        };
    }, []);

    // ── Reload when active page changes ─────────────────────────────────
    useEffect(() => {
        if (!gjsInstance.current) return;
        const gjsData = activePage?.draftContent?.gjsData || activePage?.liveContent?.gjsData;
        if (gjsData) {
            gjsInstance.current.loadProjectData(gjsData);
        } else {
            gjsInstance.current.setComponents('');
            gjsInstance.current.setStyle('');
        }
    }, [activePage?._id]);

    // ── Device switch ─────────────────────────────────────────────────
    useEffect(() => {
        if (!gjsInstance.current) return;
        const dm = gjsInstance.current.DeviceManager;
        if (device === 'desktop') dm.select('Desktop');
        else if (device === 'tablet') dm.select('Tablet');
        else dm.select('Mobile');
    }, [device]);

    // ── Save handler ──────────────────────────────────────────────────
    const handleSave = useCallback(async () => {
        if (!gjsInstance.current || saving) return;
        setSaving(true);
        try {
            const gjsData = gjsInstance.current.getProjectData();
            const gjsHtml = gjsInstance.current.getHtml();
            const gjsCss = gjsInstance.current.getCss();
            await onSave({ gjsData, gjsHtml, gjsCss }, {});
            toast.success('Page saved!');
        } catch (e) {
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    }, [onSave, saving, toast]);

    // ── Publish handler ───────────────────────────────────────────────
    const handlePublish = useCallback(async () => {
        if (!gjsInstance.current || publishing) return;
        setPublishing(true);
        try {
            const gjsData = gjsInstance.current.getProjectData();
            const gjsHtml = gjsInstance.current.getHtml();
            const gjsCss = gjsInstance.current.getCss();
            // First save draft
            await onSave({ gjsData, gjsHtml, gjsCss }, {});
            // Then publish
            const res = await fetch('/api/v1/website/publish', { method: 'POST' });
            if (res.ok) {
                toast.success('Page published to live site!');
            } else {
                toast.error('Publish failed');
            }
        } catch (e) {
            toast.error('Publish failed');
        } finally {
            setPublishing(false);
        }
    }, [onSave, publishing, toast]);

    // ── Keyboard shortcuts ────────────────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleSave]);

    // ── New page ──────────────────────────────────────────────────────
    const handleNewPage = () => {
        if (!newPageTitle.trim()) return;
        const slug = newPageSlug.trim() || newPageTitle.toLowerCase().replace(/\s+/g, '-');
        onCreatePage(newPageTitle.trim(), slug);
        setNewPageTitle('');
        setNewPageSlug('');
        setShowNewPage(false);
        setShowPageMenu(false);
    };

    return (
        <div className="grapes-shell" style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0f172a', fontFamily: 'Inter, sans-serif' }}>

            {/* ── Left Sidebar ── */}
            <div style={{ width: '260px', flexShrink: 0, background: '#0f172a', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Logo + Pages */}
                <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '15px', letterSpacing: '-0.3px' }}>Website Builder</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                title="Save (⌘S)"
                                style={{ background: saving ? '#374151' : '#2563eb', color: '#fff', border: 'none', borderRadius: '7px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.15s' }}
                            >
                                <Save size={12} />
                                {saving ? 'Saving…' : 'Save'}
                            </button>
                            <button
                                onClick={handlePublish}
                                disabled={publishing}
                                title="Publish live"
                                style={{ background: publishing ? '#374151' : '#16a34a', color: '#fff', border: 'none', borderRadius: '7px', padding: '6px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.15s' }}
                            >
                                <Globe size={12} />
                            </button>
                        </div>
                    </div>

                    {/* Page Switcher */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowPageMenu(!showPageMenu)}
                            style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 12px', color: '#e2e8f0', fontSize: '12px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.15s' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileText size={13} color="#64748b" />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }}>{activePage?.title || 'Home'}</span>
                            </div>
                            <ChevronDown size={13} color="#64748b" />
                        </button>
                        {showPageMenu && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden', zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                                {pages.map(page => (
                                    <button
                                        key={page._id || page.slug}
                                        onClick={() => { onSwitchPage(page); setShowPageMenu(false); }}
                                        style={{ width: '100%', padding: '9px 14px', background: activePage?._id === page._id ? 'rgba(59,130,246,0.15)' : 'transparent', border: 'none', color: activePage?._id === page._id ? '#60a5fa' : '#94a3b8', fontSize: '12px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', transition: 'all 0.1s' }}
                                    >
                                        <span>{page.title}</span>
                                        {pages.length > 1 && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDeletePage(page._id); setShowPageMenu(false); }}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
                                            >
                                                <Trash2 size={11} />
                                            </button>
                                        )}
                                    </button>
                                ))}
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '6px' }}>
                                    {showNewPage ? (
                                        <div style={{ padding: '6px' }}>
                                            <input
                                                autoFocus
                                                value={newPageTitle}
                                                onChange={e => setNewPageTitle(e.target.value)}
                                                placeholder="Page title"
                                                style={{ width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '7px 10px', color: '#e2e8f0', fontSize: '12px', outline: 'none', boxSizing: 'border-box', marginBottom: '6px' }}
                                            />
                                            <input
                                                value={newPageSlug}
                                                onChange={e => setNewPageSlug(e.target.value)}
                                                placeholder="Slug (optional)"
                                                style={{ width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '7px 10px', color: '#e2e8f0', fontSize: '12px', outline: 'none', boxSizing: 'border-box', marginBottom: '6px' }}
                                            />
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button onClick={handleNewPage} style={{ flex: 1, background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Create</button>
                                                <button onClick={() => setShowNewPage(false)} style={{ flex: 1, background: '#1e293b', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '7px', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setShowNewPage(true)}
                                            style={{ width: '100%', background: 'transparent', border: 'none', color: '#60a5fa', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: '7px 8px', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '6px' }}
                                        >
                                            <Plus size={13} /> New Page
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Panel Tabs */}
                <div style={{ display: 'flex', padding: '8px', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                    {[
                        { id: 'blocks', icon: <Puzzle size={14} />, label: 'Blocks' },
                        { id: 'layers', icon: <Layers size={14} />, label: 'Layers' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setLeftPanel(tab.id)}
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '7px 8px', borderRadius: '7px', border: 'none', background: leftPanel === tab.id ? '#1e40af' : 'transparent', color: leftPanel === tab.id ? '#ffffff' : '#64748b', fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* Panel Content */}
                <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                    <div 
                        id="gjs-blocks-panel" 
                        style={{ 
                            position: leftPanel === 'blocks' ? 'relative' : 'absolute', 
                            visibility: leftPanel === 'blocks' ? 'visible' : 'hidden', 
                            opacity: leftPanel === 'blocks' ? 1 : 0,
                            pointerEvents: leftPanel === 'blocks' ? 'auto' : 'none',
                            height: '100%', 
                            width: '100%',
                            overflowY: 'auto' 
                        }} 
                    />
                    <div 
                        id="gjs-layers-panel" 
                        style={{ 
                            position: leftPanel === 'layers' ? 'relative' : 'absolute', 
                            visibility: leftPanel === 'layers' ? 'visible' : 'hidden', 
                            opacity: leftPanel === 'layers' ? 1 : 0,
                            pointerEvents: leftPanel === 'layers' ? 'auto' : 'none',
                            height: '100%', 
                            width: '100%',
                            overflowY: 'auto' 
                        }} 
                    />
                </div>
            </div>

            {/* ── Canvas Area ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Top Toolbar */}
                <div style={{ height: '48px', background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '8px', flexShrink: 0 }}>
                    {/* Undo/Redo */}
                    <div style={{ display: 'flex', gap: '4px', marginRight: '8px' }}>
                        <button
                            onClick={() => gjsInstance.current?.Commands.run('core:undo')}
                            title="Undo (⌘Z)"
                            style={toolbarBtnStyle}
                        ><Undo2 size={14} /></button>
                        <button
                            onClick={() => gjsInstance.current?.Commands.run('core:redo')}
                            title="Redo (⌘⇧Z)"
                            style={toolbarBtnStyle}
                        ><Redo2 size={14} /></button>
                    </div>

                    {/* Divider */}
                    <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

                    {/* Device */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {[
                            { id: 'desktop', icon: <Monitor size={14} /> },
                            { id: 'tablet', icon: <Tablet size={14} /> },
                            { id: 'mobile', icon: <Smartphone size={14} /> },
                        ].map(d => (
                            <button
                                key={d.id}
                                onClick={() => setDevice(d.id)}
                                style={{ ...toolbarBtnStyle, background: device === d.id ? 'rgba(59,130,246,0.2)' : 'transparent', color: device === d.id ? '#60a5fa' : '#64748b' }}
                            >{d.icon}</button>
                        ))}
                    </div>

                    {/* Divider */}
                    <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

                    {/* View source */}
                    <button
                        onClick={() => gjsInstance.current?.Commands.run('custom-open-code')}
                        title="View HTML/CSS"
                        style={toolbarBtnStyle}
                    ><Code2 size={14} /></button>

                    {/* Preview */}
                    <button
                        onClick={() => gjsInstance.current?.Commands.run('core:preview')}
                        title="Preview"
                        style={toolbarBtnStyle}
                    ><Eye size={14} /></button>

                    {/* Spacer */}
                    <div style={{ flex: 1 }} />

                    {/* Page label */}
                    {activePage && (
                        <span style={{ color: '#475569', fontSize: '12px', fontWeight: 500 }}>
                            /{activePage.slug}
                        </span>
                    )}

                    {/* Live site link */}
                    {instituteCode && pageSlug && (
                        <a
                            href={`/${instituteCode}/${pageSlug === 'index' ? '' : pageSlug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#60a5fa', fontSize: '12px', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            <Globe size={12} /> View Live
                        </a>
                    )}
                </div>

                {/* GrapesJS Canvas */}
                <div ref={editorRef} style={{ flex: 1, overflow: 'hidden' }} />
            </div>

            {/* ── Right Sidebar ── */}
            <div style={{ width: '260px', flexShrink: 0, background: '#0f172a', borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Right Panel Tabs */}
                <div style={{ display: 'flex', padding: '8px', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                    {[
                        { id: 'styles', icon: <Paintbrush size={13} />, label: 'Style' },
                        { id: 'traits', icon: <Settings2 size={13} />, label: 'Traits' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setRightPanel(tab.id)}
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '7px 8px', borderRadius: '7px', border: 'none', background: rightPanel === tab.id ? '#1e40af' : 'transparent', color: rightPanel === tab.id ? '#ffffff' : '#64748b', fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* Right Panel Content */}
                <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                    <div 
                        id="gjs-styles-panel" 
                        style={{ 
                            position: rightPanel === 'styles' ? 'relative' : 'absolute', 
                            visibility: rightPanel === 'styles' ? 'visible' : 'hidden', 
                            opacity: rightPanel === 'styles' ? 1 : 0,
                            pointerEvents: rightPanel === 'styles' ? 'auto' : 'none',
                            height: '100%', 
                            width: '100%',
                            overflowY: 'auto' 
                        }} 
                    />
                    <div 
                        id="gjs-traits-panel" 
                        style={{ 
                            position: rightPanel === 'traits' ? 'relative' : 'absolute', 
                            visibility: rightPanel === 'traits' ? 'visible' : 'hidden', 
                            opacity: rightPanel === 'traits' ? 1 : 0,
                            pointerEvents: rightPanel === 'traits' ? 'auto' : 'none',
                            height: '100%', 
                            width: '100%',
                            overflowY: 'auto' 
                        }} 
                    />
                </div>

                {/* Keyboard hints */}
                <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                    <div style={{ color: '#334155', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Save</span><kbd style={{ background: '#1e293b', color: '#64748b', padding: '1px 5px', borderRadius: '3px', fontSize: '10px' }}>⌘S</kbd>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Undo</span><kbd style={{ background: '#1e293b', color: '#64748b', padding: '1px 5px', borderRadius: '3px', fontSize: '10px' }}>⌘Z</kbd>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Redo</span><kbd style={{ background: '#1e293b', color: '#64748b', padding: '1px 5px', borderRadius: '3px', fontSize: '10px' }}>⌘⇧Z</kbd>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Delete</span><kbd style={{ background: '#1e293b', color: '#64748b', padding: '1px 5px', borderRadius: '3px', fontSize: '10px' }}>Del</kbd>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Shared styles ──────────────────────────────────────────────────────────
const toolbarBtnStyle = {
    background: 'transparent',
    border: 'none',
    color: '#64748b',
    borderRadius: '6px',
    padding: '6px 8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
};

// ── Block icons map ─────────────────────────────────────────────────────────
const BLOCK_ICONS = {
    'navbar-classic': '🔷',
    'navbar-centered': '🔹',
    'navbar-transparent': '⬜',
    'hero-centered': '⭐',
    'hero-split': '◀▶',
    'hero-gradient': '🌈',
    'features-grid': '⊞',
    'placement-stats': '📊',
    'faculty-cards': '👥',
    'testimonials': '💬',
    'gallery': '🖼️',
    'contact-form': '📬',
    'footer': '⬇️',
    'notices-ticker': '📢',
    'cta-banner': '🚀',
    'blank-section': '▭',
    'two-column': '⊟',
    'text-block': '📝',
};
