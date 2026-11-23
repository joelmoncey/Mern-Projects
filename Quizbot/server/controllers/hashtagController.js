import mongoose from 'mongoose';
import Hashtag from '../models/Hashtag.js';
import Quiz from '../models/Quiz.js';
import Notification from '../models/Notification.js';
import {
  CACHE_KEYS,
  getCache,
  setCache,
  invalidateHashtagsCache,
  invalidateLeaderboardCache,
} from '../utils/cache.js';
import {
  ALL_OFFICIAL_TAXONOMY_PRESET,
  SSC_TAXONOMY_PRESET,
  UPSC_RRB_TAXONOMY_PRESET,
  normalizeEnglishTopicLabel,
} from '../utils/sscTaxonomySeed.js';

const HASHTAGS_TTL_SECONDS = 300; // 5 minutes

export function parseStringArray(raw) {
  if (!raw) return [];
  const parts = Array.isArray(raw)
    ? raw.flatMap((entry) => String(entry || '').split(','))
    : String(raw).split(',');
  return Array.from(
    new Set(
      parts
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );
}

function normalizeLanguagesList(raw) {
  const cleaned = parseStringArray(raw);
  return cleaned.length > 0 ? cleaned : ['English'];
}

function buildDefaultTag({
  examName,
  subExams = [],
  subjectName,
  subSubjectName,
  subTopicName,
}) {
  const subExamPart =
    Array.isArray(subExams) && subExams.length === 1 ? subExams[0] : '';
  return [examName, subExamPart, subjectName, subSubjectName, subTopicName]
    .map((part) =>
      String(part || '')
        .trim()
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toUpperCase()
    )
    .filter(Boolean)
    .join('_');
}

export async function getHashtags(req, res, next) {
  try {
    const includeInactive =
      req.query.includeInactive === 'true' && req.user?.role === 'admin';

    const cacheKey = includeInactive
      ? CACHE_KEYS.HASHTAGS_ALL
      : CACHE_KEYS.HASHTAGS_ACTIVE;

    const cached = getCache(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const filter = includeInactive ? {} : { isActive: true };

    const rawHashtags = await Hashtag.find(filter)
      .sort({
        examName: 1,
        subjectName: 1,
        subSubjectName: 1,
        subTopicName: 1,
      })
      .lean();

    const legacyUpdates = [];

    const hashtags = rawHashtags.map((item) => {
      const normalizedSubExams = Array.from(
        new Set([
          ...parseStringArray(item.subExams),
          ...parseStringArray(item.subExamName),
        ])
      );
      const normalizedLanguages = normalizeLanguagesList(
        item.languages || item.allowedLanguages
      );
      const cleanSubSubject = normalizeEnglishTopicLabel(item.subSubjectName);
      const cleanSubTopic = normalizeEnglishTopicLabel(item.subTopicName);

      // Migrate legacy comma-separated subExamName or Hindi labels in DB
      if (
        !Array.isArray(item.subExams) ||
        item.subExams.length !== normalizedSubExams.length ||
        cleanSubSubject !== (item.subSubjectName || '') ||
        cleanSubTopic !== (item.subTopicName || '')
      ) {
        legacyUpdates.push(
          Hashtag.updateOne(
            { _id: item._id },
            {
              $set: {
                subExams: normalizedSubExams,
                subExamName: normalizedSubExams.join(', '),
                subSubjectName: cleanSubSubject,
                subTopicName: cleanSubTopic,
              },
            }
          ).catch(() => {})
        );
      }

      return {
        ...item,
        subExams: normalizedSubExams,
        subExamName: normalizedSubExams.join(', '),
        languages: normalizedLanguages,
        allowedLanguages: normalizedLanguages,
        subSubjectName: cleanSubSubject,
        subTopicName: cleanSubTopic,
      };
    });

    if (legacyUpdates.length > 0) {
      Promise.all(legacyUpdates).catch(() => {});
    }

    const groupedByExam = {};
    for (const item of hashtags) {
      if (!groupedByExam[item.examName]) {
        groupedByExam[item.examName] = [];
      }
      groupedByExam[item.examName].push(item);
    }

    const exams = Object.keys(groupedByExam).sort((a, b) => a.localeCompare(b));

    const payload = {
      exams,
      groupedByExam,
      hashtags,
    };

    setCache(cacheKey, payload, HASHTAGS_TTL_SECONDS);

    return res.status(200).json(payload);
  } catch (error) {
    return next(error);
  }
}

export async function createHashtag(req, res, next) {
  try {
    const {
      examName,
      subExams,
      subExamName = '',
      languages,
      allowedLanguages,
      subjectName,
      subSubjectName = '',
      subTopicName = '',
      tag,
      customTag = '',
      syllabusScope = '',
    } = req.body || {};

    if (!examName?.trim() || !subjectName?.trim()) {
      return res.status(400).json({
        error: 'Exam and Subject are required',
      });
    }

    const parsedSubExams = parseStringArray(
      subExams !== undefined ? subExams : subExamName
    );
    const parsedLanguages = normalizeLanguagesList(
      languages !== undefined ? languages : allowedLanguages
    );
    const cleanSubject = normalizeEnglishTopicLabel(subjectName);
    const cleanSubSubject = normalizeEnglishTopicLabel(subSubjectName);
    const cleanSubTopic = normalizeEnglishTopicLabel(subTopicName);

    const autoTag = buildDefaultTag({
      examName,
      subExams: parsedSubExams,
      subjectName: cleanSubject,
      subSubjectName: cleanSubSubject,
      subTopicName: cleanSubTopic,
    });

    const normalizedTag = (tag?.trim() ? tag.trim() : autoTag)
      .replace(/^#+/, '')
      .replace(/[^a-zA-Z0-9_]+/g, '_')
      .toUpperCase();

    if (!normalizedTag) {
      return res.status(400).json({ error: 'A valid tag code is required' });
    }

    const existing = await Hashtag.findOne({ tag: normalizedTag });
    if (existing) {
      return res.status(409).json({
        error: `Hashtag #${normalizedTag} already exists`,
      });
    }

    const hashtag = await Hashtag.create({
      examName: examName.trim(),
      subExams: parsedSubExams,
      subExamName: parsedSubExams.join(', '),
      languages: parsedLanguages,
      subjectName: cleanSubject,
      subSubjectName: cleanSubSubject,
      subTopicName: cleanSubTopic,
      tag: normalizedTag,
      customTag: String(customTag || '').trim(),
      syllabusScope: String(syllabusScope || '').trim(),
      isActive: true,
    });

    invalidateHashtagsCache();

    return res.status(201).json({ hashtag });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ error: 'Hashtag already exists' });
    }
    return next(error);
  }
}

