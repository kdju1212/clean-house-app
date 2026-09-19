// Mirrors clean_house's src/lib/reservation-questions.ts (the two repos
// don't share code) — same category slugs, same question shape, so a
// reservation created from either client validates and displays the same
// way. Keep the two in sync when adding a category or question.

export type ReservationQuestion = {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  options?: string[];
  placeholder?: string;
  required: boolean;
  // A "select" question with more than one answer allowed (e.g. 에어컨
  // 형태 — a customer might have both a 벽걸이형 and a 스탠드형 unit to
  // clean). Stored as the selected options joined with "," in the same
  // string value every other question uses.
  multiple?: boolean;
};

const AREA_QUESTIONS: ReservationQuestion[] = [
  { key: "area", label: "평수", type: "number", placeholder: "예: 24", required: true },
  { key: "rooms", label: "방 개수", type: "number", placeholder: "예: 3", required: false },
];

export const CATEGORY_QUESTIONS: Record<string, ReservationQuestion[]> = {
  "move-in": AREA_QUESTIONS,
  moving: AREA_QUESTIONS,
  residential: AREA_QUESTIONS,
  office: [{ key: "area", label: "평수", type: "number", placeholder: "예: 30", required: true }],
  restaurant: [{ key: "area", label: "평수", type: "number", placeholder: "예: 20", required: true }],
  store: [{ key: "area", label: "평수", type: "number", placeholder: "예: 20", required: true }],
  aircon: [
    { key: "brand", label: "브랜드", type: "text", placeholder: "예: LG, 삼성", required: false },
    {
      key: "type",
      label: "형태",
      type: "select",
      options: ["벽걸이형", "스탠드형", "시스템에어컨", "창문형"],
      required: true,
      multiple: true,
    },
    { key: "count", label: "대수", type: "number", placeholder: "예: 2", required: true },
  ],
  washer: [
    { key: "brand", label: "브랜드", type: "text", placeholder: "예: LG, 삼성", required: false },
    {
      key: "type",
      label: "타입",
      type: "select",
      options: ["통돌이", "드럼", "트윈워시"],
      required: true,
    },
    { key: "capacity", label: "용량 (kg)", type: "number", placeholder: "예: 15", required: false },
  ],
};

export function getReservationQuestions(categorySlug: string): ReservationQuestion[] {
  return CATEGORY_QUESTIONS[categorySlug] ?? [];
}

/** Which question key represents the "how many units" quantity a company
 * can price PER_UNIT against — mirrors clean_house's
 * PRICING_QUANTITY_KEY. A category with no entry has no natural per-unit
 * multiplier and can only be priced FLAT. */
export const PRICING_QUANTITY_KEY: Record<string, string> = {
  "move-in": "area",
  moving: "area",
  residential: "area",
  office: "area",
  restaurant: "area",
  store: "area",
  aircon: "count",
};

export const PRICING_UNIT_LABEL: Record<string, string> = {
  area: "평",
  count: "대",
};

export function getPricingQuantityKey(categorySlug: string): string | undefined {
  return PRICING_QUANTITY_KEY[categorySlug];
}

export function supportsPerUnitPricing(categorySlug: string): boolean {
  return categorySlug in PRICING_QUANTITY_KEY;
}
