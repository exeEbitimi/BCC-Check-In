import { rst } from "../lib/store.mjs";

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
const count = async (s, prefix) => { let n = 0; for await (const p of s.list({ prefix, paginate: true })) n += p.blobs.length; return n; };

export default async (req) => {
  const pin = process.env.ADMIN_PIN;
  if (!pin || req.headers.get("authorization") !== `Bearer ${pin}`) return json({ error: "Unauthorized" }, 401);
  const store = rst("checkins");

  if (req.method === "GET") {
    if (new URL(req.url).searchParams.has("mail")) { // email queue counts
      const m = rst("mail");
      const [waiting, sent, failed] = await Promise.all([count(m, "outbox/"), count(m, "sent/"), count(m, "failed/")]);
      return json({ waiting, sent, failed, on: !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM) });
    }
    const keys = []; // every key: d1/<email> or d2/<email>
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
