// Education-aware assistant engine.
//
// Answers agent questions about loan programs, qualifying guidelines, and
// growing their business, and — most importantly — points them at the specific
// videos and documents their loan officer has published in the Education
// section.
//
// It runs fully in the browser against a curated knowledge base so it works
// with no backend or API keys. If you later stand up a real LLM endpoint, set
// VITE_ASSISTANT_ENDPOINT and it will be used first, falling back to the local
// engine on any error.

// --- Curated knowledge base ---------------------------------------------
// Each topic has trigger keywords, a concise answer, and tags used to match
// against the loan officer's uploaded resources.
const KNOWLEDGE_BASE = [
  {
    id: 'qualifying',
    keywords: ['qualify', 'guideline', 'guidelines', 'requirement', 'requirements', 'approve', 'approval', 'underwriting', 'eligible', 'eligibility'],
    answer:
      "Loan qualifying generally comes down to four things: credit score, debt-to-income (DTI) ratio, down payment/assets, and stable income history. Each loan program sets its own minimums, so the best move for a specific client is to have them get pre-approved — that's when your loan officer verifies the real numbers.",
    tags: ['guideline', 'qualify', 'program', 'underwriting'],
  },
  {
    id: 'credit',
    keywords: ['credit', 'fico', 'score', 'credit score'],
    answer:
      "Credit score minimums vary by program — conventional loans typically start around 620, FHA can go lower (often 580, sometimes 500 with a larger down payment). Higher scores unlock better rates. If a client's score is close, your loan officer can often suggest quick wins to nudge it up.",
    tags: ['credit', 'fico', 'guideline'],
  },
  {
    id: 'dti',
    keywords: ['dti', 'debt', 'income', 'debt-to-income', 'ratio', 'debt to income'],
    answer:
      "DTI (debt-to-income) is monthly debt payments divided by gross monthly income. Many programs like to see total DTI at or below ~43–50%, though it flexes with strong credit or reserves. Paying down a credit card or two before applying can meaningfully help.",
    tags: ['dti', 'debt', 'income', 'guideline'],
  },
  {
    id: 'downpayment',
    keywords: ['down payment', 'downpayment', 'down', 'closing costs', 'reserves', 'money down', 'assistance'],
    answer:
      "Down payment requirements depend on the program: conventional as low as 3%, FHA 3.5%, and 0% for VA/USDA if eligible. Down-payment-assistance programs and gift funds can also help. Investor purchases usually need more (often 15–25%).",
    tags: ['down payment', 'closing', 'assistance', 'guideline'],
  },
  {
    id: 'investor',
    keywords: ['investor', 'investment', 'rental', 'dscr', 'portfolio', 'landlord', 'cash flow', 'brrrr', 'flip', 'flipping'],
    answer:
      "Investor business is a huge growth lever. DSCR loans qualify borrowers on the property's rental cash flow instead of personal income, which is perfect for investors scaling a portfolio. There are also bank-statement and fix-and-flip options. Partnering with your loan officer on investor-friendly programs is one of the fastest ways to win more agent business.",
    tags: ['investor', 'dscr', 'rental', 'investment', 'program'],
  },
  {
    id: 'firsttime',
    keywords: ['first time', 'first-time', 'firsttime', 'new buyer', 'starter'],
    answer:
      "First-time buyers often qualify for special programs — low down payments (3–3.5%), down-payment assistance, and reduced mortgage-insurance options. Educating first-timers early builds trust and referrals. Your loan officer can co-host a first-time-buyer webinar or provide handouts.",
    tags: ['first-time', 'buyer', 'program', 'assistance'],
  },
  {
    id: 'preapproval',
    keywords: ['pre-approval', 'preapproval', 'pre approved', 'preapproved', 'pre-qual', 'prequal', 'pre-qualify'],
    answer:
      "A pre-approval tells you (and the seller) exactly what a buyer can afford before you go shopping. It makes offers stronger and closes faster. Send buyers to your loan officer for a pre-approval before the first showing whenever possible.",
    tags: ['pre-approval', 'buyer', 'process'],
  },
  {
    id: 'refinance',
    keywords: ['refinance', 'refi', 'cash out', 'cash-out', 'rate and term', 'lower rate'],
    answer:
      "Refinancing can lower a rate/payment or pull equity out (cash-out) for renovations or investing. It's a great reason to re-engage past clients. A quick 'is now a good time to refi?' check-in from you keeps you top of mind.",
    tags: ['refinance', 'refi', 'program'],
  },
  {
    id: 'programs',
    keywords: ['fha', 'va', 'usda', 'conventional', 'jumbo', 'conforming', 'arm', 'fixed', 'loan program', 'loan type', 'bank statement', 'self employed', 'self-employed'],
    answer:
      "Common programs: Conventional (best rates, good credit), FHA (flexible credit/low down), VA (0% down for veterans), USDA (0% down in rural areas), Jumbo (high-balance), and non-QM options like bank-statement loans for self-employed borrowers. Matching the client to the right program is where your loan officer shines.",
    tags: ['program', 'fha', 'va', 'conventional', 'jumbo', 'guideline'],
  },
  {
    id: 'marketing',
    keywords: ['marketing', 'social media', 'post', 'content', 'grow', 'business', 'leads', 'lead', 'branding', 'template', 'promote'],
    answer:
      "Consistent, branded content wins listings and referrals. Use the Templates section to download graphics auto-personalized with your headshot and logo, and share the Education videos with your sphere. Posting a mix of educational tips + local market updates keeps you visible.",
    tags: ['marketing', 'social', 'template', 'content', 'branding'],
  },
  {
    id: 'referrals',
    keywords: ['referral', 'refer', 'partner', 'relationship', 'network', 'sphere', 'repeat business'],
    answer:
      "A strong loan-officer partnership means faster closings and co-branded marketing you can put your name on. Stay in touch with past clients, ask for reviews, and lean on your loan officer for joint events and content — referrals compound over time.",
    tags: ['referral', 'partner', 'marketing'],
  },
]

