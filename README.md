# MES Trading Command Center

A mobile-first dark mode trading journal app for MES futures journaling, NinjaTrader CSV import, rule scoring, daily reviews, and mistake tracking.

## Features

- Dashboard with Net P&L, win rate, profit factor, average win/loss, max drawdown, and rule score
- Cumulative P&L chart and daily P&L chart
- Green/red daily calendar
- CSV import for NinjaTrader-style trade exports
- PDF performance page upload log
- Manual trade journal entry
- Riley/Joovier-style rule checklist and 0-100 trade score
- Daily review page with “Call It A Day” lock
- Mistake tracker
- Settings for trading window, max trades, daily loss, contracts, account size, and margin reminder
- Local browser storage in V1

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown in the terminal.

## Build for production

```bash
npm run build
```

## Vercel deployment

Use Node.js 20.x, `npm install`, `npm run build`, and `dist` as the output directory.

## Deploy to GitHub Pages

This is a Vite app. For GitHub Pages, add this to `vite.config.js` if deploying to a repo subpath:

```js
export default defineConfig({
  plugins: [react()],
  base: '/YOUR_REPO_NAME/',
})
```

Then deploy the `dist` folder with GitHub Actions or another static hosting tool.

## Suggested V2 upgrades

- True PDF parsing for NinjaTrader performance reports
- Supabase login and cloud database
- Screenshot storage
- AI daily review summary
- TradingView embedded chart page
- Weekly report export as PDF

## Disclaimer

For journaling and education only. Not financial advice.
