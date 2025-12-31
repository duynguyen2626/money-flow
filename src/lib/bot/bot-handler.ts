"use server";

import type { Json } from "@/types/database.types";
import { createServiceClient } from "@/lib/supabase/service";
import {
  advanceWizard,
  buildBotTransactionDraft,
  buildDraftFromTemplate,
  buildLinkHelp,
  buildQuickHelp,
  loadBotContext,
  summarizeDraft,
  type BotWizardState,
} from "@/lib/bot/quick-add";
import {
  getQuickAddTemplate,
  listQuickAddTemplates,
  upsertQuickAddTemplate,
} from "@/lib/ai/quick-add-templates";
import {
  getBotUserLink,
  updateBotUserState,
  upsertBotUserLink,
  type BotPlatform,
} from "@/lib/bot/bot-storage";
import { createBotTransactions } from "@/services/bot-transaction.service";

const yesTokens = new Set(["yes", "y", "ok", "okay", "confirm", "yep"]);
const noTokens = new Set(["no", "n", "nope", "cancel"]);

const parseState = (state: Json | null): BotWizardState | null => {
  if (!state || typeof state !== "object" || Array.isArray(state)) return null;
  const candidate = state as { step?: unknown; draft?: unknown };
  if (typeof candidate.step !== "string") return null;
  if (!candidate.draft || typeof candidate.draft !== "object") return null;
  return {
    step: candidate.step as BotWizardState["step"],
    draft: candidate.draft as BotWizardState["draft"],
  };
};

const parseCommand = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const [first, ...rest] = trimmed.split(/\s+/);
  if (!first.startsWith("/")) return null;
  const normalizedCommand = first.split("@")[0]?.toLowerCase() ?? first.toLowerCase();
  return {
    command: normalizedCommand,
    args: rest.join(" ").trim(),
  };
};

const parsePlainCommand = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const [first, ...rest] = trimmed.split(/\s+/);
  const command = first.toLowerCase();
  return {
    command,
    args: rest.join(" ").trim(),
  };
};

type ServiceClient = ReturnType<typeof createServiceClient>;

const resolveCreatedBy = async (
  supabase: ServiceClient,
  profileId?: string | null,
) => {
  if (!profileId) return null;
  const admin = (supabase as any).auth?.admin;
  if (!admin?.getUserById) return null;
  try {
    const { data, error } = await admin.getUserById(profileId);
    if (error || !data?.user) return null;
    return profileId;
  } catch {
    return null;
  }
};

