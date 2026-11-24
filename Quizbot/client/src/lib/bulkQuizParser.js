export const BULK_QUIZ_TEMPLATE = `Q: If $x + \\frac{1}{x} = 5$, find the value of $x^2 + \\frac{1}{x^2}$:
A) $23$
B) $25$
C) $27$
D) $21$
ANS: A
EXP: Using $(x + \\frac{1}{x})^2 = x^2 + \\frac{1}{x^2} + 2 \\implies x^2 + \\frac{1}{x^2} = 25 - 2 = 23$.

Q: Find the missing number (?) in the box below:
BOX:
4 | 9 | 2
3 | 5 | 7
8 | 1 | ?
A) 6
B) 9
C) 4
D) 5
ANS: A
EXP: Every row sums to 15 ($4+9+2=15$, $3+5+7=15$, so $8+1+6=15$).

Q: In $\\triangle ABC$ below, if $AB = AC$ and $\\angle A = 60^\\circ$, find $\\angle B$:
SVG: <svg viewBox="0 0 180 120"><polygon points="90,18 30,104 150,104" fill="#f8fafc" stroke="#0f172a" stroke-width="2.2"/><text x="85" y="13" font-size="12" font-weight="bold" fill="#0f172a">A</text><text x="16" y="110" font-size="12" font-weight="bold" fill="#0f172a">B</text><text x="155" y="110" font-size="12" font-weight="bold" fill="#0f172a">C</text><text x="80" y="42" font-size="10" fill="#059669">60°</text></svg>
A) $45^\\circ$
B) $60^\\circ$
C) $90^\\circ$
D) $30^\\circ$
ANS: B
EXP: Since $AB = AC$, $\\angle B = \\angle C = \\frac{180^\\circ - 60^\\circ}{2} = 60^\\circ$.

Q: Match List-I (Harappan Site) with List-II (River):
TABLE:
List-I (Site) | List-II (River)
1. Harappa | a. Bhogava
2. Lothal | b. Ravi
3. Kalibangan | c. Ghaggar
A) 1-b, 2-a, 3-c
B) 1-a, 2-b, 3-c
C) 1-c, 2-a, 3-b
D) 1-b, 2-c, 3-a
ANS: A
EXP: Harappa is on the Ravi, Lothal on the Bhogava, and Kalibangan on the Ghaggar.`;

function parseAnswerToken(raw) {
  if (raw === undefined || raw === null) return null;
  const cleaned = String(raw)
    .trim()
    .toUpperCase()
    .replace(/^OPTION\s+/i, '')
    .replace(/^[(\[]|[)\].]$/g, '')
    .trim();

  if (cleaned === 'A' || cleaned === '1') return 0;
  if (cleaned === 'B' || cleaned === '2') return 1;
  if (cleaned === 'C' || cleaned === '3') return 2;
  if (cleaned === 'D' || cleaned === '4') return 3;
  return null;
}

function normalizeJsonVisual(item) {
  if (!item || typeof item !== 'object') {
    return { visualType: 'none', visualData: '' };
  }
  if (item.visualType && item.visualData) {
    return {
      visualType: String(item.visualType).trim().toLowerCase(),
      visualData: String(item.visualData).trim(),
    };
  }
  if (item.svg || item.drawing) {
    return {
      visualType: 'svg',
      visualData: String(item.svg || item.drawing).trim(),
    };
  }
  if (item.box) {
    const data = Array.isArray(item.box)
      ? item.box.map((r) => (Array.isArray(r) ? r.join(' | ') : String(r))).join('\n')
      : String(item.box);
    return { visualType: 'box', visualData: data.trim() };
  }
  if (item.table) {
    const data = Array.isArray(item.table)
      ? item.table.map((r) => (Array.isArray(r) ? r.join(' | ') : String(r))).join('\n')
      : String(item.table);
    return { visualType: 'table', visualData: data.trim() };
  }
  if (item.img || item.image || item.imageUrl) {
    return {
      visualType: 'image',
      visualData: String(item.img || item.image || item.imageUrl).trim(),
    };
  }
  return { visualType: 'none', visualData: '' };
}

/**
 * Parses bulk quiz text in the Quiz-Gram structured .txt format:
 *
 * Q: Question text (supports inline LaTeX maths with $...$ and $$...$$)
 * BOX: (optional grid box, pipe-separated rows)
 * TABLE: (optional header table, pipe-separated rows)
 * SVG: (optional inline <svg>...</svg> drawing, single or multi-line)
 * IMG: (optional https:// image URL)
 * A) Option A
 * B) Option B
 * C) Option C
 * D) Option D
 * ANS: C
 * EXP: Optional explanation
 *
 * Also supports JSON arrays of quiz objects.
 *
 * @param {string} rawText
 * @returns {{ quizzes: Array<{ question: string, visualType: string, visualData: string, options: string[], correctIndex: number, explanation: string }>, errors: Array<{ blockNumber: number, reason: string, snippet: string }> }}
 */
