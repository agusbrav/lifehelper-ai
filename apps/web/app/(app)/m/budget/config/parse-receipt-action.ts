'use server'
import Anthropic from '@anthropic-ai/sdk'
import { cookies } from 'next/headers'
import { getSession } from '@lifehelper/core'

export type ParsedReceiptItem = {
  description: string
  amountARS: number | null
  amountUSD: number | null
  currency: 'ARS' | 'USD'
  date: string | null  // YYYY-MM-DD
  category: string | null
}

const RECEIPT_PROMPT = `You are parsing an Argentine payment receipt, bank transfer confirmation, or expense ticket.
Extract all individual expenses or charges shown.

Argentine number format: "88.000,00" = 88000.00 (dots are thousands separators, comma is decimal).

Return ONLY a valid JSON array, no markdown fences, no explanation:
[
  {
    "description": "merchant or payment description",
    "amountARS": <number or null>,
    "amountUSD": <number or null>,
    "currency": "ARS" or "USD",
    "date": "YYYY-MM-DD" or null,
    "category": "suggested category in Spanish or null"
  }
]`

export async function parseReceiptAction(formData: FormData): Promise<ParsedReceiptItem[]> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await getSession(token) : null
  if (!session) throw new Error('Unauthorized')

  const file = formData.get('image') as File | null
  if (!file) throw new Error('No image file provided')

  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString('base64')
  const mediaType = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

  const anthropic = new Anthropic()
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
        { type: 'text', text: RECEIPT_PROMPT },
      ],
    }],
  })

  const textBlock = response.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') throw new Error('Unexpected response from Claude')

  const cleaned = textBlock.text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`Could not parse Claude response: ${cleaned.slice(0, 200)}`)
  }
  if (!Array.isArray(parsed)) throw new Error('Response is not an array')
  return parsed as ParsedReceiptItem[]
}
