import { randomBytes, randomUUID } from 'node:crypto';

export const RIC_REVIEW_ROLES = Object.freeze(['ric_head', 'ric_admin', 'ric_member']);

const DECISION_STATUSES = Object.freeze({
  approve: 'approved',
  reject: 'rejected',
  request_changes: 'changes_requested'
});

/**
 * Module 6: Fixed Criteria Evaluation Rubric
 * Each criterion is scored out of 20 points, totaling 100 points.
 */
export const EVALUATION_CRITERIA = Object.freeze([
  {
    id: 'novelty',
    label: 'Originality & Novelty',
    description: 'Novelty of problem statement, intellectual originality, and differentiation from existing work.',
    max_score: 20
  },
  {
    id: 'methodology',
    label: 'Academic & Technical Methodology',
    description: 'Soundness of research design, algorithmic or experimental rigor, and data validation plan.',
    max_score: 20
  },
  {
    id: 'feasibility',
    label: 'Feasibility & Implementation Plan',
    description: 'Practicality of execution timeline, resource allocation, and mentorship alignment.',
    max_score: 20
  },
  {
    id: 'impact',
    label: 'Societal & Institutional Impact',
    description: 'Practical utility to society / Kerala region, publication, intellectual property, or commercial potential.',
    max_score: 20
  },
  {
    id: 'clarity',
    label: 'Clarity of Objectives & Deliverables',
    description: 'Precision of research objectives, quality of expected deliverables, and documentation standard.',
    max_score: 20
  }
]);

export const EVALUATION_RECOMMENDATIONS = Object.freeze([
  'Approve',
  'Revision Required',
  'Reject'
]);

export function createReviewUpdate(decision, rawComment, reviewer, reviewedAt = new Date()) {
  if (!Object.prototype.hasOwnProperty.call(DECISION_STATUSES, decision)) {
    return { error: 'Choose approve, reject, or request changes.' };
  }

  const status = DECISION_STATUSES[decision];
  const comment = typeof rawComment === 'string' ? rawComment.trim() : '';
  if (comment.length > 2000) {
    return { error: 'Review comments must be 2,000 characters or fewer.' };
  }
  if (status !== 'approved' && !comment) {
    return { error: 'A review comment is required when rejecting or requesting changes.' };
  }

  const action = status === 'approved'
    ? 'Approved'
    : status === 'rejected'
      ? 'Rejected'
      : 'Changes requested';

  return {
    update: {
      status,
      review_comment: comment,
      reviewed_by: reviewer.id,
      reviewed_by_name: reviewer.name,
      reviewed_at: reviewedAt,
      last_activity: `${action} by RIC: ${reviewer.name}`
    }
  };
}

export function applyReviewUpdate(project, reviewUpdate, updatedAt = new Date().toISOString()) {
  if (!project || project.status !== 'pending') return null;
  return { ...project, ...reviewUpdate, updatedAt };
}

/**
 * Module 6: Reviewer Assignment Validation
 */
export function validateReviewerAssignment(reviewerIds, allUsers, assigner) {
  if (!assigner || !['ric_head', 'ric_admin', 'ric_member', 'admin'].includes(assigner.role)) {
    return { error: 'Only the RIC Head or RIC Administrator can assign reviewers.' };
  }

  if (!Array.isArray(reviewerIds) || reviewerIds.length === 0) {
    return { error: 'Select at least one RIC reviewer to assign.' };
  }

  const assignedList = [];
  for (const id of reviewerIds) {
    const user = allUsers.find((u) => (u._id === id || u.id === id));
    if (!user) {
      return { error: `User with ID "${id}" was not found.` };
    }
    if (!RIC_REVIEW_ROLES.includes(user.role)) {
      return { error: `"${user.name}" does not hold an authorized RIC committee role.` };
    }
    assignedList.push({
      user_id: user._id || user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      designation: user.designation || 'RIC Committee Member',
      assigned_at: new Date().toISOString(),
      assigned_by: assigner.id,
      assigned_by_name: assigner.name
    });
  }

  return { data: assignedList };
}

/**
 * Module 6: Validate Individual Evaluation Submission against Fixed Criteria
 */
