import { describe, expect, it } from "vitest";

import type { Locale } from "@/domain/i18n";
import { compileMarkdown } from "@/application/blog/markdown";
import {
  InvalidPostDraftError,
  POST_CATEGORIES,
  POST_EXCERPT_MAX_LENGTH,
  POST_SLUG_MAX_LENGTH,
  POST_TAG_MAX_COUNT,
  POST_TAG_MAX_LENGTH,
  POST_TITLE_MAX_LENGTH,
  comparePostSummaries,
  composePostDocument,
  estimateReadingTimeMinutes,
  isArticleCategory,
  isPostStatus,
  parsePostDocument,
  readPostInput,
  slugifyPostTitle,
  toPostSummary,
  type PostDraft,
  type PostFrontMatter,
  type PostIssue,
  type PostSummary,
} from "@/domain/blog/post-draft";

/** A complete, valid document. Overridden per test through `document()`. */
const VALID = [
  "---",
  "title: Architecting resilient swarms with Kafka event streams",
  "slug: resilient-agent-swarms-on-kafka",
  "locale: en-US",
  "category: distributed-systems",
  "excerpt: Zero-loss brokers and idempotent consumers.",
  "tags: Kafka, idempotency",
  "featured: true",
  "publishedAt: 2026-06-18",
  "---",
  "A swarm of AI agents is a message-delivery problem.",
  "",
  "## The delivery contract",
  "",
  "- No accepted message may be lost",
  "- No message may be processed twice",
].join("\n");

function document(overrides: Partial<PostFrontMatter> = {}, body = "A body."): string {
  return composePostDocument({
    frontMatter: {
      title: "A title",
      slug: "a-title",
      locale: "en-US",
      category: "leadership",
      excerpt: "An excerpt.",
      tags: [],
      featured: false,
      publishedAt: "2026-06-18",
      ...overrides,
    },
    markdown: body,
  });
}

function issuesOf(fn: () => unknown): PostIssue[] {
  try {
    fn();
  } catch (error) {
    if (error instanceof InvalidPostDraftError) {
      return [...error.issues];
    }
    throw error;
  }

  throw new Error("expected the call to throw");
}