export async function handleBotMessage(params: {
  platform: BotPlatform;
  platformUserId: string;
  text: string;
}): Promise<{ replies: string[] }> {
  const supabase = createServiceClient();
  const trimmed = params.text.trim();
  if (!trimmed) {
    return { replies: [buildQuickHelp()] };
  }

  const normalized = trimmed.toLowerCase();
  const command = parseCommand(trimmed);
  const plainCommand = parsePlainCommand(trimmed);

  if (
    command?.command === "/help" ||
    command?.command === "/start" ||
    normalized === "help"
  ) {
    return { replies: [buildQuickHelp(), buildLinkHelp()] };
  }

  if (plainCommand?.command === "link" && plainCommand.args) {
    return await handleBotMessage({
      ...params,
      text: `/link ${plainCommand.args}`,
    });
  }

  if (command?.command === "/link") {
    const profileId = command.args;
    if (!profileId) {
      return { replies: [buildLinkHelp()] };
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, name")
      .eq("id", profileId)
      .maybeSingle();

    if (error || !profile) {
      return {
        replies: [
          "Profile not found. Please check the profile id and try again.",
        ],
      };
    }

    const linked = await upsertBotUserLink({
      platform: params.platform,
      platformUserId: params.platformUserId,
      profileId,
    });
    if (!linked) {
      return {
        replies: [
          "Failed to link bot. Ensure the bot_user_links migration is applied.",
        ],
      };
    }

    return {
      replies: [
        `Linked to ${(profile as any)?.name ?? "profile"}.`,
        "Send a transaction like: lunch 120k with Huy",
      ],
    };
  }

  let link = await getBotUserLink(params.platform, params.platformUserId);
  if (!link?.profile_id) {
    const defaultProfileId = process.env.BOT_DEFAULT_PROFILE_ID;
    if (defaultProfileId) {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("id", defaultProfileId)
        .maybeSingle();
      if (!error && profile) {
        const linked = await upsertBotUserLink({
          platform: params.platform,
          platformUserId: params.platformUserId,
          profileId: defaultProfileId,
        });
        if (linked) {
          link = { ...linked, profile_id: defaultProfileId } as any;
        }
      }
    }
  }

  if (!link?.profile_id) {
    return {
      replies: [
        "Bot not linked. Please use /link <profile_id> or set BOT_DEFAULT_PROFILE_ID.",
      ],
    };
  }

  if (command?.command === "/reset" || command?.command === "/cancel") {
    await updateBotUserState({
      platform: params.platform,
      platformUserId: params.platformUserId,
      state: null,
    });
    return { replies: ["Wizard reset. Send a new transaction to start."] };
  }

  if (command?.command === "/status") {
    const state = parseState(link.state as Json | null);
    if (!state) {
      return { replies: ["No active draft."] };
    }
    const { raw } = await loadBotContext(supabase);
    return { replies: [summarizeDraft(state.draft, raw)] };
  }

  if (normalized === "template list" || normalized === "templates") {
    const templates = await listQuickAddTemplates(link.profile_id);
    if (!templates.length) {
      return { replies: ["No templates yet."] };
    }
    const lines = templates.map((tpl, index) => `${index + 1}. ${tpl.name}`);
    return { replies: ["Templates:", ...lines] };
  }

  if (normalized.startsWith("template save ") || normalized.startsWith("save template ")) {
    const name = normalized.replace(/^template save\s+|^save template\s+/i, "").trim();
    if (!name) {
      return { replies: ["Provide a template name. Example: template save cafe"] };
    }
    const state = parseState(link.state as Json | null);
    if (!state) {
      return { replies: ["No active draft to save."] };
    }
    const payload = {
      intent: state.draft.intent,
      source_account_id: state.draft.source_account_id,
      destination_account_id: state.draft.destination_account_id,
      person_ids: state.draft.person_ids,
      group_id: state.draft.group_id,
      category_id: state.draft.category_id,
      shop_id: state.draft.shop_id,
      note: state.draft.note,
      split_bill: state.draft.split_bill,
      cashback_share_percent: state.draft.cashback_share_percent,
      cashback_share_fixed: state.draft.cashback_share_fixed,
      cashback_mode: state.draft.cashback_mode,
    };
    const saved = await upsertQuickAddTemplate({
      profileId: link.profile_id,
      name,
      payload,
    });
    if (!saved) {
      return { replies: ["Failed to save template."] };
    }
    return { replies: [`Template "${name}" saved.`] };
  }

  if (normalized.startsWith("template ")) {
    const name = normalized.replace(/^template\s+/i, "").trim();
    if (!name) {
      return { replies: ["Provide a template name."] };
    }
    const template = await getQuickAddTemplate(link.profile_id, name);
    if (!template) {
      return { replies: ["Template not found. Use template list."] };
    }
    const payload = (template as any).payload ?? {};
    const nextState: BotWizardState = {
      step: "amount",
      draft: {
        ...buildDraftFromTemplate(payload),
        amount: null,
      },
    };
    await updateBotUserState({
      platform: params.platform,
      platformUserId: params.platformUserId,
      state: nextState,
    });
    return { replies: ["Template loaded. Amount?"] };
  }

  const state = parseState(link.state as Json | null);
  if (state?.step === "review") {
    if (yesTokens.has(normalized)) {
      const draft = buildBotTransactionDraft(state.draft);
      if (!draft) {
        await updateBotUserState({
          platform: params.platform,
          platformUserId: params.platformUserId,
          state: null,
        });
        return { replies: ["Draft incomplete. Please start again."] };
      }

      try {
        const createdBy = await resolveCreatedBy(supabase, link.profile_id);
        await createBotTransactions(supabase, {
          ...draft,
          created_by: createdBy,
        });
        await updateBotUserState({
          platform: params.platform,
          platformUserId: params.platformUserId,
          state: null,
        });
        return { replies: ["Done! Transaction saved."] };
      } catch (error: any) {
        console.error("[bot] Failed to create transaction:", error);
        return {
          replies: [
            `Failed to save transaction: ${error?.message ?? "unknown error"}. Reply yes to retry or no to edit.`,
          ],
        };
      }
    }

    if (noTokens.has(normalized)) {
      const nextState: BotWizardState = { ...state, step: "input" };
      await updateBotUserState({
        platform: params.platform,
        platformUserId: params.platformUserId,
        state: nextState,
      });
      return { replies: ["Okay, tell me what to change."] };
    }

    const { context, raw } = await loadBotContext(supabase);
    const { replies, state: nextState } = await advanceWizard({
      text: trimmed,
      state: { step: "input", draft: state.draft },
      context,
      rawContext: raw,
    });
    await updateBotUserState({
      platform: params.platform,
      platformUserId: params.platformUserId,
      state: nextState,
    });
    return { replies };
  }

  const { context, raw } = await loadBotContext(supabase);
  const { replies, state: nextState } = await advanceWizard({
    text: trimmed,
    state: state ?? undefined,
    context,
    rawContext: raw,
  });

  await updateBotUserState({
    platform: params.platform,
    platformUserId: params.platformUserId,
    state: nextState,
  });

  return { replies };
}
