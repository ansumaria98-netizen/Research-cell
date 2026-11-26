import { randomBytes } from 'node:crypto';
import express from 'express';
import {
  addProjectEvaluation,
  assignProjectReviewers,
  createProjectRecord,
  deleteProjectRecord,
  getProjectRecord,
  listComparisonProjects,
  listProjectsForGuide,
  recordGuideReview,
  recordOfficialDecision,
  resubmitProjectRecord,
  saveSimilarityReport,
  updateProjectRecord,
  updateProjectReview
} from '../db/projectRepository.js';
import { listUsers } from '../db/userRepository.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { listDepartments, listFaculty } from '../db/institutionRepository.js';
import {
  createReviewUpdate,
  computeEvaluationSummary,
  validateEvaluationSubmission,
  validateReviewerAssignment,
  validateGuideReviewInput,
  validateOfficialDecisionInput,
  EVALUATION_CRITERIA,
  EVALUATION_RECOMMENDATIONS,
  OFFICIAL_DECISION_STATES,
  GUIDE_RECOMMENDATIONS,
  RIC_REVIEW_ROLES
} from '../services/projectReview.js';
import {
  createSimilarityReport,
  SIMILARITY_ADVISORY_NOTICE,
  SIMILARITY_THRESHOLD
} from '../services/projectSimilarity.js';
import { validateProjectAssignment } from '../services/institution.js';
import {
  sendProposalSubmittedNotification,
  sendGuideReviewNotification,
  sendRICDecisionNotification
} from '../services/emailService.js';

const router = express.Router();
const RIC_ROLES = RIC_REVIEW_ROLES;
const SUBMITTER_ROLES = [...new Set([...RIC_ROLES, 'faculty_principal', 'institutional_user', 'student'])];
const PROJECT_CATEGORIES = [
  'Research',
  'Innovation',
  'Development',
  'Product Development',
  'Interdisciplinary',
  'Patent/IP',
  'Community/Social',
  'Institutional Innovation',
  'Applied Research',
  'Socio-Economic Development',
  'Clean Energy Research',
  'Interdisciplinary Modeling',
  'Humanities & Digital Heritage',
  'Information Systems',
  'Environmental Protection'
];
const MAX_TEXT_LENGTH = 5000;

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getDepartmentCode(department) {
  return department
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9]/gi, '')[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 6) || 'GEN';
}

function validateSubmission(body) {
  const title = cleanText(body.title);
  const category = cleanText(body.category);
  const abstract = cleanText(body.abstract);
  const problemStatement = cleanText(body.problem_statement);
  const objectives = cleanText(body.objectives);
  const methodology = cleanText(body.methodology || body.methods);
  const keywords = cleanText(body.keywords);
  const innovation = cleanText(body.innovation);
  const expectedResults = cleanText(body.expected_results || body.expected_outcomes);
  const course = cleanText(body.course || body.programme);
  const courseId = cleanText(body.course_id);
  const programme = cleanText(body.programme || body.course);
  const academicYear = cleanText(body.academic_year) || '2026-27';
  const registerNumber = cleanText(body.register_number);
  const guideId = cleanText(body.guide_id || body.lead_faculty_id);
  const guideName = cleanText(body.guide_name || body.guide_teacher || body.lead_investigator);
  const guideEmail = cleanText(body.guide_email);
  const guideTeacher = guideName;
  const studentTeamMembers = cleanText(body.student_team_members || (Array.isArray(body.student_team) ? body.student_team.join(', ') : ''));
  const durationMonths = Number(body.duration_months || 12);
  const supportingDocuments = Array.isArray(body.supporting_documents) ? body.supporting_documents : [];

  if (!title || !category || !abstract) {
    return { error: 'Title, category, and abstract are required.' };
  }

  if (
    title.length > 200 ||
    abstract.length > MAX_TEXT_LENGTH ||
    problemStatement.length > MAX_TEXT_LENGTH ||
    objectives.length > MAX_TEXT_LENGTH ||
    methodology.length > MAX_TEXT_LENGTH ||
    keywords.length > 500 ||
    innovation.length > MAX_TEXT_LENGTH ||
    expectedResults.length > MAX_TEXT_LENGTH ||
    programme.length > 200 ||
    course.length > 200 ||
    guideTeacher.length > 200 ||
    studentTeamMembers.length > 1000
  ) {
    return { error: 'One or more project fields exceed the maximum allowed length.' };
  }

  if (!PROJECT_CATEGORIES.includes(category)) {
    return { error: 'Please select a valid project category.' };
  }

  if (!Number.isInteger(durationMonths) || durationMonths < 1 || durationMonths > 120) {
    return { error: 'Project duration must be between 1 and 120 months.' };
  }

  return {
    data: {
      title,
      category,
      abstract,
      problem_statement: problemStatement,
      objectives,
      methodology,
      keywords,
      innovation,
      expected_results: expectedResults,
      expected_outcomes: expectedResults,
      programme,
      course,
      course_id: courseId,
      academic_year: academicYear,
      register_number: registerNumber,
      guide_id: guideId,
      guide_name: guideName,
      guide_email: guideEmail,
      guide_teacher: guideTeacher,
      student_team_members: studentTeamMembers,
      duration_months: durationMonths,
      supporting_documents: supportingDocuments
    }
  };
}

