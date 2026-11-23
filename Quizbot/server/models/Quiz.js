import mongoose from 'mongoose';
import { computeQuestionHash } from '../utils/questionHash.js';

const { Schema } = mongoose;

const flagEntrySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const quizSchema = new Schema(
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
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    normalizedQuestion: {
      type: String,
      required: true,
    },
    questionHash: {
      type: String,
      required: true,
      match: /^[a-f0-9]{64}$/,
    },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) =>
          Array.isArray(arr) &&
          arr.length === 4 &&
          arr.every((opt) => typeof opt === 'string' && opt.trim().length > 0),
        message: 'options must contain exactly 4 non-empty strings',
      },
    },
    correctIndex: {
      type: Number,
      required: true,
      min: 0,
      max: 3,
      validate: {
        validator: Number.isInteger,
        message: 'correctIndex must be an integer between 0 and 3',
      },
    },
    explanation: {
      type: String,
      trim: true,
      maxlength: 400,
      default: '',
    },
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    attemptsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    correctCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    reportsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    flags: {
      type: [flagEntrySchema],
      default: [],
    },
    flagCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    needsCreatorEdit: {
      type: Boolean,
      default: false,
      index: true,
    },
    creatorNotifiedAt: {
      type: Date,
      default: null,
    },
    escalatedToAdmin: {
      type: Boolean,
      default: false,
      index: true,
    },
    escalatedAt: {
      type: Date,
      default: null,
    },
    lastEditedAt: {
      type: Date,
      default: null,
    },
    editCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

quizSchema.pre('validate', function populateQuestionHash(next) {
  if (this.question && (this.isModified('question') || !this.questionHash)) {
    const { normalizedQuestion, questionHash } = computeQuestionHash(
      this.question
    );
    this.normalizedQuestion = normalizedQuestion;
    this.questionHash = questionHash;
  }
  next();
});

// Prevent a creator from posting duplicate questions within the same exam
quizSchema.index({ creator: 1, examName: 1, questionHash: 1 }, { unique: true });

// High-traffic feed query index
quizSchema.index({ examName: 1, hashtag: 1, isHidden: 1, createdAt: -1 });

// Admin escalations queue index
quizSchema.index({ escalatedToAdmin: 1, isHidden: 1, escalatedAt: -1 });

const Quiz = mongoose.model('Quiz', quizSchema);

export default Quiz;
