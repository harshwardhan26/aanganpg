import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Resolves a file under `public/` to its URL path, or null when it is not there.
 *
 * The landing page is designed around photographs we have not all shot yet.
 * Rather than shipping broken <img> requests or a stock-photo fallback, every
 * decorative slot asks for its file and renders a styled gradient when the
 * answer is null. Dropping the JPEG into `public/images/` is the whole
 * deploy step.
 *
 * Server components only: this touches the filesystem at render time.
 */
export function publicImage(file: string): string | null {
  return existsSync(join(process.cwd(), 'public', file)) ? `/${file}` : null;
}
