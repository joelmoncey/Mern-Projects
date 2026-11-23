import mongoose from 'mongoose';
import Hashtag from '../models/Hashtag.js';
import {
  CACHE_KEYS,
  getCache,
  setCache,
  invalidateHashtagsCache,
} from '../utils/cache.js';

const HASHTAGS_TTL_SECONDS = 300; // 5 minutes

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

    const hashtags = await Hashtag.find(filter)
      .sort({
        examName: 1,
        subExamName: 1,
        subjectName: 1,
        subSubjectName: 1,
        subTopicName: 1,
      })
      .lean();

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

    const hashtag = await Hashtag.create({
      examName: examName.trim(),
      subExamName: String(subExamName || '').trim(),
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
      subjectName,
      subSubjectName,
      subTopicName,
    } = req.body || {};

    if (typeof isActive === 'boolean') {
      hashtag.isActive = isActive;
    } else if (
      isActive === undefined &&
      syllabusScope === undefined &&
      examName === undefined &&
      subExamName === undefined &&
      subjectName === undefined &&
      subSubjectName === undefined &&
      subTopicName === undefined
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
    if (typeof subjectName === 'string' && subjectName.trim()) {
      hashtag.subjectName = subjectName.trim();
    }
    if (typeof subSubjectName === 'string') {
      hashtag.subSubjectName = subSubjectName.trim();
    }
    if (typeof subTopicName === 'string') {
      hashtag.subTopicName = subTopicName.trim();
    }

    await hashtag.save();
    invalidateHashtagsCache();

    return res.status(200).json({ hashtag });
  } catch (error) {
    return next(error);
  }
}
