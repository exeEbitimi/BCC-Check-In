import { getStore } from "@netlify/blobs";
// Strong consistency: reads always see the latest write straight away.
// (The default can lag by up to a minute, which hid fresh check-in details and just-approved questions.)
export const st = (name) => getStore({ name, consistency: "strong" });
