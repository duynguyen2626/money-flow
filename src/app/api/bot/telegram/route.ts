import { NextResponse } from "next/server";
import { handleBotMessage } from "@/lib/bot/bot-handler";

type TelegramMessage = {
  message_id: number;
  from?: { id: number };
  chat?: { id: number };
  text?: string;
};

type TelegramUpdate = {
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
};

const sendTelegramMessage = async (
  token: string,
  chatId: number,
  text: string,
) => {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });
};

export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Missing TELEGRAM_BOT_TOKEN" },
      { status: 500 },
    );
  }

  try {
    const payload = (await request.json()) as TelegramUpdate;
    const message = payload.message ?? payload.edited_message;
    const text = message?.text?.trim();
    const chatId = message?.chat?.id;
    const userId = message?.from?.id;

    if (!text || !chatId || !userId) {
      return NextResponse.json({ ok: true });
    }

    const { replies } = await handleBotMessage({
      platform: "telegram",
      platformUserId: String(userId),
      text,
    });

    if (replies.length > 0) {
      await sendTelegramMessage(token, chatId, replies.join("\n\n"));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[telegram] webhook failed:", error);
    return NextResponse.json({ ok: true });
  }
}
