import { getStore } from "@netlify/blobs";
import { check } from "../lib/moderate.mjs";

const MAX_PER_DAY = 8;
const json = (o, s = 200, edge) => new Response(JSON.stringify(o), {
  status: s,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...(edge ? { "Netlify-CDN-Cache-Control": edge } : {}) },
});
const clean = (v, n = 120) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const lagosDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());

// find the checked-in attendee behind a ticket ID (same data as the check-in site)
async function attendee(ticket) {
  const email = await getStore("ticket-index").get(ticket, { type: "text" });
  if (!email) return null;
  const checkins = getStore("checkins"), w = encodeURIComponent(email), day = ticket[5] === "2" ? 2 : 1;
  return (await checkins.get(`d${day}/${w}`, { type: "json" })) || (await checkins.get(`d${day === 1 ? 2 : 1}/${w}`, { type: "json" }));
}

export default async (req) => {
  const qs = getStore("questions");

  if (req.method === "GET") { // public live wall: only moderator-approved questions
    const wall = await qs.get("wall/live", { type: "json" });
    return json({ questions: wall?.questions || [] }, 200, "public, max-age=3");
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const b = await req.json().catch(() => null);
  if (!b) return json({ error: "Bad request" }, 400);
  const ticket = clean(b.ticket, 40).toUpperCase();
  const a = ticket && (await attendee(ticket));
  if (!a) return json({ error: "We couldn’t find that ticket ID. Check it on your pass, or check in first." }, 404);
  if (b.action === "verify") return json({ ok: true, name: a.name });

  const idxKey = `u/${a.email}`; // this attendee's own question keys, newest first
  if (b.action === "mine") {
    const keys = (await qs.get(idxKey, { type: "json" })) || [];
    const recs = await Promise.all(keys.slice(0, 20).map((k) => qs.get(k, { type: "json" })));
    return json({ questions: recs.filter(Boolean).map((r) => ({ text: r.text, to: r.to, status: r.status, at: r.at })) });
  }

  const text = clean(b.text, 300), to = clean(b.to, 60) || "Any speaker";
  if (text.length < 10) return json({ error: "Please write at least 10 characters." }, 400);

  const nKey = `n/${a.email}/${lagosDate()}`;
  const used = parseInt((await qs.get(nKey, { type: "text" })) || "0", 10);
  if (used >= MAX_PER_DAY) return json({ error: `You’ve reached today’s limit of ${MAX_PER_DAY} questions.` }, 429);

  // nothing goes public until a moderator approves it: clean = "pending", suspicious = "held", abusive = "rejected"
  const v = check(text);
  const status = v.verdict === "ok" ? "pending" : v.verdict === "review" ? "held" : "rejected";
  const rand = [...crypto.getRandomValues(new Uint8Array(3))].map((n) => n.toString(16).padStart(2, "0")).join("");
  const key = `q/${String(9999999999999 - Date.now()).padStart(13, "0")}-${rand}`; // newest sorts first
  await qs.setJSON(key, { name: a.name, email: a.email, ticket, to, text, status, reason: v.reason, at: new Date().toISOString() });
  await qs.set(nKey, String(used + 1));
  const keys = (await qs.get(idxKey, { type: "json" })) || [];
  await qs.setJSON(idxKey, [key, ...keys].slice(0, 30));

  if (status === "rejected") return json({ ok: false, status, error: "Your question wasn’t sent because it may contain disrespectful or abusive language. Please rephrase it respectfully and try again." }, 422);
  return json({ ok: true, status });
};

export const config = { path: "/api/questions" };
