"use client";

import Image from "next/image";
import {
  UserPlus,
  IndianRupee,
  BookOpenCheck,
  UploadCloud,
  CalendarCheck,
  MessageCircle,
  User,
  Users,
  ShieldCheck,
  ListTodo,
  TrendingUp,
  History,
  Printer,
  IdCard,
  FileBadge,
  FileOutput,
  FileMinus,
  Files,
  Network,
  Database,
  CheckCircle2,
  ArrowRight,
  Star
} from "lucide-react";

export default function EduvantaPage() {
  const features = [
    { name: "Admission Module", icon: UserPlus },
    { name: "Fees Module", icon: IndianRupee },
    { name: "Exam Module", icon: BookOpenCheck },
    { name: "Homework Upload", icon: UploadCloud },
    { name: "Attendance", icon: CalendarCheck },
    { name: "WhatsApp & SMS Alerts", icon: MessageCircle },
    { name: "Student Login", icon: User },
    { name: "Teacher Login", icon: Users },
    { name: "Admin Login", icon: ShieldCheck },
    { name: "Syllabus Status", icon: ListTodo },
    { name: "Student Performance", icon: TrendingUp },
    { name: "Timeline & Activity Log", icon: History },
    { name: "Report Card Printing", icon: Printer },
    { name: "ID Card Printing", icon: IdCard },
    { name: "Bonafide Certificate", icon: FileBadge },
    { name: "Leaving Certificate", icon: FileOutput },
    { name: "Transfer Certificate", icon: FileMinus },
    { name: "Document Management", icon: Files },
    { name: "Multi Branch Management", icon: Network },
    { name: "Data Backup & Security", icon: Database },
  ];

  return (
    <main className="min-h-screen bg-[#F8F9FA] font-sans selection:bg-blue-100 selection:text-blue-900">

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center h-20 overflow-visible">
            <Image
              src="/eduvanta/Eduvanta-Logo.png"
              alt="Eduvanta Logo"
              width={210}
              height={80}
              className="h-32 w-auto object-contain scale-[1.9] origin-left translate-x-2"
            />
          </div>

          <div className="hidden md:flex items-center gap-8 font-medium text-slate-600">
            <a href="#" className="text-slate-900">Home</a>
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
            <a href="#contact" className="hover:text-slate-900 transition-colors">Contact</a>
          </div>

          <div className="flex items-center gap-4">
            <a href="/login" className="hidden md:block font-medium text-slate-600 hover:text-slate-900 transition-colors">Login</a>
            <a href="#contact" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full transition-colors shadow-sm shadow-blue-200">
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-12 px-6 overflow-hidden text-center min-h-[90vh] flex flex-col justify-center">
        {/* Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

        {/* Radial Glow */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[800px] h-[600px] opacity-30 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-400 to-transparent blur-[100px] rounded-full mix-blend-multiply"></div>
        </div>

        <div className="max-w-6xl mx-auto flex flex-col items-center relative z-10 w-full">

          {/* Glassmorphic Badge */}
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/60 backdrop-blur-md border border-slate-200/80 rounded-full text-sm font-semibold tracking-wide mb-6 shadow-sm text-slate-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            SMART SCHOOL. STRONG FUTURE.
          </div>

          {/* Typography */}
          <h1 className="text-4xl md:text-6xl lg:text-[4.5rem] font-extrabold text-slate-900 tracking-tighter leading-[1.05] mb-6 max-w-4xl">
            The All-in-One <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500">
              School Software
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto mb-8 font-light">
            Streamline your administration, engage parents, and empower teachers with our intuitive platform designed to revolutionize the way you handle school operations.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <a href="#contact" className="group flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-full transition-all duration-300 shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)] hover:shadow-[0_0_60px_-15px_rgba(59,130,246,0.7)] hover:-translate-y-0.5 border border-blue-400/50">
              <span>Get Started</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a href="#contact" className="px-7 py-3.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-medium rounded-full transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5">
              Book a Demo
            </a>
          </div>

          {/* Social Proof */}
          <div className="flex flex-col items-center gap-2 mb-16">
            <div className="flex -space-x-3">
              {[...Array(5)].map((_, i) => (
                <img key={i} src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" className="w-9 h-9 rounded-full border-2 border-white bg-slate-100 object-cover shadow-sm" />
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
              </div>
              <span>Trusted by 500+ schools</span>
            </div>
          </div>

          {/* Dashboard Presentation (macOS Frame) */}
          <div className="relative w-full max-w-[1000px] mx-auto px-4 md:px-8">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/20 to-transparent rounded-[3rem] transform scale-105 -z-10 blur-3xl opacity-50"></div>

            {/* The Browser Window Frame */}
            <div className="relative rounded-2xl md:rounded-[2rem] bg-slate-900 border border-slate-800 shadow-[0_20px_80px_-20px_rgba(15,23,42,0.8)] overflow-hidden">
              {/* Title Bar */}
              <div className="h-12 border-b border-slate-800 flex items-center px-6 gap-2 bg-slate-900/50 backdrop-blur-md">
                <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                <div className="mx-auto text-xs font-medium text-slate-500 flex items-center gap-1">
                  <ShieldCheck size={14} className="text-slate-600" />
                  eduvanta.com
                </div>
              </div>

              {/* Image Container */}
              <div className="bg-slate-100">
                <Image
                  src="/eduvanta/dashboard_mockup_v2.png"
                  alt="Eduvanta Dashboard Mockup"
                  width={1200}
                  height={800}
                  className="w-full h-auto object-cover"
                  priority
                />
              </div>
            </div>

            {/* Floating Elements & Mockups */}

            {/* Floating Stat Card 1 */}
            <div className="absolute -left-16 top-20 hidden xl:flex items-center gap-3 px-6 py-4 bg-white/90 backdrop-blur-md border border-slate-200 shadow-xl rounded-2xl animate-float">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                <TrendingUp size={24} />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-slate-500">Attendance</div>
                <div className="text-xl font-bold text-slate-900">98.5%</div>
              </div>
            </div>

            {/* Phone Mockup (Right) */}
            <div className="absolute -right-20 top-16 hidden xl:block w-[200px] h-[400px] rounded-[2.5rem] border-[6px] border-slate-900 bg-slate-900 shadow-[0_40px_80px_-15px_rgba(15,23,42,0.6)] overflow-hidden animate-float [animation-delay:1s] z-20">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-900 rounded-b-2xl z-20"></div>
              <div className="relative w-full h-full bg-slate-100">
                <Image
                  src="/eduvanta/phone view.jpeg"
                  alt="Phone Mockup"
                  fill
                  className="object-cover opacity-95"
                />
              </div>
            </div>

            {/* Tablet Mockup (Left) */}
            <div className="absolute -left-32 bottom-20 hidden xl:block w-[400px] h-[300px] rounded-[2rem] border-[10px] border-slate-900 bg-slate-900 shadow-[0_40px_80px_-15px_rgba(15,23,42,0.6)] overflow-hidden animate-float [animation-delay:2s] z-10 transform -rotate-2">
              {/* Camera dot */}
              <div className="absolute top-1/2 left-2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-800 z-20"></div>
              <div className="relative w-full h-full bg-slate-100">
                <Image
                  src="/eduvanta/Tab View.png"
                  alt="Tablet Mockup"
                  fill
                  className="object-cover opacity-95"
                />
              </div>
            </div>

            {/* Floating Stat Card 2 */}
            <div className="absolute -right-8 bottom-16 hidden lg:flex items-center gap-3 px-6 py-4 bg-white/90 backdrop-blur-md border border-slate-200 shadow-xl rounded-2xl animate-float [animation-delay:0.5s] z-30">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                <Users size={24} />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-slate-500">Total Students</div>
                <div className="text-xl font-bold text-slate-900">+1,240</div>
              </div>
            </div>


          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Everything you need to run a modern school.</h2>
            <p className="text-lg text-slate-500">A comprehensive suite of modules designed to handle every aspect of school management with zero friction.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-[#F8F9FA] hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-100 group">
                <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center mb-4 text-blue-600 group-hover:scale-110 transition-transform">
                  <feature.icon strokeWidth={1.5} size={24} />
                </div>
                <h3 className="font-semibold text-slate-900">{feature.name}</h3>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center text-slate-500 font-medium">
            ...and many more features!
          </div>
        </div>
      </section>

      {/* Illustration & Benefits Section */}
      <section className="py-24 px-6 bg-[#F8F9FA] overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1">
            <Image
              src="/eduvanta/hero_illustration.png"
              alt="School Illustration"
              width={600}
              height={600}
              className="w-full h-auto max-w-md mx-auto"
            />
          </div>
          <div className="order-1 lg:order-2 space-y-8 relative">
            <div className="absolute -top-16 -right-16 hidden md:block z-0 pointer-events-none">
              <Image src="/eduvanta/security_illustration.png" alt="Security" width={180} height={180} className="mix-blend-multiply opacity-60" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 relative z-10">Let's build a smarter tomorrow for your school.</h2>
            <p className="text-lg text-slate-600">Join hundreds of schools across India upgrading their management systems with Eduvanta.</p>

            <ul className="space-y-4">
              {['Easy to Use Minimal Interface', 'Secure & Reliable Cloud Infrastructure', 'Daily Automated Backups', 'Excellent 24/7 Support', '100% Satisfaction Guarantee'].map((benefit, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={14} strokeWidth={3} />
                  </div>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section id="contact" className="py-24 px-6 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Transform Your School?</h2>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">Contact us today to schedule a demo and see how Eduvanta can simplify your administrative workload.</p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="inline-flex flex-col sm:flex-row items-center gap-4 bg-slate-800 p-2 pr-6 rounded-full border border-slate-700">
              <div className="bg-blue-600 text-white px-8 py-4 rounded-full font-bold text-xl tracking-wider">
                9488842786
              </div>
              <span className="text-lg font-medium text-slate-200">Call us today!</span>
            </div>

            <a
              href="https://wa.me/919488842786?text=Hi!%20I%20would%20like%20to%20request%20a%20demo%20of%20the%20Eduvanta%20School%20Management%20Software."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white px-8 py-4 rounded-full font-bold text-lg transition-colors border border-[#1DA851]"
            >
              <MessageCircle size={24} />
              Request Demo on WhatsApp
            </a>
          </div>
        </div>
      </section>

    </main>
  );
}