const FALLBACK =
  "I'm your AI assistant — I can help with loan guidelines, qualifying, investor/DSCR loans, marketing, and growing your business, and point you to the right training in your Education section. Try asking something like “What credit score do buyers need?” or “How do I get more investor business?” For specifics on a real client's file, your loan officer is the best resource.";

const STOP = new Set(['the', 'a', 'an', 'is', 'are', 'to', 'of', 'and', 'or', 'for', 'in', 'on', 'do', 'i', 'my', 'me', 'we', 'you', 'how', 'what', 'can', 'with', 'about', 'get', 'need', 'does', 'it', 'be', 'have', 'has', 'want', 'more', 'some'])

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t))
}

// Score a knowledge-base topic against the question.
function scoreTopic(topic, q) {
  const ql = q.toLowerCase()
  let score = 0
  for (const kw of topic.keywords) {
    if (ql.includes(kw)) score += kw.includes(' ') ? 3 : 2
  }
  return score
}

// Score one resource (video/document) against the question tokens + matched tags.
function scoreResource(resource, qTokens, tags) {
  const hay = tokenize(`${resource.title || ''} ${resource.description || ''} ${(resource.tags || []).join(' ')}`)
  const set = new Set(hay)
  let score = 0
  for (const t of qTokens) if (set.has(t)) score += 2
  for (const tag of tags) if (set.has(tag) || (resource.title || '').toLowerCase().includes(tag)) score += 1
  return score
}

// Local engine: compose an answer + ranked resources.
export function localAnswer(question, resources = []) {
  const qTokens = tokenize(question)
  const topics = KNOWLEDGE_BASE
    .map((t) => ({ t, s: scoreTopic(t, question) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)

  const tags = topics.flatMap((x) => x.t.tags)
  const ranked = resources
    .map((r) => ({ r, s: scoreResource(r, qTokens, tags) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 4)
    .map((x) => x.r)

  let text
  if (topics.length) {
    text = topics.slice(0, 2).map((x) => x.t.answer).join('\n\n')
  } else {
    text = FALLBACK
  }

  if (ranked.length) {
    text += `\n\nI found ${ranked.length} resource${ranked.length > 1 ? 's' : ''} in your Education section that should help:`
  } else if (topics.length) {
    text += '\n\nTip: check the Education section for related videos and guides — and reach out to your loan officer for anything specific to a live deal.'
  }

  return { text, resources: ranked }
}

// Public entry point. Calls the live LLM endpoint (the Vercel /api/assistant
// function backed by OpenAI) and falls back to the offline engine on any error
// — so the assistant keeps working in local dev or if the API is unavailable.
export async function askAssistant(question, resources = []) {
  const endpoint = import.meta.env.VITE_ASSISTANT_ENDPOINT || '/api/assistant'
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, resources }),
    })
    if (res.ok) {
      const data = await res.json()
      // The endpoint returns { text }; we always attach locally-ranked resource
      // links so the answer points at the right Education items.
      return {
        text: data.text || FALLBACK,
        resources: data.resources || localAnswer(question, resources).resources,
      }
    }
  } catch {
    /* fall through to local engine */
  }
  return localAnswer(question, resources)
}

export const SUGGESTED_QUESTIONS = [
  'What credit score do buyers need to qualify?',
  'How do I get more investor business?',
  'What down payment assistance is available?',
  'How can I market myself on social media?',
]
