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
  Star,
  Menu,
  X,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export default function QuantechPage() {
  const [activeGroup, setActiveGroup] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const featureGroups = [
    {
      title: "Academic Excellence",
      subtitle: "Focus on teaching, let us handle the rest",
      color: "blue",
      features: [
        { name: "60-Second Admission", desc: "Digitize your entire pipeline with instant forms.", icon: UserPlus },
        { name: "Auto-Fee Collection", desc: "Digital receipts and automated reminders.", icon: IndianRupee },
        { name: "Instant Results", desc: "One-click grading and report card generation.", icon: BookOpenCheck },
        { name: "Smart Attendance", desc: "Live tracking with automated SMS alerts.", icon: CalendarCheck },
        { name: "Homework Cloud", desc: "Centralized assignment management.", icon: UploadCloud },
      ]
    },
    {
      title: "Smart Management",
      subtitle: "Full control over your campus",
      color: "indigo",
      features: [
        { name: "Master Dashboard", desc: "Monitor branches and staff metrics in real-time.", icon: ShieldCheck },
        { name: "Teacher Portals", desc: "Simplified tools for schedules and grading.", icon: Users },
        { name: "Progress Analytics", desc: "Visualize and improve student performance.", icon: TrendingUp },
        { name: "Live Activity Log", desc: "Audit every action within the system.", icon: History },
        { name: "Alert Center", desc: "Instant WhatsApp and SMS communication.", icon: MessageCircle },
      ]
    },
    {
      title: "Automated Logistics",
      subtitle: "Identity and documentation made easy",
      color: "teal",
      features: [
        { name: "Pro ID Printing", desc: "Batch generate high-quality school IDs.", icon: IdCard },
        { name: "Document Vault", desc: "Secure cloud storage for all records.", icon: Files },
        { name: "Instant Certificates", desc: "Leaving, Transfer, and Bonafide docs.", icon: FileBadge },
        { name: "Report Archives", desc: "Standardized templates for all grade levels.", icon: Printer },
      ]
    }
  ];

  return (
    <main className="min-h-screen bg-[#F8F9FA] font-sans selection:bg-blue-100 selection:text-blue-900">

      {/* Navigation */}
      <nav className="sticky top-0 z-[100] bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center h-20 overflow-visible">
            <Image
              src="/quantech/Quantech-Logo.png"
              alt="Quantech Logo"
              width={160}
              height={45}
              className="object-contain scale-[1.8] origin-left"
            />
          </div>
          
          <div className="hidden lg:flex items-center gap-10">
            {['Home', 'Features', 'Pricing', 'Contact'].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors uppercase tracking-widest">{item}</a>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <a href="/login" className="font-bold text-slate-600 hover:text-blue-600 transition-colors">Login</a>
            <a href="#contact" className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">Get Started</a>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="lg:hidden text-slate-900 p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile Sidebar */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="fixed inset-0 top-20 bg-white z-[90] p-6 flex flex-col gap-8 lg:hidden h-[calc(100vh-5rem)]"
            >
              <div className="flex flex-col gap-6">
                {['Home', 'Features', 'Pricing', 'Contact'].map((item) => (
                  <a 
                    key={item} 
                    href={`#${item.toLowerCase()}`} 
                    className="text-2xl font-black text-slate-900"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item}
                  </a>
                ))}
              </div>
              <div className="mt-auto flex flex-col gap-4 pb-12">
                <a href="/login" className="w-full py-4 rounded-2xl border border-slate-100 font-bold text-slate-900 text-lg text-center">Login</a>
                <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-lg shadow-xl shadow-blue-200 text-center">Get Started</a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-12 px-6 overflow-hidden text-center min-h-[90vh] flex flex-col justify-center">
        {/* Grid Background - Reduced Opacity */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-60"></div>

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
            Streamline administration and empower teachers <br className="hidden md:block" />
            with our intuitive platform built for modern school operations.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <a href="#contact" className="group flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-full transition-all duration-300 shadow-[0_10px_25px_-5px_rgba(59,130,246,0.4)] hover:shadow-[0_15px_35px_-5px_rgba(59,130,246,0.5)] hover:-translate-y-0.5 border border-blue-400/50">
              <span>Get Started</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a href="#contact" className="px-7 py-3.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-blue-600 font-medium rounded-full transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5">
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
                  quantech.com
                </div>
              </div>

              {/* Image Container */}
              <div className="bg-slate-100">
                <Image
                  src="/quantech/dashboard_mockup_v2.png"
                  alt="Quantech Dashboard Mockup"
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
                  src="/quantech/phone view.jpeg"
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
                  src="/quantech/Tab View.png"
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

        {/* Professional Soft Fade Transition - Performance Optimized */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-white via-white/90 to-transparent z-20 pointer-events-none translate-z-0"></div>
      </section>

      {/* Features Section: Inspired Layout */}
      <motion.section 
        id="features" 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="py-32 bg-white px-6 relative z-30"
      >
        <div className="max-w-7xl mx-auto">
          
          {/* Category Tabs: Custom High-End Picker for Mobile */}
          <div className="md:hidden w-full mb-12 relative z-50">
            <button 
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
              className="w-full flex items-center justify-between p-5 rounded-2xl bg-white border border-slate-200 shadow-sm font-bold text-slate-900 transition-all active:scale-[0.98]"
            >
              <span>{featureGroups[activeGroup].title}</span>
              <ChevronDown 
                size={20} 
                className={cn("text-blue-600 transition-transform duration-300", isCategoryOpen ? "rotate-180" : "")} 
              />
            </button>

            <AnimatePresence>
              {isCategoryOpen && (
                <>
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    onClick={() => setIsCategoryOpen(false)}
                    className="fixed inset-0 bg-slate-900/5 backdrop-blur-[2px] z-40"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 5, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-3xl shadow-2xl z-50 overflow-hidden"
                  >
                    {featureGroups.map((group, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setActiveGroup(idx);
                          setIsCategoryOpen(false);
                        }}
                        className={cn(
                          "w-full text-left p-5 text-base font-bold transition-colors border-b border-slate-50 last:border-0",
                          activeGroup === idx ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        {group.title}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="hidden md:flex overflow-x-auto no-scrollbar -mx-6 px-6 lg:justify-center gap-2 mb-12 lg:mb-20 scroll-smooth">
            <div className="flex gap-2 pb-2">
              {featureGroups.map((group, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveGroup(idx)}
                  className={cn(
                    "whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300",
                    activeGroup === idx 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {group.title}
                </button>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 lg:gap-20">
            
            {/* Left Column: Value Prop */}
            <div className="lg:col-span-4 space-y-4 lg:space-y-8">
              <div className="space-y-3 lg:space-y-6">
                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight">
                  {featureGroups[activeGroup].title}
                </h2>
                <p className="text-lg md:text-xl text-slate-500 leading-relaxed font-light">
                  {featureGroups[activeGroup].subtitle}
                </p>
              </div>
              
              <a href="#contact" className="inline-flex items-center gap-2 text-blue-600 font-bold group">
                <span className="border-b-2 border-transparent group-hover:border-blue-600 transition-all text-sm md:text-base">Explore Module</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

            <div className="lg:col-span-8">
              <div className="h-[1px] w-full bg-slate-100 mb-8 lg:mb-12 hidden lg:block"></div>
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeGroup}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 md:gap-y-10"
                >
                  {featureGroups[activeGroup].features.map((feature, fIdx) => (
                    <div 
                      key={fIdx} 
                      className="group relative -m-2 md:-m-4 p-2 md:p-4 rounded-2xl hover:bg-slate-50 transition-all duration-300 cursor-pointer"
                    >
                      <div className="flex items-start gap-4 md:gap-5">
                        <div className="mt-1 text-slate-900 group-hover:text-blue-600 transition-colors shrink-0">
                          <feature.icon size={22} strokeWidth={1.5} />
                        </div>
                        <div className="space-y-1 md:space-y-2 flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-base md:text-lg font-bold text-slate-900 leading-none">
                              {feature.name}
                            </h4>
                            <ArrowRight size={16} className="text-blue-600 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                          </div>
                          <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed">
                            {feature.desc}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>

          </div>
        </div>
      </motion.section>

      {/* Illustration & Benefits Section: High-End Product Narrative */}
      <motion.section 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="py-32 px-6 bg-[#F8F9FA] overflow-hidden"
      >
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          
          {/* Dashboard Mockup with Depth */}
          <div className="order-2 lg:order-1 relative group">
            <div className="absolute -inset-4 bg-gradient-to-tr from-blue-100 to-transparent blur-2xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
            <div className="relative rounded-3xl overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-white transform hover:-rotate-1 transition-transform duration-700">
              <Image
                src="/quantech/dashboard_mockup_v2.png"
                alt="Quantech Dashboard Preview"
                width={800}
                height={600}
                className="w-full h-auto scale-105 group-hover:scale-110 transition-transform duration-1000"
              />
            </div>
            
            {/* Floating Trust Card */}
            <div className="absolute -bottom-8 -right-8 bg-white p-6 rounded-2xl shadow-xl border border-slate-100 hidden md:flex items-center gap-4 animate-float">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">100% Data Security</p>
                <p className="text-xs text-slate-500 font-medium">Enterprise Encryption</p>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2 space-y-10 relative">
            <div className="space-y-4">
              <span className="text-blue-600 font-black text-xs uppercase tracking-[0.2em]">Why Quantech?</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight">
                Run your entire school from <br className="hidden md:block" /> 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">one simple dashboard.</span>
              </h2>
              <p className="text-xl text-slate-500 font-light leading-relaxed">
                We’ve replaced complexity with clarity. Monitor every branch, automate daily tasks, and grow your institution with data-driven insights.
              </p>
            </div>

            <div className="grid gap-6">
              {[
                { title: "Setup your school in minutes", desc: "No complex installations. Just sign up and start managing." },
                { title: "Automate attendance & fees", desc: "Save hours of manual work with automated SMS and collection." },
                { title: "Track everything in real-time", desc: "Instant visibility into student performance and financials." },
                { title: "Stay connected with parents", desc: "Build trust with instant WhatsApp updates and transparent logs." }
              ].map((benefit, i) => (
                <div key={i} className="flex gap-5 group">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-1 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                    <CheckCircle2 size={14} strokeWidth={3} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">{benefit.title}</h4>
                    <p className="text-slate-500 text-sm leading-relaxed">{benefit.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Contact CTA: Emotional Buildup & Premium Finish */}
      <motion.section 
        id="contact" 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="py-16 md:py-24 px-6 relative overflow-hidden mx-4 md:mx-6 rounded-[2.5rem] md:rounded-[4rem] mb-20 will-change-transform bg-slate-900"
      >
        {/* Advanced Radial Depth Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1e3a8a_0%,#020617_60%)] opacity-80"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-10">
          <div className="space-y-6">
            <h2 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tight">Ready to Transform <br className="hidden md:block" /> Your School?</h2>
            <p className="text-xl text-blue-100/70 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
              Join the future of education management. Schedule a personal demo today <br className="hidden md:block" /> 
              and see how Quantech pays for itself in weeks.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <div className="group relative w-full sm:w-auto">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur opacity-40 group-hover:opacity-70 transition-opacity duration-500"></div>
              <div className="relative inline-flex flex-col sm:flex-row items-center gap-4 bg-slate-900/50 backdrop-blur-md p-2 sm:pr-6 rounded-[2rem] sm:rounded-full border border-white/10 w-full sm:w-auto">
                <div className="bg-blue-600 text-white px-8 py-4 rounded-full font-black text-xl tracking-wider shadow-[0_0_25px_-5px_rgba(37,99,235,0.5)] group-hover:shadow-[0_0_35px_-5px_rgba(37,99,235,0.7)] transition-all w-full sm:w-auto text-center">
                  9488842786
                </div>
                <span className="text-base sm:text-lg font-bold text-white group-hover:text-blue-200 transition-colors text-center pb-2 sm:pb-0">Call us today</span>
              </div>
            </div>

            <a
              href="https://wa.me/919488842786?text=Hi!%20I%20would%20like%20to%20request%20a%20demo%20of%20the%20Quantech%20School%20Management%20Software."
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white px-10 py-5 rounded-full font-black text-lg transition-all border border-white/10 shadow-[0_10px_30px_-5px_rgba(37,211,102,0.3)] hover:shadow-[0_15px_40px_-5px_rgba(37,211,102,0.5)] hover:-translate-y-1 w-full sm:w-auto"
            >
              <MessageCircle size={24} className="group-hover:rotate-12 transition-transform" />
              Request WhatsApp Demo
            </a>
          </div>
        </div>
      </motion.section>

    </main>
  );
}
