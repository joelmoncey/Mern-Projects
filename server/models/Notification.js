import mongoose from 'mongoose';

const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['flag_edit_request', 'admin_escalation'],
      required: true,
    },
    quiz: {
      type: Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 400,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
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

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
