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

const HASHTAGS_TTL_SECONDS = 300; // 5 minutes

function normalizeLanguagesList(raw) {
  let list = [];
  if (Array.isArray(raw)) {
    list = raw.flatMap((entry) => String(entry || '').split(','));
  } else if (typeof raw === 'string') {
    list = raw.split(',');
  }
  const cleaned = Array.from(
    new Set(
      list
        .map((l) => l.trim())
        .filter(Boolean)
    )
  );
  return cleaned.length > 0 ? cleaned : ['English'];
}

function buildDefaultTag({
  examName,
  subExamName,
  subjectName,
  subSubjectName,
  subTopicName,
}) {
  return [examName, subExamName, subjectName, subSubjectName, subTopicName]
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
        subExamName: 1,
        subjectName: 1,
        subSubjectName: 1,
        subTopicName: 1,
      })
      .lean();

    const hashtags = rawHashtags.map((item) => ({
      ...item,
      languages:
        Array.isArray(item.languages) && item.languages.length > 0
          ? item.languages
          : ['English'],
    }));

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
      subExamName = '',
      languages,
      subjectName,
      subSubjectName = '',
      subTopicName = '',
      tag,
      syllabusScope = '',
    } = req.body || {};

    if (!examName?.trim() || !subjectName?.trim()) {
      return res.status(400).json({
        error: 'Exam and Subject are required',
      });
    }

    const autoTag = buildDefaultTag({
      examName,
      subExamName,
      subjectName,
      subSubjectName,
      subTopicName,
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

    const normalizedLanguages = normalizeLanguagesList(languages);

    const hashtag = await Hashtag.create({
      examName: examName.trim(),
      subExamName: String(subExamName || '').trim(),
      languages: normalizedLanguages,
      subjectName: subjectName.trim(),
      subSubjectName: String(subSubjectName || '').trim(),
      subTopicName: String(subTopicName || '').trim(),
      tag: normalizedTag,
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
      subExamName,
      languages,
      subjectName,
      subSubjectName,
      subTopicName,
      tag,
    } = req.body || {};

    if (typeof isActive === 'boolean') {
      hashtag.isActive = isActive;
    } else if (
      isActive === undefined &&
      syllabusScope === undefined &&
      examName === undefined &&
      subExamName === undefined &&
      languages === undefined &&
      subjectName === undefined &&
      subSubjectName === undefined &&
      subTopicName === undefined &&
      tag === undefined
    ) {
      hashtag.isActive = !hashtag.isActive;
    }

    if (typeof syllabusScope === 'string') {
      hashtag.syllabusScope = syllabusScope.trim();
    }
    if (typeof examName === 'string' && examName.trim()) {
      hashtag.examName = examName.trim();
    }
    if (typeof subExamName === 'string') {
      hashtag.subExamName = subExamName.trim();
    }
    if (languages !== undefined) {
      hashtag.languages = normalizeLanguagesList(languages);
    }
    if (typeof subjectName === 'string' && subjectName.trim()) {
      hashtag.subjectName = subjectName.trim();
    }
    if (typeof subSubjectName === 'string') {
      hashtag.subSubjectName = subSubjectName.trim();
    }
    if (typeof subTopicName === 'string') {
      hashtag.subTopicName = subTopicName.trim();
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
          subExamName: hashtag.subExamName || '',
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
 * Adds or removes a language across all topics matching an Exam (and optional Sub Exam).
 * Allows admins to manage allowed languages per Exam / Sub Exam cleanly.
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
    const cleanSubExam = String(subExamName || '').trim();
    const cleanLang = language.trim();

    const filter = { examName: cleanExam };
    if (cleanSubExam && cleanSubExam !== 'ALL') {
      filter.subExamName = cleanSubExam;
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
      subExamName: cleanSubExam,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Permanently deletes an admin-created hashtag / topic and cleans up associated quizzes.
 */
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
