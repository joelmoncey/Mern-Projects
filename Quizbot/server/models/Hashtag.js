import mongoose from 'mongoose';

const { Schema } = mongoose;

const hashtagSchema = new Schema(
  {
    examName: {
      type: String,
      required: true,
      trim: true,
    },
    subExamName: {
      type: String,
      trim: true,
      default: '',
    },
    // Allowed languages for this exam / sub-exam topic (managed by admin)
    languages: {
      type: [String],
      default: ['English'],
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

hashtagSchema.index({
  examName: 1,
  subExamName: 1,
  subjectName: 1,
  subSubjectName: 1,
  subTopicName: 1,
});

const Hashtag = mongoose.model('Hashtag', hashtagSchema);

export default Hashtag;
