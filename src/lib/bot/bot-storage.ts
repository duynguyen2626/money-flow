import { createServiceClient } from "@/lib/supabase/service";
import type { Database, Json } from "@/types/database.types";

export type BotPlatform = "telegram" | "slack";

type BotUserLinkRow = Database["public"]["Tables"]["bot_user_links"]["Row"];

export type BotWizardState = {
  step: string;
  draft: Record<string, unknown>;
};

export async function getBotUserLink(
  platform: BotPlatform,
  platformUserId: string,
) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("bot_user_links")
    .select("*")
    .eq("platform", platform)
    .eq("platform_user_id", platformUserId)
    .maybeSingle();

  if (error) {
    console.error("[bot] Failed to load user link:", error);
    return null;
  }

  return data as BotUserLinkRow | null;
}

export async function upsertBotUserLink(params: {
  platform: BotPlatform;
  platformUserId: string;
  profileId: string;
}) {
  const supabase = createServiceClient();
  const { data, error } = await (supabase
    .from("bot_user_links")
    .upsert as any)(
    {
      platform: params.platform,
      platform_user_id: params.platformUserId,
      profile_id: params.profileId,
      state: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "platform,platform_user_id" },
  ).select("*").single();

  if (error) {
    console.error("[bot] Failed to link user:", error);
    return null;
  }

  return data ?? null;
}

export async function updateBotUserState(params: {
  platform: BotPlatform;
  platformUserId: string;
  state: BotWizardState | null;
}) {
  const supabase = createServiceClient();
  const stateValue = params.state ? (params.state as Json) : null;
  const { error } = await (supabase
    .from("bot_user_links")
    .update as any)({
    state: stateValue,
    updated_at: new Date().toISOString(),
  })
    .eq("platform", params.platform)
    .eq("platform_user_id", params.platformUserId);

  if (error) {
    console.error("[bot] Failed to update state:", error);
    return false;
  }

  return true;
}
