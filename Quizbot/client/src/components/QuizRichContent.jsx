import { useMemo } from 'react';
import katex from 'katex';

/**
 * Client-side defense-in-depth SVG sanitizer (mirrors server/utils/quizVisuals.js).
 */
function sanitizeClientSvg(rawSvg) {
  if (typeof rawSvg !== 'string') return '';
  const match = rawSvg.trim().match(/<svg[\s\S]*?<\/svg>/i);
  if (!match) return '';
  let svg = match[0];
  svg = svg.replace(
    /<\s*(script|foreignObject|iframe|object|embed|style|link|meta|base|applet|form|input|button|textarea|select|animate|animateTransform|animateMotion|set|use)\b[^>]*>[\s\S]*?<\/\s*\1\s*>/gi,
    ''
  );
  svg = svg.replace(
    /<\s*(script|foreignObject|iframe|object|embed|style|link|meta|base|applet|input|animate|animateTransform|animateMotion|set|use)\b[^>]*\/?>/gi,
    ''
  );
  svg = svg.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  svg = svg.replace(
    /\s+(?:xlink:)?href\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
    ''
  );
  svg = svg.replace(/(?:javascript|vbscript)\s*:/gi, '');
  svg = svg.replace(/data\s*:\s*text\/html/gi, '');
  return svg.trim();
}

/**
 * Splits text into plain text segments and LaTeX math segments ($...$ and $$...$$).
 */
function tokenizeMath(text) {
  const str = String(text ?? '');
  if (!str.includes('$')) {
    return [{ type: 'text', value: str }];
  }

  const tokens = [];
  // Matches $$...$$ (display) or $...$ (inline, non-greedy, no unescaped leading/trailing spaces needed)
  const regex = /(\$\$[\s\S]+?\$\$|\$(?:\\\$|[^$\n])+?\$)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: str.slice(lastIndex, match.index) });
    }
    const raw = match[0];
    if (raw.startsWith('$$') && raw.endsWith('$$')) {
      tokens.push({
        type: 'math',
        display: true,
        value: raw.slice(2, -2).trim(),
      });
    } else {
      tokens.push({
        type: 'math',
        display: false,
        value: raw.slice(1, -1).trim(),
      });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < str.length) {
    tokens.push({ type: 'text', value: str.slice(lastIndex) });
  }

  return tokens;
}

/**
 * Renders text with inline ($...$) and block ($$...$$) LaTeX math powered by KaTeX.
 */
export function MathText({ text, className = '' }) {
  const renderedParts = useMemo(() => {
    const tokens = tokenizeMath(text);
    return tokens.map((tok, idx) => {
      if (tok.type === 'text') {
        return { key: idx, isMath: false, content: tok.value };
      }
      try {
        const html = katex.renderToString(tok.value, {
          displayMode: Boolean(tok.display),
          throwOnError: false,
          strict: false,
          trust: false,
        });
        return {
          key: idx,
          isMath: true,
          display: Boolean(tok.display),
          html,
        };
      } catch {
        return { key: idx, isMath: false, content: tok.value };
      }
    });
  }, [text]);

  return (
    <span className={`whitespace-pre-line ${className}`}>
      {renderedParts.map((part) =>
        part.isMath ? (
          <span
            key={part.key}
            className={
              part.display
                ? 'my-1.5 block overflow-x-auto text-center'
                : 'inline-block align-middle'
            }
            dangerouslySetInnerHTML={{ __html: part.html }}
          />
        ) : (
          <span key={part.key}>{part.content}</span>
        )
      )}
    </span>
  );
}

function parseRows(raw) {
  return String(raw || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      line
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => cell.trim())
    );
}

/**
 * Renders structured visual blocks attached to a quiz:
 * - 'box': Bordered missing-number / matrix grid box
 * - 'table': Match-the-following / DI table with header row
 * - 'svg': Sanitized inline vector drawing (geometry, Venn diagram, counting figures)
 * - 'image': External https:// diagram image
 */
