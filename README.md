# DREAM/BIG — A Father & Mentor's Guide to Life After High School

Official website for the DREAM/BIG book by Corey L. Cook.

## Site Structure

- **index.html** — Homepage with book overview, author story, companion entry point, purchase links, FAQ, and newsletter signup
- **companion.html** — Chapter-by-chapter DREAM/BIG reflections, actions, and device-only progress checkmarks
- **first-money-moves.html** — Paycheck, emergency fund, and student loan learning tools
- **calculators.html** — Auto loan, home loan, retirement, credit habits, and budget learning tools
- **visualizer.html** — Interactive saving, borrowing-cost, and fixed-payment payoff scenarios
- **glossary.html** — 51-term financial literacy glossary with search
- **assistant.js / assistant.css** — Floating DREAM/BIG Coach widget
- **api/assistant.js** — Vercel API Function for book-aligned life-skills and financial coaching
- **images/** — Site assets (favicon, book cover, photos)

## Deployment

This is a static site. Deploy with any static hosting provider.

**Recommended: Vercel**
1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Import this repository
4. Deploy — no build settings needed

**Custom Domain**
After deploying on Vercel, add `lifeafterhighschoolbook.com` and `www.lifeafterhighschoolbook.com` under Project Settings → Domains.

## AI Coach Setup

The site companion pages include an optional DREAM/BIG Coach widget. It calls the Vercel API Function at `/api/assistant`, so the Anthropic API key stays server-side and is never exposed to the browser.

In Vercel, add these environment variables:

- `ANTHROPIC_API_KEY` — required
- `ANTHROPIC_MODEL` — optional, defaults to `claude-haiku-4-5-20251001`
- `COACH_ENABLED` — optional; set to `false` and redeploy to pause paid coach requests without disabling the static learning tools.

### Cost and Safety Controls

The function limits input size, conversation length, output tokens, and request duration. It does not retry paid requests. The first completed answer in each conversation receives an application-supplied educational notice, and the chat panel header carries a standing disclaimer; prompt rules require projection assumptions and distinguish short-term savings from investment risk. These controls reduce risk but do not guarantee that an AI answer is accurate.

The in-memory 12-request/minute/IP limiter is only a per-instance fallback, not a shared or monthly spending limit. Configure a Vercel Firewall rule for request paths starting with `/api/assistant` (covering trailing-slash variants), using a fixed 60-second window, 12 requests per IP, and a 429 response. Publish the rule after review. Edge counters are regional; many students behind one school IP share that allowance. Monitor legitimate traffic before adjusting it.

In the Anthropic Console, use a dedicated DREAM/BIG workspace/key and set an owner-approved monthly spend limit under that workspace's spend settings. A Vercel budget does not cap Anthropic API charges. A spend cap can interrupt the coach when exhausted; the static tools continue to work. Do not assume either external control is enabled merely because it is documented here.

### Regression Tests

Run `node --test tests/*.test.cjs`. Tests use mocked provider responses and canvas drawing; no API key or paid requests are needed. For a release, also check both loan charts at 0% and positive rates in desktop/mobile browsers, and send a small number of real coach questions after deploying. Browser previews alone do not exercise the Vercel Function.

## Contact

Corey L. Cook — corey@cook-media.com
