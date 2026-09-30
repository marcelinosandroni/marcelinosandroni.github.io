import type { OgImageModel } from "@/domain/og/image";

/**
 * The visual frame every Open Graph card on this site is drawn with.
 *
 * Shared by the site-wide generator and the per-article generator on purpose: the
 * two differ only in the `OgImageModel` they are handed, so a card can never
 * drift away from its sibling by a colour or a padding value.
 *
 * ## No cover image, by design
 *
 * `BlogArticle` has no image field — see `src/domain/blog/article.ts`. There is
 * no artwork to lay in, and fetching one would mean a network request inside a
 * sandboxed renderer, which is exactly what an OG image must never do (a crawler
 * has a short timeout, and a failed fetch is a card that renders as a blank
 * rectangle). So the card is carried entirely by typography: a full-bleed
 * gradient ground, a heavy headline, and a category-coloured accent rule. That
 * reads as a deliberate editorial card rather than a missing image, and it costs
 * zero bytes of network at render time.
 *
 * ## Why the ground is always carbon
 *
 * The site has three themes, and this component cannot see which one is active:
 * an `og:image` is fetched by a crawler that never ran the theme bootstrap
 * script, so a card that adapted to the reader's theme would have no theme to
 * adapt to. The carbon ground is also the one that reads well on the white,
 * grey and black chrome of every social platform, so it is the right default for
 * every reader at once. The values are the carbon tokens from `globals.css`.
 *
 * ## Renderer constraints
 *
 * Satori supports a subset of CSS: flexbox, and a fixed list of properties. Every
 * value below is inline (a stylesheet never reaches this renderer), spacing is
 * done with margins rather than `gap`, and shadows, transforms and grid are
 * avoided. The result is that the same component is also safe to drop into a
 * browser for a visual check.
 */
export function OgImageFrame({ model }: { model: OgImageModel }) {
  const { size, monogram, siteName, host, kicker, title, subtitle, facts, accent } = model;

  return (
    <div
      style={{
        width: `${size.width}px`,
        height: `${size.height}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        // `linear-gradient` is the one background Satori rasterises; the three
        // stops are --color-surface-base, --color-surface-raised and
        // --color-surface-overlay.
        backgroundImage: "linear-gradient(135deg, #0a0d12 0%, #11151c 62%, #181e27 100%)",
        color: "#f4f1ea", // --color-text-primary
        padding: "56px 64px",
      }}
    >
      {/* Top rail: the wordmark and the person it belongs to. */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 34,
            letterSpacing: "-0.5px",
            color: "#f4f1ea",
          }}
        >
          {monogram}
          <span style={{ color: accent }}>.</span>
        </div>
        <div
          style={{
            marginLeft: 20,
            paddingLeft: 20,
            borderLeft: "2px solid #2d384b", // --color-border-prominent
            fontSize: 24,
            letterSpacing: "1px",
            color: "#94a3b8", // --color-text-secondary
          }}
        >
          {siteName}
        </div>
      </div>

      {/* Headline block. `flexGrow: 1` keeps it optically centred between the rails. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 64,
              height: 6,
              marginRight: 20,
              backgroundColor: accent,
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 24,
              letterSpacing: "4px",
              color: accent,
            }}
          >
            {kicker}
          </div>
        </div>

        {/*
          `lineHeight` is a unitless *multiplier* here, not a pixel value — the
          same convention as CSS. Satori follows that convention too, and a
          `lineHeight: 68` next to a `fontSize: 68` produces a 4424px line box
          that puts the headline outside the canvas entirely while still exiting
          zero. Multipliers are also why the two type sizes below can share one
          value: 1.12 of 68px and 1.12 of 60px stay in the same proportion.
        */}
        <div
          style={{
            display: "flex",
            fontSize: title.length > 56 ? 60 : 68,
            lineHeight: 1.12,
            letterSpacing: "-1.8px",
            color: "#f4f1ea",
          }}
        >
          {title}
        </div>

        {subtitle !== null && (
          <div
            style={{
              display: "flex",
              marginTop: 22,
              fontSize: 27,
              lineHeight: 1.4,
              color: "#94a3b8", // --color-text-secondary
            }}
          >
            {subtitle}
          </div>
        )}
      </div>

      {/* Fact row. Each fact is a plain string; the model already dropped the
          ones the article does not have, so an empty row is simply not drawn. */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            borderTop: "2px solid #1e2633", // --color-border-subtle
            paddingTop: 24,
            alignItems: "center",
          }}
        >
          {facts.map((fact, index) => (
            <div
              key={fact.id}
              style={{
                display: "flex",
                marginRight: index === facts.length - 1 ? 0 : 28,
                fontSize: 24,
                letterSpacing: "1.5px",
                color: fact.id === "published" ? "#f4f1ea" : "#56657a", // primary / muted
              }}
            >
              {fact.text}
            </div>
          ))}

          <div
            style={{
              display: "flex",
              marginLeft: "auto",
              fontSize: 24,
              letterSpacing: "1.5px",
              color: "#56657a", // --color-text-muted
            }}
          >
            {host}
          </div>
        </div>
      </div>
    </div>
  );
}
