import { describe, it, expect } from 'vitest'
import { matchCategory, buildKeywordMap, knownCategories } from '../category-match'

const SEEDS: Record<string, string> = {
  rappi: 'comida',
  delivery: 'comida',
  'uber eats': 'comida',
  uber: 'transporte',
  gym: 'salud',
  netflix: 'entretenimiento',
}

describe('matchCategory', () => {
  it('returns null for empty name', () => {
    expect(matchCategory('', SEEDS)).toBeNull()
    expect(matchCategory('   ', SEEDS)).toBeNull()
  })

  it('matches an exact key in the map', () => {
    expect(matchCategory('rappi', SEEDS)).toBe('comida')
  })

  it('matches case-insensitively', () => {
    expect(matchCategory('RAPPI', SEEDS)).toBe('comida')
    expect(matchCategory('Rappi', SEEDS)).toBe('comida')
  })

  it('matches keyword as substring of expense name', () => {
    expect(matchCategory('Rappi delivery comida', SEEDS)).toBe('comida')
  })

  it('prefers longer keyword over shorter when both match', () => {
    // "uber eats" (9 chars) should win over "uber" (4 chars)
    expect(matchCategory('Uber Eats pedido', SEEDS)).toBe('comida')
  })

  it('exact history match takes precedence over substring seed match', () => {
    // History has "rappi delivery" -> viajes (unusual, but user overrode it)
    const map = buildKeywordMap({ 'rappi delivery': 'viajes' })
    expect(matchCategory('rappi delivery', map)).toBe('viajes')
  })

  it('falls back to seed when no history matches', () => {
    const map = buildKeywordMap({})
    expect(matchCategory('Gym mensual', map)).toBe('salud')
  })

  it('returns null when no keyword matches', () => {
    expect(matchCategory('Random expense', SEEDS)).toBeNull()
  })

  it('does not match keyword as substring of a longer word', () => {
    // "gas" should not match "Gastos varios"
    const map = buildKeywordMap({ gas: 'servicios' })
    expect(matchCategory('Gastos varios', map)).toBeNull()
  })
})

describe('buildKeywordMap', () => {
  it('merges seeds with history, history wins on collision', () => {
    const map = buildKeywordMap({ rappi: 'viajes' })
    // user re-categorized "rappi" as viajes - their choice wins
    expect(map['rappi']).toBe('viajes')
    // seeds still present for other keywords
    expect(map['gym']).toBe('salud')
  })

  it('adds history keys that are not in seeds', () => {
    const map = buildKeywordMap({ "mcdonald's": 'comida' })
    expect(map["mcdonald's"]).toBe('comida')
  })
})

describe('knownCategories', () => {
  it('returns sorted unique category values', () => {
    const map = buildKeywordMap({ 'my place': 'vivienda' })
    const cats = knownCategories(map)
    expect(cats).toEqual([...new Set(cats)]) // unique
    expect(cats).toEqual([...cats].sort())    // sorted
    expect(cats).toContain('comida')
    expect(cats).toContain('salud')
  })
})