async function buildSimilarityReport(candidate, excludeProjectId = null, options = {}) {
  const projects = await listComparisonProjects();
  return createSimilarityReport(candidate, projects, {
    excludeProjectId,
    allDepartments: options.allDepartments || false
  });
}

function visibleProject(project, user) {
  if (RIC_ROLES.includes(user.role)) return project;
  const isOwner = Boolean(
    project.is_submitted_by_user ||
    (project.submitted_by && project.submitted_by === user.id)
  );
  const {
    similarity_matches,
    similarity_score,
    similarity_checked_at,
    similarity_notice,
    submitted_by,
    reviewed_by,
    reviewed_by_name,
    review_comment,
    ...safeProject
  } = project;
  if (!isOwner) {
    return { ...safeProject, is_submitted_by_user: false, review_comment: '' };
  }
  return {
    ...safeProject,
    is_submitted_by_user: true,
    review_comment: review_comment || '',
    similarity_matches: similarity_matches || [],
    similarity_score: similarity_score || 0,
    similarity_checked_at: similarity_checked_at || null,
    similarity_notice: similarity_notice || SIMILARITY_ADVISORY_NOTICE
  };
}

/**
 * MODULE 5: AI-Based Project Similarity Checking Endpoint (RIC Members Only)
 * Compares titles, abstracts, objectives, methods, keywords, and expected results.
 * Supports human committee review; never automatically rejects a project.
 */
router.post('/similarity', authenticate, requireRole(RIC_ROLES), async (req, res) => {
  const candidate = {
    department: cleanText(req.body.department),
    title: cleanText(req.body.title),
    abstract: cleanText(req.body.abstract),
    problem_statement: cleanText(req.body.problem_statement),
    description: cleanText(req.body.description),
    objectives: cleanText(req.body.objectives),
    methodology: cleanText(req.body.methodology || req.body.methods),
    keywords: cleanText(req.body.keywords),
    expected_results: cleanText(req.body.expected_results || req.body.expected_outcomes)
  };

  if (req.body.department_id) {
    try {
      const departments = await listDepartments();
      const department = departments.find((item) => item.id === cleanText(req.body.department_id));
      if (!department) return res.status(400).json({ error: 'Choose an existing department.' });
      candidate.department = department.name;
    } catch (err) {
      console.error('[Project Similarity Department Error]', err);
      return res.status(500).json({ error: 'Failed to load the selected department.' });
    }
  }

  const requestedAllDepartments = req.body.scope === 'all';
  const isReviewer = RIC_ROLES.includes(req.user.role);
  const isCrossDept = isReviewer && (requestedAllDepartments || !candidate.department);

  if (!candidate.department && !isCrossDept) {
    return res.json({
      threshold: SIMILARITY_THRESHOLD,
      matches: [],
      notice: 'This project has no department recorded; same-department comparison was skipped.'
    });
  }

  if (Object.values(candidate).some((value) => value.length > MAX_TEXT_LENGTH)) {
    return res.status(400).json({ error: 'Project text fields must be 5,000 characters or fewer.' });
  }

  const hasAnyText = Boolean(
    candidate.title ||
    candidate.abstract ||
    candidate.problem_statement ||
    candidate.description ||
    candidate.objectives ||
    candidate.methodology ||
    candidate.keywords ||
    candidate.expected_results
  );

  if (!hasAnyText) {
    return res.json({
      threshold: SIMILARITY_THRESHOLD,
      matches: [],
      notice: 'Add a title, abstract, objectives, or methods before running the comparison.'
    });
  }

  try {
    const excludeProjectId = cleanText(req.body.exclude_project_id || req.body.project_id);
    const report = await buildSimilarityReport(
      candidate,
      excludeProjectId || null,
      { allDepartments: isCrossDept }
    );
    const corpus = await listComparisonProjects();
    const target = excludeProjectId
      ? corpus.find((project) => project._id === excludeProjectId || project.project_code === excludeProjectId)
      : null;
    const canSave = Boolean(
      target &&
      (RIC_ROLES.includes(req.user.role) || target.submitted_by === req.user.id)
    );
    if (canSave) {
      await saveSimilarityReport(target._id, report);
    }

    return res.json({
      threshold: SIMILARITY_THRESHOLD,
      matches: report.similarity_matches,
      top_score: report.similarity_score,
      dimensions: ['titles', 'abstracts', 'objectives', 'methods', 'keywords', 'expected_results'],
      notice: report.similarity_notice,
      policy_notice: report.similarity_notice,
      saved: canSave,
      automatic_rejection: false
    });
  } catch (err) {
    console.error('[Project Similarity Error]', err);
    return res.status(500).json({ error: 'Failed to check project similarity.' });
  }
});

