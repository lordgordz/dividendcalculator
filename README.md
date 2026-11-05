# Dividend Benefit Illustration Calculator (standalone)

Static web app — no build step, no dependencies, no data sent anywhere.

Files: `index.html`, `styles.css`, `app.js` (screens), `engine.js` (all calculations).
Open `index.html` locally, or host on GitHub Pages (Settings → Pages → deploy from `main` / root).

Products: Single Premium, Ad-Hoc Top Up, 5-Pay, 8-Pay, 2-Pay, SRS Single Pay.
Modes: Single Product (with ad-hoc withdrawals), Mixed Planning, Compare.

## Verifying the engine
`node test_engine.js` compares `engine.js` against values recalculated from the Excel workbook
(`excel_expected.json`, 13 scenarios, ~25,000 checks). Expect: `mismatches 0`.
Rates, bonus tiers and minimums live at the top of `engine.js` (`PRODUCTS`, `tier`).
