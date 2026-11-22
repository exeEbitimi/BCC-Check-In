// Question filter. Returns { verdict: "ok" | "review" | "block", reason }.
// "block"  = abusive, insulting, obscene or threatening: rejected, the asker is told to rephrase.
// "review" = suspicious (links, contact details, shouting, spam): held for a moderator.
// No keyword filter is perfect, so the admin page lets moderators approve or hide anything.
const BLOCK_WORDS = [
  // obscene
  "fuck", "fucking", "fucker", "motherfucker", "shit", "shitty", "bullshit", "bitch", "bastard", "asshole", "arsehole",
  "dickhead", "cunt", "pussy", "whore", "slut", "nigger", "nigga", "retard", "retarded", "wanker", "prick",
  // insults
  "idiot", "idiots", "stupid", "moron", "moronic", "imbecile", "fool", "fools", "dunce", "useless", "worthless",
  "clown", "jerk", "loser", "scum", "dumb", "ugly", "illiterate", "pathetic", "trash",
  // Nigerian English, pidgin and local-language insults
  "mumu", "yeye", "olodo", "werey", "ashawo", "oloshi", "shege", "nonsense", "rubbish",
];
const BLOCK_PHRASES = [
  /\bshut\s*up\b/, /\bgo\s+to\s+hell\b/, /\bkill\s+yourself\b/, /\bkys\b/, /\bdrop\s+dead\b/, /\bgo\s+and\s+die\b/,
  /\bi\s+(will|go|wan|am\s+going\s+to)\s+(kill|beat|hurt|slap|punish)\b/, /\byou\s+(should|must)\s+die\b/,
  /\bson\s+of\s+a\s+(bitch|b)\b/, /\bmother\s+of\s+(a\s+)?(fool|idiot)\b/,
];
const norm = (t) => {
  let s = t.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const leet = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", "@": "a", $: "s", "!": "i", "+": "t" };
  return s.replace(/(?<=[a-z])[013457@$!+](?=[a-z])/g, (c) => leet[c]); // only inside words: "st0pid" -> "stopid"
};
const rep = (w) => new RegExp("(^|[^a-z])" + [...w].map((c) => c + "+").join("") + "($|[^a-z])"); // allows fuuuck, idiiot
const WORD_RES = BLOCK_WORDS.map((w) => [w, rep(w)]);
const SPACED_RES = BLOCK_WORDS.filter((w) => w.length >= 4).map((w) => [w, new RegExp("(^|[^a-z])" + [...w].join("[^a-z]+") + "($|[^a-z])")]); // f u c k, f.u.c.k

export function check(text) {
  const n = norm(text);
  for (const [, re] of WORD_RES) if (re.test(n)) return { verdict: "block", reason: "Abusive or insulting language" };
  for (const [, re] of SPACED_RES) if (re.test(n)) return { verdict: "block", reason: "Disguised abusive language" };
  for (const re of BLOCK_PHRASES) if (re.test(n)) return { verdict: "block", reason: "Abusive or threatening phrase" };
  if (/(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|ng|net|org|co|io|me|ly)\b)/i.test(text)) return { verdict: "review", reason: "Contains a link" };
  if (/(\+?\d[\d\s-]{8,}\d|\S+@\S+\.\S+)/.test(text)) return { verdict: "review", reason: "Contains a phone number or email" };
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length >= 20 && letters.replace(/[^A-Z]/g, "").length / letters.length > 0.7) return { verdict: "review", reason: "Mostly capital letters" };
  if (/(.)\1{7,}/.test(text)) return { verdict: "review", reason: "Repeated characters" };
  return { verdict: "ok", reason: "" };
}