describe("parsePostDocument", () => {
  it("splits the front matter from the body", () => {
    const parsed = parsePostDocument(VALID);

    expect(parsed.frontMatter.title).toBe("Architecting resilient swarms with Kafka event streams");
    expect(parsed.frontMatter.tags).toEqual(["Kafka", "idempotency"]);
    expect(parsed.markdown).toContain("## The delivery contract");
  });

  it("normalises CRLF, so a document authored on Windows is not a different document", () => {
    expect(parsePostDocument(VALID.replace(/\n/g, "\r\n"))).toEqual(parsePostDocument(VALID));
  });

  it("trims the body but not the meaning of it", () => {
    expect(parsePostDocument(`${VALID}\n\n\n   \n`).markdown).toBe(
      parsePostDocument(VALID).markdown,
    );
  });

  it("skips blank lines and comments inside the block", () => {
    const parsed = parsePostDocument(
      ["---", "# a comment", "", "title: Kept", "---", "Body."].join("\n"),
    );

    expect(parsed.frontMatter.title).toBe("Kept");
  });

  it("unquotes a value so a colon inside it survives", () => {
    const parsed = parsePostDocument(
      ['---', 'title: "Kafka: the good part"', "---", "Body."].join("\n"),
    );

    expect(parsed.frontMatter.title).toBe("Kafka: the good part");
  });

  it("unquotes single quotes and escaped double quotes", () => {
    expect(
      parsePostDocument(["---", "title: 'it\\'s fine'", 'excerpt: "say \\"hi\\""', "---", "B."].join("\n"))
        .frontMatter.excerpt,
    ).toBe('say "hi"');
  });

  it("returns an empty list for an empty tags value", () => {
    expect(parsePostDocument(["---", "title: T", "tags:", "---", "B."].join("\n")).frontMatter.tags)
      .toEqual([]);
  });

  it("refuses a document with no front matter at all", () => {
    expect(issuesOf(() => parsePostDocument("Just a body."))).toEqual([
      { field: "document", code: "front_matter_missing" },
    ]);
  });

  it("refuses a document whose front matter is never closed", () => {
    expect(issuesOf(() => parsePostDocument(["---", "title: T"].join("\n")))).toEqual([
      { field: "document", code: "front_matter_unterminated" },
    ]);
  });

  it("refuses a non-string, so a JSON body cannot smuggle an object in", () => {
    for (const value of [null, 42, { document: VALID }, ["---"]]) {
      expect(issuesOf(() => parsePostDocument(value))).toEqual([
        { field: "document", code: "document_unreadable" },
      ]);
    }
  });

  it("refuses a document past the size bound before splitting it into lines", () => {
    expect(issuesOf(() => parsePostDocument("x".repeat(200_001)))).toEqual([
      { field: "document", code: "value_too_long" },
    ]);
  });

  /*
   * The reason this parser exists instead of a YAML one. `titel` is a typo, and
   * a tolerant parser turns it into a post with no title; a strict one refuses.
   */
  it("refuses an unknown key rather than dropping it", () => {
    expect(issuesOf(() => parsePostDocument(["---", "titel: Typo", "---", "B."].join("\n")))).toEqual(
      [{ field: "titel", code: "front_matter_key_unknown" }],
    );
  });

  it("refuses a repeated key instead of silently taking the last one", () => {
    // This is also the only way a scalar key can be handed a list, which is why
    // `value_not_a_string` is a defensive branch rather than a reachable one.
    expect(
      issuesOf(() =>
        parsePostDocument(["---", "title: One", "title: Two", "---", "B."].join("\n")),
      ),
    ).toEqual([{ field: "title", code: "front_matter_key_repeated" }]);
  });

  it("refuses a line that is not `name: value`", () => {
    expect(issuesOf(() => parsePostDocument(["---", "just some prose", "---", "B."].join("\n")))).toEqual(
      [{ field: "just some prose", code: "front_matter_line_invalid" }],
    );
  });

  it("refuses a line with no key, which a `:`-less line would otherwise hide", () => {
    expect(issuesOf(() => parsePostDocument(["---", ": value", "---", "B."].join("\n")))).toEqual([
      { field: ": value", code: "front_matter_line_invalid" },
    ]);
  });
});

describe("composePostDocument", () => {
  it("round-trips a valid document unchanged", () => {
    expect(readPostInput(composePostDocument(readPostInput(VALID)))).toEqual(readPostInput(VALID));
  });

  it("quotes a value that would otherwise be read as a comment or a key", () => {
    const composed = document({ title: "# not a comment" });

    expect(composed).toContain('title: "# not a comment"');
    expect(readPostInput(composed).frontMatter.title).toBe("# not a comment");
  });

  it("quotes a value containing a colon and a space", () => {
    const composed = document({ title: "Kafka: the good part" });

    expect(readPostInput(composed).frontMatter.title).toBe("Kafka: the good part");
  });

  it("quotes a list item that needs it, and leaves the rest alone", () => {
    const composed = document({ tags: ["Kafka", "needs: quoting"] });

    expect(composed).toContain('tags: Kafka, "needs: quoting"');
    expect(readPostInput(composed).frontMatter.tags).toEqual(["Kafka", "needs: quoting"]);
  });

  it("writes a boolean as true or false, never as an empty value", () => {
    expect(document({ featured: true })).toContain("featured: true");
    expect(document({ featured: false })).toContain("featured: false");
  });
});

