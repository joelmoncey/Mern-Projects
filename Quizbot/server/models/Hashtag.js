import mongoose from 'mongoose';

const { Schema } = mongoose;

function normalizeStringArray(raw) {
  if (!raw) return [];
  const parts = Array.isArray(raw)
    ? raw.flatMap((item) => String(item || '').split(','))
    : String(raw).split(',');
  return Array.from(
    new Set(
      parts
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );
}

const hashtagSchema = new Schema(
  {
    examName: {
      type: String,
      required: true,
      trim: true,
    },
    // Array of sub-exams sharing this syllabus topic (e.g. ["CGL", "CHSL", "CPO"])
    subExams: {
      type: [String],
      default: [],
      index: true,
      set: normalizeStringArray,
    },
    // Legacy/display string synced automatically with subExams
    subExamName: {
      type: String,
      trim: true,
      default: '',
    },
    // Allowed languages for this exam / sub-exam topic (e.g. ["English", "Hindi"])
    languages: {
      type: [String],
      default: ['English'],
      set: (val) => {
        const arr = normalizeStringArray(val);
        return arr.length > 0 ? arr : ['English'];
      },
      validate: {
        validator: (arr) =>
          Array.isArray(arr) &&
          arr.length > 0 &&
          arr.every((lang) => typeof lang === 'string' && lang.trim().length > 0),
        message: 'At least one language is required',
      },
    },
    subjectName: {
      type: String,
      required: true,
      trim: true,
    },
    subSubjectName: {
      type: String,
      trim: true,
      default: '',
    },
    subTopicName: {
      type: String,
      trim: true,
      default: '',
    },
    tag: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      set: (value) =>
        typeof value === 'string'
          ? value.trim().replace(/^#+/, '').toUpperCase()
          : value,
    },
    customTag: {
      type: String,
      trim: true,
      default: '',
    },
    syllabusScope: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    quizCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

hashtagSchema.pre('validate', function syncSubExams(next) {
  const fromArray = normalizeStringArray(this.subExams);
  const fromLegacy = normalizeStringArray(this.subExamName);
  const merged = Array.from(new Set([...fromArray, ...fromLegacy]));
  this.subExams = merged;
  this.subExamName = merged.join(', ');
  next();
});

hashtagSchema.index({
  examName: 1,
  subExams: 1,
  subjectName: 1,
  subSubjectName: 1,
  subTopicName: 1,
});

const Hashtag = mongoose.model('Hashtag', hashtagSchema);

export default Hashtag;
