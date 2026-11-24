import express from 'express';
import { getDashboardSummary, listAllProjects } from '../db/projectRepository.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/dashboard/stats
 * Module 2: Dashboard Overview & Project Summary
 * Returns metrics, department totals and status counts, review deadlines, and recent activities.
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const summary = await getDashboardSummary(req.user);
    const userRole = req.user.role;

    // Custom annotations based on user role
    res.json({
      module: 'Module 2: Dashboard',
      userRole,
      isRICAuthorized: ['ric_head', 'ric_admin', 'ric_member'].includes(userRole),
      ...summary
    });
  } catch (err) {
    console.error('[Dashboard Error]', err);
    res.status(500).json({ error: 'Failed to retrieve dashboard metrics: ' + err.message });
  }
});

/**
 * GET /api/dashboard/projects
 * Module 2: Filtered project list for dashboard drill-down
 */
router.get('/projects', authenticate, async (req, res) => {
  try {
    const { status, department } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (department && department !== 'all') filter.department = department;

    const projects = await listAllProjects(filter, req.user);
    res.json({ projects });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve project list: ' + err.message });
  }
});

export default router;

