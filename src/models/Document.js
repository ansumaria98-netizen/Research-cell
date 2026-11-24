import mongoose from 'mongoose';

/**
 * Document Model
 * Collection: 'documents'
 * Purpose: File metadata, storage references, file size, MIME types, and access control rules.
 */
const documentSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project reference is required']
    },
    projectCode: {
      type: String,
      trim: true
    },
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true
    },
    documentType: {
      type: String,
      enum: [
        'abstract',
        'full_proposal',
        'progress_report',
        'approval_letter',
        'final_dissertation',
        'similarity_report_pdf',
        'presentation',
        'supporting_material'
      ],
      required: [true, 'Document type is required']
    },
    fileName: {
      type: String,
      required: [true, 'Stored filename is required'],
      trim: true
    },
    originalName: {
      type: String,
      trim: true
    },
    mimeType: {
      type: String,
      trim: true
    },
    fileSizeBytes: {
      type: Number,
      default: 0
    },
    storagePath: {
      type: String,
      required: [true, 'Protected filesystem storage path is required'],
      trim: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader user reference is required']
    },
    uploadedByName: {
      type: String,
      trim: true
    },
    accessLevel: {
      type: String,
      enum: ['public', 'department_only', 'committee_only', 'author_and_guide'],
      default: 'department_only'
    },
    isArchived: {
      type: Boolean,
      default: false
    }
  },
  {
    collection: 'documents',
    timestamps: true
  }
);

documentSchema.index({ projectId: 1, documentType: 1 });
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ isArchived: 1 });

const Document = mongoose.models.Document || mongoose.model('Document', documentSchema);

export default Document;
