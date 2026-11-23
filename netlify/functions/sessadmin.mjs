import { rst } from "../lib/store.mjs";
import { loadConfig, cleanSessions } from "../lib/sessions.mjs";

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
const lagosDay = () => (new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date()) >= "2026-11-25" ? 2 : 1);

export default async (req) => {
  const pin = process.env.ADMIN_PIN;
  if (!pin || req.headers.get("authorization") !== `Bearer ${pin}`) return json({ error: "Unauthorized" }, 401);
  const qs = rst("questions");
  if (req.method === "GET") return json(await loadConfig(qs));
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const b = await req.json().catch(() => ({}));
  if (b.action === "save") { // edit, add or remove sessions and panelist names
    const sessions = cleanSessions(b.sessions);
    if (!sessions.length) return json({ error: "Keep at least one session." }, 400);
    await qs.setJSON("config/sessions", { sessions });
  } else if (b.action === "activate") { // put a session on the live screen
    const cfg = await loadConfig(qs);
    if (!cfg.sessions.some((s) => s.id === b.id)) return json({ error: "Unknown session" }, 400);
    await qs.setJSON("config/active", { id: b.id, day: b.day === 2 ? 2 : b.day === 1 ? 1 : lagosDay(), at: new Date().toISOString() });
  } else if (b.action === "clear") {
    await qs.setJSON("config/active", { id: null, day: null, at: new Date().toISOString() });
  } else return json({ error: "Bad request" }, 400);
  return json(await loadConfig(qs));
};

export const config = { path: "/api/sessadmin" };
