const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const MODEL = 'gemini-1.5-flash'
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`

async function callGemini(prompt, imageDataUrl) {
  const base64 = imageDataUrl.split(',')[1]
  const mimeType = imageDataUrl.split(';')[0].split(':')[1] || 'image/jpeg'

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: base64 } },
        ],
      }],
      generationConfig: { temperature: 0.1 },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Gemini API error: ${res.status}`)
  }

  const data = await res.json()
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
}

/**
 * Given a product photo, extract the product name.
 */
export async function extractProductName(imageDataUrl) {
  const prompt = `You are looking at a photo of a product.
Identify the product name as it appears on the packaging.
Return ONLY the product name as a short string (e.g. "Maggi Noodles", "Dettol Soap", "Amul Butter").
If you cannot determine the product name, return "Unknown Product".
Do not include any explanation.`

  const result = await callGemini(prompt, imageDataUrl)
  return result || 'Unknown Product'
}

/**
 * Given a label/packaging photo, extract expiry date and lot number.
 * Returns { expiry_date: "YYYY-MM-DD" | null, lot_number: "..." | null }
 */
export async function extractLabelInfo(imageDataUrl) {
  const prompt = `You are looking at a product label or packaging.
Extract the following:
1. Expiry date — look for: EXP, EXPIRY, BEST BEFORE, USE BY, BB, MFD+shelf life. Convert to YYYY-MM-DD format.
   - If only month and year are given (e.g. "09/2026"), use the last day of that month (e.g. "2026-09-30").
   - If the date uses formats like "SEP 2026" or "09-26", convert accordingly.
2. Lot number — look for: LOT, LOT NO, BATCH, BATCH NO, L/N.

Return ONLY valid JSON like this (no explanation, no markdown):
{"expiry_date": "YYYY-MM-DD", "lot_number": "ABC123"}

If a field is not found or not readable, use null for that field.`

  const result = await callGemini(prompt, imageDataUrl)

  try {
    // Extract JSON from the response (in case there's extra text)
    const jsonMatch = result.match(/\{[\s\S]*\}/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
  } catch {
    // Parsing failed — return nulls
  }

  return { expiry_date: null, lot_number: null }
}
