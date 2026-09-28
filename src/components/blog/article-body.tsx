import type { ArticleBlock } from "@/domain/blog";

export interface ArticleBodyProps {
  blocks: ArticleBlock[];
}

/**
 * Renders a structured article body.
 *
 * Each block maps to one element with the correct typography from the design
 * system, which is exactly why the body is stored as typed blocks rather than
 * Markdown: no `dangerouslySetInnerHTML`, no runtime Markdown parser in the
 * bundle, and an unknown block type is a compile error instead of a hole in the
 * page.
 */
export function ArticleBody({ blocks }: ArticleBodyProps) {
  return (
    <div className="space-y-space-md">
      {blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </div>
  );
}

function Block({ block }: { block: ArticleBlock }) {
  switch (block.type) {
    case "paragraph":
      return (
        <p className="max-w-3xl font-body-lg text-body-lg text-text-secondary">{block.text}</p>
      );

    case "heading":
      return block.level === 2 ? (
        <h2 className="pt-space-lg font-headline-lg text-headline-lg text-text-primary">
          {block.text}
        </h2>
      ) : (
        <h3 className="pt-space-md font-headline-sm text-headline-sm text-text-primary">
          {block.text}
        </h3>
      );

    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag
          className={`max-w-3xl space-y-space-sm pl-space-lg font-body-md text-body-md text-text-secondary marker:text-primary-container ${
            block.ordered ? "list-decimal" : "list-disc"
          }`}
        >
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </Tag>
      );
    }

    case "quote":
      return (
        <figure className="max-w-3xl border-l-2 border-primary-container py-space-xs pl-space-lg">
          <blockquote className="font-editorial-quote text-editorial-quote italic text-text-primary">
            {block.text}
          </blockquote>
          {block.attribution ? (
            <figcaption className="mt-space-xs font-label-mono text-label-mono text-text-muted">
              — {block.attribution}
            </figcaption>
          ) : null}
        </figure>
      );

    case "code":
      return (
        <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface-base">
          <p className="border-b border-border-subtle bg-surface-overlay px-space-md py-space-xs font-label-mono text-label-mono uppercase text-text-muted">
            {block.language}
          </p>
          <pre className="overflow-x-auto p-space-md">
            <code className="font-code-inline text-code-inline text-text-secondary">
              {block.code}
            </code>
          </pre>
        </div>
      );

    case "callout":
      return (
        <aside
          className={`max-w-3xl rounded-lg border p-space-lg ${
            block.tone === "primary"
              ? "border-primary-container/40 bg-primary-container/8"
              : "border-secondary/40 bg-secondary/8"
          }`}
        >
          <p
            className={`font-label-mono text-label-mono uppercase ${
              block.tone === "primary" ? "text-primary-container" : "text-secondary"
            }`}
          >
            {block.title}
          </p>
          <p className="mt-space-sm font-body-md text-body-md text-text-secondary">{block.text}</p>
        </aside>
      );
  }
}
