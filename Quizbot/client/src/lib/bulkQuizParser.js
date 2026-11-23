export const BULK_QUIZ_TEMPLATE = `Q: Which Indus Valley Civilization site is famous for its tidal dockyard?
A) Harappa
B) Mohenjo-daro
C) Lothal
D) Kalibangan
ANS: C
EXP: Lothal in Gujarat had a well-engineered tidal dockyard connected to the Sabarmati river.

Q: Which Article of the Indian Constitution abolishes Untouchability?
A) Article 14
B) Article 15
C) Article 17
D) Article 21
ANS: C
EXP: Article 17 under Fundamental Rights explicitly abolishes untouchability.`;

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

/**
 * Parses bulk quiz text in the Quiz-Gram structured format:
 *
 * Q: Question text
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
 * @returns {{ quizzes: Array<{ question: string, options: string[], correctIndex: number, explanation: string }>, errors: Array<{ blockNumber: number, reason: string, snippet: string }> }}
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
            question: qText.slice(0, 300),
            options: opts,
            correctIndex: ansIdx,
            explanation: exp.slice(0, 400),
          });
        });
        return { quizzes, errors };
      }
    } catch {
      // Fall through to text parser
    }
  }

  // 2. Structured text format parser
  // Split blocks either by blank lines or before lines starting with "Q:" / "Q1:" / "Question:"
  const normalizedLines = trimmed.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let currentBlock = [];

  for (const rawLine of normalizedLines) {
    const line = rawLine.trim();
    if (!line) {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock);
        currentBlock = [];
      }
      continue;
    }

    const isNewQuestionHeader =
      /^(?:Q(?:\d+)?|QUESTION(?:\s*\d+)?)\s*[:.)\-]\s+/i.test(line);

    if (
      isNewQuestionHeader &&
      currentBlock.some((l) =>
        /^(?:\(?[A-D]\)|[A-D][.):\-])\s+/i.test(l)
      )
    ) {
      blocks.push(currentBlock);
      currentBlock = [line];
    } else {
      currentBlock.push(line);
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
    let currentSection = 'question';

    for (const line of lines) {
      // Check Question line: "Q: ..." or "Q1. ..." or "1. ..."
      const qMatch = line.match(
        /^(?:Q(?:\d+)?|QUESTION(?:\s*\d+)?|\d+)\s*[:.)\-]\s*(.+)$/i
      );
      if (qMatch && !question) {
        question = qMatch[1].trim();
        currentSection = 'question';
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
      const expMatch = line.match(/^(?:EXP|EXPLANATION|NOTE)\s*[:=\-]\s*(.+)$/i);
      if (expMatch) {
        explanation = expMatch[1].trim();
        currentSection = 'explanation';
        continue;
      }

      // Check Option line: "A) ..." / "A. ..." / "(A) ..." / "*C) ..."
      const optMatch = line.match(
        /^(\*)?\s*(?:\(([A-D])\)|([A-D])\s*[.):\-])\s*(.+)$/i
      );
      if (optMatch) {
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

      // Continuation line
      if (currentSection === 'question') {
        question = question ? `${question} ${line}` : line;
      } else if (currentSection === 'explanation') {
        explanation = explanation ? `${explanation} ${line}` : line;
      }
    }

    const snippet = (question || lines[0] || '').slice(0, 65);
    const options = [optionMap[0], optionMap[1], optionMap[2], optionMap[3]];

    if (!question) {
      errors.push({
        blockNumber,
        reason: 'Missing question line (start with "Q: Your question")',
        snippet,
      });
      return;
    }

    const missingLetters = ['A', 'B', 'C', 'D'].filter(
      (_, i) => !options[i]
    );
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
        reason: 'Missing right answer line (add "ANS: A", "ANS: B", "ANS: C", or "ANS: D")',
        snippet,
      });
      return;
    }

    if (question.length > 300) {
      errors.push({
        blockNumber,
        reason: `Question exceeds 300 characters (${question.length}/300)`,
        snippet,
      });
      return;
    }

    quizzes.push({
      question,
      options,
      correctIndex,
      explanation: explanation.slice(0, 400),
    });
  });

  return { quizzes, errors };
}
