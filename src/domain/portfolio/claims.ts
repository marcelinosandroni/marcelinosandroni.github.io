import type { Locale } from "@/domain/i18n";

/**
 * The career's headline numbers, defined once.
 *
 * ## Why this module exists
 *
 * The site, the resume data and the exported PDF are three renderings of one
 * career, and until now each of them carried its own copy of the figures. That
 * is how "100 million messages/day" and "10 million messages/day" ended up
 * describing the same system in two places, and how a period that was corrected
 * in one catalog stayed wrong in another.
 *
 * A portfolio whose whole argument is *"it refuses to lie"* cannot afford two
 * versions of a number. So the figures that appear in more than one surface live
 * here, with a unit and a scope, and everything else — copy, layout, emphasis —
 * is free to differ.
 *
 * ## What belongs here and what does not
 *
 * A number belongs here when **more than one surface quotes it**: the hero, a
 * KPI tile, the resume summary, the PDF, the Open Graph card. A number that only
 * ever appears inside one case study stays in that case study — hoisting all 96
 * case-study metrics into a central table would be a registry nobody could
 * review, and would put the copy under governance it does not need.
 *
 * ## Scope, not just value
 *
 * `messagesPerDay.total` and `messagesPerDay.rabbitmq` are both real and both
 * true — the RabbitMQ broker carried 10M/day while the pipeline it fed ingested
 * 100M/day. Presenting either without its scope is how the two drifted apart in
 * the first place, so every throughput claim here carries a `scope` string that
 * says which of the two is being quoted.
 */

export type ClaimUnit =
  | "brl-per-year"
  | "messages-per-day"
  | "duration"
  | "percent"
  | "multiplier"
  | "years"
  | "people"
  | "days"
  | "weeks";

/** One headline figure, with the scope that makes it defensible. */
export type Claim = {
  /** The figure, in its smallest honest unit. Not a display string. */
  readonly value: number;
  readonly unit: ClaimUnit;
  /**
   * What the figure counts. Rendered next to the number everywhere it appears,
   * because a bare "100M" is not a claim and "100M telemetry events/day across
   * the ingest pipeline" is.
   */
  readonly scope: string;
};

/**
 * The career's headline claims.
 *
 * The values here are the ones the rest of the site is allowed to quote. Changing
 * one changes every surface at once, which is the entire point — there is no
 * second place to forget.
 */
export const CAREER_CLAIMS = {
  /**
   * A public-sector contract rescued from cancellation at DGT.
   *
   * This is annual contract value preserved, not salary, not revenue the owner
   * personally produced, and not the company's revenue. The scope string says so
   * in every locale, because a number without that qualifier is the single
   * easiest thing on this site to over-read.
   */
  contractValueSaved: {
    value: 24_000_000,
    unit: "brl-per-year",
    scope: {
      "en-US": "annual contract value rescued from cancellation",
      "pt-BR": "valor anual de contrato resgatado do cancelamento",
    },
  } satisfies Claim,

  /**
   * Telemetry ingest across the DGT public-security pipelines.
   *
   * This is the total the platform processes. The broker number below is a
   * different measurement of a different hop, not a correction of this one.
   */
  messagesPerDay: {
    value: 100_000_000,
    unit: "messages-per-day",
    scope: {
      "en-US": "telemetry events ingested across the pipeline",
      "pt-BR": "eventos de telemetria ingeridos no pipeline",
    },
  } satisfies Claim,

  /** The RabbitMQ hop inside the system above. Quoted separately, never merged. */
  messagesPerDayBroker: {
    value: 10_000_000,
    unit: "messages-per-day",
    scope: {
      "en-US": "messages carried by the RabbitMQ messaging layer",
      "pt-BR": "mensagens carregadas pela camada de mensageria RabbitMQ",
    },
  } satisfies Claim,

  /** Dashboard query time before the MySQL → ClickHouse migration. */
  queryTimeBeforeSeconds: {
    value: 30,
    unit: "duration",
    scope: {
      "en-US": "dashboard query before the columnar migration",
      "pt-BR": "consulta de dashboard antes da migração colunar",
    },
  } satisfies Claim,

  queryTimeAfterMilliseconds: {
    value: 200,
    unit: "duration",
    scope: {
      "en-US": "dashboard query after the columnar migration",
      "pt-BR": "consulta de dashboard após a migração colunar",
    },
  } satisfies Claim,

  deployBeforeMinutes: {
    value: 240,
    unit: "duration",
    scope: {
      "en-US": "deploy duration before the delivery pipeline",
      "pt-BR": "duração do deploy antes do pipeline de entrega",
    },
  } satisfies Claim,

  deployAfterMinutes: {
    value: 15,
    unit: "duration",
    scope: {
      "en-US": "deploy duration after the delivery pipeline",
      "pt-BR": "duração do deploy após o pipeline de entrega",
    },
  } satisfies Claim,

  /** Years in corporate financial governance before engineering. */
  financeYears: {
    value: 15,
    unit: "years",
    scope: {
      "en-US": "years in corporate financial governance",
      "pt-BR": "anos de governança financeira corporativa",
    },
  } satisfies Claim,

  /** Years writing software, which is what the market actually prices. */
  engineeringYears: {
    value: 6,
    unit: "years",
    scope: {
      "en-US": "years writing software",
      "pt-BR": "anos escrevendo software",
    },
  } satisfies Claim,

  /** The team he held technical leadership over at DGT. */
  teamSizeDgt: {
    value: 10,
    unit: "people",
    scope: {
      "en-US": "people under technical leadership at DGT",
      "pt-BR": "pessoas sob liderança técnica na DGT",
    },
  } satisfies Claim,

  /** Critical defects closed inside the 48-hour mapping window. */
  criticalBugs48h: {
    value: 47,
    unit: "people",
    scope: {
      "en-US": "critical defects mapped and closed within 48 hours",
      "pt-BR": "defeitos críticos mapeados e fechados em 48 horas",
    },
  } satisfies Claim,

  /** Calendar time from taking over the failing contract to delivery. */
  rescueWeeks: {
    value: 6,
    unit: "weeks",
    scope: {
      "en-US": "weeks from takeover to delivered rescue",
      "pt-BR": "semanas da retomada à entrega do resgate",
    },
  } satisfies Claim,

  monthCloseBeforeDays: {
    value: 30,
    unit: "days",
    scope: {
      "en-US": "month-end close before automation",
      "pt-BR": "fechamento mensal antes da automação",
    },
  } satisfies Claim,

  monthCloseAfterDays: {
    value: 5,
    unit: "days",
    scope: {
      "en-US": "month-end close after automation",
      "pt-BR": "fechamento mensal após a automação",
    },
  } satisfies Claim,
} as const satisfies Record<string, Claim>;

