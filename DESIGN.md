# DESIGN.md — QUANTECH Institutional Operating System

## Concept Card
- **Idea:** On this page, the daily operational pulse of a school (RFID gate attendance, fee collection ledger, offline marksheet generation, and session isolation) becomes a live, responsive institutional console.
- **Direction:** `The product performs` (Art-directed as a high-precision institutional instrument).
- **Metaphor:** The Flight Deck of an Academic Campus — calm, authoritative, high-speed, zero fluff.
- **Signature Live Thing:** The **Interactive Campus Operations Console** in the hero. Visitors scrub through a real school day (08:15 Attendance Influx → 11:00 Instant Fee Ledger → 02:30 Marksheet Engine) and watch real, responsive UI fragments calculate and update live.

---

## Typography System
- **Display Face:** Geist / Inter Display / Switzer (Clean grotesque, tracking `-0.035em`, leading `1.05`, sentence case).
- **Body Face:** Geist / Inter (weight `400` body, `500` labels, leading `1.55`, tracking `-0.01em`).
- **Tabular Data:** Tabular numerals (`font-variant-numeric: tabular-nums`) for currency, timestamps, student counts, and percentages.
- **Scale:**
  - `Display / H1`: `clamp(2.5rem, 2rem + 3.5vw, 4.5rem)` (strictly 2 lines or fewer at all viewports).
  - `H2 (Section Titles)`: `clamp(1.75rem, 1.4rem + 1.5vw, 2.75rem)`.
  - `Body Lead`: `1.125rem` (18px) to `1.25rem` (20px).
  - `Body Regular`: `1rem` (16px) with high-contrast slate.
  - `Micro / Labels`: `0.875rem` (14px) sentence case.

---

## Palette Tokens (Console Obsidian & Clean Slate)
- `--ground`: `#090D16` (Deep Obsidian Void)
- `--surface`: `#111827` (Panel Surface)
- `--surface-raised`: `#1F2937` (Active Tab & Elevated State)
- `--border`: `#1E293B` (Quiet Structural Border)
- `--ink`: `#F8FAFC` (High-contrast Crisp Chalk)
- `--ink-muted`: `#94A3B8` (Readable Secondary Slate)
- `--ink-faint`: `#64748B` (Tertiary Labels)
- `--accent-live`: `#10B981` (Operational Green / Emerald Pulse)
- `--accent-action`: `#2563EB` (Institutional Cobalt)
- `--accent-gold`: `#F59E0B` (Marksheet / Grade Distinction)

---

## Section Blueprint & Copy Deck
Every section exists to prove one claim with working interface fragments (`data-ui`), not cards with icons.

### Section 1: Hero & Real Console
- **Headline (max 2 lines):** "The operating system for modern academic institutions."
- **Subhead (1 line):** "Manage admissions, automated fee ledgers, exam marksheets, and parent broadcasts in one unified console."
- **CTAs:** Primary: `Explore Interactive Demo`, Secondary: `Schedule Campus Walkthrough`.
- **Hero Fragment (`data-ui`):** 3-stage Campus Timeline controller (08:15 Influx, 11:00 Fee Counter, 14:30 Marksheet Engine) updating live numbers.

### Section 2: Admissions & Student Pipeline
- **Claim:** "Zero paper, zero duplicate entry. From online enquiry to verified student ID in 60 seconds."
- **Interface Fragment:** An authentic live Admission Intake slip with auto-generated Roll No, Class & Section assignment (`Class 10 - Section A`), and instant photo ID preview.

### Section 3: The Financial Ledger (Fees & Receipts)
- **Claim:** "Every rupee tracked, reconciled, and reminded without manual calls."
- **Interface Fragment:** Interactive Fee Ledger showing multi-installment breakdown, auto-calculated GST & discounts, and a one-click thermal print receipt.

### Section 4: Academic Rigor (Exams & Marksheets)
- **Claim:** "Session-isolated offline and online grading that parents trust."
- **Interface Fragment:** A real student report card preview featuring CBCS grading, class rank, teacher remarks, and a verified QR stamp.

### Section 5: Campus Communications
- **Claim:** "Direct WhatsApp and SMS alerts that reach 100% of parents."
- **Interface Fragment:** Simulated parent broadcast preview with dynamic tags (`{{student_name}}`, `{{pending_due}}`, `{{attendance_status}}`).

### Section 6: Action & Institutional Onboarding
- **Headline:** "Deploy QUANTECH to your campus."
- **Subhead:** "White-glove migration of past student records and customized fee presets in under 48 hours."
- **Direct Phone & Booking Form:** Authentic intake form connecting directly to admissions and technical consultation.

---

## Anti-Slop Laws
1. **0 Gradients in Text or Buttons:** Flat institutional solid buttons or crisp outline state.
2. **0 Fake Avatars or Pravatar Reviews:** Honest institutional capabilities and real workflow metrics only.
3. **0 Device Mockups:** No tilted tablets, no phone notches with fake wallpaper. All UI is rendered as real HTML interface fragments with `data-ui`.
4. **0 Hairline Grids & Floating Dropped Shadows:** Surfaces separated by clean tone steps (`#090D16` to `#111827`).
5. **Headlines <= 2 Lines:** Validated by `inspect.mjs` across 1440px, 768px, and 390px.
