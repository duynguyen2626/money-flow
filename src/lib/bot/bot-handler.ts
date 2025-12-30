"use server";

import type { Json } from "@/types/database.types";
import { createServiceClient } from "@/lib/supabase/service";
import {
  advanceWizard,
  buildBotTransactionDraft,
  buildLinkHelp,
  buildQuickHelp,
  loadBotContext,
  summarizeDraft,
  type BotWizardState,
} from "@/lib/bot/quick-add";
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

  if (
    command?.command === "/help" ||
    command?.command === "/start" ||
    normalized === "help"
  ) {
    return { replies: [buildQuickHelp(), buildLinkHelp()] };
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

    await upsertBotUserLink({
      platform: params.platform,
      platformUserId: params.platformUserId,
      profileId,
    });

    return {
      replies: [
        `Linked to ${profile.name ?? "profile"}.`,
        "Send a transaction like: lunch 120k with Huy",
      ],
    };
  }

  const link = await getBotUserLink(params.platform, params.platformUserId);
  if (!link?.profile_id) {
    return { replies: [buildLinkHelp()] };
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
        await createBotTransactions(supabase, {
          ...draft,
          created_by: link.profile_id,
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
            "Failed to save transaction. Reply yes to retry or no to edit.",
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

    return { replies: ["Reply yes to confirm, or no to edit."] };
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
