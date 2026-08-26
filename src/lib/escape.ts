/**
 * Escaping for the two places this app hands structured text to something that
 * will execute it.
 *
 * Pure string work, so `scripts/selfcheck.ts` can assert both without a browser
 * or a spreadsheet.
 */

/**
 * One CSV field, safe to open in Excel.
 *
 * Quote-doubling alone is not enough. A spreadsheet treats a cell beginning `=`,
 * `+`, `-` or `@` as a formula, so an owner name of `=cmd|'/c calc'!A1` runs on
 * whoever opens the export — us, on our own laptop, from our own admin panel.
 * A leading apostrophe makes it text again. Tab and carriage return lead the
 * same way in some locales, so they get the same treatment.
 */
export function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';

  const raw = String(value);
  const dangerous = /^[=+\-@\t\r]/.test(raw);
  const escaped = (dangerous ? `'${raw}` : raw).replace(/"/g, '""');

  return `"${escaped}"`;
}

/**
 * JSON destined for a `<script type="application/ld+json">` block.
 *
 * `JSON.stringify` escapes quotes and backslashes but not `<`, so any string
 * that reaches it containing `</script>` closes the tag early and everything
 * after it is parsed as HTML. Escaping the `<` itself is enough — `<` is
 * still a `<` to the JSON parser reading the block, and no longer a tag opener
 * to the HTML parser that gets there first.
 */
export function jsonLdScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
