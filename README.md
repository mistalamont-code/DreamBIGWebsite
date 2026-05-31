# DREAM/BIG — A Father & Mentor's Guide to Life After High School

Official website for the DREAM/BIG book by Corey L. Cook.

## Site Structure

- **index.html** — Homepage with about, book overview, newsletter signup
- **calculators.html** — Interactive financial calculators (auto loan, home loan, retirement)
- **glossary.html** — 32-term financial literacy glossary with search
- **assistant.js / assistant.css** — Floating DREAM/BIG Coach widget
- **api/assistant.js** — Vercel API Function for AI-powered financial coaching
- **images/** — Site assets (favicon, book cover, photos)

## Deployment

This is a static site. Deploy with any static hosting provider.

**Recommended: Vercel**
1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Import this repository
4. Deploy — no build settings needed

**Custom Domain**
After deploying on Vercel, add your domain (dreambigbook.com) under Project Settings → Domains.

## AI Coach Setup

The calculator and glossary pages include an optional DREAM/BIG Coach widget. It calls the Vercel API Function at `/api/assistant`, so the Anthropic API key stays server-side and is never exposed to the browser.

In Vercel, add these environment variables:

- `ANTHROPIC_API_KEY` — required
- `ANTHROPIC_MODEL` — optional, defaults to `claude-haiku-4-5-20251001`

## Contact

Corey L. Cook — corey@cook-media.com
