import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database, Json } from "@/types/database.types";
import type { ParseTransactionIntent } from "@/types/ai.types";

export type QuickAddTemplatePayload = {
  intent: ParseTransactionIntent | null;
  source_account_id?: string | null;
  destination_account_id?: string | null;
  person_ids?: string[];
  group_id?: string | null;
  category_id?: string | null;
  shop_id?: string | null;
  note?: string | null;
  split_bill?: boolean | null;
  cashback_share_percent?: number | null;
  cashback_share_fixed?: number | null;
  cashback_mode?: string | null;
};

type TemplateRow = Database["public"]["Tables"]["quick_add_templates"]["Row"];

const normalizeName = (value: string) => value.trim().toLowerCase();

const getTemplatesClient = () => {
  try {
    return createServiceClient();
  } catch {
    return createClient();
  }
};

export async function listQuickAddTemplates(profileId: string) {
  const supabase = getTemplatesClient();
  const { data, error } = await supabase
    .from("quick_add_templates")
    .select("id, name, payload, created_at, updated_at")
    .eq("profile_id", profileId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[templates] Failed to list templates:", error);
    return [];
  }

  return (data ?? []) as TemplateRow[];
}

export async function getQuickAddTemplate(profileId: string, name: string) {
  const supabase = getTemplatesClient();
  const { data, error } = await supabase
    .from("quick_add_templates")
    .select("*")
    .eq("profile_id", profileId)
    .eq("name", normalizeName(name))
    .maybeSingle();

  if (error) {
    console.error("[templates] Failed to load template:", error);
    return null;
  }

  return data as TemplateRow | null;
}

export async function upsertQuickAddTemplate(params: {
  profileId: string;
  name: string;
  payload: QuickAddTemplatePayload;
}) {
  const supabase = getTemplatesClient();
  const { data, error } = await (supabase
    .from("quick_add_templates")
    .upsert as any)(
    {
      profile_id: params.profileId,
      name: normalizeName(params.name),
      payload: params.payload as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,name" },
  );

  if (error) {
    console.error("[templates] Failed to save template:", error);
    return null;
  }

  return data ?? null;
}
