// Sessions, panelists and the "live now" session. Defaults below; moderators edit them from the moderation page.
const P = (id, title, subtitle, panelists) => ({ id, type: "panel", title, subtitle, panelists });
const I = (id, name) => ({ id, type: "interview", title: name, subtitle: "One-on-one interview", panelists: [name] });
const K = (id, name) => ({ id, type: "speaker", title: name, subtitle: "Speaker", panelists: [name] });

export const DEFAULT_SESSIONS = [
  P("p1", "The Music Business", "Structuring Talent Management & Label Operations for Global Export. The Blueprint & the Balance Sheet.", ["Efe Omorogbe", "Emem Ema", "Adedeji Adeniji"]),
  P("p2", "My Journey", "The Lows that built us, the Highs that define us", ["Ovieteme George", "Bathesheba Napoleon"]),
  P("p3", "Beyond The Odds: The Power Of Not Giving Up", "", ["Mercy The Influencer", "CEO Blozzom’s Bistro", "Yvonne Paul Azibato"]),
  P("p4", "From Talent to Enterprise", "From Freelancer to Founder, Structuring a Creative Business That Scales", ["Ekemini Prince", "Zigha", "Wisdom"]),
  P("p5", "Mentorship & Leadership", "Bridging Policy & Potential, Encouraging Institutional Support for the Industry", ["Hon. Tonye Isenah", "Hon. David Alagoa", "Alfred Kemepade"]),
  P("p6", "Comic Panel", "Evolution of Comedy; from yesteryears to today", ["Mc Okpeke", "Mc Erepi", "AJ", "Mc Senibo", "Mama G"]),
  P("p7", "Vendors Round Table", "The Event Business", ["CEO Events By Ozee", "Chef Debblin", "Perfect Eyi", "Godgift Iluma, CEO Bacode"]),
  P("p8", "Tech Panel", "", ["Astro Soft", "Asieri"]),
  I("i1", "Danny Spry"), I("i2", "M.I Abaga"), I("i3", "Wizard Chan"), I("i4", "Gordons"),
  I("i5", "Mera Owili"), I("i6", "Uju Okoli"), I("i7", "Nas Boi"), I("i8", "Frank Ikemefune"),
  K("k1", "Ken Etete"), K("k2", "Moses Siasia"), K("k3", "Daniel Markson"), K("k4", "I.D Cabasa"),
];

export async function loadConfig(qs) {
  const [s, a] = await Promise.all([qs.get("config/sessions", { type: "json", consistency: "strong" }), qs.get("config/active", { type: "json", consistency: "strong" })]);
  const sessions = s?.sessions?.length ? s.sessions : DEFAULT_SESSIONS;
  const live = a?.id && sessions.some((x) => x.id === a.id) ? a : null;
  return { sessions, activeId: live?.id || null, day: live?.day || null };
}

export function cleanSessions(arr) {
  if (!Array.isArray(arr)) return [];
  const c = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n), seen = new Set();
  return arr.slice(0, 60).map((s) => {
    let id = c(s.id, 20).replace(/[^a-z0-9_-]/gi, "") || "s" + Math.random().toString(36).slice(2, 8);
    while (seen.has(id)) id += "x";
    seen.add(id);
    return {
      id, type: ["panel", "interview", "speaker"].includes(s.type) ? s.type : "panel", title: c(s.title, 140), subtitle: c(s.subtitle, 260),
      panelists: (Array.isArray(s.panelists) ? s.panelists : []).map((p) => c(p, 80)).filter(Boolean).slice(0, 15),
    };
  }).filter((s) => s.title);
}
