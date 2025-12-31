import type {
  ParseTransactionContext,
  ParsedTransaction,
} from "@/types/ai.types";

type ParseMode = "gemini" | "rules";

const DEFAULT_MODELS = ["gemini-1.5-flash", "gemini-1.5-pro"];

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const clampConfidence = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
};

const buildBaseResult = (): ParsedTransaction => ({
  intent: null,
  amount: null,
  people: [],
  group_id: null,
  group_name: null,
  split_bill: null,
  occurred_at: null,
  source_account_id: null,
  source_account_name: null,
  debt_account_id: null,
  debt_account_name: null,
  category_id: null,
  category_name: null,
  shop_id: null,
  shop_name: null,
  note: null,
  cashback_share_percent: null,
  cashback_share_fixed: null,
  cashback_mode: null,
  needs: [],
  confidence: 0,
});

const normalizeIntent = (value: unknown) => {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().toLowerCase();
  if (["expense", "income", "transfer", "lend", "repay"].includes(cleaned)) {
    return cleaned as ParsedTransaction["intent"];
  }
  if (["lending", "debt", "loan"].includes(cleaned)) return "lend";
  if (["repayment", "payback"].includes(cleaned)) return "repay";
  return null;
};

const detectIntent = (text: string) => {
  const lower = normalizeText(text);
  const rules: Array<{ intent: ParsedTransaction["intent"]; keywords: string[] }> = [
    { intent: "transfer", keywords: ["transfer", "moved", "move", "between"] },
    {
      intent: "repay",
      keywords: ["repay", "repayment", "pay back", "payback", "tra", "tra tien", "tra no", "hoan", "hoan tien"],
    },
    {
      intent: "lend",
      keywords: ["lend", "loan", "lent", "owe", "debt", "borrow", "cho muon", "muon tien"],
    },
    { intent: "income", keywords: ["income", "salary", "bonus", "received", "receive"] },
    { intent: "expense", keywords: ["spent", "spend", "buy", "purchase", "paid", "expense"] },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((keyword) => lower.includes(keyword))) {
      return rule.intent;
    }
  }

  return null;
};

const extractAmount = (text: string) => {
  const withoutDates = text
    .replace(/\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b/g, " ")
    .replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b/g, " ");
  const match = withoutDates.match(/(\d[\d,]*\.?\d*)\s*(k|m|b)?/i);
  if (!match) return null;
  const raw = match[1]?.replace(/,/g, "");
  const base = raw ? Number(raw) : NaN;
  if (!Number.isFinite(base)) return null;
  const suffix = match[2]?.toLowerCase();
  const multiplier =
    suffix === "k" ? 1_000 : suffix === "m" ? 1_000_000 : suffix === "b" ? 1_000_000_000 : 1;
  return Math.abs(base) * multiplier;
};

const extractNoteFromComma = (text: string) => {
  const index = text.indexOf(",");
  if (index === -1) return null;
  const note = text.slice(index + 1).trim();
  return note || null;
};

const extractNotePrefix = (text: string) => {
  const index = text.indexOf(",");
  if (index === -1) return null;
  const prefix = text.slice(0, index).trim();
  if (!prefix) return null;
  const cleaned = prefix
    .replace(/[\d.,]+\s*(k|m|b|đ|vnd)?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || null;
};

const extractCashback = (text: string) => {
  const normalized = normalizeText(text);
  const percentMatch = normalized.match(
    /\b(?:cashback|back)\s*([0-9.,]+)\s*(%|percent|pct)\b/i,
  );
  if (percentMatch) {
    const raw = percentMatch[1]?.replace(/,/g, "");
    const value = raw ? Number(raw) : NaN;
    return Number.isFinite(value) ? { percent: value, fixed: null } : null;
  }

  const fixedMatch = normalized.match(
    /\b(?:cashback|back)\s*([0-9.,]+)\s*(k|m|b)?\b/i,
  );
  if (!fixedMatch) return null;
  const raw = fixedMatch[1]?.replace(/,/g, "");
  const base = raw ? Number(raw) : NaN;
  if (!Number.isFinite(base)) return null;
  const suffix = fixedMatch[2]?.toLowerCase();
  if (!suffix) {
    return { percent: base, fixed: null };
  }
  const multiplier =
    suffix === "k" ? 1_000 : suffix === "m" ? 1_000_000 : 1_000_000_000;
  return { percent: null, fixed: Math.abs(base) * multiplier };
};

const pad = (value: number) => value.toString().padStart(2, "0");

const extractDate = (text: string) => {
  const lower = normalizeText(text);
  const today = new Date();
  if (lower.includes("today")) {
    return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  }
  if (lower.includes("yesterday")) {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;
  }
  const iso = text.match(/\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${pad(month)}-${pad(day)}`;
    }
  }
  const dmy = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${pad(month)}-${pad(day)}`;
    }
  }
  return null;
};

