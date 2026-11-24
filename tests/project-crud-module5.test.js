import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSimilarityReport,
  findSameDepartmentMatches,
  getSimilarityDetails,
  SIMILARITY_THRESHOLD
} from '../src/services/projectSimilarity.js';
import {
  createProjectRecord,
  deleteProjectRecord,
  getProjectRecord,
  saveSimilarityReport,
  updateProjectRecord
} from '../src/db/projectRepository.js';

test('Module 5: Multi-dimensional AI similarity checks all 6 dimensions', () => {
  const existingProject = {
    project_code: 'BVM/RIC/2026/TEST/001',
    department: 'Department of Computer Applications',
    title: 'Autonomous Quadcopter Navigation via Deep Reinforcement Learning',
    abstract: 'Development of an aerial obstacle avoidance system using edge tensor processing units.',
    problem_statement: 'Unmanned aerial vehicles struggle with dynamic obstacle navigation in cluttered dense forest canopies.',
    objectives: '1. Train PPO policy in Gazebo.\n2. Quantize actor-critic weights for Coral TPU.\n3. Validate GPS-denied indoor flight.',
    methodology: 'Reinforcement learning on simulated point clouds with low-latency SPI communication to flight controllers.',
    keywords: 'Autonomous Quadcopter, Reinforcement Learning, Edge TPU, Obstacle Avoidance, Robotics',
    expected_results: 'A collision-free trajectory planner navigating at 4 m/s in obstacle-dense environments.',
    expected_outcomes: 'A collision-free trajectory planner navigating at 4 m/s in obstacle-dense environments.',
    status: 'pending'
  };

  const newProposal = {
    department: 'Department of Computer Applications',
    title: 'Autonomous Drone Navigation via Deep Reinforcement Learning in Forest',
    abstract: 'Development of an aerial obstacle avoidance system using edge tensor processing units.',
    objectives: '1. Train PPO policy in Gazebo.\n2. Quantize actor-critic weights for Coral TPU.',
    methodology: 'Reinforcement learning on simulated point clouds with low-latency communication.',
    keywords: 'Autonomous Drone, Reinforcement Learning, Edge TPU, Obstacle Avoidance',
    expected_results: 'A collision-free trajectory planner navigating at 4 m/s in obstacle-dense environments.'
  };

  const details = getSimilarityDetails(existingProject, newProposal);

  // Verifies all 6 dimensions are evaluated and non-null
  assert.ok(details.score >= 65, `Expected composite score >= 65, got ${details.score}`);
  assert.ok(details.title_score >= 60, `Title score: ${details.title_score}`);
  assert.ok(details.abstract_score >= 65, `Abstract score: ${details.abstract_score}`);
  assert.ok(details.objectives_score >= 70, `Objectives score: ${details.objectives_score}`);
  assert.ok(details.methods_score >= 65, `Methods score: ${details.methods_score}`);
  assert.ok(details.keywords_score >= 65, `Keywords score: ${details.keywords_score}`);
  assert.ok(details.results_score >= 75, `Results score: ${details.results_score}`);

  // Breakdown contains all 6 dimensions
  assert.ok(details.breakdown.titles !== null);
  assert.ok(details.breakdown.abstracts !== null);
  assert.ok(details.breakdown.objectives !== null);
  assert.ok(details.breakdown.methods !== null);
  assert.ok(details.breakdown.keywords !== null);
  assert.ok(details.breakdown.expected_results !== null);

  // Common terms extracted
  assert.ok(Array.isArray(details.common_terms));
  assert.ok(details.common_terms.length > 0);
  assert.ok(details.common_terms.some((term) => ['reinforcement', 'learning', 'obstacle', 'avoidance'].includes(term)));

  // Matches in same department
  const matches = findSameDepartmentMatches(newProposal, [existingProject]);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].project_code, 'BVM/RIC/2026/TEST/001');
  assert.ok(matches[0].score >= SIMILARITY_THRESHOLD);
});

