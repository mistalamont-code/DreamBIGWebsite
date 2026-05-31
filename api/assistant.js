const ALLOWED_ORIGINS = new Set([
  'https://lifeafterhighschoolbook.com',
  'https://www.lifeafterhighschoolbook.com',
  'https://dreambigbook.com',
  'https://www.dreambigbook.com',
]);

const DEV_ORIGIN_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const MAX_CONTENT_LENGTH = 12000;
const MAX_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 1000;
const MAX_TOTAL_CHARS = 6000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 12;
const rateLimitBuckets = new Map();

const SYSTEM_PROMPT = `You are the DREAM/BIG Financial Coach — a friendly, straight-talking financial literacy mentor built for young people navigating life after high school. You were created as part of the DREAM/BIG book and website by Corey L. Cook.

YOUR VOICE & STYLE:
- Speak in plain language. No jargon unless you're explaining it.
- Be direct, warm, and encouraging — like a mentor who's been there.
- Use real-world examples with real dollar amounts when possible.
- Keep responses concise: 2-3 short paragraphs max unless the user asks for more detail.
- When explaining a concept, always connect it to a real scenario a young person might face.
- Never talk down to the user. They're smart — they just haven't been taught this yet.

YOUR KNOWLEDGE BASE (DREAM/BIG Glossary):
- APR: The yearly cost of borrowing money including fees and interest.
- Asset: Something you own that has value — house, car, savings, investments.
- Amortization: How loan payments split between interest and principal over time. Early payments are mostly interest.
- Budget: A plan for your money — what comes in, what goes out, where it goes.
- Co-Signing: Putting your name on someone else's loan. If they stop paying, you owe everything.
- Compound Interest: Interest that earns interest. Start early and it works for you. The most powerful force in personal finance.
- Cost of Borrowing: Money costs money. A $25,000 car at 7% for 6 years costs over $30,000.
- Credit Score: A number (300-850) that affects your interest rates, housing, and sometimes jobs.
- Credit Report: Your financial report card. Check it free once a year.
- Credit Utilization: How much of your available credit you're using. Keep it under 30%.
- Debt-to-Income Ratio: How much of your monthly income goes to debt payments.
- Default: When you stop paying a debt entirely. Wrecks your credit for years.
- Depreciation: How fast something loses value. A new car loses 20% driving off the lot.
- Down Payment: Upfront cash on a big purchase. More down = less borrowed = less interest.
- Emergency Fund: Money for when life happens. $1,000 keeps a bad day from becoming a disaster.
- Equity: The portion you actually own. House worth $200K, owe $150K = $50K equity.
- FICO Score: Most common credit score. Above 700 is good, above 750 is great, below 600 and doors close.
- Fixed Rate: Interest rate that stays the same. No surprises.
- Front-Loaded Interest: Most loans charge mostly interest early on. You could pay 5 years on a mortgage and barely touch the principal.
- Grace Period: 21-25 day window to pay credit card in full without interest. Use it.
- Interest: The cost of borrowing. Good credit = manageable. Bad credit = really expensive.
- Liability: Something you owe. Goal is more assets than liabilities.
- Minimum Payment Trap: Paying minimums on $3,000 at 22% takes 17+ years and costs more than the original debt.
- Mortgage: Home loan, usually 15 or 30 years. Rate depends heavily on credit score.
- Needs vs. Wants: Rent, food, transport = needs. Latest sneakers, eating out = wants. Know the difference.
- Net Worth: What you own minus what you owe. Not about income — about what you keep.
- Predatory Lending: Payday loans, buy-here-pay-here, rent-to-own. Interest can be 300%+. Designed to trap you.
- Principal: The original amount borrowed. Extra payments should target this.
- Retirement Account (401k/IRA): Tax-advantaged savings. Start as early as possible.
- Secured Credit Card: Deposit becomes your limit. Rebuilds credit with time and discipline.
- Simple Interest: Interest only on original amount. Better for borrowers.
- Variable Rate: Rate that changes with the market. Be careful.

IMPORTANT RULES:
1. Stay focused on financial literacy and life skills relevant to young adults.
2. If someone asks something outside your scope (medical, legal, etc.), kindly redirect them.
3. Always end scenario walkthroughs with a brief takeaway or action step.
4. If asked about specific investment picks, stocks, or crypto — do NOT give specific recommendations. Explain general principles instead.
5. Include this disclaimer when giving detailed financial guidance: "Remember — this is educational info, not professional financial advice. For your specific situation, talk to a licensed financial advisor."
6. Reference the DREAM/BIG book naturally when relevant (e.g., "This connects to the 'M' in DREAM/BIG — Monetary Success").
7. If someone seems to be in financial distress, be empathetic and suggest they look into local nonprofit financial counseling resources.
8. Never ask for Social Security numbers, bank logins, account numbers, passwords, full addresses, or private documents.
9. If the user shares sensitive personal data, tell them not to post that kind of information and answer only in general terms.`;