export function validateEvaluationSubmission(body, reviewer) {
  if (!reviewer || !RIC_REVIEW_ROLES.includes(reviewer.role)) {
    return { error: 'Only authorized RIC members can submit proposal evaluations.' };
  }

  const scores = body.criteria_scores || {};
  const criteriaScores = {};
  let totalScore = 0;

  for (const criterion of EVALUATION_CRITERIA) {
    const rawVal = scores[criterion.id];
    if (rawVal === undefined || rawVal === null || rawVal === '') {
      return { error: `Score for "${criterion.label}" is required.` };
    }
    const num = Number(rawVal);
    if (isNaN(num) || num < 0 || num > criterion.max_score) {
      return {
        error: `Score for "${criterion.label}" must be between 0 and ${criterion.max_score}.`
      };
    }
    criteriaScores[criterion.id] = Math.round(num * 10) / 10;
    totalScore += criteriaScores[criterion.id];
  }

  totalScore = Math.round(totalScore * 10) / 10;

  const recommendation = typeof body.recommendation === 'string' ? body.recommendation.trim() : '';
  if (!EVALUATION_RECOMMENDATIONS.includes(recommendation)) {
    return { error: `Recommendation must be one of: ${EVALUATION_RECOMMENDATIONS.join(', ')}.` };
  }

  const comments = typeof body.comments === 'string' ? body.comments.trim() : '';
  if (!comments) {
    return { error: 'Evaluation comments and recommendations are required.' };
  }
  if (comments.length > 3000) {
    return { error: 'Evaluation comments must be 3,000 characters or fewer.' };
  }

  return {
    data: {
      evaluation_id: `eval_${randomUUID()}`,
      reviewer_id: reviewer.id,
      reviewer_name: reviewer.name,
      reviewer_email: reviewer.email || '',
      reviewer_role: reviewer.role,
      criteria_scores: criteriaScores,
      total_score: totalScore,
      recommendation,
      comments,
      evaluated_at: new Date().toISOString()
    }
  };
}

/**
 * Module 6: Compute Aggregated Evaluation Summary
 */
export function computeEvaluationSummary(evaluations = []) {
  if (!Array.isArray(evaluations) || evaluations.length === 0) {
    return {
      total_evaluations: 0,
      average_score: 0,
      consensus_recommendation: 'Awaiting Evaluation'
    };
  }

  const totalScoreSum = evaluations.reduce((sum, e) => sum + (Number(e.total_score) || 0), 0);
  const averageScore = Math.round((totalScoreSum / evaluations.length) * 10) / 10;

  const counts = {};
  evaluations.forEach((e) => {
    counts[e.recommendation] = (counts[e.recommendation] || 0) + 1;
  });

  let consensus = 'Approve';
  let maxCount = -1;
  for (const [rec, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      consensus = rec;
    }
  }

  return {
    total_evaluations: evaluations.length,
    average_score: averageScore,
    consensus_recommendation: consensus
  };
}

export const OFFICIAL_DECISION_STATES = Object.freeze([
  {
    key: 'approved',
    label: 'Approved',
    description: 'The proposal is accepted.'
  },
  {
    key: 'approved_with_modifications',
    label: 'Approved with modifications',
    description: 'The proposal is accepted subject to specified minor changes.'
  },
  {
    key: 'changes_requested',
    label: 'Changes required',
    description: 'The student must revise the proposal and resubmit it.'
  },
  {
    key: 'topic_change_required',
    label: 'Topic change required',
    description: 'RIC requires a different or substantially revised topic.'
  },
  {
    key: 'rejected',
    label: 'Rejected',
    description: 'The proposal is not accepted, with reasons recorded.'
  },
  {
    key: 'further_review',
    label: 'Further review',
    description: 'Additional examination is required before a decision.'
  }
]);

export const GUIDE_RECOMMENDATIONS = Object.freeze([
  'recommended',
  'revision_required',
  'not_recommended'
]);

export function validateGuideReviewInput(body = {}, guideUser = {}) {
  const recommendation = typeof body.recommendation === 'string' ? body.recommendation.trim().toLowerCase() : '';
  const comments = typeof body.comments === 'string' ? body.comments.trim() : '';

  if (!GUIDE_RECOMMENDATIONS.includes(recommendation)) {
    return {
      error: `Guide recommendation must be one of: ${GUIDE_RECOMMENDATIONS.join(', ')}.`
    };
  }

  if (comments.length > 3000) {
    return { error: 'Guide comments must be 3,000 characters or fewer.' };
  }

  if (recommendation !== 'recommended' && !comments) {
    return { error: 'Comments are required when requesting revisions or marking not recommended.' };
  }

  const now = new Date().toISOString();
  return {
    data: {
      reviewer_id: guideUser.id || guideUser._id || '',
      reviewer_name: guideUser.name || 'Project Guide',
      status: recommendation,
      comments,
      reviewed_at: now
    }
  };
}

