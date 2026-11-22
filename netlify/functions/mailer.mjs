// Runs every minute (scheduled). Sends queued check-in emails through Resend in batches of up to 100.
import { createHash } from "node:crypto";
import { rst } from "../lib/store.mjs";

const API = "https://api.resend.com";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default async () => {
  const apiKey = process.env.RESEND_API_KEY, from = process.env.MAIL_FROM;
  if (!apiKey || !from) return new Response("Email not configured");
  const mail = rst("mail"), started = Date.now(), headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
  const reply = process.env.MAIL_REPLY_TO ? { reply_to: process.env.MAIL_REPLY_TO } : {};

  const keys = [];
  outer: for await (const page of mail.list({ prefix: "outbox/", paginate: true })) {
    for (const b of page.blobs) { keys.push(b.key); if (keys.length >= 300) break outer; }
  }
  const sentOk = async (k) => { await mail.setJSON("sent/" + k.slice(7), { at: new Date().toISOString() }); await mail.delete(k); };
  const failed = async (k, m) => {
    m.attempts = (m.attempts || 0) + 1;
    if (m.attempts >= 4) { await mail.setJSON("failed/" + k.slice(7), { to: m.to, subject: m.subject, at: new Date().toISOString() }); await mail.delete(k); }
    else await mail.setJSON(k, m);
  };
  const payload = (m) => ({ from, to: [m.to], subject: m.subject, html: m.html, text: m.text, ...reply });
  let sent = 0;

  loop: for (let i = 0; i < keys.length && Date.now() - started < 20000; i += 100) {
    const items = (await Promise.all(keys.slice(i, i + 100).map(async (k) => ({ k, m: await mail.get(k, { type: "json" }) })))).filter((x) => x.m);
    if (!items.length) continue;
    const idem = "bcc-" + createHash("sha256").update(items.map((x) => x.k).join("|")).digest("hex");
    const res = await fetch(`${API}/emails/batch`, { method: "POST", headers: { ...headers, "Idempotency-Key": idem }, body: JSON.stringify(items.map((x) => payload(x.m))) });
    if (res.ok) { for (const x of items) await sentOk(x.k); sent += items.length; await sleep(300); continue; }
    if (res.status === 429 || res.status >= 500) break; // quota or rate limit: try again next minute
    // one bad address can reject a whole batch: send this group one by one and park the bad ones
    for (const { k, m } of items.slice(0, 25)) {
      const r = await fetch(`${API}/emails`, { method: "POST", headers: { ...headers, "Idempotency-Key": "bcc-" + k }, body: JSON.stringify(payload(m)) });
      if (r.ok) { await sentOk(k); sent++; } else if (r.status === 429 || r.status >= 500) break loop; else await failed(k, m);
      await sleep(150);
    }
  }
  console.log(`mailer: sent ${sent}, queued ${keys.length}`);
  return new Response(`sent ${sent}`);
};

export const config = { schedule: "* * * * *" };
