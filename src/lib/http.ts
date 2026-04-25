import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "@/lib/auth";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...(extra ?? {}) }, { status });
}

export function handleError(err: unknown): NextResponse {
  if (err instanceof HttpError) return fail(err.status, err.message);
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", issues: err.issues },
      { status: 400 },
    );
  }
  console.error("[api] unexpected error", err);
  const message = err instanceof Error ? err.message : "Internal error";
  return fail(500, message);
}
