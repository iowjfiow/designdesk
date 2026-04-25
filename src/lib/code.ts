import { customAlphabet } from "nanoid";

// Project codes are short, human-readable, unambiguous.
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const generate = customAlphabet(alphabet, 6);

export function projectCode(): string {
  return `DD-${generate()}`;
}
