// Clears test data. Disabled unless the ALLOW_RESET environment variable is "true", so live data can't be wiped by accident.
import { rst } from "../lib/store.mjs";

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

// deletes keys until the time budget runs out; the page keeps calling until done
async function wipe(store, prefixes, deadline) {
  let deleted = 0;
  for (const prefix of prefixes) {
    const keys = [];
    for await (const p of store.list(prefix ? { prefix, paginate: true } : { paginate: true })) p.blobs.forEach((b) => keys.push(b.key));
    for (let i = 0; i < keys.length; i += 100) {
      if (Date.now() > deadline) return { deleted, done: false };
      await Promise.all(keys.slice(i, i + 100).map((k) => store.delete(k)));
      deleted += Math.min(100, keys.length - i);
    }
  }
  return { deleted, done: true };
}

export default async (req) => {
  const pin = process.env.ADMIN_PIN;
  if (!pin || req.headers.get("authorization") !== `Bearer ${pin}`) return json({ error: "Unauthorized" }, 401);
  if (process.env.ALLOW_RESET !== "true") return json({ error: "Clearing data is switched off. In Netlify, add the environment variable ALLOW_RESET = true, redeploy, then try again." }, 403);
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const b = await req.json().catch(() => ({}));
  if (b.confirm !== "DELETE ALL") return json({ error: "Type DELETE ALL to confirm." }, 400);
  const scope = ["all", "checkins", "questions"].includes(b.scope) ? b.scope : "all";

  const deadline = Date.now() + 7000;
  let deleted = 0, done = true;
  const run = async (store, prefixes) => { if (!done) return; const r = await wipe(store, prefixes, deadline); deleted += r.deleted; done = r.done; };
  if (scope !== "questions") { await run(rst("checkins"), [""]); await run(rst("ticket-index"), [""]); await run(rst("mail"), [""]); }
  if (scope !== "checkins") await run(rst("questions"), ["q/", "n/", "u/", "wall/"]); // keeps the session list and panelist edits
  // new "epoch" tells every phone to forget its saved pass from before the reset
  if (done && scope !== "questions") await rst("questions").set("config/epoch", String(Date.now()));
  return json({ ok: true, deleted, done, scope });
};

export const config = { path: "/api/reset" };
