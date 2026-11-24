import assert from 'node:assert/strict';
import test from 'node:test';
import '../public/js/dashboard-utils.js';
import projectRoutes from '../src/routes/projects.js';
import { applyReviewUpdate, createReviewUpdate, RIC_REVIEW_ROLES } from '../src/services/projectReview.js';
import { findSameDepartmentMatches } from '../src/services/projectSimilarity.js';

test('groups dashboard projects by department without mixing records', () => {
  const biologyOne = { project_code: 'BIO-1', department: 'Biology' };
  const chemistry = { project_code: 'CHEM-1', department: 'Chemistry' };
  const biologyTwo = { project_code: 'BIO-2', department: ' Biology ' };
  const unassigned = { project_code: 'UNASSIGNED-1' };

  const groups = globalThis.dashboardUtils.groupProjectsByDepartment([
    biologyOne,
    chemistry,
    biologyTwo,
    unassigned
  ]);

  assert.deepEqual(groups.map((group) => group.department), ['Biology', 'Chemistry', 'Unassigned']);
  assert.deepEqual(groups[0].projects, [biologyOne, biologyTwo]);
  assert.equal(groups[0].count, 2);
  assert.deepEqual(groups[1].projects, [chemistry]);
  assert.deepEqual(groups[2].projects, [unassigned]);
});

test('counts only pending projects as awaiting RIC review', () => {
  const counts = globalThis.dashboardUtils.getProjectCounts([
    { status: 'pending' },
    { status: 'approved' },
    { status: 'unknown' },
    {}
  ]);
  assert.deepEqual(counts, { total: 4, awaitingRicReview: 1 });
});

test('prioritizes departments and projects awaiting RIC review', () => {
  const groups = globalThis.dashboardUtils.groupProjectsByDepartment([
    { department: 'Biology', project_code: 'BIO-A', status: 'approved' },
    { department: 'Chemistry', project_code: 'CHEM-A', status: 'pending' },
    { department: 'Chemistry', project_code: 'CHEM-B', status: 'approved' },
    { department: 'Biology', project_code: 'BIO-B', status: 'approved' }
  ]);
  assert.deepEqual(groups.map((group) => group.department), ['Chemistry', 'Biology']);
  assert.deepEqual(groups[0].projects.map((project) => project.project_code), ['CHEM-A', 'CHEM-B']);
  assert.deepEqual(groups[1].projects.map((project) => project.project_code), ['BIO-A', 'BIO-B']);
});

test('similarity returns same-department title and abstract matches only', () => {
  const candidate = {
    department: '  Biology ',
    title: 'AI models for crop disease detection',
    abstract: 'We compare crop images to identify disease patterns.'
  };
  const matches = findSameDepartmentMatches(candidate, [
    {
      project_code: 'BIO-1',
      department: 'biology',
      title: 'AI models for crop disease detection',
      abstract: 'We compare crop images to identify disease patterns.',
      status: 'pending'
    },
    {
      project_code: 'CHEM-1',
      department: 'Chemistry',
      title: candidate.title,
      abstract: candidate.abstract,
      status: 'pending'
    },
    {
      _id: 'current-project',
      project_code: 'BIO-CURRENT',
      department: 'Biology',
      title: candidate.title,
      abstract: candidate.abstract,
      status: 'pending'
    },
    {
      project_code: 'BIO-2',
      department: 'Biology',
      title: 'An unrelated ecology survey',
      abstract: 'A field study of wetland plant diversity.',
      objectives: candidate.abstract,
      methodology: candidate.abstract
    }
  ], { excludeProjectId: 'current-project' });

  assert.deepEqual(matches.map((match) => match.project_code), ['BIO-1']);
  assert.equal(matches[0].score, 100);
  assert.equal(matches[0].title_score, 100);
  assert.equal(matches[0].abstract_score, 100);
  assert.match(matches[0].match_cue, /title terms overlap and abstract\/description terms overlap/);
});

test('similarity skips candidates with missing department or comparison text', () => {
  const projects = [{ department: 'Biology', title: 'A project', abstract: 'Project abstract' }];
  assert.deepEqual(findSameDepartmentMatches({ title: 'A project' }, projects), []);
  assert.deepEqual(findSameDepartmentMatches({ department: 'Biology' }, projects), []);
  assert.deepEqual(findSameDepartmentMatches(null, projects), []);
});

test('RIC review authorization allows RIC members and blocks other roles', () => {
  const reviewRoute = projectRoutes.stack.find((layer) =>
    layer.route && layer.route.path === '/:projectId/review'
  );
  assert.ok(reviewRoute, 'the project review route is registered');
  assert.equal(reviewRoute.route.stack.length, 3);
  const guard = reviewRoute.route.stack[1].handle;
  const invoke = (role) => {
    const result = {};
    let continued = false;
    const response = {
      status(code) {
        result.status = code;
        return this;
      },
      json(body) {
        result.body = body;
        return this;
      }
    };

    guard({ user: role ? { role } : null }, response, () => {
      continued = true;
    });
    return { ...result, continued };
  };

  assert.equal(invoke('ric_member').continued, true);
  assert.equal(invoke('ric_head').continued, true);
  assert.equal(invoke('faculty_principal').status, 403);
  assert.equal(invoke(null).status, 401);
});

test('RIC approval records audit details and only transitions pending projects', () => {
  const reviewer = { id: 'ric-7', name: 'RIC Reviewer' };
  const reviewedAt = new Date('2026-11-12T10:00:00.000Z');
  const { update, error } = createReviewUpdate('approve', '', reviewer, reviewedAt);

  assert.equal(error, undefined);
  assert.equal(update.status, 'approved');
  assert.equal(update.reviewed_by, reviewer.id);
  assert.equal(update.reviewed_by_name, reviewer.name);
  assert.equal(update.reviewed_at, reviewedAt);
  assert.match(update.last_activity, /Approved by RIC: RIC Reviewer/);

  const approved = applyReviewUpdate(
    { _id: 'p-1', status: 'pending' },
    update,
    '2026-11-12T10:00:01.000Z'
  );
  assert.equal(approved.status, 'approved');
  assert.equal(approved.updatedAt, '2026-11-12T10:00:01.000Z');
  assert.equal(applyReviewUpdate({ _id: 'p-1', status: 'approved' }, update), null);

  const rejected = createReviewUpdate('reject', 'Clarify the proposed methods.', reviewer, reviewedAt);
  assert.equal(rejected.update.status, 'rejected');
  assert.equal(rejected.update.review_comment, 'Clarify the proposed methods.');
  assert.match(rejected.update.last_activity, /Rejected by RIC/);
  assert.match(createReviewUpdate('reject', '', reviewer).error, /comment is required/);
});
