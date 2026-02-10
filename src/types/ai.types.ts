export type ParseTransactionIntent =
  | "expense"
  | "income"
  | "transfer"
  | "lend"
  | "repay"
  | "debt"
  | "repayment"
  | "loan";

export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  metadata?: {
    tokens?: number;
    latency?: number;
    provider?: string;
  };
};

export type ParsedPersonRef = {
  id: string | null;
  name: string;
};

export type ParsedTransaction = {
  intent: ParseTransactionIntent | null;
  amount: number | null;
  people: ParsedPersonRef[];
  group_id: string | null;
  group_name?: string | null;
  split_bill: boolean | null;
  occurred_at: string | null;
  source_account_id: string | null;
  source_account_name?: string | null;
  debt_account_id: string | null;
  debt_account_name?: string | null;
  category_id: string | null;
  category_name?: string | null;
  shop_id: string | null;
  shop_name?: string | null;
  note: string | null;
  cashback_share_percent?: number | null;
  cashback_share_fixed?: number | null;
  cashback_mode?: "none_back" | "voluntary" | "real_fixed" | "real_percent" | null;
  needs: string[];
  confidence: number;
  mode?: "gemini" | "groq" | "fallback" | "rules";
  feedback?: string | null;
  persona?: string | null;
};

export type ParseTransactionContext = {
  people?: Array<{ id: string; name: string }>;
  groups?: Array<{ id: string; name: string }>;
  accounts?: Array<{ id: string; name: string }>;
  categories?: Array<{ id: string; name: string }>;
  shops?: Array<{ id: string; name: string }>;
  previousData?: ParsedTransaction;
  context_page?: "people" | "people_detail" | "accounts" | "transactions" | "batch" | "debt";
  current_person_id?: string;
};

export type ParseTransactionRequest = {
  text: string;
  context?: ParseTransactionContext;
};

export type ParseTransactionResponse = {
  result: ParsedTransaction;
  metadata?: {
    tokens?: number;
    latency?: number;
  };
};
