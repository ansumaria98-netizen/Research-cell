import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EVALUATION_CRITERIA,
  EVALUATION_RECOMMENDATIONS,
  validateReviewerAssignment,
  validateEvaluationSubmission,
  computeEvaluationSummary
} from '../src/services/projectReview.js';
import {
  createProjectRecord,
  deleteProjectRecord,
  getProjectRecord,
  assignProjectReviewers,
  addProjectEvaluation
} from '../src/db/projectRepository.js';

test('Module 6: Reviewer assignment requires RIC Head/Admin and valid RIC committee members', () => {
  const ricHead = {
    id: 'user_ric_head_01',
    name: 'Dr. Teresa John',
    email: 'ric.head@bvmcherpunkal.edu.in',
    role: 'ric_head'
  };

  const studentUser = {
    id: 'user_student_01',
    name: 'Student User',
    email: 'student@bvmcherpunkal.edu.in',
    role: 'student'
  };

  const reviewer1 = {
    _id: 'user_rev_01',
    name: 'Prof. Ansu Varghese',
    email: 'ansu@bvmcollege.com',
    role: 'ric_member',
    designation: 'Assistant Professor & RIC Member'
  };

  const reviewer2 = {
    _id: 'user_rev_02',
    name: 'Dr. Principal',
    email: 'principal@bvmcherpunkal.edu.in',
    role: 'ric_admin',
    designation: 'Principal'
  };

  const allUsers = [ricHead, studentUser, reviewer1, reviewer2];

  // 1. Rejects if assigner is a student or non-admin
  const studentAttempt = validateReviewerAssignment(['user_rev_01'], allUsers, studentUser);
  assert.ok(studentAttempt.error);
  assert.match(studentAttempt.error, /Only the RIC Head or RIC Administrator can assign reviewers/i);

  // 2. Rejects empty reviewer array
  const emptyAttempt = validateReviewerAssignment([], allUsers, ricHead);
  assert.ok(emptyAttempt.error);
  assert.match(emptyAttempt.error, /Select at least one RIC reviewer/i);

  // 3. Rejects assigning a student or non-RIC member
  const nonRicAttempt = validateReviewerAssignment(['user_student_01'], allUsers, ricHead);
  assert.ok(nonRicAttempt.error);
  assert.match(nonRicAttempt.error, /does not hold an authorized RIC committee role/i);

  // 4. Successfully assigns valid RIC reviewers
  const validAssignment = validateReviewerAssignment(['user_rev_01', 'user_rev_02'], allUsers, ricHead);
  assert.ok(!validAssignment.error);
  assert.equal(validAssignment.data.length, 2);
  assert.equal(validAssignment.data[0].user_id, 'user_rev_01');
  assert.equal(validAssignment.data[0].name, 'Prof. Ansu Varghese');
  assert.equal(validAssignment.data[0].assigned_by, ricHead.id);
  assert.equal(validAssignment.data[1].user_id, 'user_rev_02');
});