describe("slugifyPostTitle", () => {
  it("derives a lowercase kebab-case segment from a title", () => {
    expect(slugifyPostTitle("RDS to ClickHouse: 100M messages/day")).toBe(
      "rds-to-clickhouse-100m-messages-day",
    );
  });

  it("transliterates accented Portuguese, because a slug is a URL", () => {
    expect(slugifyPostTitle("O líder de núcleo duplo")).toBe("o-lider-de-nucleo-duplo");
    expect(slugifyPostTitle("Arquitetando swarms resilientes")).toBe("arquitetando-swarms-resilientes");
  });

  it("expands the ligatures a European title can carry", () => {
    expect(slugifyPostTitle("Estratégia")).toBe("estrategia");
    expect(slugifyPostTitle("Straße")).toBe("strasse");
  });

  it("collapses every run of separators into a single hyphen", () => {
    expect(slugifyPostTitle("a   b___c")).toBe("a-b-c");
  });

  it("never leaves a leading or trailing hyphen", () => {
    expect(slugifyPostTitle("  Leading and trailing  ")).toBe("leading-and-trailing");
  });

  it("cuts to the length bound and does not leave a dangling hyphen", () => {
    const slug = slugifyPostTitle(`${"word ".repeat(40)}tail`);

    expect(slug.length).toBeLessThanOrEqual(POST_SLUG_MAX_LENGTH);
    expect(slug.endsWith("-")).toBe(false);
    expect(slug).toBe(slug.toLowerCase());
  });

  it("produces a segment the article slug invariant accepts", () => {
    const slug = slugifyPostTitle("Códigos de núcleo: lições 1–3");

    expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it("refuses a title that reduces to nothing rather than yielding an empty segment", () => {
    expect(issuesOf(() => slugifyPostTitle("日本語"))).toEqual([
      { field: "title", code: "value_required" },
    ]);
    expect(issuesOf(() => slugifyPostTitle("   "))).toEqual([
      { field: "title", code: "value_required" },
    ]);
  });
});

describe("readPostInput", () => {
  it("returns the fields a complete document carries", () => {
    const { frontMatter, markdown } = readPostInput(VALID);

    expect(frontMatter).toEqual({
      title: "Architecting resilient swarms with Kafka event streams",
      slug: "resilient-agent-swarms-on-kafka",
      locale: "en-US",
      category: "distributed-systems",
      excerpt: "Zero-loss brokers and idempotent consumers.",
      tags: ["Kafka", "idempotency"],
      featured: true,
      publishedAt: "2026-06-18",
    });
    expect(markdown).toContain("A swarm of AI agents");
  });

  it("generates the slug from the title when the field is left blank", () => {
    expect(readPostInput(document({ title: "O líder de núcleo", slug: "" })).frontMatter.slug).toBe(
      "o-lider-de-nucleo",
    );
  });

  it("generates the slug when the field is absent entirely", () => {
    const withoutSlug = VALID.split("\n").filter((line) => !line.startsWith("slug:")).join("\n");

    expect(readPostInput(withoutSlug).frontMatter.slug).toBe(
      "architecting-resilient-swarms-with-kafka-event-streams",
    );
  });

  it("reports a missing required key once per key", () => {
    const codes = issuesOf(() => readPostInput(["---", "title: T", "---", "Body."].join("\n")));

    expect(codes).toContainEqual({ field: "excerpt", code: "front_matter_key_missing" });
    expect(codes).toContainEqual({ field: "locale", code: "front_matter_key_missing" });
    expect(codes).not.toContainEqual({ field: "slug", code: "front_matter_key_missing" });
  });

  /*
   * The reason the readers append instead of returning early. An editor that
   * reports one field per save is an editor the owner learns to avoid.
   */
  it("reports every problem in one pass, not just the first", () => {
    const broken = [
      "---",
      "title: ",
      "locale: klingon",
      "category: astrology",
      "excerpt: An excerpt.",
      "featured: perhaps",
      "publishedAt: yesterday",
      "---",
    ].join("\n");

    const codes = issuesOf(() => readPostInput(broken));

    expect(codes).toEqual(
      expect.arrayContaining([
        { field: "title", code: "value_required" },
        { field: "locale", code: "locale_unknown" },
        { field: "category", code: "category_unknown" },
        { field: "featured", code: "value_not_a_boolean" },
        { field: "publishedAt", code: "value_not_a_date" },
        { field: "body", code: "body_empty" },
      ]),
    );
  });

  it("refuses a blank required value", () => {
    expect(issuesOf(() => readPostInput(document({ title: "   " })))).toContainEqual({
      field: "title",
      code: "value_required",
    });
  });

  it("refuses a value over its bound", () => {
    expect(
      issuesOf(() => readPostInput(document({ title: "t".repeat(POST_TITLE_MAX_LENGTH + 1) }))),
    ).toContainEqual({ field: "title", code: "value_too_long" });

    expect(
      issuesOf(() => readPostInput(document({ excerpt: "e".repeat(POST_EXCERPT_MAX_LENGTH + 1) }))),
    ).toContainEqual({ field: "excerpt", code: "value_too_long" });
  });

  it("accepts a value exactly at its bound", () => {
    expect(
      readPostInput(document({ title: "t".repeat(POST_TITLE_MAX_LENGTH) })).frontMatter.title,
    ).toHaveLength(POST_TITLE_MAX_LENGTH);
  });

  it("refuses a slug the article invariant would refuse, and says so", () => {
    expect(issuesOf(() => readPostInput(document({ slug: "Not A Slug" })))).toContainEqual({
      field: "slug",
      code: "slug_invalid",
    });

    expect(issuesOf(() => readPostInput(document({ slug: "-leading" })))).toContainEqual({
      field: "slug",
      code: "slug_invalid",
    });

    expect(issuesOf(() => readPostInput(document({ slug: "a".repeat(POST_SLUG_MAX_LENGTH + 1) }))))
      .toContainEqual({ field: "slug", code: "value_too_long" });
  });

  it("trims surrounding whitespace off a value rather than storing it", () => {
    expect(readPostInput(document({ title: "  Padded  " })).frontMatter.title).toBe("Padded");
  });

  it("refuses a list value declared twice rather than merging the two", () => {
    const listed = [
      "---",
      "title: T",
      "slug: t",
      "locale: en-US",
      "category: leadership",
      "excerpt: E",
      "tags: a, b",
      "tags: c",
      "featured: true",
      "publishedAt: 2026-06-18",
      "---",
      "Body.",
    ].join("\n");

    expect(issuesOf(() => readPostInput(listed))).toEqual([
      { field: "tags", code: "front_matter_key_repeated" },
    ]);
  });

  it("refuses a date that is not a calendar date", () => {
    for (const value of ["2026-13-01", "2026-02-30", "18/06/2026", "2026-6-1"]) {
      expect(issuesOf(() => readPostInput(document({ publishedAt: value })))).toContainEqual({
        field: "publishedAt",
        code: "value_not_a_date",
      });
    }
  });

  it("accepts a leap day that exists and refuses one that does not", () => {
    expect(readPostInput(document({ publishedAt: "2028-02-29" })).frontMatter.publishedAt).toBe(
      "2028-02-29",
    );
    expect(issuesOf(() => readPostInput(document({ publishedAt: "2026-02-29" })))).toContainEqual({
      field: "publishedAt",
      code: "value_not_a_date",
    });
  });

  it("reads featured case-insensitively but refuses anything else", () => {
    expect(readPostInput(VALID.replace("featured: true", "featured: TRUE")).frontMatter.featured).toBe(
      true,
    );

    for (const value of ["perhaps", "1", "yes", "on"]) {
      expect(issuesOf(() => readPostInput(VALID.replace("featured: true", `featured: ${value}`))))
        .toContainEqual({ field: "featured", code: "value_not_a_boolean" });
    }
  });

  it("accepts `no` as a false featured flag, because it is unambiguous", () => {
    expect(readPostInput(VALID.replace("featured: true", "featured: no")).frontMatter.featured).toBe(
      false,
    );
  });

  it("drops duplicate and blank tags rather than refusing them", () => {
    const parsed = readPostInput(document({ tags: ["Kafka", "Kafka", "  ", "idempotency"] }));

    expect(parsed.frontMatter.tags).toEqual(["Kafka", "idempotency"]);
  });

  it("refuses a tag over the bound and one past the count", () => {
    expect(
      issuesOf(() => readPostInput(document({ tags: ["t".repeat(POST_TAG_MAX_LENGTH + 1)] }))),
    ).toContainEqual({ field: "tags", code: "value_too_long" });

    const many = Array.from({ length: POST_TAG_MAX_COUNT + 1 }, (_, index) => `tag-${index}`);

    expect(issuesOf(() => readPostInput(document({ tags: many })))).toContainEqual({
      field: "tags",
      code: "tags_too_many",
    });
  });

  it("refuses an empty body, which is a write the database would reject", () => {
    expect(issuesOf(() => readPostInput(document({}, "   \n  ")))).toContainEqual({
      field: "body",
      code: "body_empty",
    });
  });

  it("accepts both supported locales and refuses a third", () => {
    expect(readPostInput(document({ locale: "pt-BR" })).frontMatter.locale).toBe("pt-BR");
    expect(issuesOf(() => readPostInput(document({ locale: "fr-FR" as Locale })))).toContainEqual({
      field: "locale",
      code: "locale_unknown",
    });
  });

  it("accepts every published category and refuses anything else", () => {
    for (const category of POST_CATEGORIES) {
      expect(readPostInput(document({ category })).frontMatter.category).toBe(category);
    }

    expect(issuesOf(() => readPostInput(document({ category: "blockchain" as never })))).toContainEqual(
      { field: "category", code: "category_unknown" },
    );
  });

  it("names every problem in its message, so a server log is diagnosable", () => {
    try {
      readPostInput(document({ locale: "klingon" as Locale }));
      throw new Error("expected a throw");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidPostDraftError);
      expect((error as Error).message).toContain("locale:locale_unknown");
      expect((error as Error).name).toBe("InvalidPostDraftError");
    }
  });
});

describe("compileMarkdown", () => {
  it("compiles a document into the blocks the article page renders", () => {
    const { markdown } = readPostInput(VALID);

    expect(compileMarkdown(markdown)).toEqual([
      { type: "paragraph", text: "A swarm of AI agents is a message-delivery problem." },
      { type: "heading", level: 2, text: "The delivery contract" },
      { type: "list", ordered: false, items: ["No accepted message may be lost", "No message may be processed twice"] },
    ]);
  });

  it("returns nothing for an empty body", () => {
    expect(compileMarkdown("")).toEqual([]);
    expect(compileMarkdown("   \n\n  ")).toEqual([]);
  });

  it("reflows a paragraph onto one line, the way Markdown renders it", () => {
    expect(compileMarkdown("one\ntwo\nthree")).toEqual([
      { type: "paragraph", text: "one two three" },
    ]);
  });

  it("ends a paragraph at the first other block marker", () => {
    expect(compileMarkdown("Some prose\n## A heading\nmore prose")).toEqual([
      { type: "paragraph", text: "Some prose" },
      { type: "heading", level: 2, text: "A heading" },
      { type: "paragraph", text: "more prose" },
    ]);
  });

  it("folds a single hash to level 2, because the page owns the h1", () => {
    expect(compileMarkdown("# One")).toEqual([{ type: "heading", level: 2, text: "One" }]);
    expect(compileMarkdown("### Three")).toEqual([{ type: "heading", level: 3, text: "Three" }]);
  });

  it("clamps a level the block union does not have rather than failing the document", () => {
    expect(compileMarkdown("###### Six")).toEqual([{ type: "heading", level: 3, text: "Six" }]);
  });

  it("compiles an ordered list and keeps it ordered", () => {
    expect(compileMarkdown("1. first\n2. second\n3. third")).toEqual([
      { type: "list", ordered: true, items: ["first", "second", "third"] },
    ]);
  });

  it("accepts both bullet markers and `1.` style ordered markers", () => {
    expect(compileMarkdown("- a\n* b\n+ c")).toEqual([
      { type: "list", ordered: false, items: ["a", "b"] },
      { type: "paragraph", text: "+ c" },
    ]);
    expect(compileMarkdown("1) a")).toEqual([{ type: "list", ordered: true, items: ["a"] }]);
  });

  it("reads a quote and a trailing attribution", () => {
    expect(compileMarkdown("> Engineering that connects things.\n> — the author")).toEqual([
      {
        type: "quote",
        text: "Engineering that connects things.",
        attribution: "the author",
      },
    ]);
  });

  it("only reads the attribution from the last line, so a sentence can start with an em dash", () => {
    expect(compileMarkdown("> — this is a whole sentence\n> and it continues")).toEqual([
      { type: "quote", text: "— this is a whole sentence and it continues" },
    ]);
  });

  it("reads a fenced code block and its language", () => {
    expect(compileMarkdown("```sql\nSELECT 1;\nSELECT 2;\n```")).toEqual([
      { type: "code", language: "sql", code: "SELECT 1;\nSELECT 2;" },
    ]);
  });

  it("defaults an unlabelled fence to `text` and keeps indentation in the code", () => {
    expect(compileMarkdown("```\n  indented\n```")).toEqual([
      { type: "code", language: "text", code: "  indented" },
    ]);
  });

  it("takes only the first word of the fence label as the language", () => {
    expect(compileMarkdown("```json title=x\n{}\n```")[0]).toEqual({
      type: "code",
      language: "json",
      code: "{}",
    });
  });

  it("consumes the rest of the document for an unterminated fence, rather than losing it", () => {
    expect(compileMarkdown("```py\nprint(1)\nprint(2)")).toEqual([
      { type: "code", language: "py", code: "print(1)\nprint(2)" },
    ]);
  });

  it("compiles a callout with a title, a tone and a body", () => {
    expect(compileMarkdown("::: secondary\nIf you are hiring\nAsk about downtime.\n:::")).toEqual([
      {
        type: "callout",
        tone: "secondary",
        title: "If you are hiring",
        text: "Ask about downtime.",
      },
    ]);
  });

  it("defaults an unknown or missing callout tone to primary", () => {
    expect(compileMarkdown("::: neon\nTitle\nBody.\n:::")[0]).toMatchObject({ tone: "primary" });
    expect(compileMarkdown(":::\n\nBody.\n:::")[0]).toMatchObject({
      tone: "primary",
      title: "primary",
    });
  });

  it("handles CRLF documents identically to LF ones", () => {
    const body = "One.\r\n\r\n## Two\r\n\r\n- three";

    expect(compileMarkdown(body)).toEqual(compileMarkdown(body.replace(/\r\n/g, "\n")));
  });

  /*
   * The security claim, stated as a test.
   *
   * There is no HTML in the output and no path that produces any, so the script
   * survives as text and React escapes it on the way to the page. A test that
   * asserted the tag was *removed* would be asserting a different design — one
   * that silently deletes what somebody typed.
   */
  it("carries raw HTML through as inert text and never as markup", () => {
    const attacks = [
      "<script>alert(1)</script>",
      '<img src=x onerror="alert(1)">',
      "<iframe src='javascript:alert(1)'></iframe>",
      "</p><script>alert(1)</script><p>",
    ];

    for (const attack of attacks) {
      const blocks = compileMarkdown(`${attack}\n\n## ${attack}`);

      // Survives verbatim: nothing is silently deleted.
      expect(blocks).toEqual([
        { type: "paragraph", text: attack },
        { type: "heading", level: 2, text: attack },
      ]);

      // The important half: every value in every block is a primitive or a list
      // of primitives, so there is no node a renderer could interpret as markup.
      for (const block of blocks) {
        for (const value of Object.values(block)) {
          expect(
            typeof value === "string" ||
              typeof value === "number" ||
              (Array.isArray(value) && value.every((entry) => typeof entry === "string")),
          ).toBe(true);
        }
      }
    }
  });

  it("does not invent a link out of a URL, so there is no target to sanitise", () => {
    // `ArticleBlock` has no link variant. A link is a security decision this
    // module does not get to make, so the URL stays text.
    expect(compileMarkdown("See https://example.test/a?b=c for details")).toEqual([
      { type: "paragraph", text: "See https://example.test/a?b=c for details" },
    ]);
  });

  it("keeps unsupported inline syntax literal rather than deleting it", () => {
    // `ArticleBlock` has no inline node type, so `**bold**` and `[text](url)`
    // cannot be rendered. Stripping the markers would lose the author's intent
    // with no trace; showing them tells them the syntax is not supported.
    expect(compileMarkdown("**bold** and [a link](https://example.test)")).toEqual([
      { type: "paragraph", text: "**bold** and [a link](https://example.test)" },
    ]);
  });

  it("keeps a javascript: target as text, since there is no link block to carry it", () => {
    const blocks = compileMarkdown("[click](javascript:alert(1))");

    expect(blocks[0]).toEqual({
      type: "paragraph",
      text: "[click](javascript:alert(1))",
    });
  });

  it("compiles a mixed document into a sequence that renders top to bottom", () => {
    const blocks = compileMarkdown(
      [
        "Intro paragraph.",
        "",
        "## Section",
        "",
        "1. step one",
        "2. step two",
        "",
        "> A quote.",
        "",
        "```",
        "code()",
        "```",
        "",
        "::: primary",
        "The rule",
        "Body of the callout.",
        ":::",
      ].join("\n"),
    );

    expect(blocks.map((block) => block.type)).toEqual([
      "paragraph",
      "heading",
      "list",
      "quote",
      "code",
      "callout",
    ]);
  });

  it("compiles nothing but whitespace into no blocks, so the caller can refuse it", () => {
    expect(compileMarkdown("\n\n\n")).toEqual([]);
  });
});

describe("estimateReadingTimeMinutes", () => {
  it("is at least one minute, because the column forbids zero", () => {
    expect(estimateReadingTimeMinutes("")).toBe(1);
    expect(estimateReadingTimeMinutes("one two three")).toBe(1);
  });

  it("rounds up to whole minutes", () => {
    expect(estimateReadingTimeMinutes("word ".repeat(201))).toBe(2);
    expect(estimateReadingTimeMinutes("word ".repeat(400))).toBe(2);
    expect(estimateReadingTimeMinutes("word ".repeat(401))).toBe(3);
  });

  it("is capped at the ceiling the database enforces", () => {
    expect(estimateReadingTimeMinutes("word ".repeat(1_000_000))).toBe(120);
  });
});

describe("guards", () => {
  it("recognises exactly the three lifecycle states", () => {
    for (const status of ["draft", "published", "archived"]) {
      expect(isPostStatus(status)).toBe(true);
    }

    for (const value of ["deleted", "DRAFT", "", null, 3]) {
      expect(isPostStatus(value)).toBe(false);
    }
  });

  it("recognises exactly the published categories", () => {
    expect(isArticleCategory("ai-ml")).toBe(true);
    expect(isArticleCategory("blockchain")).toBe(false);
    expect(isArticleCategory(undefined)).toBe(false);
  });
});

describe("post projections", () => {
  const draft: PostDraft = {
    id: "6f1c9d2a-7b3e-4a51-9c6d-0e2f7a4b8d31",
    status: "draft",
    frontMatter: {
      title: "T",
      slug: "t",
      locale: "en-US",
      category: "leadership",
      excerpt: "E",
      tags: [],
      featured: false,
      publishedAt: "2026-06-18",
    },
    markdown: "Body that must not leak into a list payload.",
    createdAt: "2026-06-18T10:00:00.000Z",
    updatedAt: "2026-06-18T10:00:00.000Z",
  };

  it("drops the body while keeping every list field", () => {
    const summary = toPostSummary(draft);

    expect(summary).not.toHaveProperty("markdown");
    expect(Object.keys(summary).sort()).toEqual(
      ["createdAt", "frontMatter", "id", "status", "updatedAt"].sort(),
    );
  });

  it("shares the front-matter reference, so no needless copy is made", () => {
    expect(toPostSummary(draft).frontMatter).toBe(draft.frontMatter);
  });

  it("orders the CMS list by recency, then by title", () => {
    const base: PostSummary = toPostSummary(draft);
    const older = { ...base, updatedAt: "2026-01-01T00:00:00.000Z" };
    const alpha = { ...base, frontMatter: { ...base.frontMatter, title: "Alpha" } };
    const beta = { ...base, frontMatter: { ...base.frontMatter, title: "Beta" } };

    expect([older, base].sort(comparePostSummaries)).toEqual([base, older]);
    expect([beta, alpha].sort(comparePostSummaries)).toEqual([alpha, beta]);
    expect(comparePostSummaries(base, { ...base })).toBe(0);
  });
});
