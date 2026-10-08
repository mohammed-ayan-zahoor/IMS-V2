"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SECTIONS = [
    {
        id: "overview",
        navLabel: "Overview",
        title: "Terms & Conditions",
        callout: {
            title: "Welcome!",
            body: "These Terms and Conditions govern your use of our educational ERP application and related services. Please read these Terms carefully. By accessing, logging in, or using our Platform, you agree to be bound by these Terms."
        },
        clauses: [
            {
                num: "1. Acceptance of Terms",
                body: "By accessing or using this app, you agree to comply with these Terms and all applicable laws and regulations. If you are using the app on behalf of an organization or institution, you represent that you have the authority to bind that organization to these Terms."
            },
            {
                num: "2. Eligibility",
                body: "You must be at least 18 years old or have the verified consent of a parent, guardian, or educational institution to use the app. By using the app, you affirm that you meet these eligibility requirements."
            },
            {
                num: "3. Account Registration",
                body: "Some features may require creating an account. You agree to:",
                list: [
                    "Provide accurate, complete, and current information.",
                    "Keep your login credentials confidential and secure.",
                    "Promptly notify institution administrators of any unauthorized access."
                ]
            }
        ]
    },
    {
        id: "privacy",
        navLabel: "Privacy Policy",
        title: "Privacy Policy",
        callout: {
            title: "Data Protection & Privacy",
            body: "Your privacy is paramount. We implement enterprise-grade encryption and security practices to ensure your personal, institutional, and student records remain confidential."
        },
        clauses: [
            {
                num: "1. Information We Collect",
                body: "We collect information necessary to deliver educational and academic ERP services, including authenticated user credentials, academic progress, and institutional logs."
            },
            {
                num: "2. How We Use Information",
                body: "Information is utilized strictly to provide, maintain, and optimize educational workflows, proctored assessments, and fee management."
            }
        ]
    },
    {
        id: "user-agreement",
        navLabel: "User Agreement",
        title: "User Agreement",
        clauses: [
            {
                num: "1. Permitted Use",
                body: "Users are granted a revocable, non-exclusive license to access institutional portals solely for legitimate educational and administrative purposes."
            },
            {
                num: "2. Institutional Governance",
                body: "Administrators and faculty members agree to uphold all institutional academic codes of conduct and student privacy safeguards."
            }
        ]
    },
    {
        id: "data-collection",
        navLabel: "Data Collection & Usage",
        title: "Data Collection & Usage",
        clauses: [
            {
                num: "1. Academic & Operational Logs",
                body: "System activity, session logs, and access timestamps are archived for accountability, audit compliance, and system security."
            },
            {
                num: "2. Third-Party Integrations",
                body: "Authorized third-party gateways (e.g., messaging and payment processors) adhere strictly to our data processing guidelines."
            }
        ]
    },
    {
        id: "health-confidentiality",
        navLabel: "Health Data Confidentiality",
        title: "Health Data Confidentiality",
        clauses: [
            {
                num: "1. Medical Records Safeguard",
                body: "Any student health or medical exemption records stored within the portal are restricted strictly to authorized medical and administrative personnel."
            },
            {
                num: "2. Statutory Compliance",
                body: "All student health records are protected in compliance with regional healthcare privacy regulations and institutional safety policies."
            }
        ]
    },
    {
        id: "consent-permissions",
        navLabel: "Consent & Permissions",
        title: "Consent & Permissions",
        clauses: [
            {
                num: "1. Communication Consent",
                body: "By continuing, you consent to receive critical academic notifications, fee alerts, and examination schedules via authenticated channels."
            },
            {
                num: "2. Revocation Rights",
                body: "You may manage optional communication preferences or request record updates through your institutional administrator at any time."
            }
        ]
    },
    {
        id: "user-responsibilities",
        navLabel: "User Responsibilities",
        title: "User Responsibilities",
        clauses: [
            {
                num: "1. Credential Security",
                body: "You are solely responsible for safeguarding your authentication credentials and preventing unauthorized third-party device access."
            },
            {
                num: "2. Accurate Representation",
                body: "All submissions, assessments, and profile updates must accurately reflect true personal and academic information."
            }
        ]
    },
    {
        id: "prohibited-activities",
        navLabel: "Prohibited Activities",
        title: "Prohibited Activities",
        clauses: [
            {
                num: "1. Unauthorized Interference",
                body: "Any attempt to reverse engineer, disrupt, bypass security tokens, or scrape institutional records is strictly prohibited."
            },
            {
                num: "2. Penalties",
                body: "Violations result in immediate credential revocation and may be subject to legal and institutional disciplinary action."
            }
        ]
    }
];

