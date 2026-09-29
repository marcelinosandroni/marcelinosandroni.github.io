import { handlers } from "@/infrastructure/auth/auth";

/**
 * Auth.js route handlers.
 *
 * `handlers` already answers 503 with a machine-readable body when the provider
 * has no credentials, so a build machine or a fork without a Resend key fails
 * loudly and specifically instead of returning an opaque 500.
 */
export const GET = handlers;
export const POST = handlers;