export function QuizVisualBlock({
  visualType = 'none',
  visualData = '',
  compact = false,
}) {
  const type = String(visualType || 'none').toLowerCase();
  const data = String(visualData || '').trim();

  const safeSvg = useMemo(
    () => (type === 'svg' ? sanitizeClientSvg(data) : ''),
    [type, data]
  );

  const rows = useMemo(
    () => (type === 'box' || type === 'table' ? parseRows(data) : []),
    [type, data]
  );

  if (!data || type === 'none') return null;

  if (type === 'box' && rows.length > 0) {
    const colCount = Math.max(...rows.map((r) => r.length), 1);
    return (
      <div
        className={`flex justify-center overflow-x-auto ${compact ? 'my-1.5' : 'mt-2.5'}`}
      >
        <div
          className="inline-grid overflow-hidden rounded-xl border-2 border-slate-800 bg-slate-800 shadow-2xs"
          style={{
            gridTemplateColumns: `repeat(${colCount}, minmax(${compact ? '2.2rem' : '3.2rem'}, auto))`,
            gap: '1.5px',
          }}
        >
          {rows.flatMap((row, rIdx) =>
            Array.from({ length: colCount }).map((_, cIdx) => {
              const cell = row[cIdx] ?? '';
              const isMissingMarker = cell === '?' || cell === '___';
              return (
                <div
                  key={`${rIdx}-${cIdx}`}
                  className={`flex items-center justify-center text-center font-bold ${
                    compact ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2.5 text-sm'
                  } ${
                    isMissingMarker
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-white text-slate-900'
                  }`}
                >
                  <MathText text={cell} />
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  if (type === 'table' && rows.length > 0) {
    const [headerRow, ...bodyRows] = rows;
    const colCount = Math.max(...rows.map((r) => r.length), 1);
    return (
      <div
        className={`overflow-x-auto rounded-xl border border-slate-200 bg-white ${compact ? 'my-1.5' : 'mt-2.5'}`}
      >
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/90">
              {Array.from({ length: colCount }).map((_, cIdx) => (
                <th
                  key={cIdx}
                  className={`border-r border-slate-200 font-bold text-slate-800 last:border-r-0 ${
                    compact ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1.5 text-xs'
                  }`}
                >
                  <MathText text={headerRow[cIdx] ?? ''} />
                </th>
              ))}
            </tr>
          </thead>
          {bodyRows.length > 0 && (
            <tbody>
              {bodyRows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="border-b border-slate-100 odd:bg-white even:bg-slate-50/50 last:border-b-0"
                >
                  {Array.from({ length: colCount }).map((__, cIdx) => (
                    <td
                      key={cIdx}
                      className={`border-r border-slate-100 font-medium text-slate-700 last:border-r-0 ${
                        compact
                          ? 'px-2 py-1 text-[10px]'
                          : 'px-2.5 py-1.5 text-xs'
                      }`}
                    >
                      <MathText text={row[cIdx] ?? ''} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>
    );
  }

  if (type === 'svg' && safeSvg) {
    return (
      <div
        className={`flex items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70 ${
          compact
            ? 'my-1.5 p-2 [&_svg]:max-h-24 [&_svg]:w-auto [&_svg]:max-w-full'
            : 'mt-2.5 p-3 [&_svg]:max-h-44 [&_svg]:w-auto [&_svg]:max-w-full'
        }`}
        dangerouslySetInnerHTML={{ __html: safeSvg }}
      />
    );
  }

  if (type === 'image' && /^https?:\/\//i.test(data)) {
    return (
      <div
        className={`flex items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70 ${
          compact ? 'my-1.5 p-1.5' : 'mt-2.5 p-2'
        }`}
      >
        <img
          src={data}
          alt="Quiz diagram"
          loading="lazy"
          className={
            compact
              ? 'max-h-24 w-auto rounded-lg object-contain'
              : 'max-h-48 w-auto rounded-lg object-contain'
          }
        />
      </div>
    );
  }

  return null;
}
