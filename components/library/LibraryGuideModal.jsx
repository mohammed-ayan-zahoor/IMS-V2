"use client";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { BookOpen, ScanLine, Clock, AlertCircle, Printer, ShieldCheck } from "lucide-react";

export default function LibraryGuideModal({ isOpen = true, onClose }) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Library Management Guide" className="max-w-4xl">
            <div className="space-y-6 text-sm text-slate-700">
                {/* Intro summary */}
                <div className="border-b border-slate-100 pb-4">
                    <p className="text-xs text-slate-600 leading-relaxed">
                        The <strong className="text-slate-900 font-semibold">Library Module</strong> streamlines institutional book cataloging, physical copy tracking, scanner-assisted desk circulation, student hold reservations, and automated overdue fine calculations.
                    </p>
                </div>

                {/* 2-Column Responsive Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    {/* Left Column: Catalog & Circulation */}
                    <div className="space-y-6">
                        {/* Section 1: Catalog & Accessioning */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                                <BookOpen size={14} className="text-slate-500" />
                                <span>1. Catalog & Copy Accessioning</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Manage title records and physical assets under the <strong className="text-slate-700">Catalog</strong> tab:
                            </p>
                            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1.5 pl-1">
                                <li>
                                    <strong>Add Book Titles</strong>: Enter title, authors, publisher, and optional ISBN. If an ISBN is supplied, cover art is automatically queried and cached from Open Library.
                                </li>
                                <li>
                                    <strong>Accessioning Copies</strong>: Click <span className="font-semibold text-slate-800">+</span> on any title to add physical copies. Accession numbers (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px] text-slate-800">LIB-2026-000001</code>) are sequentially auto-generated.
                                </li>
                                <li>
                                    <strong>Stock Visibility</strong>: Available vs total copies are aggregated on-the-fly per book with no slow recalculations.
                                </li>
                            </ul>
                        </div>

                        {/* Section 2: Circulation & Fast Scanner Wedge */}
                        <div className="space-y-2 border-t border-slate-100 pt-5">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                                <ScanLine size={14} className="text-slate-500" />
                                <span>2. Desk Circulation & Barcode Wedge</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Process transactions quickly under the <strong className="text-slate-700">Circulation</strong> tab:
                            </p>
                            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1.5 pl-1">
                                <li>
                                    <strong>Fast Modes</strong>: Select <em>Issue</em>, <em>Return</em>, <em>Renew</em>, or <em>Lost</em>.
                                </li>
                                <li>
                                    <strong>Hardware Scanner Ready</strong>: The accession input is autofocused. Standard USB and Bluetooth handheld scanners act as a keyboard wedge, automatically submitting on barcode scan.
                                </li>
                                <li>
                                    <strong>Issue Verification</strong>: Checks patron borrowing limits (<code className="text-[11px] font-mono">maxBooks</code>) by role and validates hold priority before issuing.
                                </li>
                                <li>
                                    <strong>In-Place Renewals</strong>: Extends due dates in-place while enforcing institute renewal caps and hold waiting queues.
                                </li>
                            </ul>
                        </div>

                        {/* Section 3: Barcode Label Sheets */}
                        <div className="space-y-2 border-t border-slate-100 pt-5">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                                <Printer size={14} className="text-slate-500" />
                                <span>3. Barcode Label Sheet Printing</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Click the <strong className="text-slate-800">Printer icon</strong> on any catalog title to select copies and print standard <strong>Avery 3×10 (30 labels/page)</strong> Code-128 stickers directly from the browser.
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Holds, Fines & Permissions */}
                    <div className="space-y-6">
                        {/* Section 4: Holds & Reservations */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                                <Clock size={14} className="text-slate-500" />
                                <span>4. Reservation & Hold Queues</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Coordinate high-demand titles under the <strong className="text-slate-700">Holds</strong> tab:
                            </p>
                            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1.5 pl-1">
                                <li>
                                    <strong>Automatic Advance</strong>: Returning a copy automatically promotes the oldest waiting patron to <em>Ready</em> and locks the copy as <em>Reserved</em>.
                                </li>
                                <li>
                                    <strong>Smart Expiry Sweep</strong>: If the holding patron fails to claim the copy within the configured hold expiry days, background sweeps release it to the next waiter.
                                </li>
                            </ul>
                        </div>

                        {/* Section 5: Fines & Reports */}
                        <div className="space-y-2 border-t border-slate-100 pt-5">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                                <AlertCircle size={14} className="text-slate-500" />
                                <span>5. Overdue Fines & Reports</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Monitor borrowing analytics and fines under the <strong className="text-slate-700">Reports</strong> tab, and configure institutional rules under <strong className="text-slate-700">Settings</strong>:
                            </p>
                            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1.5 pl-1">
                                <li>
                                    <strong>Fine Engine</strong>: Accrues daily or flat fines after grace days at check-in. Marking a book <em>Lost</em> automatically applies replacement cost billing.
                                </li>
                                <li>
                                    <strong>Most Borrowed</strong>: Ranks books by total circulation frequency.
                                </li>
                                <li>
                                    <strong>Rules & Config</strong>: Set loan periods, max books, renewal limits per role, and fine rates in the dedicated <em>Settings</em> comparison table.
                                </li>
                            </ul>
                            <div className="mt-2.5 p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs text-amber-800 leading-relaxed">
                                <strong>Notice on Finance Isolation</strong>: Fines recorded in the library are managed independently and will not alter the academic Fee Ledger or cash drawer Day Book.
                            </div>
                        </div>

                        {/* Section 6: Staff Permissions */}
                        <div className="space-y-2 border-t border-slate-100 pt-5">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                                <ShieldCheck size={14} className="text-slate-500" />
                                <span>6. Staff Permissions (Librarians)</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Instructors or non-admin staff can be granted access by enabling the <strong className="text-slate-800">Manage library (Librarian)</strong> checkbox in <em>Administration → User Management</em>.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end pt-4 border-t border-slate-100">
                    <Button onClick={onClose} size="sm">
                        Got it
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
