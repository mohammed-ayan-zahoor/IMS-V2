# Explainer Page Plan: Fee Profile Overview & Filtering

## 1. Chosen Concept
- **Concept:** Side-by-Side Split Canvas (Left 42% copy & filter signals, Right 58% live ledger showcase).
- **Rationale:** Aligns with the request for side-by-side comparison while presenting the filter controls and ledger data as the primary hero without gimmicky tilts or neon glows.

## 2. Canvas & Export Scale
- **Canvas Dimensions:** 1920px × 1080px (Fixed viewport, zero scroll).
- **Export Scale:** 2x (`3840px × 2160px` PNG via Playwright).

## 3. Headline Options (Max 7 words)
1. **Filter every student ledger instantly.** *(Recommended)* (5 words)
2. Complete fee clarity across every class. (6 words)
3. Instant audit for every fee balance. (6 words)

## 4. Supporting Line (Max 12 words)
"Zero manual calculations. Real-time class and section balance tracking." (9 words)

## 5. Total Copy Budget
- **On-slide copy count:** 14 words max outside the UI (Headline: 5 words + Supporting line: 9 words).

## 6. Layout Description
- **Grid:** 12-column CSS Grid with 96px outer margins, 48px column gap.
- **Left Column (cols 1-5):**
  - Quantech "Q" vector monogram badge (44px height).
  - Main headline (76px font-size, tight -0.025em tracking, line-height 1.08).
  - Supporting line (24px, slate-500).
  - 3 micro-metric badges derived from code: Class Filter, Live Balance, 1-Click Pay.
- **Right Column (cols 6-12):**
  - Large UI frame (1080px width) presenting the Fee Ledger screenshot with sharp crop (browser chrome removed).
  - 1px border (`#E2E8F0`), clean crisp shadow (`0 25px 60px -12px rgba(15, 23, 42, 0.08)`). No neon glow.

## 7. Color Tokens (Hex)
- `--bg-canvas`: `#F8FAFC` (Clean architectural off-white)
- `--surface-card`: `#FFFFFF`
- `--text-primary`: `#0F172A` (Deep slate, 14.8:1 contrast)
- `--text-muted`: `#64748B` (Neutral slate, 4.6:1 contrast)
- `--brand-primary`: `#0F172A` (Sophisticated deep slate)
- `--brand-accent`: `#1D4ED8` (Technical sapphire blue from the Q logo, no purple)
- `--border-subtle`: `#E2E8F0`

## 8. Typography
- **Font Family:** `Instrument Sans`, -apple-system, sans-serif (Loaded via Google Fonts, wait for `document.fonts.ready`).
- **Sizes:**
  - Headline: 76px / weight 700 / letter-spacing -0.03em.
  - Subhead: 24px / weight 450 / letter-spacing -0.01em.
  - Category / Kicker: 14px / weight 600 / uppercase tracking 0.08em.

## 9. Screenshot Treatment
- **File:** `C:/Users/Comp/.gemini/antigravity/brain/8d593511-6a9f-4055-9ec9-4e1159a15da0/.user_uploaded/media_1792735635183_f24af7e7.png`
- **Treatment:** Clean crop removing OS taskbar and browser address bar. Preserves real student names and ledger columns as requested.
- **Framing:** 16px corner radius, 1px border (`#E2E8F0`), flat soft ambient drop-shadow. No rotation or 3D tilt.

## 10. Assets Needed
- Quantech "Q" logo: Sourced directly from `mobile/assets/quantech_logo_concept.svg`.
- Target screenshot: Verified and located.

## 11. Risks & Mitigations
- **Risk:** Dense table text on the right might scale down on lower resolution previews.
- **Mitigation:** Right frame occupies 58% of canvas width with 2x Playwright export to maintain razor-sharp text legibility.
