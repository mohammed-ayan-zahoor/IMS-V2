# Quantech MOU Word Template (`quantech-mou.docx`)

This directory contains the master Microsoft Word template for generating genuine, fully editable `.docx` Memorandums of Understanding for schools and colleges.

## Files

| File | Purpose |
|---|---|
| [`quantech-mou.docx`](./quantech-mou.docx) | Master Word template containing `{tags}` filled by `docxtemplater` on the server. |
| [`provider_sign.png`](./provider_sign.png) | High-resolution static signature for Quantech Authorised Signatory. |
| [`README.md`](./README.md) | Documentation of all dynamic tags, rules, and maintenance guidelines. |

---

## Dynamic Tags Contract

Every tag below is filled by the server API (`/api/v1/mou/docx`).

### 1. Header & General Metadata

| Tag | Type | Description / Example |
|---|---|---|
| `{refId}` | String | Unique document reference number (e.g. `QP/MOU/2026-27/8921`). Appears in header, footer, and audit badge. |
| `{date}` | String | Full Indian format date (e.g. `19 September 2026`). Appears in header, signature block, and audit badge. |
| `{academicYear}` | String | Academic year (e.g. `2026–27`). |
| `{mouSubtitle}` | String | Document subtitle: `For Implementation of Quantech Platform` (standard) or `For Provision of Student Smart ID Card Services` (smart ID coupon). |
| `{providerRoleDetail}` | String | Party A descriptor: `Developers of Quantech Platform` or `Smart ID Card & Digital Solutions Provider`. |

### 2. Institution / Party B Details

| Tag | Type | Description / Example |
|---|---|---|
| `{schoolName}` | String | Full name of the School / Junior College / Degree College. |
| `{city}` | String | City and District (e.g. `Bhopal, MP`). |
| `{address}` | String | Street address / Postal address (or blank if omitted). |
| `{udiseCode}` | String | Official UDISE / Institution Code (or `—` if not provided). |

### 3. Clauses & Commercial Terms

| Tag | Type | Description / Example |
|---|---|---|
| `{clause1Purpose}` | String | Complete purpose clause text (varies dynamically for ERP platform vs ID card only). |
| `{clause2Intro}` | String | Introductory sentence for student enrollment and academic year. |
| `{studentCount}` | String / Number | Total agreed student strength (e.g. `450`). |
| `{#isCollege}...{/isCollege}` | Block | Conditional table row included only for colleges showing year-wise ID card breakdown. |
| `{yr1Count}` | String / Number | 1st Year student strength. |
| `{yr1Rate}` | String / Number | 1st Year card rate (e.g. `59` or `45`). |
| `{yr2Count}` | String / Number | 2nd Year student strength. |
| `{yr2Rate}` | String / Number | 2nd Year renewal rate (e.g. `30` or `20`). |
| `{totalPrice}` | String | Total commercial agreement value with rupee symbol (e.g. `₹26,550.00`). |
| `{totalPriceLabel}` | String | Plan and rate breakdown label (e.g. `Total Price (at ₹59 / Student)`). |
| `{upfrontPrice}` | String | Upfront payment amount (e.g. `₹13,275.00`). |
| `{upfrontPriceLabel}` | String | Upfront description label (e.g. `50% Upfront Commercial Amount`). |
| `{commFooter}` | String | Billing milestones and installment schedule explanation. |
| `{clause2Sla}` | String | SLA and scope expansion threshold notice. |
| `{#clause3Items}...{/clause3Items}` | Loop | Repeating list of obligations for the Provider (each item rendered with `{text}`). |
| `{clause4Title}` | String | Heading for Clause 4 (`4. Obligations of the School` or `4. Obligations of the Institution`). |
| `{#clause4Items}...{/clause4Items}` | Loop | Repeating list of obligations for the Institution (each item rendered with `{text}`). |
| `{durationWords}` | String | Duration expressed in legal wording (e.g. `one (1) academic year`, `two (2) academic years`). |
| `{jurisdiction}` | String | Legal jurisdiction court place (default: `Dhule, Maharashtra`). |

### 4. Signatures

| Tag | Type | Description / Example |
|---|---|---|
| `{%schoolSignature}` | Image | Client digital signature drawn on canvas or uploaded via file (PNG). Rendered at fixed 160×60px ratio. |
| `{principalName}` | String | Name of the Principal or Authorised Signatory. |
| `{designation}` | String | Official designation (e.g. `Principal`, `Director`). |
| `{%providerSignature}` | Image | Quantech authorised corporate signatory PNG. |

---

## Rules for Editing the Template in Word

When editing `quantech-mou.docx` directly in Microsoft Word or LibreOffice:

1. **Keep tags plain text:** Never format only half of a tag (e.g. do not make `{school` bold and `Name}` normal). Word will split the tag into multiple XML runs and cause template parse errors. Type tags in a plain text editor (Notepad) and paste them as *Keep Text Only*.
2. **Do not remove table structure:** The tables use Word's native `Table Grid` style with standard borders. You can adjust column widths, but keep the tags inside their respective table cells.
3. **Image tags:** `{%schoolSignature}` and `{%providerSignature}` begin with `%` to indicate an image replacement tag to `docxtemplater-image-module-free`.
4. **Header and Footer:** The header and footer contain `Quantech MOU: {schoolName} | Ref: {refId}` and dynamic Word fields `PAGE` of `NUMPAGES`.
