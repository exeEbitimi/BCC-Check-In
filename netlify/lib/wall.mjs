// Rebuilds the single "live wall" blob that the public pages read (cheap to poll every few seconds).
export async function rebuildWall(qs) {
  const keys = [];
  outer: for await (const page of qs.list({ prefix: "q/", paginate: true })) {
    for (const b of page.blobs) { keys.push(b.key); if (keys.length >= 500) break outer; }
  }
  const recs = await Promise.all(keys.map(async (k) => ({ k, r: await qs.get(k, { type: "json" }) })));
  const questions = recs
    .filter(({ r }) => r && (r.status === "published" || r.status === "answered"))
    .map(({ k, r }) => ({ id: k, name: r.name, to: r.to, text: r.text, at: r.at, answered: r.status === "answered" }));
  await qs.setJSON("wall/live", { questions, updatedAt: new Date().toISOString() });
}