test('Module 5 ranks the closest stored project first and stays advisory', () => {
  const candidate = {
    department: 'Biology',
    title: 'Crop disease detection with leaf images',
    abstract: 'Leaf images are classified to detect crop disease.',
    objectives: 'Classify leaf images.',
    methodology: 'Train an image classifier.',
    keywords: 'crop disease, leaf images',
    expected_results: 'A leaf disease classifier.'
  };
  const closest = {
    project_code: 'HIGH',
    department: 'Biology',
    title: candidate.title,
    abstract: candidate.abstract,
    objectives: candidate.objectives,
    methodology: candidate.methodology,
    keywords: candidate.keywords,
    expected_results: candidate.expected_results,
    status: 'pending'
  };
  const partial = {
    project_code: 'LOW',
    department: 'Biology',
    title: 'Crop disease field survey notes',
    abstract: 'Farmers write crop disease notes during field visits.',
    objectives: 'Collect field notes.',
    methodology: 'Paper survey forms.',
    keywords: 'crop disease, survey',
    expected_results: 'A folder of field notes.',
    status: 'approved'
  };
  const report = createSimilarityReport(candidate, [partial, closest]);

  assert.equal(report.automatic_rejection, false);
  assert.match(report.similarity_notice, /never reject a project automatically/);
  assert.equal(report.similarity_matches[0].project_code, 'HIGH');
  assert.equal(report.similarity_score, report.similarity_matches[0].score);
  assert.ok(report.similarity_matches[0].score >= (report.similarity_matches[1] ? report.similarity_matches[1].score : 0));
  assert.equal(report.similarity_matches[0].breakdown.titles, 100);
  assert.ok(report.similarity_matches[0].breakdown.objectives !== null);
  assert.ok(report.similarity_matches[0].breakdown.methods !== null);
  assert.ok(report.similarity_matches[0].breakdown.keywords !== null);
  assert.ok(report.similarity_matches[0].breakdown.expected_results !== null);
});

test('Module 5 saves the similarity report for later RIC reference without rejecting the project', async () => {
  const department = 'Department of Computer Applications';
  const ricUser = { id: 'usr_ric_similarity', name: 'RIC Reviewer', role: 'ric_head', department };
  const studentUser = {
    id: 'usr_similarity_owner',
    name: 'Similarity Scholar',
    role: 'student',
    department
  };
  const stamp = Date.now().toString().slice(-6);
  const stored = await createProjectRecord({
    project_code: `BVM/RIC/2026/SIM/A${stamp}`,
    title: 'Campus rainwater quality sensing with low-cost electrodes',
    department,
    lead_investigator: 'Dr. Mathew Joseph',
    category: 'Research',
    status: 'approved',
    abstract: 'Electrode sensors measure runoff quality across the college campus.',
    objectives: 'Calibrate electrode sensors and publish a campus water dashboard.',
    methodology: 'Weekly sampling with calibrated conductivity probes.',
    keywords: 'rainwater, electrodes, campus, water quality',
    expected_results: 'A dashboard of seasonal runoff quality for campus maintenance.',
    submitted_by: 'usr_other_similarity'
  });
  const proposal = {
    title: 'Campus rainwater quality sensing using low-cost electrodes',
    department,
    abstract: stored.abstract,
    objectives: stored.objectives,
    methodology: stored.methodology,
    keywords: stored.keywords,
    expected_results: stored.expected_results
  };
  let created = null;

  try {
    const report = createSimilarityReport(proposal, [stored]);
    assert.equal(report.automatic_rejection, false);
    assert.ok(report.similarity_score >= SIMILARITY_THRESHOLD);
    assert.equal(report.similarity_matches[0].project_code, stored.project_code);

    created = await createProjectRecord({
      project_code: `BVM/RIC/2026/SIM/B${stamp}`,
      ...proposal,
      lead_investigator: 'Dr. Mathew Joseph',
      category: 'Research',
      status: 'pending',
      submitted_by: studentUser.id,
      submitted_by_name: studentUser.name
    });
    const saved = await saveSimilarityReport(created._id, report);
    assert.equal(saved.status, 'pending');
    assert.equal(saved.similarity_score, report.similarity_score);
    assert.match(saved.similarity_notice, /never reject/);

    const asRic = await getProjectRecord(created._id, ricUser);
    assert.equal(asRic.status, 'pending');
    assert.equal(asRic.similarity_matches[0].title, stored.title);
    assert.equal(asRic.similarity_matches[0].score, report.similarity_score);
    assert.ok(asRic.similarity_matches[0].breakdown.keywords !== null);

    const asOwner = await getProjectRecord(created._id, studentUser);
    assert.equal(asOwner.is_submitted_by_user, true);
    assert.equal(asOwner.similarity_matches[0].project_code, stored.project_code);
  } finally {
    await deleteProjectRecord(stored._id, ricUser.id, ricUser);
    if (created) await deleteProjectRecord(created._id, ricUser.id, ricUser);
  }
});