test('Module 6: Fixed criteria evaluation validates scores (0-20 per criterion), recommendations, and comments', () => {
  const reviewer = {
    id: 'user_rev_01',
    name: 'Prof. Ansu Varghese',
    email: 'ansu@bvmcollege.com',
    role: 'ric_member'
  };

  // 1. Rejects missing criterion
  const missingCriterion = {
    criteria_scores: {
      novelty: 18,
      methodology: 17,
      feasibility: 16,
      impact: 19
      // clarity missing
    },
    recommendation: 'Approve',
    comments: 'Strong proposal with clear methodology.'
  };
  const res1 = validateEvaluationSubmission(missingCriterion, reviewer);
  assert.ok(res1.error);
  assert.match(res1.error, /Clarity of Objectives & Deliverables/i);

  // 2. Rejects out of range score (> 20)
  const outOfRange = {
    criteria_scores: {
      novelty: 25, // Invalid > 20
      methodology: 17,
      feasibility: 16,
      impact: 19,
      clarity: 18
    },
    recommendation: 'Approve',
    comments: 'Exceeds maximum score.'
  };
  const res2 = validateEvaluationSubmission(outOfRange, reviewer);
  assert.ok(res2.error);
  assert.match(res2.error, /must be between 0 and 20/i);

  // 3. Rejects invalid recommendation
  const invalidRec = {
    criteria_scores: {
      novelty: 15,
      methodology: 15,
      feasibility: 15,
      impact: 15,
      clarity: 15
    },
    recommendation: 'Maybe Later', // Invalid
    comments: 'Undecided proposal.'
  };
  const res3 = validateEvaluationSubmission(invalidRec, reviewer);
  assert.ok(res3.error);
  assert.match(res3.error, /Recommendation must be one of/i);

  // 4. Rejects empty comments
  const emptyComments = {
    criteria_scores: {
      novelty: 15,
      methodology: 15,
      feasibility: 15,
      impact: 15,
      clarity: 15
    },
    recommendation: 'Approve',
    comments: '   '
  };
  const res4 = validateEvaluationSubmission(emptyComments, reviewer);
  assert.ok(res4.error);
  assert.match(res4.error, /comments and recommendations are required/i);

  // 5. Valid submission computes total score (sum of all 5 criteria = 88)
  const validBody = {
    criteria_scores: {
      novelty: 18,
      methodology: 17,
      feasibility: 18,
      impact: 16,
      clarity: 19
    },
    recommendation: 'Approve',
    comments: 'Exemplary project formulation. The research design is sound and well aligned with institutional focus areas.'
  };
  const res5 = validateEvaluationSubmission(validBody, reviewer);
  assert.ok(!res5.error);
  assert.equal(res5.data.total_score, 88);
  assert.equal(res5.data.recommendation, 'Approve');
  assert.equal(res5.data.reviewer_name, 'Prof. Ansu Varghese');
});

test('Module 6: Aggregated evaluation summary computes average score and majority consensus', () => {
  const evaluations = [
    { total_score: 85, recommendation: 'Approve' },
    { total_score: 75, recommendation: 'Revision Required' },
    { total_score: 95, recommendation: 'Approve' }
  ];

  const summary = computeEvaluationSummary(evaluations);
  assert.equal(summary.total_evaluations, 3);
  // Average = (85 + 75 + 95) / 3 = 85.0
  assert.equal(summary.average_score, 85);
  // Consensus = 'Approve' (2 votes vs 1)
  assert.equal(summary.consensus_recommendation, 'Approve');

  // Empty list test
  const emptySummary = computeEvaluationSummary([]);
  assert.equal(emptySummary.total_evaluations, 0);
  assert.equal(emptySummary.average_score, 0);
  assert.equal(emptySummary.consensus_recommendation, 'Awaiting Evaluation');
});

