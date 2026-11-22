// Builds the check-in confirmation email. Edit EVENT if details change.
const EVENT = {
  name: "Bayelsa Creatives Converge 3.0", venue: "DSP Alamieyeseigha Memorial Banquet Hall, Yenagoa", doors: "8AM",
  days: { 1: "Tuesday 24 November 2026", 2: "Wednesday 25 November 2026" },
};
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const mask = (e) => { const [a, d] = String(e).split("@"); return d ? a.slice(0, 1) + "***@" + d : ""; };

export function buildEmail(r) {
  const site = (process.env.URL || "").replace(/\/$/, "");
  const when = new Date(r.timeIn).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos", hour: "numeric", minute: "2-digit" });
  const day = EVENT.days[r.day] || `Day ${r.day}`;
  const rows = [["Name", r.name], ["Email", r.emailInput || r.email], ["Phone", r.phone], ["Creative field", r.discipline], ["Brand or organisation", r.brand || "-"], ["City", r.city]];
  const subject = `You’re checked in: BCC 3.0 Day ${r.day} (${r.id})`;
  const ask = site ? `${site}/ask` : "";
  const text = [
    `Hi ${r.name}, you’re checked in for Day ${r.day} of ${EVENT.name}.`, "",
    `Ticket ID: ${r.id}`, `Day: ${day}`, `Time in: ${when}`, `Venue: ${EVENT.venue}`, `Doors open: ${EVENT.doors}`, "",
    "Your details as you entered them:", ...rows.map(([k, v]) => `${k}: ${v}`), "",
    "Show your QR pass or this ticket ID at the door.", ask ? `Ask a speaker a question: ${ask} (use your ticket ID)` : "",
  ].join("\n");
  const row = ([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#555;font-size:14px">${esc(k)}</td><td style="padding:6px 0;font-weight:700;font-size:15px">${esc(v)}</td></tr>`;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:#000">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff">
<tr><td style="background:#FFCD03;padding:20px 24px;font-size:22px;font-weight:800">${esc(EVENT.name)}</td></tr>
<tr><td style="height:6px;background:#E4002B"></td></tr>
<tr><td style="padding:24px">
<p style="margin:0 0 16px;font-size:16px">Hi ${esc(r.name)}, you’re checked in for <b>Day ${esc(r.day)}</b>.</p>
<div style="background:#000;color:#FFCD03;padding:16px 20px;text-align:center"><div style="font-size:12px;color:#fff">YOUR TICKET ID</div><div style="font-size:30px;font-weight:800;letter-spacing:2px">${esc(r.id)}</div></div>
<p style="margin:16px 0 4px;font-size:15px"><b>${esc(day)}</b><br>Time in: ${esc(when)}<br>${esc(EVENT.venue)}<br>Doors open ${esc(EVENT.doors)}</p>
<p style="margin:20px 0 6px;font-size:13px;color:#555">YOUR DETAILS AS YOU ENTERED THEM</p>
<table role="presentation" cellpadding="0" cellspacing="0">${rows.map(row).join("")}</table>
<p style="margin:20px 0 0;font-size:14px">Show your QR pass or this ticket ID at the door.${ask ? ` Want to ask a speaker something? <a href="${esc(ask)}" style="color:#E4002B;font-weight:700">Ask a question</a> with your ticket ID.` : ""}</p>
</td></tr></table></td></tr></table></body></html>`;
  return { to: r.emailInput || r.email, subject, html, text, attempts: 0, createdAt: new Date().toISOString() };
}
