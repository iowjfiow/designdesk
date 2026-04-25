export const dynamic = "force-dynamic";
import { getCurrentUser } from "@/lib/auth";
import { ok, handleError } from "@/lib/http";

export async function GET() {
  try {
    const me = await getCurrentUser();
    return ok({ user: me });
  } catch (e) {
    return handleError(e);
  }
}
