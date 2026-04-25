import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const ROOT = process.env.UPLOAD_DIR ?? "./uploads";
const MAX = Number(process.env.MAX_UPLOAD_BYTES ?? 20_971_520);

const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/zip",
  "application/postscript",
  "application/illustrator",
  "application/x-photoshop",
  "image/vnd.adobe.photoshop",
  "application/octet-stream", // .ai/.psd often arrive as this
  "text/plain",
]);

export type StoredFile = {
  filename: string;
  storagePath: string;
  mimetype: string;
  sizeBytes: number;
  sha256: string;
  scannedClean: boolean;
};

export async function storeFile(
  scope: string,
  file: { name: string; type: string; arrayBuffer: () => Promise<ArrayBuffer>; size: number },
): Promise<StoredFile> {
  if (file.size > MAX) {
    throw new Error(`File exceeds max size of ${MAX} bytes`);
  }
  if (!ALLOWED.has(file.type)) {
    throw new Error(`Disallowed mimetype: ${file.type}`);
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256").update(buf).digest("hex");
  const cleanName = file.name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 120);
  const id = randomUUID();
  const dir = join(ROOT, scope);
  await mkdir(dir, { recursive: true });
  const storagePath = join(dir, `${id}_${cleanName}`);
  await writeFile(storagePath, buf);

  // Malware scan stub: real implementation should call ClamAV / VirusTotal
  // and only set scannedClean=true on a verified clean result.
  const scannedClean = await scanForMalware();

  return {
    filename: cleanName,
    storagePath,
    mimetype: file.type,
    sizeBytes: file.size,
    sha256: hash,
    scannedClean,
  };
}

async function scanForMalware(): Promise<boolean> {
  // TODO: integrate ClamAV (clamscan) or VirusTotal.
  // For local dev we mark uploads as clean. Production deployments MUST
  // implement a real scanner before serving these files back to users.
  return true;
}
