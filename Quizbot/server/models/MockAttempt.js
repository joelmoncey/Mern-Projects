import mongoose from 'mongoose';

const { Schema } = mongoose;

const mockAnswerSchema = new Schema(
  {
    quiz: {
      type: Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
    },
    selectedIndex: {
      type: Number,
      default: -1, // -1 means skipped / unanswered
      min: -1,
      max: 3,
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const mockAttemptSchema = new Schema(
  {
    mockTest: {
      type: Schema.Types.ObjectId,
      ref: 'MockTest',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    answers: {
      type: [mockAnswerSchema],
      default: [],
    },
    totalQuestions: {
      type: Number,
      required: true,
      min: 1,
    },
    correctCount: {
      type: Number,
      required: true,
      min: 0,
    },
    wrongCount: {
      type: Number,
      required: true,
      min: 0,
    },
    skippedCount: {
      type: Number,
      required: true,
      min: 0,
    },
    score: {
      type: Number,
      required: true,
    },
    maxScore: {
      type: Number,
      required: true,
    },
    accuracyPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    scorePercent: {
      type: Number,
      required: true,
    },
    timeSpentSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

mockAttemptSchema.index({ mockTest: 1, user: 1, submittedAt: -1 });

const MockAttempt = mongoose.model('MockAttempt', mockAttemptSchema);

export default MockAttempt;
