import mongoose from 'mongoose';

const { Schema } = mongoose;

const attemptSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    quiz: {
      type: Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
      index: true,
    },
    isCorrect: {
      type: Boolean,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

attemptSchema.index({ createdAt: -1, user: 1 });

const Attempt = mongoose.model('Attempt', attemptSchema);

export default Attempt;
