// Supabase Edge Function (Deno): validates a lead, stores it, optionally notifies by email.
// Template: not deployed or tested against a live project. Deploy only with approval:
//   📋 LOVABLE PROMPT: > "Deploy the submit-lead edge function"
//
// Secrets (Cloud → Secrets, never in code):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   provided by Supabase/Lovable Cloud
//   RESEND_API_KEY, LEAD_NOTIFY_TO, LEAD_NOTIFY_FROM   optional; without them the lead is stored, no email
//   ALLOWED_ORIGINS   comma-separated list, e.g. "https://example.com,https://www.example.com"

const json = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...cors(origin) } });

function cors(origin: string | null): Record<string, string> {
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const ok = origin && allowed.includes(origin);
  return ok
    ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, authorization, apikey", Vary: "Origin" }
    : { Vary: "Origin" };
}

// Best-effort per-instance rate limit. Edge instances are ephemeral, so this slows bursts but is not a
// guarantee; add a database-side limit if abuse appears.
const hits = new Map<string, number[]>();
function limited(key: string, max = 5, windowMs = 10 * 60_000): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > max;
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
  if (!cors(origin)["Access-Control-Allow-Origin"]) return json({ error: "origin_not_allowed" }, 403, origin);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (limited(ip)) return json({ error: "too_many_requests" }, 429, origin);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400, origin); }

  // Honeypot: a hidden field real visitors never fill. Answer success so bots learn nothing.
  if (clean(body.website, 200)) return json({ ok: true }, 200, origin);

  const lead = {
    name: clean(body.name, 120),
    email: clean(body.email, 254).toLowerCase(),
    message: clean(body.message, 4000) || null,
    source_page: clean(body.source_page, 300) || null,
    consent: body.consent === true,
    user_agent: clean(req.headers.get("user-agent"), 500) || null,
  };
  if (!lead.name || !EMAIL.test(lead.email)) return json({ error: "invalid_fields" }, 422, origin);
  if (!lead.consent) return json({ error: "consent_required" }, 422, origin);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "server_not_configured" }, 500, origin);

  // PostgREST insert with the service role, server side only. Never expose this key to the browser.
  const insert = await fetch(`${url}/rest/v1/leads`, {
    method: "POST",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(lead),
  });
  if (!insert.ok) {
    console.error("lead insert failed", insert.status, await insert.text());
    return json({ error: "store_failed" }, 502, origin);
  }

  // Optional notification. Storage succeeded either way; report the two states separately.
  let notified: "sent" | "skipped" | "failed" = "skipped";
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const to = Deno.env.get("LEAD_NOTIFY_TO");
  const from = Deno.env.get("LEAD_NOTIFY_FROM");
  if (resendKey && to && from) {
    const mail = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from, to: [to], reply_to: lead.email,
        subject: `Novo contato pelo site: ${lead.name}`,
        html: `<p><b>${escapeHtml(lead.name)}</b> &lt;${escapeHtml(lead.email)}&gt;</p><p>${escapeHtml(lead.message ?? "")}</p><p><small>${escapeHtml(lead.source_page ?? "")}</small></p>`,
      }),
    });
    notified = mail.ok ? "sent" : "failed";
    if (!mail.ok) console.error("notify failed", mail.status, await mail.text());
  }

  return json({ ok: true, stored: true, notified }, 200, origin);
});