// GET /api/projects/decisions/states - Return official decision states & guide recommendations
router.get('/decisions/states', authenticate, (req, res) => {
  return res.json({
    decision_states: OFFICIAL_DECISION_STATES,
    guide_recommendations: GUIDE_RECOMMENDATIONS
  });
});

// GET /api/projects/guide/assigned - Retrieve proposals assigned to the authenticated guide
const GUIDE_ROLES = [...RIC_ROLES, 'faculty_principal', 'guide', 'institutional_user'];
router.get('/guide/assigned', authenticate, requireRole(GUIDE_ROLES), async (req, res) => {
  try {
    const projects = await listProjectsForGuide(req.user);
    return res.json({
      projects: projects.map((p) => visibleProject(p, req.user)),
      count: projects.length,
      guide: {
        id: req.user.id,
        name: req.user.name,
        role: req.user.role
      }
    });
  } catch (err) {
    console.error('[Guide Assigned Projects Error]', err);
    return res.status(500).json({ error: 'Failed to retrieve assigned guide projects.' });
  }
});

// GET /api/projects/:projectId - Read single proposal (CRUD: Read)
router.get('/:projectId', authenticate, async (req, res) => {
  try {
    const project = await getProjectRecord(req.params.projectId, req.user);
    if (!project) {
      return res.status(404).json({ error: 'Project not found or access restricted.' });
    }
    return res.json({ project: visibleProject(project, req.user) });
  } catch (err) {
    console.error('[Get Project Error]', err);
    return res.status(500).json({ error: 'Failed to retrieve project details.' });
  }
});

// POST /api/projects - Create proposal (CRUD: Create)
router.post('/', authenticate, requireRole(SUBMITTER_ROLES), async (req, res) => {
  const { data, error } = validateSubmission(req.body);
  if (error) return res.status(400).json({ error });

  try {
    const [departments, faculty] = await Promise.all([listDepartments(), listFaculty()]);
    const assignment = validateProjectAssignment({
      departmentId: cleanText(req.body.department_id),
      leadFacultyId: cleanText(req.body.lead_faculty_id),
      teamMemberIds: req.body.team_member_ids,
      departments,
      faculty
    });
    if (assignment.error) return res.status(400).json({ error: assignment.error });
    Object.assign(data, assignment.data);
    if (!data.guide_teacher) {
      data.guide_teacher = data.lead_investigator;
    }

    // Module 5: compare stored projects and keep an advisory report. Status stays pending.
    const report = await buildSimilarityReport(data, null);
    const year = new Date().getFullYear();
    const projectCode = `BVM/RIC/${year}/${getDepartmentCode(data.department)}/${randomBytes(4).toString('hex').toUpperCase()}`;

    const project = await createProjectRecord({
      ...data,
      project_code: projectCode,
      submitted_by: req.user.id,
      submitted_by_name: req.user.name,
      similarity_matches: report.similarity_matches,
      similarity_score: report.similarity_score,
      similarity_checked_at: report.similarity_checked_at,
      similarity_notice: report.similarity_notice,
      status: 'pending',
      submitted_date: new Date(),
      last_activity: report.similarity_matches.length
        ? `Proposal submitted (AI similarity ${report.similarity_score}% saved for RIC reference)`
        : 'Proposal submitted for RIC evaluation'
    });

    // Asynchronously dispatch email notification via Gmail
    (async () => {
      try {
        const allFaculty = await listFaculty();
        const guide = allFaculty.find((f) => f.id === data.guide_id || f.name === data.guide_name);
        await sendProposalSubmittedNotification({ student: req.user, project, guide });
      } catch (mailErr) {
        console.error('[Email Notification Error]', mailErr.message);
      }
    })();

    return res.status(201).json({
      message: 'Project submitted for RIC evaluation.',
      project: visibleProject(project, req.user),
      similarityMatches: report.similarity_matches,
      automatic_rejection: false
    });
  } catch (err) {
    if (err.code === 11000 || err.code === 'PROJECT_CODE_CONFLICT') {
      return res.status(409).json({ error: 'Could not assign a unique project code. Please submit again.' });
    }
    console.error('[Project Submission Error]', err);
    return res.status(500).json({ error: 'Failed to submit project.' });
  }
});

