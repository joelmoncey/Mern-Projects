export const VALID_VISUAL_TYPES = ['none', 'box', 'table', 'svg', 'image'];

const MAX_SVG_LENGTH = 8000;
const MAX_TABLE_LENGTH = 2500;
const MAX_IMAGE_URL_LENGTH = 600;

/**
 * Strips dangerous tags, attributes, and scriptable URIs from inline SVG strings
 * so creators can safely embed geometry/reasoning diagrams in bulk .txt uploads.
 *
 * @param {string} rawSvg
 * @returns {string}
 */
export function sanitizeSvg(rawSvg) {
  if (typeof rawSvg !== 'string') return '';
  const trimmed = rawSvg.trim();
  const match = trimmed.match(/<svg[\s\S]*?<\/svg>/i);
  if (!match) return '';

  let svg = match[0];

  // Remove dangerous block elements completely
  svg = svg.replace(
    /<\s*(script|foreignObject|iframe|object|embed|style|link|meta|base|applet|form|input|button|textarea|select|animate|animateTransform|animateMotion|set|use)\b[^>]*>[\s\S]*?<\/\s*\1\s*>/gi,
    ''
  );
  // Remove self-closing dangerous tags
  svg = svg.replace(
    /<\s*(script|foreignObject|iframe|object|embed|style|link|meta|base|applet|input|animate|animateTransform|animateMotion|set|use)\b[^>]*\/?>/gi,
    ''
  );
  // Strip inline event handler attributes (onload, onclick, onerror, etc.)
  svg = svg.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // Strip href / xlink:href attributes (prevents external fetches or javascript: URIs)
  svg = svg.replace(
    /\s+(?:xlink:)?href\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
    ''
  );
  // Strip javascript:, vbscript:, or data:text/html URIs anywhere
  svg = svg.replace(/(?:javascript|vbscript)\s*:/gi, '');
  svg = svg.replace(/data\s*:\s*text\/html/gi, '');

  if (svg.length > MAX_SVG_LENGTH) {
    return '';
  }

  return svg.trim();
}

/**
 * Cleans pipe-delimited BOX or TABLE text blocks (max 20 rows).
 *
 * @param {string} raw
 * @returns {string}
 */
export function sanitizeTableOrBox(raw) {
  if (typeof raw !== 'string') return '';
  const rows = raw
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 20);

  const joined = rows.join('\n').trim();
  if (!joined || joined.length > MAX_TABLE_LENGTH) {
    return joined.slice(0, MAX_TABLE_LENGTH);
  }
  return joined;
}

/**
 * Validates HTTP(S) image URLs for optional IMG: visuals.
 *
 * @param {string} rawUrl
 * @returns {string}
 */
export function sanitizeImageUrl(rawUrl) {
  if (typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > MAX_IMAGE_URL_LENGTH) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * Validates and sanitizes optional quiz visual fields ({ visualType, visualData }).
 *
 * @param {{ visualType?: string, visualData?: string }} input
 * @returns {{ visualType: string, visualData: string, error?: string }}
 */
export function validateAndSanitizeVisual({ visualType = 'none', visualData = '' } = {}) {
  const normalizedType = String(visualType || 'none').trim().toLowerCase();
  const rawData = typeof visualData === 'string' ? visualData.trim() : '';

  if (!rawData || normalizedType === 'none') {
    return { visualType: 'none', visualData: '' };
  }

  if (!VALID_VISUAL_TYPES.includes(normalizedType)) {
    return {
      visualType: 'none',
      visualData: '',
      error: `Invalid visualType "${visualType}". Use box, table, svg, or image.`,
    };
  }

  if (normalizedType === 'svg') {
    const clean = sanitizeSvg(rawData);
    if (!clean) {
      return {
        visualType: 'none',
        visualData: '',
        error: 'SVG drawing must be a valid <svg>...</svg> block under 8000 characters.',
      };
    }
    return { visualType: 'svg', visualData: clean };
  }

  if (normalizedType === 'box' || normalizedType === 'table') {
    const clean = sanitizeTableOrBox(rawData);
    if (!clean) {
      return {
        visualType: 'none',
        visualData: '',
        error: 'BOX / TABLE visual must contain at least one row.',
      };
    }
    return { visualType: normalizedType, visualData: clean };
  }

  if (normalizedType === 'image') {
    const clean = sanitizeImageUrl(rawData);
    if (!clean) {
      return {
        visualType: 'none',
        visualData: '',
        error: 'IMG visual must be a valid https:// or http:// image URL.',
      };
    }
    return { visualType: 'image', visualData: clean };
  }

  return { visualType: 'none', visualData: '' };
}
