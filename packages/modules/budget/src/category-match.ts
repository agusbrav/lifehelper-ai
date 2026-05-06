import { CATEGORY_SEEDS } from './category-seeds'

export function buildKeywordMap(historyMap: Record<string, string>): Record<string, string> {
  return { ...CATEGORY_SEEDS, ...historyMap }
}

export function matchCategory(name: string, keywordMap: Record<string, string>): string | null {
  const lower = name.toLowerCase().trim()
  if (!lower) return null
  if (lower in keywordMap) return keywordMap[lower]!
  const keys = Object.keys(keywordMap).sort((a, b) => b.length - a.length)
  for (const kw of keys) {
    if (lower.includes(kw)) return keywordMap[kw]!
  }
  return null
}

export function knownCategories(keywordMap: Record<string, string>): string[] {
  return [...new Set(Object.values(keywordMap))].sort()
}
