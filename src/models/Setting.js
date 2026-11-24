import mongoose from 'mongoose';

/**
 * Setting Model
 * Collection: 'settings'
 * Purpose: System-wide configuration, guide capacity ceilings, similarity thresholds, and rubric criteria.
 */
const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Configuration key is required'],
      unique: true,
      trim: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Configuration value is required']
    },
    category: {
      type: String,
      enum: [
        'guide_capacity',
        'similarity_thresholds',
        'evaluation_rubric',
        'academic_session',
        'general'
      ],
      default: 'general'
    },
    description: {
      type: String,
      default: ''
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    collection: 'settings',
    timestamps: true
  }
);

settingSchema.index({ category: 1 });

const Setting = mongoose.models.Setting || mongoose.model('Setting', settingSchema);

export default Setting;
