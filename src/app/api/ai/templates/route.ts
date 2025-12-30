import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  listQuickAddTemplates,
  upsertQuickAddTemplate,
} from "@/lib/ai/quick-add-templates";

const resolveProfileId = async (userId: string) => {
  try {
    const service = createServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (profile?.id) return profile.id;

    const { data: owner } = await service
      .from("profiles")
      .select("id")
      .eq("is_owner", true)
      .eq("is_archived", false)
      .limit(1)
      .maybeSingle();
    return owner?.id ?? null;
  } catch {
    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    return profile?.id ?? null;
  }
};

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const profileId = await resolveProfileId(user.id);
  if (!profileId) {
    return NextResponse.json({ templates: [] });
  }
  const templates = await listQuickAddTemplates(profileId);
  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const profileId = await resolveProfileId(user.id);
  if (!profileId) {
    return NextResponse.json({ error: "Profile not found" }, { status: 400 });
  }

  const payload = (await request.json()) as {
    name?: string;
    payload?: Record<string, unknown>;
  };
  if (!payload?.name || !payload.payload) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const saved = await upsertQuickAddTemplate({
    profileId,
    name: payload.name,
    payload: payload.payload as any,
  });

  if (!saved) {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
