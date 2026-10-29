"use client";

import React, { useState, useEffect } from "react";
import { Copy, Check, Eye, EyeOff } from "lucide-react";
import { DefinitionList, DefinitionRow } from "./DefinitionList";
import { StatusDot } from "./StatusDot";
import { Money } from "./Money";
import { EmptyValue } from "./EmptyValue";

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
      ? "Admin"
      : staff?.role === "faculty"
      ? "Faculty"
      : "Staff";

  const joiningFormatted = formatIndianDate(staff?.hrDetails?.joiningDate);
  const tenure = calculateTenure(staff?.hrDetails?.joiningDate);
  const joiningText = joiningFormatted
    ? `${joiningFormatted}${tenure ? ` · ${tenure}` : ""}`
    : null;

  const dobFormatted = formatIndianDate(staff?.profile?.dateOfBirth);

  const address = staff?.profile?.address;
  const addressParts = [
    address?.street,
    address?.city,
    address?.state,
    address?.pincode,
  ].filter(Boolean);
  const addressText = addressParts.length > 0 ? addressParts.join(", ") : null;

  const bank = staff?.hrDetails?.bankDetails || {};
  const hasBankDetails =
    Boolean(bank.accountNumber && bank.accountNumber.trim()) ||
    Boolean(bank.bankName && bank.bankName.trim());

  const maskAccount = (num) => {
    if (!num) return "";
    if (num.length <= 4) return num;
    return "••••" + num.slice(-4);
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* LEFT 60% — Personal & Employment */}
      <div className="lg:col-span-7 space-y-6">
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-[15px] font-semibold tracking-tight text-[#101323] dark:text-gray-100">
            Personal & employment
          </h2>
          <button
            type="button"
            onClick={onOpenEditProfile}
            className="text-xs font-medium text-[#4F46E5] dark:text-indigo-400 hover:underline cursor-pointer"
          >
            Edit
          </button>
        </div>

        {/* IDENTITY GROUP */}
        <DefinitionList eyebrow="IDENTITY">
          <DefinitionRow label="Full name" value={fullName} />
          <DefinitionRow
            label="Employee code"
            mono
            value={
              employeeCode ? (
                <span className="inline-flex items-center gap-2">
                  <span>{employeeCode}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(employeeCode)}
                    title="Copy employee code"
                    aria-label="Copy employee code"
                    className="text-[#6B7280] hover:text-[#101323] dark:hover:text-white transition-colors cursor-pointer p-0.5"
                  >
                    {copiedCode ? (
                      <Check className="w-3.5 h-3.5 text-[#047857]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </span>
              ) : null
            }
          />
          <DefinitionRow label="Gender" value={staff?.profile?.gender} />
          <DefinitionRow label="Date of birth" value={dobFormatted} />
          <DefinitionRow label="Blood group" value={staff?.profile?.bloodGroup} />
        </DefinitionList>

        {/* EMPLOYMENT GROUP */}
        <DefinitionList eyebrow="EMPLOYMENT">
          <DefinitionRow label="Designation" value={designation} />
          <DefinitionRow label="Role" value={roleName} />
          <DefinitionRow label="Department" value={department} />
          <DefinitionRow label="Joined" value={joiningText} />
          <DefinitionRow
            label="Qualification"
            value={staff?.hrDetails?.qualification}
          />
        </DefinitionList>

        {/* CONTACT & ACCESS GROUP */}
        <DefinitionList eyebrow="CONTACT & ACCESS">
          <DefinitionRow
            label="Phone"
            value={
              staff?.profile?.phone ? (
                <a
                  href={`tel:${staff.profile.phone}`}
                  className="hover:underline text-[#101323] dark:text-gray-200"
                >
                  {staff.profile.phone}
                </a>
              ) : null
            }
          />
          <DefinitionRow
            label="Email"
            value={
              staff?.email ? (
                <a
                  href={`mailto:${staff.email}`}
                  className="hover:underline text-[#101323] dark:text-gray-200"
                >
                  {staff.email}
                </a>
              ) : null
            }
          />
          <DefinitionRow label="Address" value={addressText} />
          <DefinitionRow
            label="Portal sign-in"
            value={
              <div className="flex flex-wrap items-center gap-2">
                <StatusDot
                  tone={staff?.allowLogin !== false ? "positive" : "muted"}
                  label={staff?.allowLogin !== false ? "Enabled" : "Disabled"}
                />
                {staff?.allowLogin !== false && (
                  <>
                    <span className="text-[#6B7280]">·</span>
                    <button
                      type="button"
                      onClick={handleCopyLoginLink}
                      className="text-xs font-medium text-[#4F46E5] dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      {copiedLoginLink ? "Copied link!" : "Copy sign-in link"}
                    </button>
                  </>
                )}
              </div>
            }
          />
        </DefinitionList>
      </div>

      {/* RIGHT 40% — Bank Account, Statutory IDs, Compensation */}
      <div className="lg:col-span-5 space-y-6">
        {/* BANK ACCOUNT (The one bordered panel, r10) */}
        <div
          className={`rounded-[10px] bg-white dark:bg-gray-900 border p-4 sm:p-5 transition-all ${
            hasBankDetails
              ? "border-[#E9E9F1] dark:border-gray-800"
              : "border-[#E9E9F1] dark:border-gray-800 border-l-[3px] border-l-[#B45309]"
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#E9E9F1] dark:border-gray-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#101323] dark:text-gray-200">
              Bank account
            </h3>
            <button
              type="button"
              onClick={onOpenEditProfile}
              className="text-xs font-medium text-[#4F46E5] dark:text-indigo-400 hover:underline cursor-pointer"
            >
              {hasBankDetails ? "Edit" : "Configure"}
            </button>
          </div>

          {hasBankDetails ? (
            <div className="pt-2 divide-y divide-[#E9E9F1] dark:divide-gray-800/60 text-xs">
              <div className="py-2 flex justify-between">
                <span className="text-[#6B7280]">Bank name</span>
                <span className="font-medium text-[#101323] dark:text-gray-100">
                  {bank.bankName || <EmptyValue />}
                </span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-[#6B7280]">Account holder</span>
                <span className="font-medium text-[#101323] dark:text-gray-100">
                  {bank.accountName || fullName}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-[#6B7280]">Account number</span>
                <span className="font-mono text-[13px] font-medium text-[#101323] dark:text-gray-100 flex items-center gap-1.5">
                  {isBankRevealed
                    ? bank.accountNumber
                    : maskAccount(bank.accountNumber)}
                  <button
                    type="button"
                    onClick={() => setIsBankRevealed(!isBankRevealed)}
                    title={isBankRevealed ? "Hide account" : "Reveal account (30s)"}
                    className="text-[#6B7280] hover:text-[#101323] dark:hover:text-white p-0.5"
                  >
                    {isBankRevealed ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-[#6B7280]">IFSC code</span>
                <span className="font-mono text-[13px] font-medium text-[#101323] dark:text-gray-100 uppercase">
                  {bank.ifscCode || <EmptyValue />}
                </span>
              </div>
              {bank.branch && (
                <div className="py-2 flex justify-between">
                  <span className="text-[#6B7280]">Branch</span>
                  <span className="font-medium text-[#101323] dark:text-gray-100">
                    {bank.branch}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-3 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B45309]" />
                <span className="text-xs font-semibold text-[#B45309] dark:text-amber-400">
                  Not set up
                </span>
              </div>
              <p className="text-xs text-[#6B7280] dark:text-gray-400 leading-relaxed">
                Salary cannot be paid by bank transfer until direct deposit details are added.
              </p>
              <button
                type="button"
                onClick={onOpenEditProfile}
                className="h-8 px-3 rounded-[8px] border border-[#8E93A8]/40 dark:border-gray-700 bg-transparent hover:bg-[#F1F1F8] dark:hover:bg-gray-800 text-xs font-medium text-[#101323] dark:text-gray-200 transition-colors cursor-pointer active:scale-97"
              >
                Add bank details
              </button>
            </div>
          )}
        </div>

        {/* STATUTORY IDS (Unboxed) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between pb-2 border-b border-[#E9E9F1] dark:border-gray-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-gray-400">
              Statutory IDs
            </h3>
          </div>
          <div className="divide-y divide-[#E9E9F1] dark:divide-gray-800/60 text-xs">
            {/* PAN */}
            <div className="min-h-[40px] py-2 flex items-center justify-between">
              <span className="text-[#6B7280]">PAN</span>
              {panNumber ? (
                <span className="font-mono text-[13px] font-medium text-[#101323] dark:text-gray-100 flex items-center gap-1.5 uppercase">
                  {isPanRevealed ? panNumber : maskPan(panNumber)}
                  <button
                    type="button"
                    onClick={() => setIsPanRevealed(!isPanRevealed)}
                    title={isPanRevealed ? "Hide PAN" : "Reveal PAN (30s)"}
                    className="text-[#6B7280] hover:text-[#101323] dark:hover:text-white p-0.5"
                  >
                    {isPanRevealed ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onOpenEditProfile}
                  className="text-xs font-medium text-[#4F46E5] dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Add
                </button>
              )}
            </div>

            {/* UAN / EPF */}
            <div className="min-h-[40px] py-2 flex items-center justify-between">
              <span className="text-[#6B7280]">UAN / EPF</span>
              {uanNumber ? (
                <span className="font-mono text-[13px] font-medium text-[#101323] dark:text-gray-100">
                  {uanNumber}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onOpenEditProfile}
                  className="text-xs font-medium text-[#4F46E5] dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Add
                </button>
              )}
            </div>

            {/* ESI */}
            <div className="min-h-[40px] py-2 flex items-center justify-between">
              <span className="text-[#6B7280]">ESI</span>
              {esiNumber ? (
                <span className="font-mono text-[13px] font-medium text-[#101323] dark:text-gray-100">
                  {esiNumber}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onOpenEditProfile}
                  className="text-xs font-medium text-[#4F46E5] dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Add
                </button>
              )}
            </div>
          </div>
        </div>

        {/* COMPENSATION SUMMARY (Unboxed, 2 rows) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between pb-2 border-b border-[#E9E9F1] dark:border-gray-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-gray-400">
              Compensation
            </h3>
            {onSwitchTab && (
              <button
                type="button"
                onClick={() => onSwitchTab("salary")}
                className="text-xs font-medium text-[#4F46E5] dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Open salary →
              </button>
            )}
          </div>
          <div className="divide-y divide-[#E9E9F1] dark:divide-gray-800/60 text-xs">
            <div className="min-h-[40px] py-2 flex items-baseline justify-between">
              <span className="text-[#6B7280]">Gross / month</span>
              <Money
                value={grossSalary}
                fixed
                className="text-sm font-semibold text-[#101323] dark:text-gray-100"
              />
            </div>
            <div className="min-h-[40px] py-2 flex items-baseline justify-between">
              <span className="text-[#6B7280]">Est. net take-home</span>
              <Money
                value={estNetSalary}
                fixed
                className="text-sm font-semibold text-[#047857] dark:text-emerald-400"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
