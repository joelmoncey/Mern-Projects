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
    username: {
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
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

export default User;