export async function updateHashtag(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid hashtag id' });
    }

    const hashtag = await Hashtag.findById(id);
    if (!hashtag) {
      return res.status(404).json({ error: 'Hashtag not found' });
    }

    const {
      isActive,
      syllabusScope,
      examName,
      subExams,
      subExamName,
      languages,
      allowedLanguages,
      subjectName,
      subSubjectName,
      subTopicName,
      tag,
      customTag,
    } = req.body || {};

    if (typeof isActive === 'boolean') {
      hashtag.isActive = isActive;
    } else if (
      isActive === undefined &&
      syllabusScope === undefined &&
      examName === undefined &&
      subExams === undefined &&
      subExamName === undefined &&
      languages === undefined &&
      allowedLanguages === undefined &&
      subjectName === undefined &&
      subSubjectName === undefined &&
      subTopicName === undefined &&
      tag === undefined &&
      customTag === undefined
    ) {
      hashtag.isActive = !hashtag.isActive;
    }

    if (typeof syllabusScope === 'string') {
      hashtag.syllabusScope = syllabusScope.trim();
    }
    if (typeof examName === 'string' && examName.trim()) {
      hashtag.examName = examName.trim();
    }
    if (subExams !== undefined || subExamName !== undefined) {
      const nextSubExams = parseStringArray(
        subExams !== undefined ? subExams : subExamName
      );
      hashtag.subExams = nextSubExams;
      hashtag.subExamName = nextSubExams.join(', ');
    }
    if (languages !== undefined || allowedLanguages !== undefined) {
      hashtag.languages = normalizeLanguagesList(
        languages !== undefined ? languages : allowedLanguages
      );
    }
    if (typeof subjectName === 'string' && subjectName.trim()) {
      hashtag.subjectName = normalizeEnglishTopicLabel(subjectName);
    }
    if (typeof subSubjectName === 'string') {
      hashtag.subSubjectName = normalizeEnglishTopicLabel(subSubjectName);
    }
    if (typeof subTopicName === 'string') {
      hashtag.subTopicName = normalizeEnglishTopicLabel(subTopicName);
    }
    if (typeof customTag === 'string') {
      hashtag.customTag = customTag.trim();
    }
    if (typeof tag === 'string' && tag.trim()) {
      const normalizedTag = tag
        .trim()
        .replace(/^#+/, '')
        .replace(/[^a-zA-Z0-9_]+/g, '_')
        .toUpperCase();
      if (normalizedTag && normalizedTag !== hashtag.tag) {
        const duplicateTag = await Hashtag.findOne({
          _id: { $ne: hashtag._id },
          tag: normalizedTag,
        });
        if (duplicateTag) {
          return res.status(409).json({
            error: `Hashtag #${normalizedTag} already exists`,
          });
        }
        hashtag.tag = normalizedTag;
      }
    }

    await hashtag.save();

    // Keep denormalized hierarchy fields on existing quizzes under this tag in sync
    await Quiz.updateMany(
      { hashtag: hashtag._id },
      {
        $set: {
          examName: hashtag.examName,
          subExams: hashtag.subExams || [],
          subExamName: (hashtag.subExams || []).join(', '),
          subjectName: hashtag.subjectName,
          subSubjectName: hashtag.subSubjectName || '',
          subTopicName: hashtag.subTopicName || '',
        },
      }
    );

    invalidateHashtagsCache();

    return res.status(200).json({ hashtag });
  } catch (error) {
    return next(error);
  }
}

