import { rst } from "../lib/store.mjs";
import { buildEmail, mask } from "../lib/mail.mjs";

const DAYS = { "2026-11-24": 1, "2026-11-25": 2 };
const lagosDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
const clean = (v, n = 120) => String(v ?? "").trim().slice(0, n);
const newId = (day) => {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", r = crypto.getRandomValues(new Uint8Array(6));
  return `BCC-D${day}-` + [...r].map((n) => a[n % a.length]).join("");
};

export default async (req) => {
  const test = process.env.TEST_MODE === "true";
  if (req.method === "GET") {
    let epoch = "0";
    try { epoch = (await rst("questions").get("config/epoch", { type: "text" })) || "0"; } catch { /* default */ }
    return json({ today: lagosDate(), testMode: test, epoch });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let b;
  try { b = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  if (b.website) return json({ ok: true }); // honeypot

  let day = DAYS[lagosDate()];
  if (test && (b.day === 1 || b.day === 2)) day = b.day;
  if (!day) return json({ error: "Check-in is only open on 24 and 25 November." }, 403);

  try {
    const store = rst("checkins");        // d1/<email>, d2/<email>
    const tickets = rst("ticket-index");  // ticket ID -> email
    let d;

    if (b.lookup) {
      // returning attendee: find their earlier details by email or ticket ID
      const q = clean(b.lookup, 160);
      const email = q.includes("@") ? q.toLowerCase() : await tickets.get(q.toUpperCase(), { type: "text" });
      let prior = null;
      if (email) {
        const w = encodeURIComponent(email);
        prior = (await store.get(`d1/${w}`, { type: "json" })) || (await store.get(`d2/${w}`, { type: "json" }));
      }
      if (!prior) return json({ error: "We couldn’t find that email or ticket ID. Check it, or fill in your details below." }, 404);
      d = { name: prior.name, emailInput: prior.emailInput || prior.email, email: prior.email, phone: prior.phone, discipline: prior.discipline, brand: prior.brand, city: prior.city };
    } else {
      d = {
        name: clean(b.name), emailInput: clean(b.email, 160), email: clean(b.email, 160).toLowerCase(), phone: clean(b.phone, 30),
        discipline: clean(b.discipline), brand: clean(b.brand), city: clean(b.city),
      };
      if (!d.name || !/^\S+@\S+\.\S+$/.test(d.email) || d.phone.replace(/\D/g, "").length < 10 || !d.discipline || !d.city)
        return json({ error: "Please complete every required field with a valid email and phone number." }, 400);
    }

    const who = encodeURIComponent(d.email);
    const key = `d${day}/${who}`;
    const existing = await store.get(key, { type: "json" });
    const other = await store.get(`d${day === 1 ? 2 : 1}/${who}`, { type: "json" });
    if (existing) return json({ ok: true, repeat: true, name: existing.name, id: existing.id, timeIn: existing.timeIn, both: !!other });

    const rec = { ...d, day, id: newId(day), timeIn: new Date().toISOString() };
    await store.setJSON(key, rec);
    await tickets.set(rec.id, rec.email);

    // queue the confirmation email; a scheduled job (mailer.mjs) sends it, so a rush of check-ins never hits the email limits
    let emailTo = null;
    if (process.env.RESEND_API_KEY && process.env.MAIL_FROM) {
      try { await rst("mail").setJSON(`outbox/${rec.id}`, buildEmail(rec)); emailTo = mask(rec.emailInput); } catch { /* check-in still succeeds */ }
    }
    return json({ ok: true, repeat: false, name: rec.name, id: rec.id, timeIn: rec.timeIn, both: !!other, emailTo });
  } catch (e) {
    console.error("checkin failed", e);
    return json({ error: "We couldn’t save your check-in just now. Please try again in a moment." }, 503);
  }
};

export const config = { path: "/api/checkin" };
