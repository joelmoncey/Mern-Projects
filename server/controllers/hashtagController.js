import mongoose from 'mongoose';
import Hashtag from '../models/Hashtag.js';
import {
  CACHE_KEYS,
  getCache,
  setCache,
  invalidateHashtagsCache,
} from '../utils/cache.js';

const HASHTAGS_TTL_SECONDS = 300; // 5 minutes

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
      .sort({ examName: 1, subjectName: 1 })
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
    const { examName, subjectName, tag, syllabusScope = '' } = req.body || {};

    if (!examName?.trim() || !subjectName?.trim() || !tag?.trim()) {
      return res.status(400).json({
        error: 'examName, subjectName, and tag are required',
      });
    }

    const normalizedTag = tag.trim().replace(/^#+/, '').toUpperCase();

    const existing = await Hashtag.findOne({ tag: normalizedTag });
    if (existing) {
      return res.status(409).json({
        error: `Hashtag #${normalizedTag} already exists`,
      });
    }

    const hashtag = await Hashtag.create({
      examName: examName.trim(),
      subjectName: subjectName.trim(),
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

    const { isActive, syllabusScope, examName, subjectName } = req.body || {};

    if (typeof isActive === 'boolean') {
      hashtag.isActive = isActive;
    } else if (
      isActive === undefined &&
      syllabusScope === undefined &&
      examName === undefined &&
      subjectName === undefined
    ) {
      hashtag.isActive = !hashtag.isActive;
    }

    if (typeof syllabusScope === 'string') {
      hashtag.syllabusScope = syllabusScope.trim();
    }
    if (typeof examName === 'string' && examName.trim()) {
      hashtag.examName = examName.trim();
    }
    if (typeof subjectName === 'string' && subjectName.trim()) {
      hashtag.subjectName = subjectName.trim();
    }

    await hashtag.save();
    invalidateHashtagsCache();

    return res.status(200).json({ hashtag });
  } catch (error) {
    return next(error);
  }
}
