import type { ArticleBlock } from "@/domain/blog";

/**
 * Markdown → `ArticleBlock[]`.
 *
 * ## The one rule: this is not an HTML renderer
 *
 * There is no HTML anywhere in the output. Every block is a plain object of
 * strings, and `ArticleBody` renders it as React children, which escape whatever
 * they are given. So `<script>alert(1)</script>` written by the owner is not
 * sanitised — it is *structurally impossible to execute*, because the string
 * never becomes markup. It survives as visible text, exactly as it would in
 * any Markdown viewer with raw HTML disabled, and that is the honest outcome:
 * silently deleting what somebody typed is worse than showing it inert.
 *
 * This is why no sanitiser library is a dependency. A sanitiser is the right
 * tool when the output is an HTML string; adding one here would imply the
 * output *is* an HTML string, which it is not, and would leave the real
 * invariant — "the compiler emits data, never markup" — undocumented and
 * therefore undefended.
 *
 * ## The grammar, in full
 *
 * A deliberately small subset, chosen so that everything it accepts maps onto
 * one variant of `ArticleBlock` and nothing is silently dropped:
 *
 * | Source | Block |
 * | --- | --- |
 * | `## Heading` / `# Heading` | `heading` level 2 |
 * | `### Heading` | `heading` level 3 |
 * | `- item` / `* item` | `list`, unordered |
 * | `1. item` | `list`, ordered |
 * | `> line` | `quote` |
 * | `> — Name` (last line of a quote) | the quote's `attribution` |
 * | ` ```lang ` … ` ``` ` | `code` |
 * | `::: primary` / `::: secondary` … `:::` | `callout` |
 * | anything else | `paragraph` |
 *
 * A single `#` is a level-2 heading because the page already owns the `<h1>`:
 * `ArticlePage` renders the title as an `h1` and a document that also produced
 * one would give the page two.
 *
 * ## What is not supported, and why that is a feature
 *
 * No inline emphasis, no links, no images, no tables, no raw HTML, no
 * footnotes. The reason is not caution — it is that `ArticleBlock` has no inline
 * node type. An `emphasis` or a `link` variant would be a change to the article
 * contract the seeded catalog, the PDF renderer and the copilot corpus are all
 * written against, and this module does not get to make that call.
 *
 * So `**bold**` is kept as literal asterisks rather than stripped. Stripping
 * would lose the author's intent with no trace; keeping it shows them, on the
 * rendered page and in the live preview, that the syntax is not supported. The
 * same applies to `[text](url)`: a link is a security decision (where do
 * outbound links go, do they get `rel="noopener"`, is a `javascript:` target
 * possible) and the design system has no answer for one yet.
 */

const FENCE = "```";
const CALLOUT_FENCE = ":::";
const QUOTE_ATTRIBUTION = /^—\s*(.+)$/;

const UNORDERED_ITEM = /^[-*]\s+(.*)$/;
const ORDERED_ITEM = /^\d+[.)]\s+(.*)$/;
const HEADING = /^(#{1,6})\s+(.*)$/;

/** Every line a Markdown document can contain, once CRLF is normalised away. */
function toLines(markdown: string): string[] {
  return markdown.replace(/\r\n/g, "\n").split("\n");
}

/** Block-level fences need no inline parsing, so the text is taken verbatim. */
function verbatim(lines: string[]): string {
  return lines.join("\n").replace(/\s+$/, "");
}

/** Prose is reflowed onto one line, the way Markdown itself renders a paragraph. */
function prose(lines: string[]): string {
  return lines.map((line) => line.trim()).filter(Boolean).join(" ").trim();
}

/**
 * Compiles a Markdown body into article blocks.
 *
 * A body with no recognised block throws, because `blog_articles.body` carries
 * `jsonb_array_length(body) > 0` and an empty array is a write that fails for a
 * reason the owner cannot act on. `readPostInput` already refuses an empty body
 * in the document; this is the same rule restated at the layer that would
 * otherwise be the one to discover it.
 */
export function compileMarkdown(markdown: string): ArticleBlock[] {
  const lines = toLines(markdown);
  const blocks: ArticleBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (trimmed === "") {
      index += 1;
      continue;
    }

    if (trimmed.startsWith(FENCE)) {
      const code = readFenced(lines, index, FENCE, trimmed.slice(FENCE.length).trim());
      blocks.push({ type: "code", language: code.language || "text", code: code.body });
      index = code.next;
      continue;
    }

    if (trimmed.startsWith(CALLOUT_FENCE)) {
      const callout = readFenced(lines, index, CALLOUT_FENCE, trimmed.slice(CALLOUT_FENCE.length).trim());
      blocks.push(toCallout(callout));
      index = callout.next;
      continue;
    }

    const heading = HEADING.exec(trimmed);

    if (heading) {
      // `##` is level 2, `###` is level 3, and `#` folds to 2 with the article's
      // title already occupying the `h1`. Six hashes is a level the block union
      // does not have, so it clamps rather than failing the whole document.
      const level = Math.min(Math.max(heading[1].length, 2), 3) as 2 | 3;
      blocks.push({ type: "heading", level, text: heading[2].trim() });
      index += 1;
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quote = readQuote(lines, index);
      blocks.push(quote.block);
      index = quote.next;
      continue;
    }

    if (UNORDERED_ITEM.test(trimmed) || ORDERED_ITEM.test(trimmed)) {
      const list = readList(lines, index);
      blocks.push(list.block);
      index = list.next;
      continue;
    }

    const paragraph = readParagraph(lines, index);
    blocks.push(paragraph.block);
    index = paragraph.next;
  }

  return blocks;
}

