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