// PUT /api/projects/:projectId - Update proposal (CRUD: Update)
router.put('/:projectId', authenticate, requireRole(SUBMITTER_ROLES), async (req, res) => {
  const { data, error } = validateSubmission(req.body);
  if (error) return res.status(400).json({ error });

  try {
    const [departments, faculty] = await Promise.all([listDepartments(), listFaculty()]);

    if (req.body.department_id || req.body.lead_faculty_id) {
      const assignment = validateProjectAssignment({
        departmentId: cleanText(req.body.department_id),
        leadFacultyId: cleanText(req.body.lead_faculty_id),
        teamMemberIds: req.body.team_member_ids,
        departments,
        faculty
      });
      if (assignment.error) return res.status(400).json({ error: assignment.error });
      Object.assign(data, assignment.data);
    }
    if (!data.guide_teacher && data.lead_investigator) {
      data.guide_teacher = data.lead_investigator;
    }

    const report = await buildSimilarityReport(data, req.params.projectId);
    data.similarity_matches = report.similarity_matches;
    data.similarity_score = report.similarity_score;
    data.similarity_checked_at = report.similarity_checked_at;
    data.similarity_notice = report.similarity_notice;

    const result = await updateProjectRecord(req.params.projectId, req.user.id, data, req.user);
    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    return res.json({
      message: 'Project proposal updated successfully.',
      project: visibleProject(result.project, req.user),
      similarityMatches: report.similarity_matches,
      automatic_rejection: false
    });
  } catch (err) {
    console.error('[Project Update Error]', err);
    return res.status(500).json({ error: 'Failed to update project proposal.' });
  }
});

// DELETE /api/projects/:projectId - Withdraw / Delete proposal (CRUD: Delete)
router.delete('/:projectId', authenticate, requireRole(SUBMITTER_ROLES), async (req, res) => {
  try {
    const result = await deleteProjectRecord(req.params.projectId, req.user.id, req.user);
    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }
    return res.json({
      message: `Project proposal ${result.deletedCode} withdrawn successfully.`,
      deletedCode: result.deletedCode
    });
  } catch (err) {
    console.error('[Project Deletion Error]', err);
    return res.status(500).json({ error: 'Failed to withdraw project proposal.' });
  }
});

// PATCH /api/projects/:projectId/review - RIC Committee Review
router.patch('/:projectId/review', authenticate, requireRole(RIC_ROLES), async (req, res) => {
  const { update, error } = createReviewUpdate(req.body.decision, req.body.comment, req.user);
  if (error) return res.status(400).json({ error });

  try {
    const project = await updateProjectReview(req.params.projectId, update);
    if (!project) {
      return res.status(404).json({ error: 'Pending project was not found or has already been reviewed.' });
    }
    return res.json({ message: 'RIC review decision recorded.', project });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ error: 'Pending project was not found or has already been reviewed.' });
    }
    console.error('[Project Review Error]', err);
    return res.status(500).json({ error: 'Failed to save the RIC review decision.' });
  }
});

// PATCH /api/projects/:projectId/resubmit - Student Resubmission
router.patch('/:projectId/resubmit', authenticate, requireRole(['student']), async (req, res) => {
  const { data, error } = validateSubmission(req.body);
  if (error) return res.status(400).json({ error });

  try {
    const report = await buildSimilarityReport({
      ...data,
      department: cleanText(req.body.department)
    }, req.params.projectId);

    const project = await resubmitProjectRecord(req.params.projectId, req.user.id, {
      ...data,
      similarity_matches: report.similarity_matches,
      similarity_score: report.similarity_score,
      similarity_checked_at: report.similarity_checked_at,
      similarity_notice: report.similarity_notice,
      status: 'pending'
    });
    if (!project) {
      return res.status(404).json({ error: 'A project awaiting changes for this student was not found.' });
    }
    return res.json({
      message: 'Revised project resubmitted for RIC evaluation.',
      project: visibleProject(project, req.user),
      similarityMatches: report.similarity_matches,
      automatic_rejection: false
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ error: 'A project awaiting changes for this student was not found.' });
    }
    console.error('[Project Resubmission Error]', err);
    return res.status(500).json({ error: 'Failed to resubmit project.' });
  }
});

