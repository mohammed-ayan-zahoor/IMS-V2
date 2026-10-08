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
    isModal = false,
    initialSectionId = "overview"
}) {
    const router = useRouter();
    const [activeSectionId, setActiveSectionId] = useState(initialSectionId);
    const [accepted, setAccepted] = useState(false);
    const [travelDirection, setTravelDirection] = useState(1);
    const [scrollTop, setScrollTop] = useState(0);
    
    // Per-section scroll position cache
    const scrollPositionsRef = useRef({});
    const readingPaneRef = useRef(null);

    const activeIndex = SECTIONS.findIndex((s) => s.id === activeSectionId);
    const activeSection = SECTIONS[activeIndex] || SECTIONS[0];

    const handleSelectSection = (newId) => {
        if (newId === activeSectionId) return;
        const newIndex = SECTIONS.findIndex((s) => s.id === newId);
        
        // Cache current scroll
        if (readingPaneRef.current) {
            scrollPositionsRef.current[activeSectionId] = readingPaneRef.current.scrollTop;
        }

        setTravelDirection(newIndex > activeIndex ? 1 : -1);
        setActiveSectionId(newId);
    };

    // Restore scroll position upon section swap
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
        } else if (isModal && onDecline) {
            onDecline();
        } else {
            router.back();
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

    // Keyboard navigation (↑/↓ to navigate tablist, Esc to close)
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
            className="w-full flex items-center justify-center font-sans antialiased text-[#151515] outline-none select-none"
        >
            <style jsx global>{`
                :root {
                    --tc-page: #FBEDE6;
                    --tc-halo: rgba(244, 190, 165, 0.28);
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
                    --tc-r-sheet: 14px;
                    --tc-r-callout: 12px;
                }
                @media (prefers-color-scheme: dark) {
                    :root {
                        --tc-page: #15100E;
                        --tc-halo: rgba(255, 140, 100, 0.10);
                        --tc-surface: #1E1A18;
                        --tc-hairline: #3A3430;
                        --tc-nav-selected: #2E2926;
                        --tc-nav-hover: #26211F;
                        --tc-text: #F5F1EE;
                        --tc-text-nav: #D8D2CD;
                        --tc-text-body: #C9C2BD;
                        --tc-tint: #2A211D;
                        --tc-tint-strong: #33261F;
                        --tc-accent-text: #FF8A66;
                    }
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
                @media (prefers-reduced-transparency: reduce) {
                    .tc-sheet-halo, .tc-callout-feather, .tc-decline-feather {
                        box-shadow: none !important;
                    }
                }
                @media (prefers-contrast: more) {
                    .tc-callout-feather, .tc-decline-feather {
                        outline: 1px solid var(--tc-text) !important;
                    }
                }
                @media (forced-colors: active) {
                    .tc-selected-nav {
                        background: Highlight !important;
                        color: HighlightText !important;
                    }
                }
            `}</style>

            {/* Main Sheet Container */}
            <motion.div
                initial={isModal ? { opacity: 0, scale: 0.97 } : { opacity: 1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ type: "spring", bounce: 0, duration: 0.35 }}
                className="relative w-full max-w-[725px] h-[536px] bg-[var(--tc-surface)] rounded-[14px] overflow-hidden tc-sheet-halo shadow-[0_0_40px_6px_var(--tc-halo)] grid grid-cols-[225px_1fr] grid-rows-[41px_1fr]"
            >
                {/* Header (Span Full Width) */}
                <header className="col-span-2 h-[41px] flex items-center px-4 gap-3 bg-[var(--tc-surface)] border-b border-[var(--tc-hairline)] z-20">
                    <button
                        type="button"
                        onClick={handleBack}
                        aria-label="Go back"
                        className="p-1 -ml-1 text-[var(--tc-text)] hover:opacity-75 active:scale-95 transition-all cursor-pointer rounded"
                    >
                        <ChevronLeft size={16} strokeWidth={1.75} />
                    </button>
                    <h1 className="text-[13px] font-medium text-[var(--tc-text)] tracking-normal">
                        Terms &amp; Conditions
                    </h1>
                </header>

                {/* Left Section Navigation (Full Height) */}
                <nav
                    role="tablist"
                    aria-orientation="vertical"
                    className="relative bg-[var(--tc-surface)] border-r border-[var(--tc-hairline)] overflow-y-auto overflow-x-hidden z-10"
                >
                    {/* Shared Square Full-Bleed Highlight Gliding Element */}
                    <motion.div
                        layoutId="tc-nav-highlight"
                        className="absolute left-0 right-0 h-[40px] bg-[var(--tc-nav-selected)] pointer-events-none z-0"
                        style={{
                            top: `${activeIndex * 40}px`
                        }}
                        transition={{ type: "spring", bounce: 0, duration: 0.25 }}
                    />

                    {SECTIONS.map((sec, idx) => {
                        const isSelected = sec.id === activeSectionId;
                        return (
                            <button
                                key={sec.id}
                                role="tab"
                                id={`tc-tab-${sec.id}`}
                                aria-selected={isSelected}
                                aria-controls={`tc-panel-${sec.id}`}
                                onClick={() => handleSelectSection(sec.id)}
                                className={`relative z-10 w-full h-[40px] px-[22px] flex items-center text-left text-[14px] leading-[40px] transition-colors cursor-pointer ${
                                    isSelected
                                        ? "font-semibold text-[var(--tc-text)]"
                                        : "font-normal text-[var(--tc-text-nav)] hover:bg-[var(--tc-nav-hover)]"
                                }`}
                            >
                                <span className="relative block">
                                    {sec.navLabel}
                                    {/* Reserved-width bold trick to eliminate layout jitter */}
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
                <main className="relative bg-[var(--tc-surface)] overflow-hidden flex flex-col justify-between">
                    <div
                        ref={readingPaneRef}
                        role="tabpanel"
                        id={`tc-panel-${activeSection.id}`}
                        aria-labelledby={`tc-tab-${activeSection.id}`}
                        onScroll={handleScroll}
                        style={{
                            "--tc-fade-top": scrollTop > 0 ? "24px" : "0px"
                        }}
                        className="tc-fade-mask flex-1 px-[22px] pt-[22px] pb-[76px] overflow-y-auto overscroll-contain select-text"
                    >
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
                                className="space-y-6 max-w-[72ch]"
                            >
                                {/* Welcome Callout (If Section Has It) */}
                                {activeSection.callout && (
                                    <div className="tc-callout-feather bg-[var(--tc-tint)] rounded-[12px] p-[14px_15px] shadow-[0_0_14px_4px_rgba(247,200,180,0.22)]">
                                        <h2 className="text-[13px] leading-[1.2] font-semibold text-[var(--tc-accent-text)] mb-1">
                                            {activeSection.callout.title}
                                        </h2>
                                        <p className="text-[11px] leading-[15.5px] text-[var(--tc-text-body)]">
                                            {activeSection.callout.body}
                                        </p>
                                    </div>
                                )}

                                {/* Clauses List */}
                                <div className="space-y-7">
                                    {activeSection.clauses?.map((clause, idx) => (
                                        <div key={idx} className="space-y-2">
                                            <h2 className="text-[13px] leading-[1.3] font-semibold text-[var(--tc-text)]">
                                                {clause.num}
                                            </h2>
                                            <p className="text-[12px] leading-[18px] text-[var(--tc-text-body)] text-pretty">
                                                {clause.body}
                                            </p>
                                            {clause.list && (
                                                <ul role="list" className="mt-3 space-y-1 pl-0 list-none">
                                                    {clause.list.map((item, lIdx) => (
                                                        <li
                                                            key={lIdx}
                                                            className="text-[12px] leading-[18px] text-[var(--tc-text-body)] text-pretty"
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

                    {/* Right-Aligned Action Footer (No Hairline, Text Fades Above It) */}
                    <footer className="absolute bottom-0 right-0 left-0 h-[66px] flex items-center justify-end px-[22px] pb-[14px] pointer-events-none z-20">
                        <div className="flex items-center gap-2 pointer-events-auto">
                            {/* Decline Button */}
                            <button
                                type="button"
                                onClick={handleDeclineClick}
                                className="tc-decline-feather h-[38px] w-[109px] rounded-full bg-[var(--tc-tint-strong)] text-[var(--tc-accent-text)] font-semibold text-[13px] shadow-[0_0_12px_3px_rgba(247,200,180,0.35)] hover:opacity-90 active:scale-[0.97] transition-all cursor-pointer flex items-center justify-center"
                            >
                                Decline
                            </button>

                            {/* Accept Button */}
                            <button
                                type="button"
                                onClick={handleAcceptClick}
                                className="h-[38px] w-[109px] rounded-full bg-gradient-to-br from-[var(--tc-accept-from)] to-[var(--tc-accept-to)] text-white font-semibold text-[13px] shadow-[0_4px_10px_-4px_rgba(200,74,39,0.30)] hover:brightness-105 active:scale-[0.97] transition-all cursor-pointer flex items-center justify-center"
                            >
                                <AnimatePresence mode="wait" initial={false}>
                                    {accepted ? (
                                        <motion.span
                                            key="accepted"
                                            initial={{ opacity: 0, scale: 0.7 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ type: "spring", bounce: 0, duration: 0.25 }}
                                            className="flex items-center gap-1"
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
            </motion.div>
        </div>
    );
}
