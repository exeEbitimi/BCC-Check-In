import { st } from "../lib/store.mjs";

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export default async (req) => {
  const pin = process.env.ADMIN_PIN;
  if (!pin || req.headers.get("authorization") !== `Bearer ${pin}`) return json({ error: "Unauthorized" }, 401);
  const store = st("checkins");

  if (req.method === "GET") { // every key: d1/<email> or d2/<email>
    const keys = [];
    for await (const page of store.list({ paginate: true })) page.blobs.forEach((x) => keys.push(x.key));
    return json({ keys });
  }
  if (req.method === "POST") { // full records for up to 100 keys
    const { keys } = await req.json().catch(() => ({}));
    if (!Array.isArray(keys)) return json({ error: "Bad request" }, 400);
    const records = await Promise.all(keys.slice(0, 100).map(async (k) => ({ key: String(k), rec: await store.get(String(k), { type: "json" }) })));
    return json({ records });
  }
  return json({ error: "Method not allowed" }, 405);
};

export const config = { path: "/api/admin" };