// POST /api/projects/:projectId/guide-review - Record project guide recommendation & review comments (Section 8)
router.post('/:projectId/guide-review', authenticate, requireRole(GUIDE_ROLES), async (req, res) => {
  try {
    const project = await getProjectRecord(req.params.projectId, req.user);
    if (!project) return res.status(404).json({ error: 'Project proposal not found.' });

    const { data: reviewData, error } = validateGuideReviewInput(req.body, req.user);
    if (error) return res.status(400).json({ error });

    const result = await recordGuideReview(req.params.projectId, reviewData, req.user);
    if (result.error) return res.status(result.status || 400).json({ error: result.error });

    // Asynchronously dispatch guide review notification email via Gmail
    (async () => {
      try {
        const allUsers = await listUsers();
        const studentUser = allUsers.find((u) => (u.id || u._id || '').toString() === (project.submitted_by || '').toString()) || {
          name: project.student_name || project.submitted_by_name || 'Student Researcher',
          email: project.student_email || ''
        };
        await sendGuideReviewNotification({
          student: studentUser,
          project: result.project || project,
          guide: req.user,
          review: reviewData
        });
      } catch (mailErr) {
        console.error('[Guide Review Email Error]', mailErr.message);
      }
    })();

    return res.json({
      message: reviewData.status === 'revision_required'
        ? 'Proposal returned to student with revision comments.'
        : 'Guide review recorded and forwarded to RIC review workflow.',
      project: visibleProject(result.project, req.user),
      guide_review: reviewData
    });
  } catch (err) {
    console.error('[Guide Review Error]', err);
    return res.status(500).json({ error: 'Failed to submit guide review.' });
  }
});

// POST /api/projects/:projectId/official-decision - Record official RIC Council approval decision (Section 9)
router.post('/:projectId/official-decision', authenticate, requireRole(RIC_ROLES), async (req, res) => {
  try {
    const project = await getProjectRecord(req.params.projectId, req.user);
    if (!project) return res.status(404).json({ error: 'Project proposal not found.' });

    const { data: decisionPayload, error } = validateOfficialDecisionInput(req.body, req.user, project);
    if (error) return res.status(400).json({ error });

    const result = await recordOfficialDecision(req.params.projectId, decisionPayload, req.user);
    if (result.error) return res.status(result.status || 400).json({ error: result.error });

    // Asynchronously dispatch official RIC decision notification email via Gmail
    (async () => {
      try {
        const allUsers = await listUsers();
        const studentUser = allUsers.find((u) => (u.id || u._id || '').toString() === (project.submitted_by || '').toString()) || {
          name: project.student_name || project.submitted_by_name || 'Student Researcher',
          email: project.student_email || ''
        };
        const allFaculty = await listFaculty();
        const guideUser = allFaculty.find((f) => f.id === project.guide_id || f.name === project.guide_name);
        await sendRICDecisionNotification({
          student: studentUser,
          project: result.project || project,
          guide: guideUser,
          decision: decisionPayload.status,
          comments: decisionPayload.official_decision.comments,
          conditions: decisionPayload.official_decision.conditions,
          approvalLetter: decisionPayload.approval_letter
        });
      } catch (mailErr) {
        console.error('[Official Decision Email Error]', mailErr.message);
      }
    })();

    return res.json({
      message: `Official RIC Council decision recorded: ${decisionPayload.official_decision.decision_label}.`,
      project: visibleProject(result.project, req.user),
      official_decision: decisionPayload.official_decision,
      approval_letter: decisionPayload.approval_letter
    });
  } catch (err) {
    console.error('[Official Decision Error]', err);
    return res.status(500).json({ error: 'Failed to record official RIC decision.' });
  }
});

// =============================================================================
// MODULE 6: PROJECT REVIEW AND EVALUATION ENDPOINTS
// =============================================================================

