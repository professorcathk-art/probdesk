"use server";

import { polishListingDetails } from "@/lib/aiml";
import { createClient } from "@/lib/supabase/server";

export async function polishMeetupDetails(details: string, lang: "zh" | "en") {
  const text = details.trim();
  if (text.length < 8) return { ok: false as const, message: "short" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "auth" };
  try {
    const polished = await polishListingDetails(text, lang);
    return { ok: true as const, text: polished };
  } catch (error) {
    console.error("[polishMeetupDetails]", error);
    return { ok: false as const, message: "failed" };
  }
}
