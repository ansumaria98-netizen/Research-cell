import assert from 'node:assert/strict';
import test from 'node:test';
import {
  recordGuideReview,
  recordOfficialDecision,
  listProjectsForGuide,
  createProjectRecord,
  getProjectRecord
} from '../src/db/projectRepository.js';
import {
  OFFICIAL_DECISION_STATES,
  GUIDE_RECOMMENDATIONS,
  validateGuideReviewInput,
  validateOfficialDecisionInput
} from '../src/services/projectReview.js';

test('Guide Review Validation: validates recommendations and comments', () => {
  const guideUser = { id: 'fac-guide-1', name: 'Dr. Mathew Joseph' };

  // Valid recommended
  const validRec = validateGuideReviewInput({
    recommendation: 'recommended',
    comments: 'Strong proposal with clear methodology.'
  }, guideUser);
  assert.equal(validRec.error, undefined);
  assert.equal(validRec.data.status, 'recommended');
  assert.equal(validRec.data.reviewer_name, 'Dr. Mathew Joseph');

  // Valid revision_required
  const validRev = validateGuideReviewInput({
    recommendation: 'revision_required',
    comments: 'Please refine problem statement and objectives.'
  }, guideUser);
  assert.equal(validRev.error, undefined);
  assert.equal(validRev.data.status, 'revision_required');

  // Missing comments when revision_required
  const missingComment = validateGuideReviewInput({
    recommendation: 'revision_required',
    comments: ''
  }, guideUser);
  assert.match(missingComment.error, /Comments are required/i);

  // Invalid recommendation
  const invalidRec = validateGuideReviewInput({
    recommendation: 'passed'
  }, guideUser);
  assert.match(invalidRec.error, /Guide recommendation must be one of/i);
});

test('Official Decisions Validation: validates the 6 official decisions and generates approval letter', () => {
  const ricUser = { id: 'ric-user-1', name: 'Dr. Mathew Joseph (Head, RIC)', role: 'ric_head' };
  const project = { academic_year: '2026-27' };

  // All 6 states exist in specification
  const expectedKeys = [
    'approved',
    'approved_with_modifications',
    'changes_requested',
    'topic_change_required',
    'rejected',
    'further_review'
  ];
  const actualKeys = OFFICIAL_DECISION_STATES.map((d) => d.key);
  assert.deepEqual(actualKeys, expectedKeys);

  // Approved decision generates official approval letter
  const appDecision = validateOfficialDecisionInput({
    decision: 'approved',
    comments: 'Excellent interdisciplinary innovation proposal.',
    signatory_name: 'Rev. Fr. Principal & RIC Head'
  }, ricUser, project);
  assert.equal(appDecision.error, undefined);
  assert.equal(appDecision.data.status, 'approved');
  assert.ok(appDecision.data.approval_letter, 'Approval letter must be generated');
  assert.match(appDecision.data.approval_letter.letter_number, /^BVM\/RIC\/APPR\/2026-27\/[A-F0-9]+$/);
  assert.equal(appDecision.data.approval_letter.signatory_name, 'Rev. Fr. Principal & RIC Head');
  assert.equal(appDecision.data.approval_letter.college_name, 'Bishop Vayalil Memorial Holy Cross College, Cherpunkal');

  // Approved with modifications generates letter with conditions
  const modDecision = validateOfficialDecisionInput({
    decision: 'approved_with_modifications',
    comments: 'Approved subject to expanding literature review.',
    conditions: 'Submit expanded literature review within 15 days.'
  }, ricUser, project);
  assert.equal(modDecision.error, undefined);
  assert.equal(modDecision.data.status, 'approved_with_modifications');
  assert.ok(modDecision.data.approval_letter);
  assert.equal(modDecision.data.approval_letter.conditions, 'Submit expanded literature review within 15 days.');

  // Rejected requires reasons/comments
  const missingRej = validateOfficialDecisionInput({
    decision: 'rejected',
    comments: ''
  }, ricUser, project);
  assert.match(missingRej.error, /Reasons\/comments are required/i);
});

test('Guide Review Workflow: recordGuideReview updates status and preserves history', async () => {
  const guideUser = { id: 'fac-guide-test', name: 'Prof. Guide Tester' };
  const testProjectCode = `BVM/RIC/2026/TEST/${Date.now().toString().slice(-4)}`;

  const created = await createProjectRecord({
    project_code: testProjectCode,
    title: 'Test Guide Review Proposal',
    department: 'Department of Computer Applications',
    lead_investigator: 'Prof. Guide Tester',
    guide_teacher: 'Prof. Guide Tester',
    guide_name: 'Prof. Guide Tester',
    category: 'Research',
    abstract: 'Abstract for guide review workflow testing.',
    status: 'pending',
    academic_year: '2026-27'
  });

  // 1. Guide requests revision
  const revResult = await recordGuideReview(created._id, {
    reviewer_id: guideUser.id,
    reviewer_name: guideUser.name,
    status: 'revision_required',
    comments: 'Clarify research methodology.',
    reviewed_at: new Date().toISOString()
  }, guideUser);

  assert.equal(revResult.project.status, 'changes_requested');
  assert.equal(revResult.project.guide_review.status, 'revision_required');
  assert.equal(revResult.project.guide_review_history.length, 1);

  // 2. Guide recommends
  const recResult = await recordGuideReview(created._id, {
    reviewer_id: guideUser.id,
    reviewer_name: guideUser.name,
    status: 'recommended',
    comments: 'Methodology clarified, strongly recommended for RIC review.',
    reviewed_at: new Date().toISOString()
  }, guideUser);

  assert.equal(recResult.project.status, 'guide_reviewed');
  assert.equal(recResult.project.guide_review.status, 'recommended');
  assert.equal(recResult.project.guide_review_history.length, 2);
});

test('Official RIC Decision Workflow: recordOfficialDecision transitions status and preserves decision history', async () => {
  const ricUser = { id: 'ric-head-test', name: 'Dr. Mathew Joseph (Head, RIC)', role: 'ric_head' };
  const testProjectCode = `BVM/RIC/2026/OFFICIAL/${Date.now().toString().slice(-4)}`;

  const created = await createProjectRecord({
    project_code: testProjectCode,
    title: 'Official Decision Test Proposal',
    department: 'Department of Computer Applications',
    lead_investigator: 'Dr. Lead Researcher',
    category: 'Innovation',
    abstract: 'Testing official approval decision recording.',
    status: 'guide_reviewed',
    academic_year: '2026-27'
  });

  // Official decision: approved
  const { data: decisionPayload } = validateOfficialDecisionInput({
    decision: 'approved',
    comments: 'Approved without conditions by the RIC Board.',
    signatory_name: 'Rev. Fr. Principal & RIC Head'
  }, ricUser, created);

  const officialResult = await recordOfficialDecision(created._id, decisionPayload, ricUser);

  assert.equal(officialResult.project.status, 'approved');
  assert.equal(officialResult.project.official_decision.decision, 'approved');
  assert.ok(officialResult.project.approval_letter);
  assert.match(officialResult.project.approval_letter.letter_number, /^BVM\/RIC\/APPR\/2026-27\//);
  assert.equal(officialResult.project.decision_history.length, 1);
});
