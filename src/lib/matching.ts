export type Matchable = { skuKey: string; eanKey?: string | null };

export function createUniqueIndex<T extends Matchable>(records: T[], field: "skuKey" | "eanKey") {
  const grouped = new Map<string, T[]>();
  for (const record of records) {
    const key = record[field];
    if (!key) continue;
    const existing = grouped.get(key);
    if (existing) existing.push(record);
    else grouped.set(key, [record]);
  }
  return grouped;
}

export function createMatchIndexes<T extends Matchable>(records: T[]) {
  return {
    sku: createUniqueIndex(records, "skuKey"),
    ean: createUniqueIndex(records, "eanKey"),
  };
}

export function matchIndexed<T extends Matchable>(record: Matchable, indexes: ReturnType<typeof createMatchIndexes<T>>) {
  const sku = indexes.sku.get(record.skuKey) ?? [];
  if (sku.length === 1) return { status: "MATCHED_SKU" as const, record: sku[0] };
  if (sku.length > 1) return { status: "AMBIGUOUS" as const, record: null };
  const ean = record.eanKey
    ? indexes.ean.get(record.eanKey) ?? []
    : [];
  if (ean.length === 1) return { status: "MATCHED_EAN" as const, record: ean[0] };
  if (ean.length > 1) return { status: "AMBIGUOUS" as const, record: null };
  return { status: "UNMATCHED" as const, record: null };
}

export function matchRecord<T extends Matchable>(record: Matchable, candidates: T[]) {
  return matchIndexed(record, createMatchIndexes(candidates));
}
