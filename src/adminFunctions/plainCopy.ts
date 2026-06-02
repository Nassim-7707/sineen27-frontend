/** إزالة عبارات تسويقية مبالغ فيها من النصوص المعروضة للزبون والمتجر */

const MARKETING_WORD_PATTERNS = [
  /فاخر[ةةً]?/gi,
  /كلاسيك[يةيً]?/gi,
  /رسمي[ةةً]?/gi,
  /حصر[يةيً]?/gi,
  /استثنائي[ةة]?/gi,
  /ملكي[ةة]?/gi,
] as const;

export function stripMarketingTerms(text: string): string {
  if (!text?.trim()) return text ?? "";
  let result = text;
  for (const pattern of MARKETING_WORD_PATTERNS) {
    result = result.replace(pattern, "");
  }
  return result
    .replace(/\s{2,}/g, " ")
    .replace(/\s*([،,.])\s*\1+/g, "$1")
    .replace(/^\s*[-–—،]\s*/g, "")
    .replace(/\s*[-–—،]\s*$/g, "")
    .trim();
}

export function sanitizeProductCopy<T extends { name?: string; description?: string }>(
  item: T,
): T {
  return {
    ...item,
    ...(item.name != null ? { name: stripMarketingTerms(item.name) } : {}),
    ...(item.description != null
      ? { description: stripMarketingTerms(item.description) }
      : {}),
  };
}
