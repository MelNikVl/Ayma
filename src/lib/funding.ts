/** Разбивка инвестиций по статьям, сохранённая в Startup.fundingBreakdown */
export type FundingItem = { item: string; amount: number };

export function parseFundingBreakdown(value: unknown): FundingItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((r) => ({ item: String((r as FundingItem)?.item ?? ""), amount: Number((r as FundingItem)?.amount) || 0 }))
    .filter((r) => r.item && r.amount > 0);
}
