'use server'
import { cookies } from 'next/headers'
import { getSession } from '@lifehelper/core'
import Anthropic from '@anthropic-ai/sdk'

export type ParsedTransaction = {
  description: string
  amountARS: number | null
  amountUSD: number | null
  currency: 'ARS' | 'USD'
  installmentCurrent: number | null
  installmentTotal: number | null
}

const PARSE_PROMPT = `You are parsing an Argentine credit card statement (resumen de tarjeta de credito).
Extract all purchase/consumption/service transactions from the raw text below.

EXCLUDE (do not include in output):
- Tax lines: anything containing IMPUESTO, IIBB, IVA RG, DB.RG, SELLOS, PERCEP
- Bank fees: PROT. PAGOS, PLAN PROT, CUOTA MANTENIMIENTO, CARGO
- Payments: SU PAGO, PAGO EN PESOS
- Balance lines: SALDO ANTERIOR, Total Consumos

INCLUDE: purchases, subscriptions, fuel, insurance services, online services, restaurants, etc.

Argentine number format: "88.000,00" = 88000.00 (dots are thousands separators, comma is decimal).

For installments, look for patterns like "C.10/12" meaning installment 10 of 12.

Return ONLY a valid JSON array, no markdown fences, no explanation:
[
  {
    "description": "cleaned merchant name (remove reference codes like P1j2R3H3, MXG528XLY, etc.)",
    "amountARS": <number or null>,
    "amountUSD": <number or null>,
    "currency": "ARS" or "USD",
    "installmentCurrent": <number or null>,
    "installmentTotal": <number or null>
  }
]

Statement text:
`

async function getAuthedSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await getSession(token) : null
  if (!session) throw new Error('Unauthorized')
  return session
}

export async function parseStatementAction(formData: FormData): Promise<ParsedTransaction[]> {
  await getAuthedSession()

  const file = formData.get('pdf') as File | null
  if (!file) throw new Error('No PDF file provided')

  const buffer = Buffer.from(await file.arrayBuffer())
  const pdfParseModule = await import('pdf-parse')
  const pdfParse = (pdfParseModule as unknown as { default: (buf: Buffer) => Promise<{ text: string }> }).default ?? pdfParseModule
  const { text } = await (pdfParse as (buf: Buffer) => Promise<{ text: string }>)(buffer)

  const anthropic = new Anthropic()
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: PARSE_PROMPT + text }],
  })

  const raw = response.content[0]
  if (!raw || raw.type !== 'text') throw new Error('Unexpected response type from Claude')

  return JSON.parse(raw.text) as ParsedTransaction[]
}