const detectSplitBill = (text: string, peopleCount: number, groupName?: string | null) => {
  const lower = normalizeText(text);
  if (groupName) return true;
  if (peopleCount > 1) return true;
  if (
    ["split", "share", "divide", "each", "per person"].some((keyword) =>
      lower.includes(keyword),
    )
  ) {
    return true;
  }
  return null;
};

const findMatches = (text: string, options: Array<{ name: string }>) => {
  const lower = normalizeText(text);
  return options
    .map((option) => {
      const name = option.name.trim();
      if (!name) return null;
      const normalizedName = normalizeText(name);
      const index = lower.indexOf(normalizedName);
      if (index === -1) return null;
      return { name, index };
    })
    .filter((item): item is { name: string; index: number } => Boolean(item))
    .sort((a, b) => a.index - b.index);
};

const normalizeNeeds = (result: ParsedTransaction) => {
  const needs = new Set<string>();
  if (!result.intent) needs.add("type");
  if (!result.amount) needs.add("amount");
  const isDebt = result.intent === "lend" || result.intent === "repay";
  if (isDebt && result.people.length === 0 && !result.group_name) {
    needs.add("person");
  }
  if (!result.source_account_id && !result.source_account_name) {
    needs.add("account");
  }
  if (result.intent === "transfer" && !result.debt_account_id && !result.debt_account_name) {
    needs.add("account");
  }
  if (!result.occurred_at) needs.add("date");
  if (isDebt && result.split_bill === null) needs.add("split_confirm");
  return Array.from(needs);
};

const normalizeResult = (
  partial: Partial<ParsedTransaction>,
  mode: ParseMode,
): ParsedTransaction => {
  const base = buildBaseResult();
  const intent = normalizeIntent(partial.intent ?? base.intent);
  const people = Array.isArray(partial.people) ? partial.people : [];
  const result: ParsedTransaction = {
    ...base,
    ...partial,
    intent,
    people,
    confidence: clampConfidence(Number(partial.confidence ?? base.confidence)),
    mode,
  };
  result.needs = normalizeNeeds(result);
  return result;
};

const simpleParse = (
  text: string,
  context?: ParseTransactionContext,
): ParsedTransaction => {
  const intent = detectIntent(text);
  const amount = extractAmount(text);
  const occurred_at = extractDate(text);
  const note = extractNoteFromComma(text);
  const cashback = extractCashback(text);
  const peopleMatches = context?.people ? findMatches(text, context.people) : [];
  const groupMatches = context?.groups ? findMatches(text, context.groups) : [];
  const accountMatches = context?.accounts ? findMatches(text, context.accounts) : [];
  const categoryMatches = context?.categories
    ? findMatches(text, context.categories)
    : [];
  const shopMatches = context?.shops ? findMatches(text, context.shops) : [];

  const group_name = groupMatches[0]?.name ?? null;
  const people = peopleMatches.map((match) => ({ id: null, name: match.name }));
  const split_bill = detectSplitBill(text, people.length, group_name);

  let source_account_name: string | null = null;
  let debt_account_name: string | null = null;
  if (intent === "transfer") {
    source_account_name = accountMatches[0]?.name ?? null;
    debt_account_name = accountMatches[1]?.name ?? null;
  } else {
    source_account_name = accountMatches[0]?.name ?? null;
  }

  const category_name = categoryMatches[0]?.name ?? null;
  let shop_name: string | null = shopMatches[0]?.name ?? null;
  if (!shop_name && context?.shops?.length) {
    const defaultShop = context.shops.find((shop) =>
      normalizeText(shop.name).includes("shopee"),
    );
    shop_name = defaultShop?.name ?? null;
  }

  return normalizeResult(
    {
      intent,
      amount,
      people,
      group_id: null,
      group_name,
      split_bill,
      occurred_at,
      source_account_id: null,
      source_account_name,
      debt_account_id: null,
      debt_account_name,
      category_id: null,
      category_name,
      shop_id: null,
      shop_name,
      note,
      cashback_share_percent: cashback?.percent ?? null,
      cashback_share_fixed: cashback?.fixed ?? null,
      cashback_mode: null,
      confidence: 0.2,
    },
    "rules",
  );
};

const extractJson = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const codeFence = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeFence?.[1]) {
    return codeFence[1];
  }
  return trimmed;
};

