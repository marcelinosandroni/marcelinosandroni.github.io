import { parseFeatureFlag } from "@/domain/feature-flags/feature-flags";
import type { ChatInvitation } from "@/domain/chat/message";

/**
 * Whether the site itself invites every visitor into a conversation.
 *
 * ## Why this is a server-side variable and not a `NEXT_PUBLIC_` one
 *
 * The browser never reads it. The client asks `/api/presence` whether a chat is
 * offered and renders whatever the answer was, which is the same shape it already
 * has for the owner-initiates rule — so there is nothing for a `NEXT_PUBLIC_` name
 * to do, and exposing it would only add a second, weaker place for the policy to
 * live. The decision is made where the conversation is actually opened, which is
 * the server, using the secret Supabase key.
 *
 * That placement is also what keeps the database honest.
 * `public.append_visitor_message` refuses to write to anything the owner has not
 * opened, and `execute` on it is granted to `anon` — so an anonymous browser can
 * call it straight through PostgREST, skipping this application entirely. What
 * `site-invites` changes is who the *server* opens a conversation for; it does not
 * hand the browser a way around a rule it cannot otherwise reach. Closing a
 * conversation still ends it for everyone.
 *
 * ## Why `off` is the default
 *
 * Because the alternative is the owner's inbox. Every stranger who can open the
 * channel can put words in it, and the rate limit bounds the rate rather than the
 * volume. Someone who wants the channel open is choosing to be reachable; nobody
 * should become reachable by inheriting a variable from a deploy.
 */
export const CHAT_INVITATION_ENV = "CHAT_INVITATION";

/** The environment slice this module reads. */
export type ChatInvitationEnv = Readonly<Partial<Record<string, string | undefined>>>;

/**
 * Reads the invitation out of an environment.
 *
 * Anything the flag parser does not recognise as "on" is `owner-initiates`, which
 * reuses the same `1/true/yes/on` vocabulary as the two `NEXT_PUBLIC_` flags so
 * there is one way to say yes in this repository rather than three.
 */
export function readChatInvitation(env: ChatInvitationEnv = process.env): ChatInvitation {
  return parseFeatureFlag(env[CHAT_INVITATION_ENV]) ? "site-invites" : "owner-initiates";
}