/**
 * Bulk imports or seeds a structured exam taxonomy array:
 * Each item can have:
 * {
 *   exam: "SSC",
 *   subExams: ["CGL", "CHSL", ...],
 *   allowedLanguages: ["English", "Hindi"],
 *   subject: "General Awareness",
 *   subSubjects: { "History": ["Ancient India", "Medieval India", ...] },
 *   customTag: "ssc_core_gk"
 * }
 * OR flat items { exam, subExams, allowedLanguages, subject, subSubject, subTopic, tag }.
 */
export async function upsertTaxonomyItems(items) {
  const flatTopics = [];

  for (const entry of items) {
    if (!entry || typeof entry !== 'object') continue;
    const examName = String(entry.exam || entry.examName || '').trim();
    const subjectName = normalizeEnglishTopicLabel(
      entry.subject || entry.subjectName || ''
    );
    if (!examName || !subjectName) continue;

    const subExams = parseStringArray(
      entry.subExams !== undefined ? entry.subExams : entry.subExamName
    );
    const languages = normalizeLanguagesList(
      entry.allowedLanguages !== undefined
        ? entry.allowedLanguages
        : entry.languages
    );
    const customTag = String(entry.customTag || '').trim();
    const syllabusScope = String(entry.syllabusScope || '').trim();

    if (
      entry.subSubjects &&
      typeof entry.subSubjects === 'object' &&
      !Array.isArray(entry.subSubjects)
    ) {
      for (const [rawSubSubj, subTopicList] of Object.entries(
        entry.subSubjects
      )) {
        const subSubjectName = normalizeEnglishTopicLabel(rawSubSubj);
        const topics = Array.isArray(subTopicList) ? subTopicList : [];
        if (topics.length === 0) {
          flatTopics.push({
            examName,
            subExams,
            languages,
            subjectName,
            subSubjectName,
            subTopicName: '',
            customTag,
            syllabusScope,
          });
        } else {
          for (const rawTopic of topics) {
            const subTopicName = normalizeEnglishTopicLabel(rawTopic);
            if (!subTopicName) continue;
            flatTopics.push({
              examName,
              subExams,
              languages,
              subjectName,
              subSubjectName,
              subTopicName,
              customTag,
              syllabusScope,
            });
          }
        }
      }
    } else {
      flatTopics.push({
        examName,
        subExams,
        languages,
        subjectName,
        subSubjectName: normalizeEnglishTopicLabel(
          entry.subSubject || entry.subSubjectName || ''
        ),
        subTopicName: normalizeEnglishTopicLabel(
          entry.subTopic || entry.subTopicName || ''
        ),
        tag: entry.tag ? String(entry.tag).trim() : '',
        customTag,
        syllabusScope,
      });
    }
  }

  let createdCount = 0;
  let updatedCount = 0;

  for (const item of flatTopics) {
    const generatedTag = (
      item.tag ||
      buildDefaultTag({
        examName: item.examName,
        subExams: [],
        subjectName: item.subjectName,
        subSubjectName: item.subSubjectName,
        subTopicName: item.subTopicName,
      })
    )
      .replace(/^#+/, '')
      .replace(/[^a-zA-Z0-9_]+/g, '_')
      .toUpperCase();

    if (!generatedTag) continue;

    const existing = await Hashtag.findOne({
      $or: [
        { tag: generatedTag },
        {
          examName: item.examName,
          subjectName: item.subjectName,
          subSubjectName: item.subSubjectName,
          subTopicName: item.subTopicName,
        },
        ...(item.customTag
          ? [
              {
                examName: item.examName,
                customTag: item.customTag,
                subjectName: item.subjectName,
                subSubjectName: item.subSubjectName,
                subTopicName: item.subTopicName,
              },
            ]
          : []),
      ],
    });

    if (existing) {
      const mergedSubExams = Array.from(
        new Set([...(existing.subExams || []), ...item.subExams])
      );
      const mergedLanguages = Array.from(
        new Set([...(existing.languages || []), ...item.languages])
      );
      existing.subExams = mergedSubExams;
      existing.subExamName = mergedSubExams.join(', ');
      existing.languages =
        mergedLanguages.length > 0 ? mergedLanguages : ['English'];
      existing.subjectName = item.subjectName;
      existing.subSubjectName = item.subSubjectName;
      existing.subTopicName = item.subTopicName;
      if (item.customTag) existing.customTag = item.customTag;
      if (item.syllabusScope) existing.syllabusScope = item.syllabusScope;
      existing.isActive = true;
      await existing.save();
      updatedCount += 1;
    } else {
      await Hashtag.create({
        examName: item.examName,
        subExams: item.subExams,
        subExamName: item.subExams.join(', '),
        languages: item.languages,
        subjectName: item.subjectName,
        subSubjectName: item.subSubjectName,
        subTopicName: item.subTopicName,
        tag: generatedTag,
        customTag: item.customTag,
        syllabusScope: item.syllabusScope,
        isActive: true,
      });
      createdCount += 1;
    }
  }

  invalidateHashtagsCache();

  return {
    createdCount,
    updatedCount,
    totalProcessed: flatTopics.length,
  };
}

export async function bulkImportHashtags(req, res, next) {
  try {
    const { taxonomy, useSscPreset, useUpscRrbPreset, useAllPresets } =
      req.body || {};

    const sourceList = useAllPresets
      ? ALL_OFFICIAL_TAXONOMY_PRESET
      : useUpscRrbPreset
        ? UPSC_RRB_TAXONOMY_PRESET
        : useSscPreset
          ? ALL_OFFICIAL_TAXONOMY_PRESET
          : Array.isArray(taxonomy)
            ? taxonomy
            : null;

    if (!sourceList || sourceList.length === 0) {
      return res.status(400).json({
        error:
          'Provide a valid taxonomy JSON array or set useSscPreset / useUpscRrbPreset / useAllPresets: true',
      });
    }

    const result = await upsertTaxonomyItems(sourceList);

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * Adds or removes a language across all topics matching an Exam (and optional Sub Exam).
 */
export async function updateExamLanguages(req, res, next) {
  try {
    const {
      examName,
      subExamName = '',
      action,
      language,
    } = req.body || {};

    if (!examName?.trim() || !language?.trim()) {
      return res
        .status(400)
        .json({ error: 'examName and language are required' });
    }

    const cleanExam = examName.trim();
    const cleanSubExams = parseStringArray(subExamName).filter(
      (s) => s.toUpperCase() !== 'ALL'
    );
    const cleanLang = language.trim();

    const filter = { examName: cleanExam };
    if (cleanSubExams.length > 0) {
      filter.subExams = { $in: cleanSubExams };
    }

    const matchingTags = await Hashtag.find(filter);
    if (matchingTags.length === 0) {
      return res
        .status(404)
        .json({ error: 'No topics found for the specified exam / sub-exam' });
    }

    for (const doc of matchingTags) {
      const current =
        Array.isArray(doc.languages) && doc.languages.length > 0
          ? [...doc.languages]
          : ['English'];

      if (action === 'remove') {
        const nextList = current.filter(
          (l) => l.toLowerCase() !== cleanLang.toLowerCase()
        );
        if (nextList.length === 0) {
          return res.status(400).json({
            error:
              'Cannot remove the last remaining language. Add another language first.',
          });
        }
        doc.languages = nextList;
      } else {
        const exists = current.some(
          (l) => l.toLowerCase() === cleanLang.toLowerCase()
        );
        if (!exists) {
          current.push(cleanLang);
        }
        doc.languages = current;
      }

      await doc.save();
    }

    invalidateHashtagsCache();

    return res.status(200).json({
      updatedCount: matchingTags.length,
      examName: cleanExam,
      subExams: cleanSubExams,
    });
  } catch (error) {
    return next(error);
  }
}

export async function deleteHashtag(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid hashtag id' });
    }

    const hashtag = await Hashtag.findById(id);
    if (!hashtag) {
      return res.status(404).json({ error: 'Hashtag not found' });
    }

    const quizzesToRemove = await Quiz.find({ hashtag: hashtag._id })
      .select('_id')
      .lean();
    const quizIds = quizzesToRemove.map((q) => q._id);

    await Promise.all([
      Hashtag.deleteOne({ _id: hashtag._id }),
      Quiz.deleteMany({ hashtag: hashtag._id }),
      quizIds.length > 0
        ? Notification.deleteMany({ quiz: { $in: quizIds } })
        : Promise.resolve(),
    ]);

    invalidateHashtagsCache();
    invalidateLeaderboardCache();

    return res.status(200).json({
      deleted: true,
      _id: hashtag._id,
      deletedQuizzesCount: quizIds.length,
    });
  } catch (error) {
    return next(error);
  }
}
