import mongoose from 'mongoose';

const { Schema } = mongoose;

const contributionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    telegramId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    payloadId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    stars: {
      type: Number,
      required: true,
      min: 1,
      max: 2500,
    },
    approxInr: {
      type: Number,
      required: true,
      min: 1,
    },
    cupsCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    tierId: {
      type: String,
      trim: true,
      default: 'custom',
    },
    tierLabel: {
      type: String,
      trim: true,
      default: 'Buy Me a Chai',
    },
    note: {
      type: String,
      trim: true,
      maxlength: 140,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    telegramPaymentChargeId: {
      type: String,
      trim: true,
      default: '',
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Contribution = mongoose.model('Contribution', contributionSchema);

export default Contribution;
