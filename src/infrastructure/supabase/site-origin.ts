import type { EnvironmentLike } from "@/infrastructure/supabase/server";

/**
 * Where a Supabase redirect is allowed to point.
 *
 * `emailRedirectTo` has to be an absolute URL, and hardcoding the apex would
 * break local development and preview deployments, which are different origins.
 * So the origin is derived from the incoming request, which means the value
 * follows the deployment rather than a constant.
 *
 * The variable is `NEXT_PUBLIC_APP_URL` because Supabase also needs the site URL
 * configured in its dashboard to allow the redirect at all — this function only
 * produces the value, it does not grant the permission.
 */
export function getSiteOrigin(
  request?: Request,
  env: EnvironmentLike = process.env,
): string {
  const configured = env.NEXT_PUBLIC_APP_URL;

  if (typeof configured === "string" && configured.trim() !== "") {
    return configured.trim().replace(/\/+$/, "");
  }

  if (request !== undefined) {
    try {
      return new URL(request.url).origin;
    } catch {
      // Fall through to the explicit failure below.
    }
  }

  return "http://localhost:3000";
}
