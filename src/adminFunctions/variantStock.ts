/** Used when a product has no colors or for legacy invoice lines */
export const DEFAULT_VARIANT_COLOR = "افتراضي";

export interface PurchaseSizeLine {
  quantity: number;
  purchasePrice: number;
  suggestedSellingPrice: number;
}

export interface PurchaseInvoiceItem {
  productId: string;
  colors: Record<string, Record<string, PurchaseSizeLine>>;
  sizes?: Record<string, PurchaseSizeLine>;
}

export interface PurchaseColorBlock {
  sizes: Record<string, PurchaseSizeLine>;
  globalPurchasePrice?: number;
  globalSellingPrice?: number;
}

/** Runtime shape in PurchaseModal (UI fields stripped on save) */
export interface PurchaseLineDraft {
  productId: string;
  productName?: string;
  colors?: Record<string, PurchaseColorBlock>;
  /** @deprecated legacy flat sizes — migrated to colors[DEFAULT_VARIANT_COLOR] */
  sizes?: Record<string, PurchaseSizeLine>;
  globalPurchasePrice?: number;
  globalSellingPrice?: number;
}

export function productColors(colors?: string[]): string[] {
  const list = (colors || []).map((c) => c.trim()).filter(Boolean);
  return list.length > 0 ? list : [DEFAULT_VARIANT_COLOR];
}

function normalizeSizeLine(row: Partial<PurchaseSizeLine>): PurchaseSizeLine {
  return {
    quantity: Number(row.quantity) || 0,
    purchasePrice: Number(row.purchasePrice) || 0,
    suggestedSellingPrice: Number(row.suggestedSellingPrice) || 0,
  };
}

/** يوحّد شكل اللون: مسودّة UI `{ sizes }` أو فاتورة محفوظة `{ "54": {...} }` */
export function toColorBlock(raw: unknown): PurchaseColorBlock {
  if (!raw || typeof raw !== "object") {
    return { sizes: {}, globalPurchasePrice: 0, globalSellingPrice: 0 };
  }
  const obj = raw as Record<string, unknown>;
  const globals = {
    globalPurchasePrice: Number(obj.globalPurchasePrice) || 0,
    globalSellingPrice: Number(obj.globalSellingPrice) || 0,
  };

  const mergeFlatSizeKeys = (
    sizes: Record<string, PurchaseSizeLine>,
  ): Record<string, PurchaseSizeLine> => {
    const next = { ...sizes };
    Object.entries(obj).forEach(([key, val]) => {
      if (key === "sizes" || key === "globalPurchasePrice" || key === "globalSellingPrice")
        return;
      if (val && typeof val === "object" && "quantity" in (val as object)) {
        next[key] = normalizeSizeLine(val as PurchaseSizeLine);
      }
    });
    return next;
  };

  if (obj.sizes && typeof obj.sizes === "object") {
    const sizes: Record<string, PurchaseSizeLine> = {};
    Object.entries(obj.sizes as Record<string, PurchaseSizeLine>).forEach(
      ([size, row]) => {
        sizes[size] = normalizeSizeLine(row);
      },
    );
    return { ...globals, sizes: mergeFlatSizeKeys(sizes) };
  }

  const sizes: Record<string, PurchaseSizeLine> = {};
  Object.entries(obj).forEach(([key, val]) => {
    if (key === "globalPurchasePrice" || key === "globalSellingPrice") return;
    if (val && typeof val === "object" && "quantity" in (val as object)) {
      sizes[key] = normalizeSizeLine(val as PurchaseSizeLine);
    }
  });
  return { ...globals, sizes };
}

/** فواتير قديمة بدون لون → أول لون في المنتج */
export function resolveVariantColorForProduct(
  color: string,
  productColorsList?: string[],
): string {
  const palette = productColors(productColorsList);
  if (
    color === DEFAULT_VARIANT_COLOR &&
    palette[0] !== DEFAULT_VARIANT_COLOR
  ) {
    return palette[0];
  }
  return color;
}