const buildPrompt = (text: string, context?: ParseTransactionContext) => {
  const people = (context?.people ?? []).map((item) => item.name).slice(0, 40);
  const groups = (context?.groups ?? []).map((item) => item.name).slice(0, 40);
  const accounts = (context?.accounts ?? []).map((item) => item.name).slice(0, 40);
  const categories = (context?.categories ?? []).map((item) => item.name).slice(0, 40);
  const shops = (context?.shops ?? []).map((item) => item.name).slice(0, 40);

  return [
    "You are a transaction parser. Output JSON only, no extra text.",
    "If a field is unknown, return null and add its key to needs.",
    "Never invent IDs; use name fields when unsure.",
    "Allowed intents: expense, income, transfer, lend, repay.",
    "Use occurred_at format YYYY-MM-DD when present.",
    "Schema:",
    "{",
    '  "intent": "expense|income|transfer|lend|repay",',
    '  "amount": number|null,',
    '  "people": [{ "id": null, "name": string }],',
    '  "group_id": null,',
    '  "group_name": string|null,',
    '  "split_bill": boolean|null,',
    '  "occurred_at": "YYYY-MM-DD"|null,',
    '  "source_account_id": null,',
    '  "source_account_name": string|null,',
    '  "debt_account_id": null,',
    '  "debt_account_name": string|null,',
    '  "category_id": null,',
    '  "category_name": string|null,',
    '  "shop_id": null,',
    '  "shop_name": string|null,',
    '  "note": string|null,',
    '  "cashback_share_percent": number|null,',
    '  "cashback_share_fixed": number|null,',
    '  "cashback_mode": "none_back|voluntary|real_fixed|real_percent"|null,',
    '  "needs": string[],',
    '  "confidence": number',
    "}",
    people.length ? `People: ${people.join(", ")}` : "People: none",
    groups.length ? `Groups: ${groups.join(", ")}` : "Groups: none",
    accounts.length ? `Accounts: ${accounts.join(", ")}` : "Accounts: none",
    categories.length ? `Categories: ${categories.join(", ")}` : "Categories: none",
    shops.length ? `Shops: ${shops.join(", ")}` : "Shops: none",
    `Input: ${text}`,
  ].join("\n");
};

const callGemini = async (model: string, apiKey: string, prompt: string) => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.9,
          maxOutputTokens: 512,
        },
      }),
    },
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as any;
  const rawText = data?.candidates?.[0]?.content?.parts
    ?.map((part: any) => part.text)
    ?.join("");
  if (!rawText) return null;

  const jsonText = extractJson(rawText);
  if (!jsonText) return null;

  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
};

const parseWithGemini = async (
  text: string,
  context?: ParseTransactionContext,
): Promise<ParsedTransaction | null> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const configuredModel = process.env.GEMINI_MODEL ?? "auto";
  const models =
    configuredModel === "auto" ? DEFAULT_MODELS : [configuredModel];
  const prompt = buildPrompt(text, context);

  for (const model of models) {
    const parsed = await callGemini(model, apiKey, prompt);
    if (!parsed) continue;
    return normalizeResult(parsed, "gemini");
  }

  return null;
};

const applyPostProcessing = (
  result: ParsedTransaction,
  text: string,
  context?: ParseTransactionContext,
) => {
  const normalizedText = normalizeText(text);
  const notePrefix = extractNotePrefix(text);
  const noteFromComma = extractNoteFromComma(text);
  if (notePrefix) {
    result.note = notePrefix;
  } else if (noteFromComma) {
    result.note = noteFromComma;
  }

  const cashback = extractCashback(text);
  if (cashback) {
    result.cashback_share_percent = cashback.percent ?? null;
    result.cashback_share_fixed = cashback.fixed ?? null;
  }

  if (result.people.length > 0) {
    const seen = new Set<string>();
    result.people = result.people.filter((person) => {
      const key = normalizeText(person.name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  if (result.group_name && result.people.length > 0) {
    const groupKey = normalizeText(result.group_name);
    if (result.people.some((person) => normalizeText(person.name) === groupKey)) {
      result.group_name = null;
    }
  }

  const splitSignal = detectSplitBill(text, result.people.length, result.group_name);
  if (!splitSignal && !result.group_name && result.people.length <= 1) {
    result.split_bill = false;
  }

  if (result.people.length > 0 && (!result.intent || result.intent === "expense")) {
    const shouldLend =
      /\bcho\b/.test(normalizedText) ||
      /\bfor\b/.test(normalizedText) ||
      normalizedText.includes("back");
    if (shouldLend) {
      result.intent = "lend";
    }
  }

  const hasLam = result.people.some((person) =>
    normalizeText(person.name).includes("lam"),
  );
  if (
    hasLam &&
    result.cashback_share_percent === null &&
    result.cashback_share_fixed === null
  ) {
    result.cashback_share_percent = 8;
  }

  if (!result.shop_name && context?.shops?.length) {
    const defaultShop = context.shops.find((shop) =>
      normalizeText(shop.name).includes("shopee"),
    );
    result.shop_name = defaultShop?.name ?? null;
  }

  result.needs = normalizeNeeds(result);
};

export async function parseTransaction(
  text: string,
  context?: ParseTransactionContext,
): Promise<ParsedTransaction> {
  const trimmed = text.trim();
  if (!trimmed) {
    return normalizeResult({}, "rules");
  }

  const geminiResult = await parseWithGemini(trimmed, context);
  const parsed = geminiResult ?? simpleParse(trimmed, context);
  applyPostProcessing(parsed, trimmed, context);
  return parsed;
}