// GET /api/projects/criteria/rubric - Get fixed criteria rubric
router.get('/criteria/rubric', authenticate, (req, res) => {
  return res.json({
    criteria: EVALUATION_CRITERIA,
    recommendations: EVALUATION_RECOMMENDATIONS
  });
});

// GET /api/projects/committee/reviewers - List available RIC reviewers
router.get('/committee/reviewers', authenticate, requireRole(RIC_ROLES), async (req, res) => {
  try {
    const allUsers = await listUsers();
    const reviewers = allUsers
      .filter((u) => u.is_active !== false && RIC_ROLES.includes(u.role))
      .map((u) => ({
        id: u._id ? u._id.toString() : u.id,
        _id: u._id ? u._id.toString() : u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        designation: u.designation || 'RIC Committee Member',
        department: u.department || 'Research & Innovation Cell'
      }));
    return res.json({ reviewers });
  } catch (err) {
    console.error('[Get Reviewers Error]', err);
    return res.status(500).json({ error: 'Failed to retrieve reviewers.' });
  }
});

// POST /api/projects/:projectId/assign-reviewers - Assign proposal to RIC reviewers
router.post('/:projectId/assign-reviewers', authenticate, requireRole([...RIC_ROLES, 'admin']), async (req, res) => {
  try {
    const allUsers = await listUsers();
    const reviewerIds = Array.isArray(req.body.reviewer_ids) ? req.body.reviewer_ids : [];
    const { data: assignedReviewers, error } = validateReviewerAssignment(reviewerIds, allUsers, req.user);
    if (error) return res.status(400).json({ error });

    const result = await assignProjectReviewers(req.params.projectId, assignedReviewers, req.user, req.user);
    if (result.error) return res.status(result.status || 400).json({ error: result.error });

    return res.json({
      message: `Successfully assigned ${assignedReviewers.length} reviewer(s).`,
      project: visibleProject(result.project, req.user),
      assigned_reviewers: assignedReviewers
    });
  } catch (err) {
    console.error('[Assign Reviewers Error]', err);
    return res.status(500).json({ error: 'Failed to assign reviewers.' });
  }
});

// POST /api/projects/:projectId/evaluate - Submit individual RIC evaluation with fixed criteria
router.post('/:projectId/evaluate', authenticate, requireRole(RIC_ROLES), async (req, res) => {
  try {
    const project = await getProjectRecord(req.params.projectId, req.user);
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    // Authorization: Must be assigned reviewer OR RIC Head / Admin
    const isHead = ['ric_head', 'ric_admin'].includes(req.user.role);
    const isAssigned = Array.isArray(project.assigned_reviewers) &&
      project.assigned_reviewers.some((r) => r.user_id === req.user.id);

    if (!isHead && !isAssigned) {
      return res.status(403).json({
        error: 'You are not assigned as an authorized reviewer for this proposal.'
      });
    }

    const { data: evaluationData, error } = validateEvaluationSubmission(req.body, req.user);
    if (error) return res.status(400).json({ error });

    const result = await addProjectEvaluation(req.params.projectId, evaluationData, req.user, req.user);
    if (result.error) return res.status(result.status || 400).json({ error: result.error });

    return res.status(201).json({
      message: 'Evaluation successfully recorded.',
      evaluation: result.evaluation,
      summary: result.summary,
      project: visibleProject(result.project, req.user)
    });
  } catch (err) {
    console.error('[Submit Evaluation Error]', err);
    return res.status(500).json({ error: 'Failed to record proposal evaluation.' });
  }
});

// GET /api/projects/:projectId/evaluations - Retrieve all historical evaluations for a proposal
router.get('/:projectId/evaluations', authenticate, requireRole([...RIC_ROLES, 'faculty_principal', 'student']), async (req, res) => {
  try {
    const project = await getProjectRecord(req.params.projectId, req.user);
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    if (req.user.role === 'student' && project.submitted_by !== req.user.id && !project.is_submitted_by_user) {
      return res.status(403).json({ error: 'Access denied. You can only view evaluations for your own proposals.' });
    }

    return res.json({
      project_code: project.project_code,
      title: project.title,
      evaluations: project.evaluations || [],
      summary: project.evaluation_summary || { total_evaluations: 0, average_score: 0, consensus_recommendation: 'Awaiting Evaluation' },
      assigned_reviewers: project.assigned_reviewers || []
    });
  } catch (err) {
    console.error('[Get Evaluations Error]', err);
    return res.status(500).json({ error: 'Failed to retrieve proposal evaluations.' });
  }
});

export default router;
