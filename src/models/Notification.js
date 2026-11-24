import mongoose from 'mongoose';

/**
 * Notification Model
 * Collection: 'notifications'
 * Purpose: Real-time user notifications, proposal status changes, review queues, and email delivery tracking.
 */
const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient user reference is required']
    },
    recipientEmail: {
      type: String,
      trim: true,
      lowercase: true
    },
    type: {
      type: String,
      enum: [
        'proposal_submitted',
        'guide_assigned',
        'review_pending',
        'evaluation_completed',
        'official_decision',
        'similarity_alert',
        'milestone_due',
        'system_announcement'
      ],
      required: true
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    projectCode: {
      type: String,
      trim: true
    },
    actionUrl: {
      type: String,
      default: ''
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date,
      default: null
    },
    deliveryChannel: {
      type: String,
      enum: ['in_app', 'email', 'both'],
      default: 'both'
    },
    emailDispatched: {
      type: Boolean,
      default: false
    }
  },
  {
    collection: 'notifications',
    timestamps: true
  }
);

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

export default Notification;
