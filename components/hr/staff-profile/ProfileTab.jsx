"use client";

import React, { useState, useEffect } from "react";
import {
  Mail,
  Phone,
  MapPin,
  User,
  Hash,
  Shield,
  Briefcase,
  Building2,
  Calendar,
  GraduationCap,
  UserCheck,
  HeartHandshake,
  Landmark,
  CreditCard,
  FileText,
  Coins,
  KeyRound,
  Check,
  Copy,
  Eye,
  EyeOff,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { InfoRow } from "./InfoRow";
import { Money } from "./Money";
import Badge from "@/components/ui/Badge";

export function ProfileTab({
  staff,
  grossSalary = 0,
  estNetSalary = 0,
  onOpenEditProfile,
  onSwitchTab,
}) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLoginLink, setCopiedLoginLink] = useState(false);
  const [isBankRevealed, setIsBankRevealed] = useState(false);
  const [isPanRevealed, setIsPanRevealed] = useState(false);

  // Auto-mask after 30 seconds
  useEffect(() => {
    if (isBankRevealed) {
      const timer = setTimeout(() => setIsBankRevealed(false), 30000);
      return () => clearTimeout(timer);
    }
  }, [isBankRevealed]);

  useEffect(() => {
    if (isPanRevealed) {
      const timer = setTimeout(() => setIsPanRevealed(false), 30000);
      return () => clearTimeout(timer);
    }
  }, [isPanRevealed]);

  const handleCopyCode = async (code) => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error("Failed to copy code", err);
    }
  };

  const handleCopyLoginLink = async () => {
    try {
      const url = `${window.location.origin}/login`;
      await navigator.clipboard.writeText(url);
      setCopiedLoginLink(true);
      setTimeout(() => setCopiedLoginLink(false), 2000);
    } catch (err) {
      console.error("Failed to copy login link", err);
    }
  };

  const formatIndianDate = (dateVal) => {
    if (!dateVal) return null;
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return null;
      return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(d);
    } catch {
      return null;
    }
  };

  const calculateTenure = (joiningDateVal) => {
    if (!joiningDateVal) return "";
    try {
      const joined = new Date(joiningDateVal);
      if (isNaN(joined.getTime())) return "";
      const now = new Date();
      const diffMonths =
        (now.getFullYear() - joined.getFullYear()) * 12 +
        (now.getMonth() - joined.getMonth());
      if (diffMonths < 1) return "Joined recently";
      if (diffMonths < 12) return `${diffMonths} mos`;
      const years = Math.floor(diffMonths / 12);
      return `${years} ${years === 1 ? "yr" : "yrs"}`;
    } catch {
      return "";
    }
  };

  const fullName = `${staff?.profile?.firstName || ""} ${
    staff?.profile?.lastName || ""
  }`.trim();
  const employeeCode = staff?.employeeCode || staff?.employeeId || "";
  const designation =
    staff?.hrDetails?.designation?.name ||
    staff?.hrDetails?.designation ||
    "";
  const department =
    staff?.department?.name ||
    staff?.department?.code ||
    staff?.department ||
    "";
  const roleName =
    staff?.role === "admin"
      ? "Administrator"
      : staff?.role === "faculty" || staff?.role === "instructor"
      ? "Teaching faculty"
      : "Support staff";

  const joiningFormatted = formatIndianDate(staff?.hrDetails?.joiningDate);
  const tenure = calculateTenure(staff?.hrDetails?.joiningDate);
  const joiningText = joiningFormatted
    ? `${joiningFormatted}${tenure ? ` (${tenure})` : ""}`
    : null;

  const dobFormatted = formatIndianDate(staff?.profile?.dateOfBirth);

  const address = staff?.profile?.address;
  const street = address?.street;
  const city = address?.city;
  const stateAndPin = [address?.state, address?.pincode].filter(Boolean).join(" - ");

  const bank = staff?.hrDetails?.bankDetails || {};
  const hasBankDetails =
    Boolean(bank.accountNumber && bank.accountNumber.trim()) ||
    Boolean(bank.bankName && bank.bankName.trim());

  const maskAccount = (num) => {
    if (!num) return "";
    if (num.length <= 4) return num;
    return "•••• " + num.slice(-4);
  };

  const maskPan = (pan) => {
    if (!pan) return "";
    if (pan.length <= 4) return pan;
    return "••••••" + pan.slice(-4);
  };

  const panNumber = staff?.hrDetails?.panNumber?.trim() || "";
  const uanNumber = staff?.hrDetails?.uanNumber?.trim() || "";
  const esiNumber = staff?.hrDetails?.esiNumber?.trim() || "";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
      {/* LEFT COLUMN */}
      <div className="space-y-6">
        {/* CONTACT & ADDRESS */}
        <div className="bg-white rounded-lg border border-slate-100 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 bg-[#F9FAFB] border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Contact &amp; Address
            </h3>
            <button
              type="button"
              onClick={onOpenEditProfile}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Edit
            </button>
          </div>
          <div className="p-5 space-y-1">
            <InfoRow
              icon={Mail}
              label="Email Address"
              value={
                staff?.email ? (
                  <a
                    href={`mailto:${staff.email}`}
                    className="hover:underline text-slate-900"
                  >
                    {staff.email}
                  </a>
                ) : null
              }
            />
            <InfoRow
              icon={Phone}
              label="Phone Number"
              value={
                staff?.profile?.phone ? (
                  <a
                    href={`tel:${staff.profile.phone}`}
                    className="hover:underline text-slate-900"
                  >
                    {staff.profile.phone}
                  </a>
                ) : null
              }
            />
            <InfoRow icon={MapPin} label="Street Address" value={street} />
            <InfoRow icon={MapPin} label="City" value={city} />
            <InfoRow icon={MapPin} label="State &amp; Pin" value={stateAndPin} />
            <InfoRow
              icon={KeyRound}
              label="Portal Sign-in"
              value={
                <div className="flex items-center gap-2">
                  <Badge
                    variant={staff?.allowLogin !== false ? "success" : "neutral"}
                    className="text-[10px] px-2 py-0.5 font-bold"
                  >
                    {staff?.allowLogin !== false ? "Enabled" : "Disabled"}
                  </Badge>
                  {staff?.allowLogin !== false && (
                    <button
                      type="button"
                      onClick={handleCopyLoginLink}
                      className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer ml-1"
                    >
                      {copiedLoginLink ? "Copied!" : "Copy Link"}
                    </button>
                  )}
                </div>
              }
            />
          </div>
        </div>

        {/* IDENTITY & EMPLOYMENT */}
        <div className="bg-white rounded-lg border border-slate-100 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 bg-[#F9FAFB] border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Identity &amp; Employment
            </h3>
            <button
              type="button"
              onClick={onOpenEditProfile}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Edit
            </button>
          </div>
          <div className="p-5 space-y-1">
            <InfoRow icon={User} label="Full Name" value={fullName} />
            <InfoRow
              icon={Hash}
              label="Employee Code"
              value={
                employeeCode ? (
                  <span className="inline-flex items-center gap-1.5 font-mono">
                    <span>{employeeCode}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(employeeCode)}
                      title="Copy employee code"
                      className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                    >
                      {copiedCode ? (
                        <Check size={12} className="text-emerald-600" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </span>
                ) : null
              }
            />
            <InfoRow icon={Briefcase} label="Designation" value={designation} />
            <InfoRow icon={Shield} label="Role / Category" value={roleName} />
            <InfoRow icon={Building2} label="Department" value={department} />
            <InfoRow icon={Calendar} label="Date of Joining" value={joiningText} />
            <InfoRow
              icon={GraduationCap}
              label="Qualification"
              value={staff?.hrDetails?.qualification}
            />
            <InfoRow icon={UserCheck} label="Gender" value={staff?.profile?.gender} />
            <InfoRow icon={Calendar} label="Date of Birth" value={dobFormatted} />
            <InfoRow
              icon={HeartHandshake}
              label="Blood Group"
              value={staff?.profile?.bloodGroup}
            />
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="space-y-6">
        {/* BANK ACCOUNT */}
        <div className="bg-white rounded-lg border border-slate-100 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 bg-[#F9FAFB] border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Bank Account Details
            </h3>
            <button
              type="button"
              onClick={onOpenEditProfile}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              {hasBankDetails ? "Edit" : "Configure"}
            </button>
          </div>

          {hasBankDetails ? (
            <div className="p-5 space-y-1">
              <InfoRow icon={Landmark} label="Bank Name" value={bank.bankName} />
              <InfoRow
                icon={User}
                label="Account Holder"
                value={bank.accountName || fullName}
              />
              <InfoRow
                icon={CreditCard}
                label="Account Number"
                value={
                  bank.accountNumber ? (
                    <span className="inline-flex items-center gap-1.5 font-mono">
                      <span>
                        {isBankRevealed
                          ? bank.accountNumber
                          : maskAccount(bank.accountNumber)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsBankRevealed(!isBankRevealed)}
                        title={isBankRevealed ? "Hide account" : "Reveal (30s)"}
                        className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                      >
                        {isBankRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </span>
                  ) : null
                }
              />
              <InfoRow
                icon={FileText}
                label="IFSC Code"
                value={
                  bank.ifscCode ? (
                    <span className="font-mono uppercase">{bank.ifscCode}</span>
                  ) : null
                }
              />
              <InfoRow icon={Building2} label="Branch" value={bank.branch} />
            </div>
          ) : (
            <div className="p-6 text-center space-y-3 bg-amber-50/40">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <AlertCircle size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Bank Account Not Set Up
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Salary cannot be paid by bank transfer until direct deposit details are added.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenEditProfile}
                className="h-8 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Add Bank Details
              </button>
            </div>
          )}
        </div>

        {/* STATUTORY IDS */}
        <div className="bg-white rounded-lg border border-slate-100 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 bg-[#F9FAFB] border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Statutory &amp; Government IDs
            </h3>
            <button
              type="button"
              onClick={onOpenEditProfile}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Edit
            </button>
          </div>
          <div className="p-5 space-y-1">
            <InfoRow
              icon={CreditCard}
              label="PAN Number"
              value={
                panNumber ? (
                  <span className="inline-flex items-center gap-1.5 font-mono uppercase">
                    <span>{isPanRevealed ? panNumber : maskPan(panNumber)}</span>
                    <button
                      type="button"
                      onClick={() => setIsPanRevealed(!isPanRevealed)}
                      title={isPanRevealed ? "Hide PAN" : "Reveal (30s)"}
                      className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                    >
                      {isPanRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </span>
                ) : null
              }
            />
            <InfoRow
              icon={Shield}
              label="UAN / EPF Number"
              value={uanNumber ? <span className="font-mono">{uanNumber}</span> : null}
            />
            <InfoRow
              icon={HeartHandshake}
              label="ESI Number"
              value={esiNumber ? <span className="font-mono">{esiNumber}</span> : null}
            />
          </div>
        </div>

        {/* COMPENSATION SUMMARY */}
        <div className="bg-white rounded-lg border border-slate-100 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 bg-[#F9FAFB] border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Compensation Summary
            </h3>
            {onSwitchTab && (
              <button
                type="button"
                onClick={() => onSwitchTab("salary")}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
              >
                <span>Open Salary</span>
                <ExternalLink size={12} />
              </button>
            )}
          </div>
          <div className="p-5 space-y-1">
            <InfoRow
              icon={Coins}
              label="Monthly Basic Pay"
              value={<Money value={staff?.hrDetails?.basicSalary || 0} fixed />}
            />
            <InfoRow
              icon={CreditCard}
              label="Gross / Month"
              value={<Money value={grossSalary} fixed />}
            />
            <InfoRow
              icon={Coins}
              label="Est. Net Take-Home"
              value={
                <span className="text-emerald-700 font-extrabold text-base">
                  <Money value={estNetSalary} fixed />
                </span>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