test('Module 6: End-to-end repository workflow: assign reviewers, record evaluations, and persist records', async () => {
  const ricHead = {
    id: 'user_ric_head_01',
    name: 'Dr. Teresa John',
    email: 'ric.head@bvmcherpunkal.edu.in',
    role: 'ric_head'
  };

  const reviewer1 = {
    id: 'user_rev_01',
    name: 'Prof. Ansu Varghese',
    email: 'ansu@bvmcollege.com',
    role: 'ric_member'
  };

  const reviewer2 = {
    id: 'user_rev_02',
    name: 'Dr. Principal',
    email: 'principal@bvmcherpunkal.edu.in',
    role: 'ric_admin'
  };

  const testProjectCode = `BVM/RIC/2026/REV/${Date.now().toString().slice(-6)}`;
  const created = await createProjectRecord(
    {
      project_code: testProjectCode,
      title: 'Decentralized Crop Yield Prediction using IoT and Edge AI',
      department: 'Department of Computer Applications',
      lead_investigator: 'Robin Kuriakose',
      student_team_members: 'Robin Kuriakose, Albin Shaji',
      category: 'Research',
      status: 'pending',
      abstract: 'Deployment of edge AI microcontrollers for soil moisture and crop yield forecasting.',
      problem_statement: 'Smallholder spice farmers in Kottayam face erratic monsoons leading to crop losses.',
      objectives: '1. Build battery-efficient LoRa sensor nodes.\n2. Predict blight outbreaks.',
      methodology: 'Embedded tinyML models deployed on ESP32 microcontrollers.',
      keywords: 'Edge AI, IoT, Precision Agriculture, LoRaWAN',
      expected_results: 'Real-time alert delivery with 88% blight detection precision.'
    }
  );

  const projectId = created._id || created.project_code;

  try {
    // 1. Assign two reviewers
    const assignedList = [
      {
        user_id: reviewer1.id,
        name: reviewer1.name,
        email: reviewer1.email,
        role: reviewer1.role,
        designation: 'Assistant Professor',
        assigned_at: new Date().toISOString(),
        assigned_by: ricHead.id,
        assigned_by_name: ricHead.name
      },
      {
        user_id: reviewer2.id,
        name: reviewer2.name,
        email: reviewer2.email,
        role: reviewer2.role,
        designation: 'RIC Administrator',
        assigned_at: new Date().toISOString(),
        assigned_by: ricHead.id,
        assigned_by_name: ricHead.name
      }
    ];

    const assignResult = await assignProjectReviewers(projectId, assignedList, ricHead, ricHead);
    assert.ok(!assignResult.error);
    assert.equal(assignResult.project.assigned_reviewers.length, 2);

    // 2. Submit evaluation from reviewer 1 (Score: 84)
    const evalData1 = {
      evaluation_id: 'eval_test_01',
      reviewer_id: reviewer1.id,
      reviewer_name: reviewer1.name,
      reviewer_email: reviewer1.email,
      reviewer_role: reviewer1.role,
      criteria_scores: {
        novelty: 17,
        methodology: 18,
        feasibility: 16,
        impact: 17,
        clarity: 16
      },
      total_score: 84,
      recommendation: 'Approve',
      comments: 'Very well structured IoT architecture suitable for regional rubber and spice plantations.',
      evaluated_at: new Date().toISOString()
    };

    const evalResult1 = await addProjectEvaluation(projectId, evalData1, reviewer1, reviewer1);
    assert.ok(!evalResult1.error);
    assert.equal(evalResult1.summary.total_evaluations, 1);
    assert.equal(evalResult1.summary.average_score, 84);
    assert.equal(evalResult1.summary.consensus_recommendation, 'Approve');

    // 3. Submit evaluation from reviewer 2 (Score: 78, Revision Required)
    const evalData2 = {
      evaluation_id: 'eval_test_02',
      reviewer_id: reviewer2.id,
      reviewer_name: reviewer2.name,
      reviewer_email: reviewer2.email,
      reviewer_role: reviewer2.role,
      criteria_scores: {
        novelty: 15,
        methodology: 16,
        feasibility: 15,
        impact: 16,
        clarity: 16
      },
      total_score: 78,
      recommendation: 'Revision Required',
      comments: 'Include solar harvesting battery circuit analysis in the hardware methodology.',
      evaluated_at: new Date().toISOString()
    };

    const evalResult2 = await addProjectEvaluation(projectId, evalData2, reviewer2, reviewer2);
    assert.ok(!evalResult2.error);
    assert.equal(evalResult2.summary.total_evaluations, 2);
    // Average: (84 + 78) / 2 = 81.0
    assert.equal(evalResult2.summary.average_score, 81);

    // 4. Retrieve project and verify complete records permanence
    const fetched = await getProjectRecord(projectId, ricHead);
    assert.ok(fetched);
    assert.equal(fetched.evaluations.length, 2);
    assert.equal(fetched.evaluation_summary.total_evaluations, 2);
    assert.equal(fetched.evaluation_summary.average_score, 81);
    assert.equal(fetched.assigned_reviewers.length, 2);

    // Verify individual criteria breakdown is preserved
    const evalRec1 = fetched.evaluations.find((e) => e.reviewer_id === reviewer1.id);
    assert.ok(evalRec1);
    assert.equal(evalRec1.criteria_scores.novelty, 17);
    assert.equal(evalRec1.criteria_scores.methodology, 18);
    assert.equal(evalRec1.total_score, 84);
    assert.equal(evalRec1.recommendation, 'Approve');
    assert.match(evalRec1.comments, /suitable for regional rubber and spice plantations/);

  } finally {
    // Cleanup test record
    await deleteProjectRecord(projectId, ricHead);
  }
});
