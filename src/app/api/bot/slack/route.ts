import crypto from "crypto";
import { NextResponse } from "next/server";
import { handleBotMessage } from "@/lib/bot/bot-handler";

export const runtime = "nodejs";

const verifySlackSignature = (
  rawBody: string,
  headers: Headers,
  signingSecret: string,
) => {
  const signature = headers.get("x-slack-signature");
  const timestamp = headers.get("x-slack-request-timestamp");
  if (!signature || !timestamp) return false;

  const now = Math.floor(Date.now() / 1000);
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > 60 * 5) return false;

  const base = `v0:${timestamp}:${rawBody}`;
  const hash = crypto.createHmac("sha256", signingSecret).update(base).digest("hex");
  const expected = `v0=${hash}`;

  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
};

const postSlackMessage = async (
  token: string,
  channel: string,
  text: string,
) => {
  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      channel,
      text,
    }),
  });
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (signingSecret) {
    const valid = verifySlackSignature(rawBody, request.headers, signingSecret);
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: true });
  }

  if (payload?.type === "url_verification") {
    return NextResponse.json({ challenge: payload.challenge });
  }

  if (payload?.type !== "event_callback") {
    return NextResponse.json({ ok: true });
  }

  const event = payload.event;
  if (!event || event.type !== "message") {
    return NextResponse.json({ ok: true });
  }

  if (event.subtype || event.bot_id) {
    return NextResponse.json({ ok: true });
  }

  const text = typeof event.text === "string" ? event.text.trim() : "";
  const channel = event.channel;
  const userId = event.user;

  if (!text || !channel || !userId) {
    return NextResponse.json({ ok: true });
  }

  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.error("[slack] Missing SLACK_BOT_TOKEN");
    return NextResponse.json({ ok: true });
  }

  const cleanedText = text.replace(/^<@[^>]+>\s*/, "");
  try {
    const { replies } = await handleBotMessage({
      platform: "slack",
      platformUserId: String(userId),
      text: cleanedText,
    });

    if (replies.length > 0) {
      await postSlackMessage(token, channel, replies.join("\n\n"));
    }
  } catch (error) {
    console.error("[slack] webhook failed:", error);
  }

  return NextResponse.json({ ok: true });
}
