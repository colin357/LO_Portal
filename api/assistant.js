// Vercel serverless function: POST /api/assistant
//
// Answers agent questions with OpenAI, using the loan officer's Education
// library (videos + documents) as context. The API key stays server-side —
// set OPENAI_API_KEY in the Vercel project's Environment Variables. On any
// error this returns a non-2xx status so the browser falls back to the
// built-in offline engine in src/lib/assistant.js.

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const question = String(body.question || '').slice(0, 2000).trim()
    const resources = Array.isArray(body.resources) ? body.resources.slice(0, 40) : []
    if (!question) return res.status(400).json({ error: 'Missing question' })

    const library = resources.length
      ? resources
          .map((r, i) => `${i + 1}. [${r.type || 'resource'}] ${r.title || 'Untitled'}${r.description ? ` — ${r.description}` : ''}`)
          .join('\n')
      : '(no resources published yet)'

    const system = [
      'You are an AI assistant helping real estate agents who partner with a loan officer.',
      'Answer questions about loan guidelines and qualifying (credit score, DTI, down payment, reserves), loan programs (FHA, VA, USDA, conventional, jumbo, DSCR/investor, bank-statement), growing investor business, refinancing, marketing, and referrals.',
      'Be concise, friendly, and practical — at most 2-4 short paragraphs, plain language, no markdown headings.',
      'When it fits, encourage the agent to watch or read the most relevant items from their Education library (refer to them by title), and to confirm any real client scenario with their loan officer.',
      'Never invent specific interest rates and never promise loan approval. This is general education, not a lending commitment.',
      '',
      "The agent's Education library, published by their loan officer:",
      library,
    ].join('\n')

    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        max_tokens: 500,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: question },
        ],
      }),
    })

    if (!completion.ok) {
      const detail = await completion.text()
      return res.status(502).json({ error: 'Upstream OpenAI error', detail: detail.slice(0, 500) })
    }

    const data = await completion.json()
    const text = data.choices?.[0]?.message?.content?.trim()
    if (!text) return res.status(502).json({ error: 'Empty response from model' })

    // The browser attaches its own locally-ranked resource links to this text.
    return res.status(200).json({ text })
  } catch (err) {
    return res.status(500).json({ error: 'Assistant request failed', detail: String(err).slice(0, 500) })
  }
}
