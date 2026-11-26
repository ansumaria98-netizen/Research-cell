import mongoose from 'mongoose';

/**
 * Project Model
 * Collection: 'projects'
 * Purpose: Project proposals, abstracts, status, academic metadata, and review lifecycles.
 * Conforms to Section 13.1 & 13.2 of the institutional database specification.
 */
const projectSchema = new mongoose.Schema(
  {
    // Primary identification (Supports both projectCode and project_code)
    project_code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      alias: 'projectCode'
    },
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true
    },

    // Institutional Academic Placement (References)
    department: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true
    },
    department_id: {
      type: String,
      default: ''
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    },
    course: {
      type: String,
      default: ''
    },
    course_id: {
      type: String,
      default: ''
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    programme: {
      type: String,
      default: ''
    },
    academic_year: {
      type: String,
      default: '2026-27',
      trim: true,
      alias: 'academicYear'
    },
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear'
    },
    register_number: {
      type: String,
      default: '',
      trim: true,
      alias: 'registerNumber'
    },

    // Mentorship & Student Authorship (References)
    lead_investigator: {
      type: String,
      required: [true, 'Lead student/investigator is required'],
      trim: true
    },
    lead_faculty_id: {
      type: String,
      default: ''
    },
    guide_id: {
      type: String,
      default: ''
    },
    guideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    guide_teacher: {
      type: String,
      default: '',
      alias: 'guideTeacher'
    },
    guide_name: {
      type: String,
      default: ''
    },
    guide_email: {
      type: String,
      default: ''
    },
    submitted_by: {
      type: String,
      default: ''
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    submitted_by_name: {
      type: String,
      default: '',
      alias: 'submittedByName'
    },
    team_members: {
      type: [String],
      default: []
    },
    team_member_ids: {
      type: [String],
      default: []
    },
    teamMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    student_team_members: {
      type: String,
      default: '',
      alias: 'studentTeamMembers'
    },
    projectGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProjectGroup'
    },

    // Proposal Core Details
    category: {
      type: String,
      required: true,
      enum: [
        'Software Development',
        'Data Science & AI',
        'Cybersecurity',
        'Commerce & Finance',
        'Social Impact',
        'Media & Animation',
        'Clinical & Healthcare',
        'Interdisciplinary',
        'General Research',
        'Research',
        'Application',
        'Industry Problem',
        'Community Project',
        'Innovation'
      ],
      default: 'Research'
    },
    status: {
      type: String,
      enum: [
        'draft',
        'submitted',
        'pending',
        'guide_reviewed',
        'under_ric_review',
        'changes_requested',
        'approved',
        'allocated',
        'ongoing',
        'completed',
        'rejected',
        'withdrawn'
      ],
      default: 'pending'
    },
    abstract: {
      type: String,
      default: ''
    },
    problem_statement: {
      type: String,
      default: '',
      alias: 'problemStatement'
    },
    objectives: {
      type: mongoose.Schema.Types.Mixed,
      default: ''
    },
    methodology: {
      type: String,
      default: ''
    },
    keywords: {
      type: mongoose.Schema.Types.Mixed,
      default: ''
    },
    innovation: {
      type: String,
      default: ''
    },
    expected_results: {
      type: String,
      default: ''
    },
    expected_outcomes: {
      type: String,
      default: '',
      alias: 'expectedOutcomes'
    },

    // Proposal Documents
    supporting_documents: {
      type: [
        {
          id: String,
          name: String,
          original_name: String,
          file_path: String,
          file_type: String,
          file_size: Number,
          uploaded_at: {
            type: Date,
            default: Date.now
          }
        }
      ],
      default: []
    },

    // AI Similarity Checking Metadata
    similarityStatus: {
      type: String,
      enum: ['pending', 'scanned', 'flagged', 'cleared'],
      default: 'pending'
    },
    similarity_score: {
      type: Number,
      default: null,
      alias: 'similarityScore'
    },
    similarity_checked_at: {
      type: Date,
      default: null
    },
    similarity_matches: {
      type: [
        {
          project_code: String,
          title: String,
          department: String,
          score: Number,
          title_score: Number,
          abstract_score: Number,
          match_cue: String,
          breakdown: {
            titles: Number,
            abstracts: Number,
            objectives: Number,
            methods: Number,
            keywords: Number,
            expected_results: Number
          }
        }
      ],
      default: []
    },
    similarity_report_ref: {
      type: String,
      default: null
    },
    latestSimilarityReportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SimilarityReport'
    },
    similarity_notice: {
      type: String,
      default: 'Advisory support for human review; never reject a project automatically.'
    },

    // Guide Review Details
    guide_review: {
      reviewed: { type: Boolean, default: false },
      recommendation: {
        type: String,
        enum: ['Recommend for RIC Approval', 'Revision Required', 'Reject', ''],
        default: ''
      },
      comments: { type: String, default: '' },
      reviewed_at: { type: Date, default: null },
      reviewed_by: { type: String, default: '' },
      reviewed_by_id: { type: String, default: '' }
    },
    guide_review_history: {
      type: [
        {
          recommendation: String,
          comments: String,
          reviewed_at: { type: Date, default: Date.now },
          reviewed_by: String,
          reviewed_by_id: String
        }
      ],
      default: []
    },

    // RIC Reviewer Assignments
    assigned_reviewers: {
      type: [
        {
          user_id: String,
          userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          name: String,
          email: String,
          role: String,
          designation: String,
          assigned_at: {
            type: Date,
            default: Date.now
          },
          assigned_by: String,
          assigned_by_name: String
        }
      ],
      default: []
    },

    // Fixed 5-Criteria Committee Evaluations
    evaluations: {
      type: [
        {
          evaluation_id: String,
          reviewer_id: String,
          reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          reviewer_name: String,
          reviewer_email: String,
          reviewer_role: String,
          criteria_scores: {
            novelty: { type: Number, default: 0 },
            methodology: { type: Number, default: 0 },
            feasibility: { type: Number, default: 0 },
            impact: { type: Number, default: 0 },
            clarity: { type: Number, default: 0 }
          },
          total_score: { type: Number, default: 0 },
          comments: { type: String, default: '' },
          recommendation: {
            type: String,
            enum: ['Approve', 'Revision Required', 'Reject'],
            default: 'Approve'
          },
          evaluated_at: {
            type: Date,
            default: Date.now
          }
        }
      ],
      default: []
    },

    // Evaluation Summary & Majority Consensus
    evaluation_summary: {
      total_evaluations: { type: Number, default: 0 },
      average_score: { type: Number, default: 0 },
      consensus_recommendation: { type: String, default: 'Awaiting Evaluation' }
    },

    // Official RIC Decision & Sanctions
    official_decision: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    decision_history: {
      type: [
        {
          decision: String,
          decision_date: { type: Date, default: Date.now },
          responsible_member: String,
          responsible_member_id: String,
          comments: String,
          reasons: String,
          conditions: String
        }
      ],
      default: []
    },

    // Official Approval Letter
    approval_letter: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },

    // RIC Panel Interview & Oral Defense Evaluation
    panel_interview: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    review_comment: {
      type: String,
      default: ''
    },
    reviewed_by: {
      type: String,
      default: ''
    },
    reviewed_by_name: {
      type: String,
      default: ''
    },
    reviewed_at: {
      type: Date
    },
    proposed_budget: {
      type: Number,
      default: 0
    },
    duration_months: {
      type: Number,
      default: 12
    },
    submitted_date: {
      type: Date,
      default: Date.now
    },
    review_deadline: {
      type: Date
    },
    last_activity: {
      type: String,
      default: 'Proposal submitted for Guide & RIC review'
    },

    // Section 13.2 Rule: Ordinary users must not permanently delete project or approval records
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    collection: 'projects',
    timestamps: true
  }
);

// Indexes for query performance and data integrity
projectSchema.index({ department: 1, academic_year: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ course_id: 1 });
projectSchema.index({ isDeleted: 1 });
projectSchema.index({ submitted_by: 1 });
projectSchema.index({ guide_id: 1 });
projectSchema.index({ title: 'text', abstract: 'text', methodology: 'text' });

const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);

export default Project;
