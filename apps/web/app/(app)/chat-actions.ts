'use server'
import Anthropic from '@anthropic-ai/sdk'
import { cookies } from 'next/headers'
import { getSession } from '@lifehelper/core'
import {
  getItemsForAnalytics,
  computeCategoryTotals,
  computeUsdCategoryTotals,
  budgetToolSchemas,
  buildBudgetSystemPrompt,
  executeBudgetTool,
} from '@lifehelper/budget'
import type { ChatContext } from '@/components/chat/chat-context'

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

const MUTATION_TOOLS = new Set(['add_expense', 'add_installment', 'set_amount', 'add_month'])

async function getSessionOrThrow() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await getSession(token) : null
  if (!session) throw new Error('Unauthorized')
  return session
}

export async function sendChatMessage(
  messages: ChatMessage[],
  context: ChatContext,
): Promise<{ message: ChatMessage; mutated: boolean }> {
  const session = await getSessionOrThrow()
  const userId = session.user.id
  const locale = session.user.locale ?? 'es-AR'

  if (context.module !== 'budget') {
    return { message: { role: 'assistant', content: 'No module context available.' }, mutated: false }
  }

  const year = context.metadata.year as number
  const month = context.metadata.month as number

  const allItems = await getItemsForAnalytics(userId)
  const monthItems = allItems.filter(i => i.month.year === year && i.month.month === month)

  const arsTotals = computeCategoryTotals(monthItems).sort((a, b) => b.total - a.total)
  const usdTotals = computeUsdCategoryTotals(monthItems).sort((a, b) => b.total - a.total)
  const arsTotal = arsTotals.reduce((s, c) => s + c.total, 0)
  const usdTotal = usdTotals.reduce((s, c) => s + c.total, 0)
  const recurringCount = monthItems.filter(i => i.recurring && !i.isCard && i.parentId === null).length
  const installmentCount = monthItems.filter(i => i.installmentTotal !== null && i.parentId === null).length

  const systemPrompt = buildBudgetSystemPrompt({
    locale,
    year,
    month,
    arsTotal,
    usdTotal,
    topArsCategories: arsTotals,
    topUsdCategories: usdTotals,
    recurringCount,
    installmentCount,
  })

  const anthropic = new Anthropic()
  const toolContext = { year, month }
  let mutated = false

  const anthropicMessages: Anthropic.MessageParam[] = messages.map(m => ({
    role: m.role,
    content: m.content,
  }))

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: budgetToolSchemas as any,
      messages: anthropicMessages,
    })

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find(b => b.type === 'text')
      const text = textBlock?.type === 'text' ? textBlock.text : ''
      return { message: { role: 'assistant', content: text }, mutated }
    }

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      )

      const toolResults = await Promise.all(
        toolUseBlocks.map(async block => {
          if (MUTATION_TOOLS.has(block.name)) mutated = true
          const result = await executeBudgetTool(
            block.name,
            block.input as Record<string, unknown>,
            userId,
            toolContext,
          )
          return {
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: result,
          }
        }),
      )

      anthropicMessages.push({ role: 'assistant', content: response.content })
      anthropicMessages.push({ role: 'user', content: toolResults })
    } else {
      // Unexpected stop reason (e.g. max_tokens) — return whatever text is available
      const textBlock = response.content.find(b => b.type === 'text')
      const text = textBlock?.type === 'text' ? textBlock.text : ''
      return { message: { role: 'assistant', content: text }, mutated }
    }
  }
}
