export type MessageValues = Readonly<Record<string, string | number>>;

const PLACEHOLDER_PATTERN = /\{(\w+)\}/g;

/**
 * Substitutes `{placeholder}` tokens in a catalog message.
 *
 * Unknown placeholders are intentionally left untouched so a missing value
 * surfaces in the UI instead of silently rendering an empty gap.
 */
export function formatMessage(template: string, values: MessageValues = {}): string {
  return template.replace(PLACEHOLDER_PATTERN, (token, key: string) => {
    const value = values[key];
    return value === undefined ? token : String(value);
  });
}