test('Student CRUD: Create, Read, Update, and Delete project proposals', async () => {
  const studentUser = {
    id: 'usr_test_student_crud',
    name: 'Test Student Scholar',
    email: 'test.student@bvmcherpunkal.edu.in',
    role: 'student',
    department: 'Department of Computer Applications'
  };

  const otherStudent = {
    id: 'usr_other_student',
    name: 'Other Student',
    email: 'other@bvmcherpunkal.edu.in',
    role: 'student',
    department: 'Department of Computer Applications'
  };

  const testProjectCode = `BVM/RIC/2026/TEST/${Date.now().toString().slice(-6)}`;

  // 1. CREATE (Module 4)
  const created = await createProjectRecord({
    project_code: testProjectCode,
    title: 'IoT Real-Time Weather Monitoring Station for Rubber Plantations',
    department: 'Department of Computer Applications',
    department_id: 'dept_computer_applications',
    programme: 'BCA (Honours) — Artificial Intelligence',
    guide_teacher: 'Dr. Mathew Joseph (Associate Professor)',
    lead_investigator: 'Dr. Mathew Joseph',
    lead_faculty_id: 'fac_bvm_ca_1',
    student_team_members: 'Test Student Scholar',
    category: 'Innovation',
    status: 'pending',
    abstract: 'Low-cost ESP32 LoRa sensor network for microclimate sensing across agricultural slopes.',
    problem_statement: 'Monsoon flooding and fungal attacks on rubber trees require localized soil and moisture monitoring.',
    objectives: '1. Deploy 10 LoRa sensor nodes.\n2. Ingest telemetry into campus dashboard.',
    methodology: 'Solar powered ESP32 transceivers sending packets over 868MHz to a Raspberry Pi gateway.',
    keywords: 'IoT, LoRa, ESP32, Rubber Plantation, Agriculture, Weather Telemetry',
    innovation: 'Off-grid mesh telemetry with zero mobile cellular carrier dependency.',
    expected_results: 'Real-time rainfall and temperature alerts 48 hours before crop blight outbreaks.',
    expected_outcomes: 'Real-time rainfall and temperature alerts 48 hours before crop blight outbreaks.',
    duration_months: 12,
    submitted_by: studentUser.id,
    submitted_by_name: studentUser.name,
    similarity_matches: [],
    similarity_score: 0
  });

  assert.ok(created._id, 'Project should be created with an _id');
  assert.equal(created.project_code, testProjectCode);
  assert.equal(created.status, 'pending');

  try {
    // 2. READ (Inspect Proposal)
    const fetched = await getProjectRecord(created._id, studentUser);
    assert.ok(fetched, 'Student should be able to read their own project');
    assert.equal(fetched.title, 'IoT Real-Time Weather Monitoring Station for Rubber Plantations');
    assert.equal(fetched.is_submitted_by_user, true);

    // 3. UPDATE (Edit Proposal while pending)
    const updateResult = await updateProjectRecord(
      created._id,
      studentUser.id,
      {
        title: 'Updated IoT Weather Monitoring Station for Rubber Plantations v2',
        abstract: 'Enhanced ESP32 LoRa sensor network with edge anomaly detection.',
        duration_months: 18
      },
      studentUser
    );

    assert.ok(!updateResult.error, `Update failed: ${updateResult.error}`);
    assert.equal(updateResult.project.title, 'Updated IoT Weather Monitoring Station for Rubber Plantations v2');
    assert.equal(updateResult.project.duration_months, 18);

    // 4. AUTHORIZATION: Another student CANNOT edit or delete this proposal
    const unauthorizedUpdate = await updateProjectRecord(
      created._id,
      otherStudent.id,
      { title: 'Hacked Title' },
      otherStudent
    );
    assert.ok(unauthorizedUpdate.error, 'Other student must not be allowed to edit');

    const unauthorizedDelete = await deleteProjectRecord(
      created._id,
      otherStudent.id,
      otherStudent
    );
    assert.ok(unauthorizedDelete.error, 'Other student must not be allowed to delete');

    // 5. DELETE (Withdraw Proposal)
    const deleteResult = await deleteProjectRecord(
      created._id,
      studentUser.id,
      studentUser
    );
    assert.ok(deleteResult.success, 'Student should successfully withdraw/delete their proposal');
    assert.equal(deleteResult.deletedCode, testProjectCode);

    // Verify it is gone
    const afterDelete = await getProjectRecord(created._id, studentUser);
    assert.equal(afterDelete, null, 'Deleted proposal should no longer exist');
  } finally {
    // Clean up if still exists
    try {
      await deleteProjectRecord(created._id, studentUser.id, { role: 'ric_head' });
    } catch (_) {}
  }
});