export function normalizePurchaseItem(
  item: PurchaseLineDraft,
  productColorsList?: string[],
): PurchaseInvoiceItem {
  const colors: Record<string, PurchaseColorBlock> = {};
  Object.entries(item.colors || {}).forEach(([c, raw]) => {
    colors[c] = toColorBlock(raw);
  });

  if (item.sizes && Object.keys(item.sizes).length > 0) {
    const key = productColorsList?.[0] || DEFAULT_VARIANT_COLOR;
    if (!colors[key]) colors[key] = { sizes: {} };
    Object.entries(item.sizes).forEach(([size, data]) => {
      colors[key].sizes[size] = { ...data };
    });
  }

  const cleanColors: Record<string, Record<string, PurchaseSizeLine>> = {};
  Object.entries(colors).forEach(([color, rawBlock]) => {
    const block = toColorBlock(rawBlock);
    const cleanSizes: Record<string, PurchaseSizeLine> = {};
    Object.entries(block.sizes).forEach(([size, data]) => {
      if ((data.quantity || 0) > 0) {
        cleanSizes[size] = {
          quantity: data.quantity,
          purchasePrice: data.purchasePrice || 0,
          suggestedSellingPrice: data.suggestedSellingPrice || 0,
        };
      }
    });
    if (Object.keys(cleanSizes).length > 0) {
      cleanColors[color] = cleanSizes;
    }
  });

  return { productId: item.productId, colors: cleanColors };
}

function forEachVariantLine(
  colors: PurchaseLineDraft["colors"],
  fn: (color: string, size: string, data: PurchaseSizeLine) => void,
) {
  Object.entries(colors ?? {}).forEach(([color, raw]) => {
    Object.entries(toColorBlock(raw).sizes).forEach(([size, data]) =>
      fn(color, size, data),
    );
  });
}

