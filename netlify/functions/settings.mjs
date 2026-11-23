import { rst } from "../lib/store.mjs";

const json = (o, s = 200, edge) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...(edge ? { "Netlify-CDN-Cache-Control": edge } : {}) } });

export default async (req) => {
  const qs = rst("questions");
  if (req.method === "GET") { // public: pages ask whether to show the developer credit
    const fresh = new URL(req.url).searchParams.has("fresh");
    const c = await qs.get("config/settings", { type: "json", consistency: "strong" });
    return json({ devtag: c?.devtag !== false }, 200, fresh ? undefined : "public, max-age=15");
  }
  if (req.method === "POST") { // admin only
    const pin = process.env.ADMIN_PIN;
    if (!pin || req.headers.get("authorization") !== `Bearer ${pin}`) return json({ error: "Unauthorized" }, 401);
    const b = await req.json().catch(() => ({}));
    const c = (await qs.get("config/settings", { type: "json", consistency: "strong" })) || {};
    await qs.setJSON("config/settings", { ...c, devtag: !!b.devtag });
    return json({ devtag: !!b.devtag });
  }
  return json({ error: "Method not allowed" }, 405);
};

export const config = { path: "/api/settings" };
