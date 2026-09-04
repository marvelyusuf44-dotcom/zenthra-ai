import { NextRequest } from "next/server";

/**
 * V1 admin auth: a single shared secret (ADMIN_API_SECRET) passed as
 * `x-admin-secret` header. This is intentionally minimal — no user
 * accounts/roles system is in scope for V1 (BLUEPRINT.md §13 "no complex
 * auth"). It is sufficient to gate the stats/orders endpoints from the
 * public internet, but is NOT a substitute for a real multi-admin auth
 * system if Zenthra grows beyond a single operator. Documented as a known
 * V1 limitation in the final report.
 */
export function isAuthorizedAdmin(req: NextRequest): boolean {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) return false; // fail closed if not configured
  const provided = req.headers.get("x-admin-secret");
  return provided === secret;
}
