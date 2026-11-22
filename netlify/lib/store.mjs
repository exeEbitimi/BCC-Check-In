import { getStore } from "@netlify/blobs";
// Strong consistency: reads always see the latest write straight away.
export const st = (name) => getStore({ name, consistency: "strong" });
// Retry a storage call a couple of times so a brief hiccup during a burst never loses a check-in or question.
export const retry = async (fn, n = 3) => {
  for (let i = 0; ; i++) {
    try { return await fn(); } catch (e) { if (i >= n - 1) throw e; await new Promise((r) => setTimeout(r, 150 * (i + 1) + Math.random() * 100)); }
  }
};
// Same store, every call retried.
export const rst = (name) => {
  const s = st(name);
  return {
    get: (k, o) => retry(() => s.get(k, o)), set: (k, v) => retry(() => s.set(k, v)),
    setJSON: (k, v) => retry(() => s.setJSON(k, v)), delete: (k) => retry(() => s.delete(k)), list: (o) => s.list(o),
  };
};
