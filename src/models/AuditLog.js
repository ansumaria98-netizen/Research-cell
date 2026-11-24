import mongoose from 'mongoose';

/**
 * AuditLog Model
 * Collection: 'auditLogs'
 * Purpose: Immutable compliance and security ledger tracking sensitive actions across the institution.
 */
const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userEmail: {
      type: String,
      trim: true
    },
    userName: {
      type: String,
      trim: true
    },
    userRole: {
      type: String,
      trim: true
    },
    action: {
      type: String,
      required: [true, 'Audit action is required (e.g. PROPOSAL_SUBMITTED, REVIEW_EVALUATED)'],
      trim: true
    },
    entityType: {
      type: String,
      required: [true, 'Entity type is required (e.g. Project, Evaluation, User)'],
      trim: true
    },
    entityId: {
      type: String,
      trim: true
    },
    previousState: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    newState: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    ipAddress: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    },
    timestamp: {
      type: Date,
      default: Date.now,
      immutable: true
    }
  },
  {
    collection: 'auditLogs',
    timestamps: false
  }
);

auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ userId: 1, action: 1 });

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
