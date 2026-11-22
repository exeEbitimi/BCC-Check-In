import { rst } from "../lib/store.mjs";
import { rebuildWall } from "../lib/wall.mjs";

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
const STATUSES = ["pending", "published", "held", "rejected", "hidden", "answered"];

export default async (req) => {
  const pin = process.env.ADMIN_PIN;
  if (!pin || req.headers.get("authorization") !== `Bearer ${pin}`) return json({ error: "Unauthorized" }, 401);
  const qs = rst("questions");

  if (req.method === "GET") { // every question with its status, newest first
    const keys = [];
    outer: for await (const page of qs.list({ prefix: "q/", paginate: true })) {
      for (const b of page.blobs) { keys.push(b.key); if (keys.length >= 1500) break outer; }
    }
    const recs = [];
    for (let i = 0; i < keys.length; i += 100) recs.push(...(await Promise.all(keys.slice(i, i + 100).map(async (k) => ({ key: k, ...(await qs.get(k, { type: "json" })) })))));
    return json({ questions: recs.filter((r) => r.text) });
  }
  if (req.method === "POST") { // { key, status }: approving publishes it to the live pages within seconds
    const { key, status } = await req.json().catch(() => ({}));
    if (!String(key).startsWith("q/") || !STATUSES.includes(status)) return json({ error: "Bad request" }, 400);
    const rec = await qs.get(key, { type: "json" });
    if (!rec) return json({ error: "Not found" }, 404);
    const updated = { ...rec, status, reviewedAt: new Date().toISOString() };
    await qs.setJSON(key, updated);
    await rebuildWall(qs, { key, rec: updated });
    return json({ ok: true });
  }
  return json({ error: "Method not allowed" }, 405);
};

export const config = { path: "/api/qadmin" };