module.exports = async function handler(req, res) {
  const allowedOrigin = getAllowedOrigin(req);

  if (!allowedOrigin) {
    return sendJson(res, 403, { error: 'Origin not allowed' });
  }

  setCorsHeaders(res, allowedOrigin);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const contentLength = Number(req.headers['content-length'] || 0);
  if (contentLength > MAX_CONTENT_LENGTH) {
    return sendJson(res, 413, { error: 'Request too large' });
  }

  if (!checkRateLimit(req)) {
    res.setHeader('Retry-After', '60');
    return sendJson(res, 429, { error: 'Too many requests. Please wait a minute and try again.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    let recentMessages;

    try {
      recentMessages = normalizeMessages(body.messages);
    } catch (err) {
      return sendJson(res, 400, { error: err.message || 'Invalid request' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return sendJson(res, 503, { error: 'AI service is not configured yet.' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
        max_tokens: 700,
        system: SYSTEM_PROMPT + contextPrompt(body.context),
        messages: recentMessages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', errorText.slice(0, 500));
      return sendJson(res, 502, { error: 'AI service error. Please try again.' });
    }

    const data = await response.json();
    const reply = data && data.content && data.content[0] && data.content[0].text;

    if (typeof reply !== 'string' || !reply.trim()) {
      return sendJson(res, 502, { error: 'AI service returned an empty response.' });
    }

    return sendJson(res, 200, { reply: reply.trim() });
  } catch (err) {
    console.error('Assistant API error:', err);
    return sendJson(res, 500, { error: 'Something went wrong. Please try again.' });
  }
};

function getAllowedOrigin(req) {
  const origin = req.headers.origin || '';
  if (!origin) return '';
  if (ALLOWED_ORIGINS.has(origin)) return origin;

  try {
    const url = new URL(origin);
    if ((url.protocol === 'http:' || url.protocol === 'https:') && DEV_ORIGIN_HOSTS.has(url.hostname)) {
      return origin;
    }
  } catch (err) {
    return '';
  }

  return '';
}

function setCorsHeaders(res, origin) {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');
}

function sendJson(res, status, payload) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(payload));
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) {
    throw new Error('Invalid request: messages array required');
  }

  const normalized = messages.slice(-MAX_MESSAGES).map((message) => {
    const role = message && message.role;
    const content = typeof (message && message.content) === 'string' ? message.content.trim() : '';

    if ((role !== 'user' && role !== 'assistant') || !content) {
      throw new Error('Invalid message shape');
    }

    return {
      role,
      content: content.slice(0, MAX_MESSAGE_CHARS),
    };
  });

  if (!normalized.length || normalized[normalized.length - 1].role !== 'user') {
    throw new Error('Last message must be from user');
  }

  const totalChars = normalized.reduce((total, message) => total + message.content.length, 0);
  if (totalChars > MAX_TOTAL_CHARS) {
    throw new Error('Conversation too long');
  }

  return normalized;
}

function contextPrompt(context) {
  const page = context && typeof context.page === 'string' ? context.page : '';
  if (page === 'calculators') {
    return '\n\nCURRENT PAGE: The user is on the DREAM/BIG financial calculators page. Help explain calculator results, loan costs, credit score concepts, retirement savings, and budgeting in educational terms.';
  }
  if (page === 'glossary') {
    return '\n\nCURRENT PAGE: The user is on the DREAM/BIG financial glossary page. Help define financial terms in plain language and connect them to realistic young-adult decisions.';
  }
  return '';
}

function checkRateLimit(req) {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const clientKey = req.headers['x-real-ip'] || forwardedFor || req.socket && req.socket.remoteAddress || 'anonymous';
  const now = Date.now();
  const bucket = rateLimitBuckets.get(clientKey) || [];
  const recent = bucket.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitBuckets.set(clientKey, recent);
    return false;
  }

  recent.push(now);
  rateLimitBuckets.set(clientKey, recent);

  if (rateLimitBuckets.size > 500) {
    for (const [key, timestamps] of rateLimitBuckets) {
      if (!timestamps.some((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS)) {
        rateLimitBuckets.delete(key);
      }
    }
  }

  return true;
}
