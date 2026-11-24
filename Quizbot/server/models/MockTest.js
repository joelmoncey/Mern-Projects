import mongoose from 'mongoose';

const { Schema } = mongoose;

const mockQuestionRefSchema = new Schema(
  {
    quiz: {
      type: Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
    },
    questionHash: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const mockTestSchema = new Schema(
  {
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    hashtag: {
      type: Schema.Types.ObjectId,
      ref: 'Hashtag',
      required: true,
      index: true,
    },
    examName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    subExams: {
      type: [String],
      default: [],
      index: true,
    },
    subExamName: {
      type: String,
      trim: true,
      default: '',
    },
    language: {
      type: String,
      required: true,
      trim: true,
      default: 'English',
      index: true,
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
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
      max: 240,
      default: 15,
    },
    negativeMarking: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    questions: {
      type: [mockQuestionRefSchema],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length >= 1 && arr.length <= 200,
        message: 'A mock test must contain between 1 and 200 questions',
      },
    },
    questionCount: {
      type: Number,
      required: true,
      min: 1,
    },
    attemptsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalScorePercentSum: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

mockTestSchema.index({ examName: 1, isActive: 1, createdAt: -1 });
mockTestSchema.index({ hashtag: 1, isActive: 1, createdAt: -1 });

const MockTest = mongoose.model('MockTest', mockTestSchema);

export default MockTest;
