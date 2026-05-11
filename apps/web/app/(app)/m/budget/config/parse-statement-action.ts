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
  date: string | null
}

export type ParsedStatementResult = {
  transactions: ParsedTransaction[]
  dueDate: string | null
}

const PARSE_PROMPT = `You are parsing an Argentine credit card statement (resumen de tarjeta de credito).
Extract all purchase/consumption/service transactions from the raw text below.

EXCLUDE entirely (do not include in output):
- Bank fees: PROT. PAGOS, PLAN PROT, CUOTA MANTENIMIENTO, CARGO
- Payments: SU PAGO, PAGO EN PESOS
- Balance lines: SALDO ANTERIOR, Total Consumos

GROUP into a single entry with description "Impuestos y sellos":
- All tax lines: anything containing IMPUESTO, IIBB, IVA RG, DB.RG, SELLOS, PERCEP, IMPUESTO PAIS
- Sum their ARS amounts into one entry. If none exist, omit this entry entirely.

INCLUDE individually: purchases, subscriptions, fuel, insurance services, online services, restaurants, etc.

Argentine number format: "88.000,00" = 88000.00 (dots are thousands separators, comma is decimal).

For installments, look for patterns like "C.10/12" meaning installment 10 of 12.

For dates: look for patterns like "12/03", "12-MAR", "12/03/2026". The statement year is the current year unless explicitly shown otherwise.

Also extract the card payment due date (vencimiento/fecha de pago/fecha de vencimiento). Look for labels like "Vencimiento:", "Fecha de Vencimiento:", "Fecha de Pago:", "Pagar antes del". Return it in "dueDate" as "YYYY-MM-DD" or null if not found.

Return ONLY a valid JSON object, no markdown fences, no explanation:
{
  "dueDate": "YYYY-MM-DD" or null,
  "transactions": [
    {
      "description": "cleaned merchant name (remove reference codes like P1j2R3H3, MXG528XLY, etc.)",
      "amountARS": <number or null>,
      "amountUSD": <number or null>,
      "currency": "ARS" or "USD",
      "installmentCurrent": <number or null>,
      "installmentTotal": <number or null>,
      "date": "YYYY-MM-DD" or null
    }
  ]
}

Statement text:
`

async function getAuthedSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await getSession(token) : null
  if (!session) throw new Error('Unauthorized')
  return session
}

export async function parseStatementAction(formData: FormData): Promise<ParsedStatementResult> {
  await getAuthedSession()

  const file = formData.get('pdf') as File | null
  if (!file) throw new Error('No PDF file provided')

  const buffer = Buffer.from(await file.arrayBuffer())
  const { PDFParse } = await import('pdf-parse') as unknown as { PDFParse: new (opts: { data: Buffer }) => { getText(): Promise<{ text: string }> } }
  const parser = new PDFParse({ data: buffer })
  const { text } = await parser.getText()

  const anthropic = new Anthropic()
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8192,
    messages: [{ role: 'user', content: PARSE_PROMPT + text }],
  })

  if (response.stop_reason !== 'end_turn') throw new Error('Statement too large to process')

  const textBlock = response.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') throw new Error('Unexpected response type from Claude')

  const cleaned = textBlock.text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`Could not parse Claude response: ${cleaned.slice(0, 200)}`)
  }
  if (Array.isArray(parsed)) {
    return { transactions: parsed as ParsedTransaction[], dueDate: null }
  }
  if (typeof parsed === 'object' && parsed !== null && 'transactions' in parsed) {
    const obj = parsed as { transactions: ParsedTransaction[]; dueDate?: string | null }
    return { transactions: obj.transactions, dueDate: obj.dueDate ?? null }
  }
  throw new Error('Claude response is not a valid statement result')
}
