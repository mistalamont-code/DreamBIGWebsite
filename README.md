# DREAM/BIG — A Father & Mentor's Guide to Life After High School

Official website for the DREAM/BIG book by Corey L. Cook.

## Site Structure

- **index.html** — Homepage with about, book overview, newsletter signup
- **calculators.html** — Interactive financial calculators (auto loan, home loan, retirement)
- **glossary.html** — 32-term financial literacy glossary with search
- **chatbot-worker.js** — Cloudflare Worker for AI-powered financial coach (deploy separately)
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

## AI Chatbot (Optional — Future Setup)

The `chatbot-worker.js` file is a ready-to-deploy Cloudflare Worker that powers an AI financial coach. See the comments at the top of that file for deployment instructions.

## Contact

Corey L. Cook — corey@cook-media.com