export function parseBulkQuizzesText(rawText) {
  const trimmed = String(rawText || '').trim();
  if (!trimmed) {
    return { quizzes: [], errors: [] };
  }

  // 1. Support JSON array format if creator pastes JSON
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const quizzes = [];
        const errors = [];
        parsed.forEach((item, idx) => {
          const qText = String(item?.question || '').trim();
          const opts = Array.isArray(item?.options)
            ? item.options.map((o) => String(o || '').trim()).filter(Boolean)
            : [];
          const ansIdx =
            typeof item?.correctIndex === 'number' &&
            item.correctIndex >= 0 &&
            item.correctIndex <= 3
              ? item.correctIndex
              : parseAnswerToken(item?.answer ?? item?.ans ?? item?.right);
          const exp = String(item?.explanation || item?.exp || '').trim();
          const { visualType, visualData } = normalizeJsonVisual(item);

          if (!qText) {
            errors.push({
              blockNumber: idx + 1,
              reason: 'Missing question text',
              snippet: JSON.stringify(item).slice(0, 60),
            });
            return;
          }
          if (opts.length !== 4) {
            errors.push({
              blockNumber: idx + 1,
              reason: 'Exactly 4 options are required',
              snippet: qText.slice(0, 60),
            });
            return;
          }
          if (ansIdx === null) {
            errors.push({
              blockNumber: idx + 1,
              reason: 'Missing valid answer (A, B, C, or D)',
              snippet: qText.slice(0, 60),
            });
            return;
          }

          quizzes.push({
            question: qText.slice(0, 3000),
            visualType,
            visualData,
            options: opts,
            correctIndex: ansIdx,
            explanation: exp.slice(0, 2000),
          });
        });
        return { quizzes, errors };
      }
    } catch {
      // Fall through to text parser
    }
  }

  // 2. Structured .txt format parser
  // Split blocks either by blank lines (when not inside an unclosed <svg>) or before lines starting with "Q:" / "Q1:" / "Question:"
  const normalizedLines = trimmed.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let currentBlock = [];
  let insideOpenSvg = false;

  for (const rawLine of normalizedLines) {
    const line = rawLine.trim();

    if (/<svg\b/i.test(line) && !/<\/svg>/i.test(line)) {
      insideOpenSvg = true;
    }

    if (!line) {
      if (!insideOpenSvg && currentBlock.length > 0) {
        blocks.push(currentBlock);
        currentBlock = [];
      }
      continue;
    }

    const isNewQuestionHeader =
      /^(?:Q(?:\d+)?|QUESTION(?:\s*\d+)?)\s*[:.)\-]\s+/i.test(line);

    if (
      !insideOpenSvg &&
      isNewQuestionHeader &&
      currentBlock.some((l) => /^(?:\(?[A-D]\)|[A-D][.):\-])\s+/i.test(l))
    ) {
      blocks.push(currentBlock);
      currentBlock = [line];
    } else {
      currentBlock.push(line);
    }

    if (/<\/svg>/i.test(line)) {
      insideOpenSvg = false;
    }
  }
  if (currentBlock.length > 0) {
    blocks.push(currentBlock);
  }

  const quizzes = [];
  const errors = [];

  blocks.forEach((lines, idx) => {
    const blockNumber = idx + 1;
    let question = '';
    const optionMap = { 0: '', 1: '', 2: '', 3: '' };
    let correctIndex = null;
    let explanation = '';
    let visualType = 'none';
    const visualLines = [];
    let currentSection = 'question';

    for (const line of lines) {
      // Check explicit visual directive headers: BOX:, TABLE:, SVG:/DRAW:, IMG:/IMAGE:
      const boxMatch = line.match(/^(?:BOX|GRID|MATRIX)\s*:\s*(.*)$/i);
      if (boxMatch) {
        visualType = 'box';
        visualLines.length = 0;
        if (boxMatch[1].trim()) visualLines.push(boxMatch[1].trim());
        currentSection = 'box';
        continue;
      }

      const tableMatch = line.match(/^TABLE\s*:\s*(.*)$/i);
      if (tableMatch) {
        visualType = 'table';
        visualLines.length = 0;
        if (tableMatch[1].trim()) visualLines.push(tableMatch[1].trim());
        currentSection = 'table';
        continue;
      }

      const svgMatch = line.match(/^(?:SVG|DRAW|DIAGRAM)\s*:\s*(.*)$/i);
      if (svgMatch) {
        visualType = 'svg';
        visualLines.length = 0;
        const inlineSvg = svgMatch[1].trim();
        if (inlineSvg) visualLines.push(inlineSvg);
        currentSection = /<\/svg>/i.test(inlineSvg) ? 'after_svg' : 'svg';
        continue;
      }

      const imgMatch = line.match(/^(?:IMG|IMAGE|IMAGE_URL)\s*:\s*(.+)$/i);
      if (imgMatch) {
        visualType = 'image';
        visualLines.length = 0;
        visualLines.push(imgMatch[1].trim());
        currentSection = 'image';
        continue;
      }

      // Check Answer line: "ANS: C" / "ANSWER: B" / "RIGHT: D" / "CORRECT: A"
      const ansMatch = line.match(
        /^(?:ANS|ANSWER|RIGHT|CORRECT(?:\s*ANSWER)?)\s*[:=\-]\s*(.+)$/i
      );
      if (ansMatch) {
        const parsedAns = parseAnswerToken(ansMatch[1]);
        if (parsedAns !== null) {
          correctIndex = parsedAns;
        }
        currentSection = 'answer';
        continue;
      }

      // Check Explanation line: "EXP: ..." / "EXPLANATION: ..."
      const expMatch = line.match(
        /^(?:EXP|EXPLANATION|NOTE)\s*[:=\-]\s*(.+)$/i
      );
      if (expMatch) {
        explanation = expMatch[1].trim();
        currentSection = 'explanation';
        continue;
      }

      // Check Option line: "A) ..." / "A. ..." / "(A) ..." / "*C) ..."
      // Note: Do not match pipe-delimited TABLE/BOX rows (e.g. "A. Something | B. Other")
      const isPipeRowInVisual =
        (currentSection === 'box' || currentSection === 'table') &&
        line.includes('|');
      const optMatch = !isPipeRowInVisual
        ? line.match(
            /^(\*)?\s*(?:\(([A-D])\)|([A-D])\s*[.):\-])\s*(.+)$/i
          )
        : null;

      if (optMatch && currentSection !== 'svg') {
        const hasStar = Boolean(optMatch[1]);
        const letter = (optMatch[2] || optMatch[3]).toUpperCase();
        const optIdx = letter.charCodeAt(0) - 65;
        let optText = optMatch[4].trim();

        if (optText.endsWith('*') || /\[(?:RIGHT|CORRECT)\]$/i.test(optText)) {
          optText = optText
            .replace(/\*+$/, '')
            .replace(/\[(?:RIGHT|CORRECT)\]$/i, '')
            .trim();
          correctIndex = optIdx;
        } else if (hasStar) {
          correctIndex = optIdx;
        }

        optionMap[optIdx] = optText;
        currentSection = `opt_${optIdx}`;
        continue;
      }

      // Check Question line: "Q: ..." or "Q1. ..." or "1. ..." (only if question hasn't been set yet)
      const qMatch = !question
        ? line.match(
            /^(?:Q(?:\d+)?|QUESTION(?:\s*\d+)?|\d+)\s*[:.)\-]\s*(.+)$/i
          )
        : null;
      if (qMatch) {
        question = qMatch[1].trim();
        currentSection = 'question';
        continue;
      }

      // Continuation lines by active section
      if (currentSection === 'box' || currentSection === 'table') {
        visualLines.push(line);
      } else if (currentSection === 'svg') {
        visualLines.push(line);
        if (/<\/svg>/i.test(line)) {
          currentSection = 'after_svg';
        }
      } else if (currentSection === 'question') {
        // Also support raw inline <svg> directly after Q: without typing "SVG:"
        if (/^<svg\b/i.test(line)) {
          visualType = 'svg';
          visualLines.push(line);
          currentSection = /<\/svg>/i.test(line) ? 'after_svg' : 'svg';
        } else {
          question = question ? `${question}\n${line}` : line;
        }
      } else if (currentSection === 'explanation') {
        explanation = explanation ? `${explanation} ${line}` : line;
      }
    }

    const snippet = (question || lines[0] || '').slice(0, 65);
    const options = [optionMap[0], optionMap[1], optionMap[2], optionMap[3]];
    const visualData =
      visualType === 'svg'
        ? visualLines.join(' ').trim()
        : visualLines.join('\n').trim();

    if (!question) {
      errors.push({
        blockNumber,
        reason: 'Missing question line (start with "Q: Your question")',
        snippet,
      });
      return;
    }

    const missingLetters = ['A', 'B', 'C', 'D'].filter((_, i) => !options[i]);
    if (missingLetters.length > 0) {
      errors.push({
        blockNumber,
        reason: `Missing option(s): ${missingLetters.join(', ')} (use "A) ...", "B) ...", "C) ...", "D) ...")`,
        snippet,
      });
      return;
    }

    if (correctIndex === null) {
      errors.push({
        blockNumber,
        reason:
          'Missing right answer line (add "ANS: A", "ANS: B", "ANS: C", or "ANS: D")',
        snippet,
      });
      return;
    }

    if (question.length > 3000) {
      errors.push({
        blockNumber,
        reason: `Question exceeds 3000 characters (${question.length}/3000)`,
        snippet,
      });
      return;
    }

    if (visualType === 'svg' && (!/<svg\b/i.test(visualData) || !/<\/svg>/i.test(visualData))) {
      errors.push({
        blockNumber,
        reason: 'SVG drawing must include a complete <svg>...</svg> tag',
        snippet,
      });
      return;
    }

    if (visualType === 'image' && !/^https?:\/\//i.test(visualData)) {
      errors.push({
        blockNumber,
        reason: 'IMG visual must be a valid https:// or http:// URL',
        snippet,
      });
      return;
    }

    quizzes.push({
      question,
      visualType: visualData ? visualType : 'none',
      visualData,
      options,
      correctIndex,
      explanation: explanation.slice(0, 2000),
    });
  });

  return { quizzes, errors };
}