export function validateOfficialDecisionInput(body = {}, user = {}, project = {}) {
  const decision = typeof body.decision === 'string' ? body.decision.trim().toLowerCase() : '';
  const validKeys = OFFICIAL_DECISION_STATES.map((d) => d.key);

  if (!validKeys.includes(decision)) {
    return {
      error: `Official decision must be one of: ${validKeys.join(', ')}.`
    };
  }

  const comments = typeof body.comments === 'string' ? body.comments.trim() : '';
  const reasons = typeof body.reasons === 'string' ? body.reasons.trim() : (comments || '');
  const conditions = typeof body.conditions === 'string' ? body.conditions.trim() : '';

  if (comments.length > 5000 || reasons.length > 5000 || conditions.length > 3000) {
    return { error: 'Decision text fields exceed maximum length.' };
  }

  if (['rejected', 'changes_requested', 'topic_change_required'].includes(decision) && !comments && !reasons) {
    return { error: 'Reasons/comments are required for this official decision.' };
  }

  const stateObj = OFFICIAL_DECISION_STATES.find((d) => d.key === decision);
  const now = new Date().toISOString();
  const yearCode = (project.academic_year || '2026-27').replace(/[^0-9-]/g, '') || '2026-27';

  // Support for Live RIC Panel Interview & Oral Defense Evaluation
  const isPanelInterview = Boolean(body.is_panel_interview || body.interview_venue || body.panel_members);
  let panelInterview = null;
  if (isPanelInterview) {
    const defaultVivaScores = {
      presentation: 18,
      methodology: 18,
      defense: 18,
      feasibility: 18,
      novelty: 18
    };
    const vivaScores = body.viva_scores && typeof body.viva_scores === 'object'
      ? { ...defaultVivaScores, ...body.viva_scores }
      : defaultVivaScores;

    const computedTotal = Object.values(vivaScores).reduce((acc, s) => acc + (Number(s) || 0), 0);
    const totalScore = Number(body.total_score) || computedTotal || 90;

    panelInterview = {
      interview_date: body.interview_date || now,
      interview_venue: body.interview_venue || 'Research & Innovation Cell (RIC) Room',
      interview_mode: body.interview_mode || 'In-Person Oral Defense & Viva Voce',
      panel_members: body.panel_members || (user.name ? `${user.name} (RIC Member)` : 'RIC Evaluation Committee'),
      viva_scores: vivaScores,
      total_score: totalScore,
      panel_observations: comments || body.panel_observations || 'Candidate defended the research proposal satisfactorily before the RIC evaluation committee.',
      verdict: stateObj ? stateObj.label : decision,
      conducted_by: user.name,
      conducted_by_id: user.id || user._id,
      conducted_at: now
    };
  }

  let approvalLetter = null;
  if (decision === 'approved' || decision === 'approved_with_modifications') {
    approvalLetter = {
      letter_number: body.letter_number || `BVM/RIC/APPR/${yearCode}/${randomBytes(3).toString('hex').toUpperCase()}`,
      issue_date: now,
      signatory_name: body.signatory_name || user.name || 'Rev. Fr. Principal & RIC Head',
      signatory_title: body.signatory_title || 'Head, Research & Innovation Cell / Principal',
      college_name: 'Bishop Vayalil Memorial Holy Cross College, Cherpunkal',
      conditions: conditions || (decision === 'approved_with_modifications' ? comments : 'Standard Institutional Research Ethics & Progress Compliance'),
      verification_status: isPanelInterview ? 'Official Sanction Accorded via RIC Panel Interview' : 'Official Sanction Granted',
      panel_interview: panelInterview
    };
  }

  const decisionRecord = {
    decision,
    decision_label: stateObj ? stateObj.label : decision,
    decision_date: now,
    decided_by: user.id || user._id,
    decided_by_name: user.name,
    comments,
    reasons,
    conditions,
    panel_interview: panelInterview,
    approval_letter: approvalLetter
  };

  return {
    data: {
      official_decision: decisionRecord,
      panel_interview: panelInterview,
      approval_letter: approvalLetter,
      status: decision,
      last_activity: isPanelInterview
        ? `Approved via RIC Panel Interview by ${user.name} (Score: ${panelInterview.total_score}/100)`
        : `Official RIC Decision: ${stateObj ? stateObj.label : decision} by ${user.name}`
    }
  };
}
