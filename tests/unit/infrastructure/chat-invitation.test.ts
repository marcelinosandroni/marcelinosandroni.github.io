import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { CHAT_INVITATION_ENV, readChatInvitation } from "@/infrastructure/presence/chat-invitation";

const root = resolve(__dirname, "../../..");

/**
 * Who may open a conversation.
 *
 * The tests below are almost entirely about the answer being "no", because that is
 * the answer that protects an owner's inbox and the answer a typo in a dashboard
 * would otherwise flip. Each `TRUTHY` spelling is here so that the vocabulary
 * cannot drift from the two `NEXT_PUBLIC_` flags without a failing test.
 */
describe("readChatInvitation", () => {
  it("keeps the owner-initiates rule when nothing is set", () => {
    expect(readChatInvitation({})).toBe("owner-initiates");
  });

  it.each(["1", "true", "TRUE", "yes", "on", "on ", " on"])(
    "opens the conversation to everybody when the variable says %o",
    (value) => {
      expect(readChatInvitation({ [CHAT_INVITATION_ENV]: value })).toBe("site-invites");
    },
  );

  /*
   * A blank is the mistake worth naming. `CHAT_INVITATION=` with nothing after it is
   * what a dashboard produces when somebody clears the field to "turn it off" and
   * then saves, and reading that as on would make every visitor a correspondent.
   */
  it.each(["", " ", "  \t", "off", "no", "false", "0", "enabled", "true-ish", "2"])(
    "keeps the owner-initiates rule when the variable is %o",
    (value) => {
      expect(readChatInvitation({ [CHAT_INVITATION_ENV]: value })).toBe("owner-initiates");
    },
  );

  it("treats an undefined variable the same as an empty one", () => {
    expect(readChatInvitation({ [CHAT_INVITATION_ENV]: undefined })).toBe("owner-initiates");
  });

  it("reads the name the .env.example and the dashboard both use", () => {
    expect(CHAT_INVITATION_ENV).toBe("CHAT_INVITATION");
  });

  /*
   * The database keeps the rule this variable cannot touch. `append_visitor_message`
   * is granted to `anon`, so an anonymous browser can reach it straight through
   * PostgREST without this application running at all; if the open-state check ever
   * became conditional, the flag would be a switch anybody could flip by editing a
   * request. Read from the migration rather than trusted, because the flag lives in
   * the server precisely because it must not be the only place the rule is written.
   */
  it("leaves the database refusing a conversation the owner has not opened", () => {
    const source = readFileSync(
      resolve(root, "supabase/migrations/20260930000300_presence_and_chat.sql"),
      "utf8",
    );

    const fn = source.slice(
      source.indexOf("create or replace function public.append_visitor_message"),
      source.indexOf("comment on function public.append_visitor_message"),
    );

    expect(fn).toContain("target.state <> 'open'");
    // Unconditional: no `if`, no parameter, no session setting it could read.
    expect(fn).not.toMatch(/if\s+.*open_to_visitors/);
  });
});