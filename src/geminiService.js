const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const MODEL = 'gemini-1.5-flash'
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

async function callGemini(prompt, imageDataUrl) {
  const base64 = imageDataUrl.split(',')[1]
  const mimeType = imageDataUrl.split(';')[0].split(':')[1] || 'image/jpeg'

  const body = JSON.stringify({
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: base64 } },
      ],
    }],
    generationConfig: { temperature: 0.1 },
  })

  // Pass key via both URL param AND x-goog-api-key header (covers all formats)
  const res = await fetch(`${API_URL}?key=${API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': API_KEY,
    },
    body,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Gemini API error ${res.status}`)
  }

  const data = await res.json()
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
}

export async function extractProductName(imageDataUrl) {
  const prompt = `Look at this product photo. Return ONLY the product name (e.g. "Maggi Noodles", "Dettol Soap"). If unclear, return "Unknown Product". No explanation.`
  const result = await callGemini(prompt, imageDataUrl)
  return result || 'Unknown Product'
}

export async function extractLabelInfo(imageDataUrl) {
  const prompt = `Look at this product label. Extract:
1. Expiry date (EXP/BEST BEFORE/USE BY/BB) — return as YYYY-MM-DD. If only month+year given (e.g. "09/2026"), use last day of month (e.g. "2026-09-30").
2. Lot/Batch number (LOT/BATCH/L/N).

Return ONLY JSON, no explanation:
{"expiry_date": "YYYY-MM-DD", "lot_number": "ABC123"}

Use null if not found.`

  const result = await callGemini(prompt, imageDataUrl)
  try {
    const match = result.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
  } catch { /* fall through */ }
  return { expiry_date: null, lot_number: null }
}
