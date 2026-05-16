import { NextResponse } from "next/server";
import { probeAimlApi } from "@/lib/aiml-health";

export const dynamic = "force-dynamic";

/**
 * Shallow check (no external call): whether AIML is configured.
 * Live probe: `x-vennode-ai-probe: 1` and `x-vennode-health-secret: <HEALTH_CHECK_SECRET>`
 * (legacy `x-probdesk-*` headers still accepted).
 */
export async function GET(req: Request) {
  const configured = Boolean(process.env.AIML_API_KEY?.trim());
  const base =
    process.env.AIML_API_BASE_URL?.trim()?.replace(/\/+$/, "") ?? "https://api.aimlapi.com/v1";

  const shallow = {
    ok: true as const,
    service: "aiml",
    configured,
    /** Host-level hint only; never includes API keys. */
    apiBase: base.replace(/\/v1$/i, ""),
  };

  const wantsProbe =
    req.headers.get("x-vennode-ai-probe") === "1" || req.headers.get("x-probdesk-ai-probe") === "1";
  if (!wantsProbe) {
    return NextResponse.json(shallow);
  }

  const expected = process.env.HEALTH_CHECK_SECRET?.trim();
  if (!expected) {
    return NextResponse.json(
      {
        ...shallow,
        probe: "skipped" as const,
        reason: "Set HEALTH_CHECK_SECRET to enable authenticated live probes.",
      },
      { status: 200 },
    );
  }

  const secret =
    req.headers.get("x-vennode-health-secret") ?? req.headers.get("x-probdesk-health-secret");
  if (secret !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized probe" }, { status: 401 });
  }

  const result = await probeAimlApi();
  const status = result.ok ? 200 : 502;
  return NextResponse.json(
    {
      service: "aiml" as const,
      configured,
      apiBase: shallow.apiBase,
      ok: result.ok,
      probe: result,
    },
    { status },
  );
}
