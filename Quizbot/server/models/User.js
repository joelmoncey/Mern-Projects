import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    telegramId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    // Custom creator username chosen inside Quiz-Gram (not taken from Telegram)
    username: {
      type: String,
      trim: true,
      default: '',
    },
    // Raw Telegram username stored separately for admin reference only
    telegramUsername: {
      type: String,
      trim: true,
      default: '',
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    photoUrl: {
      type: String,
      trim: true,
      default: '',
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    canCreateQuiz: {
      type: Boolean,
      default: false,
      index: true,
    },
    followers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    following: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    streakCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastActiveDate: {
      type: Date,
      default: null,
    },
    totalSolved: {
      type: Number,
      default: 0,
      min: 0,
    },
    correctSolved: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Telegram Stars ("Buy Me a Chai") Supporter tracking
    starsContributed: {
      type: Number,
      default: 0,
      min: 0,
    },
    isSupporter: {
      type: Boolean,
      default: false,
      index: true,
    },
    supporterSince: {
      type: Date,
      default: null,
    },
    lastGuideShownAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

export default User;
