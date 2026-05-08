type ToolProperty = {
  type: string
  description: string
  enum?: string[]
}

type ToolSchema = {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, ToolProperty>
    required: string[]
  }
}

export const budgetToolSchemas: ToolSchema[] = [
  {
    name: 'add_expense',
    description:
      'Adds a single expense to the current month. Call once per expense — call multiple times to add multiple expenses.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the expense (e.g. "Almuerzo", "Netflix").' },
        amount: {
          type: 'number',
          description: 'Amount in pesos or dollars as a plain number (not cents). E.g. 1200 for $1,200.',
        },
        category: {
          type: 'string',
          description: 'Category slug in lowercase (e.g. "comida", "transporte", "servicios", "entretenimiento").',
        },
        currency: {
          type: 'string',
          enum: ['ARS', 'USD'],
          description: 'Currency. Defaults to ARS if not specified.',
        },
      },
      required: ['name', 'amount', 'category'],
    },
  },
  {
    name: 'add_installment',
    description:
      'Adds an installment purchase to the current month. The item propagates automatically to future months.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the purchase (e.g. "Televisor Samsung").' },
        amount: {
          type: 'number',
          description: 'Amount per installment in pesos or dollars (not cents).',
        },
        totalPayments: { type: 'number', description: 'Total number of monthly installments.' },
        category: { type: 'string', description: 'Category slug in lowercase.' },
        currency: {
          type: 'string',
          enum: ['ARS', 'USD'],
          description: 'Currency. Defaults to ARS.',
        },
      },
      required: ['name', 'amount', 'totalPayments', 'category'],
    },
  },
  {
    name: 'set_amount',
    description:
      'Updates the amount of an existing expense in the current month, looked up by name (case-insensitive).',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the expense to update (partial, case-insensitive match).',
        },
        amount: { type: 'number', description: 'New amount in pesos or dollars (not cents).' },
      },
      required: ['name', 'amount'],
    },
  },
  {
    name: 'add_month',
    description:
      'Creates a new budget month. Only call when the user explicitly asks to create or open a new month.',
    input_schema: {
      type: 'object',
      properties: {
        year: { type: 'number', description: 'Year (e.g. 2026).' },
        month: { type: 'number', description: 'Month number 1–12.' },
      },
      required: ['year', 'month'],
    },
  },
  {
    name: 'get_summary',
    description:
      'Returns spending totals and category breakdown for a month. Use when the user asks about totals, spending overview, or category breakdown.',
    input_schema: {
      type: 'object',
      properties: {
        year: { type: 'number', description: 'Year. Omit to use the current viewed month.' },
        month: { type: 'number', description: 'Month 1–12. Omit to use the current viewed month.' },
      },
      required: [],
    },
  },
  {
    name: 'get_inflation_report',
    description:
      'Returns recurring expenses whose price changed compared to 3 months ago. Use when the user asks about price changes, inflation, or cost increases.',
    input_schema: {
      type: 'object',
      properties: {
        year: { type: 'number', description: 'Year. Omit to use the current viewed month.' },
        month: { type: 'number', description: 'Month 1–12. Omit to use the current viewed month.' },
      },
      required: [],
    },
  },
]