export type CareerClaimId = keyof typeof CAREER_CLAIMS;

/** A claim resolved for one locale: the figure plus the sentence around it. */
export type LocalizedClaim = {
  readonly id: CareerClaimId;
  readonly value: number;
  readonly unit: ClaimUnit;
  readonly scope: string;
  /** The figure already formatted for display in this locale. */
  readonly display: string;
};

const LOCALE_NUMBER_FORMAT: Record<Locale, string> = {
  "en-US": "en-US",
  "pt-BR": "pt-BR",
};

/**
 * The claim's number as a reader should see it.
 *
 * `en-US` gets grouping separators because that is how a US reader parses a
 * large number. `pt-BR` does not, because Brazilian numeric convention omits the
 * separator and adding one reads as a formatting mistake rather than as
 * precision.
 */
export function formatClaimValue(value: number, locale: Locale): string {
  return new Intl.NumberFormat(LOCALE_NUMBER_FORMAT[locale], {
    maximumFractionDigits: 0,
    useGrouping: locale === "en-US",
  }).format(value);
}

/** The claim's number with its unit, e.g. `R$ 24M/yr` or `6 years`. */
export function formatClaimWithUnit(id: CareerClaimId, locale: Locale): string {
  const claim = CAREER_CLAIMS[id] as {
    value: number;
    unit: ClaimUnit;
  };
  const number = formatClaimValue(claim.value, locale);

  switch (claim.unit) {
    case "brl-per-year":
      return `R$ ${number}/yr`;
    case "messages-per-day":
      return `${number} msgs/day`;
    case "duration":
      return `${number}`;
    case "percent":
      return `${number}%`;
    case "multiplier":
      return `${number}x`;
    case "years":
      return `${number} ${locale === "en-US" ? "yrs" : "anos"}`;
    case "people":
      return `${number}`;
    case "days":
      return `${number} ${locale === "en-US" ? "days" : "dias"}`;
    case "weeks":
      return `${number} ${locale === "en-US" ? "weeks" : "semanas"}`;
  }
}

/** The claim resolved for a locale, ready to render. */
export function getClaim(id: CareerClaimId, locale: Locale): LocalizedClaim {
  const claim = CAREER_CLAIMS[id] as {
    value: number;
    unit: ClaimUnit;
    scope: Record<Locale, string>;
  };

  return {
    id,
    value: claim.value,
    unit: claim.unit,
    scope: claim.scope[locale],
    display: formatClaimWithUnit(id, locale),
  };
}

/** Every claim resolved for a locale, in declaration order. */
export function getAllClaims(locale: Locale): LocalizedClaim[] {
  return (Object.keys(CAREER_CLAIMS) as CareerClaimId[]).map((id) => getClaim(id, locale));
}

/**
 * The three figures the hero is allowed to lead with.
 *
 * Not the three largest. The three that answer the three questions a hiring
 * manager actually has — what did you protect, at what scale, and what did you
 * change — with no fourth number to dilute them.
 */
export const HERO_CLAIM_IDS = [
  "contractValueSaved",
  "messagesPerDay",
  "deployAfterMinutes",
] as const satisfies readonly CareerClaimId[];