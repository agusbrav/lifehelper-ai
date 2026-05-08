import { describe, it, expect } from 'vitest'
import { buildBudgetSystemPrompt } from '../chat-prompt'

const base = {
  locale: 'en-US',
  year: 2026,
  month: 5,
  arsTotal: 4520000,
  usdTotal: 12000,
  topArsCategories: [
    { category: 'food', total: 1200000 },
    { category: 'transport', total: 800000 },
  ],
  topUsdCategories: [{ category: 'subscriptions', total: 12000 }],
  recurringCount: 5,
  installmentCount: 2,
}

describe('buildBudgetSystemPrompt', () => {
  it('includes the locale-formatted month label', () => {
    const result = buildBudgetSystemPrompt(base)
    expect(result).toContain('May 2026')
  })

  it('includes ARS total formatted without cents', () => {
    const result = buildBudgetSystemPrompt(base)
    expect(result).toContain('45,200')
  })

  it('includes USD section when usdTotal > 0', () => {
    const result = buildBudgetSystemPrompt(base)
    expect(result).toContain('USD total')
    expect(result).toContain('120.00')
  })

  it('omits USD section when usdTotal is 0', () => {
    const result = buildBudgetSystemPrompt({ ...base, usdTotal: 0, topUsdCategories: [] })
    expect(result).not.toContain('USD total')
  })

  it('includes locale in rules', () => {
    const result = buildBudgetSystemPrompt(base)
    expect(result).toContain('en-US')
  })

  it('includes recurring and installment counts', () => {
    const result = buildBudgetSystemPrompt(base)
    expect(result).toContain('5')
    expect(result).toContain('2')
  })
})
