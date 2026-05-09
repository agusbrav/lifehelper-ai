import { CATEGORY_SEEDS } from './category-seeds'

export function buildTypeMap(
  keywords: { keyword: string; itemType: string | null }[],
): Record<string, string> {
  return Object.fromEntries(
    keywords.filter(r => r.itemType != null).map(r => [r.keyword, r.itemType!]),
  )
}

export function matchItemType(name: string, typeMap: Record<string, string>): string | null {
  const lower = name.toLowerCase().trim()
  if (!lower) return null
  if (lower in typeMap) return typeMap[lower]!
  const keys = Object.keys(typeMap).sort((a, b) => b.length - a.length)
  for (const kw of keys) {
    const pattern = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (pattern.test(lower)) return typeMap[kw]!
  }
  return null
}

export function buildKeywordMap(
  historyMap: Record<string, string>,
  userKeywords: Record<string, string> = {},
): Record<string, string> {
  // Priority: user-defined > history > seeds
  return { ...CATEGORY_SEEDS, ...historyMap, ...userKeywords }
}

export function matchCategory(name: string, keywordMap: Record<string, string>): string | null {
  const lower = name.toLowerCase().trim()
  if (!lower) return null
  if (lower in keywordMap) return keywordMap[lower]!
  const keys = Object.keys(keywordMap).sort((a, b) => b.length - a.length)
  for (const kw of keys) {
    const pattern = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (pattern.test(lower)) return keywordMap[kw]!
  }
  return null
}

export function knownCategories(keywordMap: Record<string, string>): string[] {
  return [...new Set(Object.values(keywordMap))].sort()
}