/** Reads a fenced region, returning its body and the index just past the fence. */
function readFenced(
  lines: string[],
  start: number,
  fence: string,
  info: string,
): { language: string; body: string; next: number } {
  const body: string[] = [];
  let index = start + 1;

  while (index < lines.length && lines[index].trim() !== fence) {
    body.push(lines[index]);
    index += 1;
  }

  return {
    // Only the first word is the language. A fence line like ```json title=x
    // should not put `title=x` in the label the article renders.
    language: info.split(/\s+/)[0] ?? "",
    body: verbatim(body),
    // An unterminated fence consumes the rest of the document rather than
    // failing: the author is mid-edit, and losing the tail silently is worse
    // than rendering it as code.
    next: Math.min(index + 1, lines.length),
  };
}

/**
 * A callout is a tone on the fence line, then a title, then prose.
 *
 * The title has to be the first line, so the layout matches what `ArticleBody`
 * draws: a small uppercase label above a paragraph. An empty title falls back to
 * the tone name rather than rendering a blank label, which would read as a
 * rendering bug.
 */
function toCallout(fenced: { language: string; body: string; next: number }): ArticleBlock {
  const tone: "primary" | "secondary" = fenced.language === "secondary" ? "secondary" : "primary";
  const [firstLine = "", ...rest] = fenced.body.split("\n");

  return {
    type: "callout",
    tone,
    title: firstLine.trim() === "" ? tone : firstLine.trim(),
    text: prose(rest),
  };
}

function readQuote(
  lines: string[],
  start: number,
): { block: ArticleBlock; next: number } {
  const quoted: string[] = [];
  let index = start;

  while (index < lines.length && lines[index].trim().startsWith(">")) {
    quoted.push(lines[index].trim().replace(/^>\s?/, ""));
    index += 1;
  }

  /*
   * A trailing `— Name` is the attribution, and only the last line can be one.
   * Recognising it anywhere else would silently swallow a sentence that happens
   * to start with an em dash, which is a real way to write.
   */
  const last = quoted.length - 1;
  const match = last >= 0 ? QUOTE_ATTRIBUTION.exec(quoted[last]) : null;

  const text = (match ? quoted.slice(0, last) : quoted).filter(Boolean).join(" ").trim();
  const attribution = match?.[1]?.trim();

  return {
    block: attribution === undefined || attribution === ""
      ? { type: "quote", text }
      : { type: "quote", text, attribution },
    next: index,
  };
}

function readList(
  lines: string[],
  start: number,
): { block: ArticleBlock; next: number } {
  const first = lines[start].trim();
  const ordered = ORDERED_ITEM.test(first);
  const items: string[] = [];
  let index = start;

  while (index < lines.length) {
    const trimmed = lines[index].trim();
    const match = UNORDERED_ITEM.exec(trimmed) ?? ORDERED_ITEM.exec(trimmed);

    if (match === null) {
      break;
    }

    items.push(match[1].trim());
    index += 1;
  }

  return { block: { type: "list", ordered, items }, next: index };
}

/** A paragraph runs to the first blank line or the first other block marker. */
function readParagraph(
  lines: string[],
  start: number,
): { block: ArticleBlock; next: number } {
  const collected: string[] = [];
  let index = start;

  while (index < lines.length) {
    const trimmed = lines[index].trim();

    if (trimmed === "" || startsNewBlock(trimmed)) {
      break;
    }

    collected.push(trimmed);
    index += 1;
  }

  return { block: { type: "paragraph", text: prose(collected) }, next: index };
}

/**
 * Whether a line begins a block other than a paragraph.
 *
 * Needed because a paragraph's run has to stop at a heading, fence, quote or
 * list. Without it, `Some prose` followed by `## A heading` would be one
 * paragraph whose text contains a literal `##`.
 */
function startsNewBlock(trimmed: string): boolean {
  return (
    trimmed.startsWith(FENCE) ||
    trimmed.startsWith(CALLOUT_FENCE) ||
    trimmed.startsWith(">") ||
    HEADING.test(trimmed) ||
    UNORDERED_ITEM.test(trimmed) ||
    ORDERED_ITEM.test(trimmed)
  );
}
