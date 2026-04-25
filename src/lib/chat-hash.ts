import { createHash } from "node:crypto";

// Tamper-evident chain: each message hash = sha256(prevHash + senderId + body + createdAtIso).
export function messageHash(input: {
  prevHash: string | null;
  senderId: string;
  body: string;
  createdAtIso: string;
}): string {
  const h = createHash("sha256");
  h.update(input.prevHash ?? "");
  h.update("\u001f");
  h.update(input.senderId);
  h.update("\u001f");
  h.update(input.body);
  h.update("\u001f");
  h.update(input.createdAtIso);
  return h.digest("hex");
}