/** يجمع كل البنود من مسودة التحرير أو فاتورة محفوظة */
export function iteratePurchaseVariantsFromDraft(
  item: PurchaseLineDraft | PurchaseInvoiceItem,
): Array<{ color: string; size: string; data: PurchaseSizeLine }> {
  const out: Array<{ color: string; size: string; data: PurchaseSizeLine }> = [];
  const seen = new Set<string>();

  const push = (color: string, size: string, data: PurchaseSizeLine) => {
    if ((data.quantity || 0) <= 0) return;
    const key = `${color}|${size}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ color, size, data });
  };

  forEachVariantLine(item.colors, push);

  const legacy = (item as PurchaseLineDraft).sizes;
  if (legacy) {
    Object.entries(legacy).forEach(([size, data]) =>
      push(DEFAULT_VARIANT_COLOR, size, data),
    );
  }

  return out;
}

export function iteratePurchaseVariants(item: PurchaseInvoiceItem): Array<{
  color: string;
  size: string;
  data: PurchaseSizeLine;
}> {
  return iteratePurchaseVariantsFromDraft(item);
}

export function purchaseItemHasStock(item: PurchaseLineDraft): boolean {
  return iteratePurchaseVariantsFromDraft(item).some(
    (v) => v.data.quantity > 0 && v.data.purchasePrice > 0,
  );
}

export function calcPurchaseTotal(items: PurchaseLineDraft[]): number {
  return items.reduce((sum, item) => {
    return (
      sum +
      iteratePurchaseVariantsFromDraft(item).reduce(
        (a, v) => a + v.data.quantity * (v.data.purchasePrice || 0),
        0,
      )
    );
  }, 0);
}

/** ألوان ومقاسات الفاتورة + المنتج — لا نفقد بيانات محفوظة */
export function editPaletteAndSizes(
  item: PurchaseLineDraft | PurchaseInvoiceItem,
  prod?: { colors?: string[]; sizes?: string[]; category?: string },
  categorySizes?: Record<string, string[]>,
): { palette: string[]; sizes: string[] } {
  const variants = iteratePurchaseVariantsFromDraft(item);
  const palette = [
    ...new Set([
      ...productColors(prod?.colors),
      ...variants.map((v) => v.color),
      ...Object.keys(item.colors || {}),
    ]),
  ];
  const sizes = [
    ...new Set([
      ...(prod?.sizes || []),
      ...(prod?.category && categorySizes
        ? categorySizes[prod.category] || []
        : []),
      ...variants.map((v) => v.size),
      ...Object.values(item.colors || {}).flatMap((raw) =>
        Object.keys(toColorBlock(raw).sizes),
      ),
      ...Object.keys((item as PurchaseLineDraft).sizes || {}),
    ]),
  ];
  return { palette, sizes };
}

/** بناء مسودة تحرير من بيانات الفاتورة (مصدر الحقيقة: الكميات المحفوظة) */
export function buildPurchaseEditDraft(
  item: PurchaseLineDraft | PurchaseInvoiceItem,
  prod?: { name?: string; colors?: string[]; sizes?: string[]; category?: string },
  categorySizes?: Record<string, string[]>,
): PurchaseLineDraft {
  const variants = iteratePurchaseVariantsFromDraft(item);
  const { palette, sizes: relSizes } = editPaletteAndSizes(
    item,
    prod,
    categorySizes,
  );

  const colors: Record<string, PurchaseColorBlock> = {};
  palette.forEach((color) => {
    colors[color] = {
      sizes: {},
      globalPurchasePrice: 0,
      globalSellingPrice: 0,
    };
  });

  variants.forEach(({ color, size, data }) => {
    const resolved = resolveVariantColorForProduct(color, prod?.colors);
    if (!colors[resolved]) {
      colors[resolved] = { sizes: {}, globalPurchasePrice: 0, globalSellingPrice: 0 };
    }
    colors[resolved].sizes[size] = {
      quantity: data.quantity,
      purchasePrice: data.purchasePrice,
      suggestedSellingPrice: data.suggestedSellingPrice,
    };
    if (data.purchasePrice > 0 && !colors[resolved].globalPurchasePrice) {
      colors[resolved].globalPurchasePrice = data.purchasePrice;
    }
    if (data.suggestedSellingPrice > 0 && !colors[resolved].globalSellingPrice) {
      colors[resolved].globalSellingPrice = data.suggestedSellingPrice;
    }
  });

  const draft: PurchaseLineDraft = {
    productId: item.productId,
    productName: (item as PurchaseLineDraft).productName || prod?.name,
    colors,
  };

  return ensureVariantMatrix(draft, palette, relSizes);
}

/** تحويل بنود الفاتورة المحفوظة إلى مسودة جاهزة للتحرير في النافذة */
export function preparePurchaseEditItems(
  invoiceItems: Array<PurchaseLineDraft | PurchaseInvoiceItem>,
  products: Array<{
    id: string;
    name: string;
    colors?: string[];
    sizes?: string[];
    category: string;
  }>,
  categorySizes: Record<string, string[]>,
): PurchaseLineDraft[] {
  return invoiceItems.map((item) => {
    const prod = products.find((p) => p.id === item.productId);
    return buildPurchaseEditDraft(item, prod, categorySizes);
  });
}

/** Merge legacy `sizes` into `colors` for modal editing */
export function getVariantLine(
  item: PurchaseLineDraft,
  color: string,
  size: string,
): PurchaseSizeLine {
  const block = toColorBlock(item.colors?.[color]);
  return (
    block.sizes[size] || {
      quantity: 0,
      purchasePrice: block.globalPurchasePrice || item.globalPurchasePrice || 0,
      suggestedSellingPrice:
        block.globalSellingPrice || item.globalSellingPrice || 0,
    }
  );
}

export function setVariantLine(
  item: PurchaseLineDraft,
  color: string,
  size: string,
  patch: Partial<PurchaseSizeLine>,
): PurchaseLineDraft {
  const colors = { ...(item.colors || {}) };
  const block = toColorBlock(colors[color]);
  const prev = getVariantLine(item, color, size);
  colors[color] = {
    ...block,
    sizes: {
      ...block.sizes,
      [size]: { ...prev, ...patch },
    },
  };
  return { ...item, colors };
}

export function applyBulkPricesToItem(
  item: PurchaseLineDraft,
  purchasePrice: number,
  sellingPrice: number,
): PurchaseLineDraft {
  let next = { ...item };
  if (purchasePrice > 0) next.globalPurchasePrice = purchasePrice;
  if (sellingPrice > 0) next.globalSellingPrice = sellingPrice;

  const colors = { ...(next.colors || {}) };
  Object.keys(colors).forEach((color) => {
    const block = toColorBlock(colors[color]);
    const nextSizes = { ...block.sizes };
    if (purchasePrice > 0) block.globalPurchasePrice = purchasePrice;
    if (sellingPrice > 0) block.globalSellingPrice = sellingPrice;
    Object.keys(nextSizes).forEach((size) => {
      const row = nextSizes[size];
      if ((row.quantity || 0) > 0 || purchasePrice > 0 || sellingPrice > 0) {
        nextSizes[size] = {
          ...row,
          purchasePrice: purchasePrice > 0 ? purchasePrice : row.purchasePrice,
          suggestedSellingPrice:
            sellingPrice > 0 ? sellingPrice : row.suggestedSellingPrice,
        };
      }
    });
    colors[color] = { ...block, sizes: nextSizes };
  });
  return { ...next, colors };
}

/** Ensure every color×size row exists for fast grid entry */
export function ensureVariantMatrix(
  item: PurchaseLineDraft,
  palette: string[],
  sizes: string[],
): PurchaseLineDraft {
  const allColors = [
    ...new Set([...palette, ...Object.keys(item.colors || {})]),
  ];
  const colors = { ...(item.colors || {}) };
  allColors.forEach((color) => {
    const block = toColorBlock(colors[color]);
    if (!block.globalPurchasePrice && item.globalPurchasePrice) {
      block.globalPurchasePrice = item.globalPurchasePrice;
    }
    if (!block.globalSellingPrice && item.globalSellingPrice) {
      block.globalSellingPrice = item.globalSellingPrice;
    }
    const nextSizes = { ...block.sizes };
    sizes.forEach((size) => {
      if (!nextSizes[size]) {
        nextSizes[size] = {
          quantity: 0,
          purchasePrice: block.globalPurchasePrice || 0,
          suggestedSellingPrice: block.globalSellingPrice || 0,
        };
      }
    });
    colors[color] = { ...block, sizes: nextSizes };
  });
  return { ...item, colors };
}

export function variantMatrixRows(
  palette: string[],
  sizes: string[],
): Array<{ color: string; size: string }> {
  return palette.flatMap((color) => sizes.map((size) => ({ color, size })));
}

export function hydratePurchaseLineDraft(
  item: PurchaseLineDraft,
  productColorsList?: string[],
): PurchaseLineDraft {
  if (item.colors && Object.keys(item.colors).length > 0) {
    return {
      ...item,
      colors: Object.fromEntries(
        Object.entries(item.colors).map(([c, raw]) => [c, toColorBlock(raw)]),
      ),
    };
  }

  if (item.sizes && Object.keys(item.sizes).length > 0) {
    const colorKey = productColorsList?.[0] || DEFAULT_VARIANT_COLOR;
    return {
      ...item,
      colors: {
        [colorKey]: {
          sizes: { ...item.sizes },
          globalPurchasePrice: item.globalPurchasePrice ?? 0,
          globalSellingPrice: item.globalSellingPrice ?? 0,
        },
      },
    };
  }

  const palette = productColorsList?.length
    ? productColorsList
    : [DEFAULT_VARIANT_COLOR];
  return {
    ...item,
    colors: Object.fromEntries(
      palette.map((c) => [
        c,
        {
          sizes: {},
          globalPurchasePrice: 0,
          globalSellingPrice: 0,
        },
      ]),
    ),
  };
}