export default function TermsSheet({
    onAccept,
    onDecline,
    onBack,
    initialSectionId = "overview"
}) {
    const router = useRouter();
    const [activeSectionId, setActiveSectionId] = useState(initialSectionId);
    const [accepted, setAccepted] = useState(false);
    const [travelDirection, setTravelDirection] = useState(1);
    const [scrollTop, setScrollTop] = useState(0);
    
    const scrollPositionsRef = useRef({});
    const readingPaneRef = useRef(null);

    const activeIndex = SECTIONS.findIndex((s) => s.id === activeSectionId);
    const activeSection = SECTIONS[activeIndex] || SECTIONS[0];

    const handleSelectSection = (newId) => {
        if (newId === activeSectionId) return;
        const newIndex = SECTIONS.findIndex((s) => s.id === newId);
        
        if (readingPaneRef.current) {
            scrollPositionsRef.current[activeSectionId] = readingPaneRef.current.scrollTop;
        }

        setTravelDirection(newIndex > activeIndex ? 1 : -1);
        setActiveSectionId(newId);
    };

    useEffect(() => {
        if (readingPaneRef.current) {
            const saved = scrollPositionsRef.current[activeSectionId] || 0;
            readingPaneRef.current.scrollTop = saved;
            setScrollTop(saved);
        }
    }, [activeSectionId]);

    const handleScroll = (e) => {
        setScrollTop(e.currentTarget.scrollTop);
    };

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            router.push("/login");
        }
    };

    const handleDeclineClick = () => {
        if (onDecline) {
            onDecline();
        } else {
            router.push("/login");
        }
    };

    const handleAcceptClick = () => {
        setAccepted(true);
        setTimeout(() => {
            if (onAccept) {
                onAccept();
            } else {
                router.push("/login");
            }
        }, 600);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Escape") {
            handleBack();
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            const nextIdx = (activeIndex + 1) % SECTIONS.length;
            handleSelectSection(SECTIONS[nextIdx].id);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            const prevIdx = (activeIndex - 1 + SECTIONS.length) % SECTIONS.length;
            handleSelectSection(SECTIONS[prevIdx].id);
        }
    };

    return (
        <div 
            onKeyDown={handleKeyDown}
            tabIndex={-1}
            className="h-screen w-screen flex flex-col bg-white font-sans antialiased text-[#151515] outline-none select-none overflow-hidden"
        >
            <style jsx global>{`
                :root {
                    --tc-page: #FBEDE6;
                    --tc-surface: #FFFFFF;
                    --tc-hairline: #DEDEDE;
                    --tc-nav-selected: #E8E8E8;
                    --tc-nav-hover: #F3F3F3;
                    --tc-text: #151515;
                    --tc-text-nav: #333333;
                    --tc-text-body: #4F4F4F;
                    --tc-tint: #FDF6F1;
                    --tc-tint-strong: #FCEFEA;
                    --tc-accent-text: #BE371D;
                    --tc-accept-from: #CC4A27;
                    --tc-accept-to: #B63A1D;
                    --tc-r-callout: 12px;
                }
                .tc-fade-mask {
                    mask-image: linear-gradient(
                        to bottom,
                        transparent 0,
                        #000 var(--tc-fade-top, 0px),
                        #000 calc(100% - 98px),
                        transparent calc(100% - 66px)
                    );
                    -webkit-mask-image: linear-gradient(
                        to bottom,
                        transparent 0,
                        #000 var(--tc-fade-top, 0px),
                        #000 calc(100% - 98px),
                        transparent calc(100% - 66px)
                    );
                }
            `}</style>

            {/* Header (Full Width Top Bar) */}
            <header className="h-[48px] w-full flex items-center px-6 gap-3 bg-white border-b border-[#DEDEDE] z-20 shrink-0">
                <button
                    type="button"
                    onClick={handleBack}
                    aria-label="Go back"
                    className="p-1.5 -ml-1.5 text-[#151515] hover:opacity-75 active:scale-95 transition-all cursor-pointer rounded flex items-center justify-center"
                >
                    <ChevronLeft size={18} strokeWidth={1.75} />
                </button>
                <h1 className="text-[14px] font-medium text-[#151515] tracking-normal">
                    Terms &amp; Conditions
                </h1>
            </header>

            {/* Main Master-Detail Body */}
            <div className="flex-1 w-full grid grid-cols-[240px_1fr] md:grid-cols-[260px_1fr] overflow-hidden">
                {/* Left Section Navigation */}
                <nav
                    role="tablist"
                    aria-orientation="vertical"
                    className="relative bg-white border-r border-[#DEDEDE] overflow-y-auto overflow-x-hidden z-10 select-none"
                >
                    {/* Shared Square Full-Bleed Selection Band */}
                    <motion.div
                        layoutId="tc-nav-highlight-fullscreen"
                        className="absolute left-0 right-0 h-[44px] bg-[#E8E8E8] pointer-events-none z-0"
                        style={{
                            top: `${activeIndex * 44}px`
                        }}
                        transition={{ type: "spring", bounce: 0, duration: 0.25 }}
                    />

                    {SECTIONS.map((sec) => {
                        const isSelected = sec.id === activeSectionId;
                        return (
                            <button
                                key={sec.id}
                                role="tab"
                                id={`tc-tab-${sec.id}`}
                                aria-selected={isSelected}
                                aria-controls={`tc-panel-${sec.id}`}
                                onClick={() => handleSelectSection(sec.id)}
                                className={`relative z-10 w-full h-[44px] px-[22px] flex items-center text-left text-[14px] leading-[44px] transition-colors cursor-pointer ${
                                    isSelected
                                        ? "font-semibold text-[#151515]"
                                        : "font-normal text-[#333333] hover:bg-[#F3F3F3]"
                                }`}
                            >
                                <span className="relative block">
                                    {sec.navLabel}
                                    <span
                                        aria-hidden="true"
                                        className="block h-0 font-semibold invisible overflow-hidden"
                                    >
                                        {sec.navLabel}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </nav>

                {/* Right Reading Pane */}
                <main className="relative bg-white overflow-hidden flex flex-col justify-between">
                    <div
                        ref={readingPaneRef}
                        role="tabpanel"
                        id={`tc-panel-${activeSection.id}`}
                        aria-labelledby={`tc-tab-${activeSection.id}`}
                        onScroll={handleScroll}
                        style={{
                            "--tc-fade-top": scrollTop > 0 ? "24px" : "0px"
                        }}
                        className="tc-fade-mask flex-1 px-8 md:px-14 pt-8 pb-[86px] overflow-y-auto overscroll-contain select-text"
                    >
                        <div className="max-w-[760px] mx-auto">
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.div
                                    key={activeSection.id}
                                    initial={{
                                        opacity: 0,
                                        y: travelDirection * 8
                                    }}
                                    animate={{
                                        opacity: 1,
                                        y: 0
                                    }}
                                    exit={{
                                        opacity: 0,
                                        y: travelDirection * -8
                                    }}
                                    transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                                    className="space-y-7"
                                >
                                    {/* Welcome Callout (If Section Has It) */}
                                    {activeSection.callout && (
                                        <div className="bg-[#FDF6F1] rounded-[12px] p-[16px_18px] shadow-[0_0_14px_4px_rgba(247,200,180,0.22)]">
                                            <h2 className="text-[14px] leading-[1.2] font-semibold text-[#BE371D] mb-1.5">
                                                {activeSection.callout.title}
                                            </h2>
                                            <p className="text-[12px] leading-[17px] text-[#4F4F4F]">
                                                {activeSection.callout.body}
                                            </p>
                                        </div>
                                    )}

                                    {/* Clauses List */}
                                    <div className="space-y-8">
                                        {activeSection.clauses?.map((clause, idx) => (
                                            <div key={idx} className="space-y-2.5">
                                                <h2 className="text-[14px] leading-[1.3] font-semibold text-[#151515]">
                                                    {clause.num}
                                                </h2>
                                                <p className="text-[13px] leading-[20px] text-[#4F4F4F] text-pretty max-w-[72ch]">
                                                    {clause.body}
                                                </p>
                                                {clause.list && (
                                                    <ul role="list" className="mt-3.5 space-y-1.5 pl-0 list-none max-w-[72ch]">
                                                        {clause.list.map((item, lIdx) => (
                                                            <li
                                                                key={lIdx}
                                                                className="text-[13px] leading-[20px] text-[#4F4F4F] text-pretty"
                                                            >
                                                                {item}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Right-Aligned Action Footer */}
                    <footer className="absolute bottom-0 right-0 left-0 h-[72px] flex items-center justify-end px-8 md:px-14 pb-4 pointer-events-none z-20 bg-gradient-to-t from-white via-white/95 to-transparent">
                        <div className="flex items-center gap-3 pointer-events-auto">
                            {/* Decline Button */}
                            <button
                                type="button"
                                onClick={handleDeclineClick}
                                className="h-[38px] w-[114px] rounded-full bg-[#FCEFEA] text-[#BE371D] font-semibold text-[13px] shadow-[0_0_12px_3px_rgba(247,200,180,0.35)] hover:opacity-90 active:scale-[0.97] transition-all cursor-pointer flex items-center justify-center"
                            >
                                Decline
                            </button>

                            {/* Accept Button */}
                            <button
                                type="button"
                                onClick={handleAcceptClick}
                                className="h-[38px] w-[114px] rounded-full bg-gradient-to-br from-[#CC4A27] to-[#B63A1D] text-white font-semibold text-[13px] shadow-[0_4px_10px_-4px_rgba(200,74,39,0.30)] hover:brightness-105 active:scale-[0.97] transition-all cursor-pointer flex items-center justify-center"
                            >
                                <AnimatePresence mode="wait" initial={false}>
                                    {accepted ? (
                                        <motion.span
                                            key="accepted"
                                            initial={{ opacity: 0, scale: 0.7 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ type: "spring", bounce: 0, duration: 0.25 }}
                                            className="flex items-center gap-1.5"
                                        >
                                            <Check size={14} strokeWidth={2.5} />
                                            <span>Accepted</span>
                                        </motion.span>
                                    ) : (
                                        <motion.span
                                            key="accept"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            Accept
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </button>
                        </div>
                    </footer>
                </main>
            </div>
        </div>
    );
}
