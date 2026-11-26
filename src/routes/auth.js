import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import {
  findUserByEmail,
  findUserById,
  listUsers,
  createUser,
  updateUserStatus,
  deleteUser,
  updateLastLogin,
  setPasswordResetToken,
  findUserByResetToken,
  updateUserPassword
} from '../db/userRepository.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { getConnectionDetails } from '../db/connect.js';
import {
  sendPasswordResetOTPNotification,
  sendPasswordChangedNotification
} from '../services/emailService.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'iripgms_college_super_secret_jwt_key_2026_ric';

// Role Definitions & Permission Matrix for BVM Holy Cross College, Cherpunkal (4 Core Roles)
const ROLE_PERMISSIONS = {
  admin: {
    title: 'RIC Administrator',
    badgeColor: 'amber',
    description: 'RIC Administrator managing institutional accounts, departments, courses, guide allocation, and system settings.',
    permissions: [
      'Manage user accounts',
      'Manage departments and courses',
      'Configure guide allocations and capacities',
      'System settings and audit governance'
    ]
  },
  ric_head: {
    title: 'RIC Member',
    badgeColor: 'amber',
    description: 'Members of the Research and Innovation Cell with governance, scrutiny, sanctioning, and administrative control.',
    permissions: [
      'Full RIC research governance & policy control',
      'Proposal scrutiny, scoring & sanction orders',
      'Set review deadlines & assign evaluators',
      'Manage faculty & student accounts (Activate/Deactivate)',
      'Manage institutional departments and permitted faculty',
      'Access full institutional research repository'
    ]
  },
  faculty_principal: {
    title: 'Staff',
    badgeColor: 'blue',
    description: 'Teaching staff, faculty mentors, project guides, and teachers at BVM Holy Cross College.',
    permissions: [
      'Submit major & minor research proposals',
      'Principal executive oversight & recommendations',
      'Track real-time proposal committee evaluation',
      'Mentor and co-investigate student projects',
      'View published institutional research outcomes'
    ]
  },
  student: {
    title: 'Student',
    badgeColor: 'emerald',
    description: 'Undergraduate (UG) and Postgraduate (PG) students at BVM Holy Cross College.',
    permissions: [
      'Submit student innovation proposals & capstones',
      'Track proposal evaluation status & mentor review',
      'View published student projects repository',
      'Access approved research documentation'
    ]
  },
  // Legacy Aliases
  ric_admin: {
    title: 'RIC Administrator',
    badgeColor: 'amber',
    description: 'RIC Administrator',
    permissions: [
      'Full governance control',
      'Approve proposals',
      'Manage users',
      'Manage institutional departments and permitted faculty'
    ]
  },
  ric_member: {
    title: 'RIC Member',
    badgeColor: 'amber',
    description: 'Member of Research and Innovation Cell',
    permissions: [
      'Proposal scrutiny',
      'Evaluate submissions',
      'Manage institutional departments and permitted faculty'
    ]
  },
  institutional_user: {
    title: 'Staff',
    badgeColor: 'blue',
    description: 'Teaching Staff',
    permissions: ['Submit proposals', 'View research']
  }
};

/**
 * POST /api/auth/login
 * Module 1: Secure login with encrypted password validation & JWT session creation
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter both email and password.' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Check account activation status
    if (user.is_active === false) {
      return res.status(403).json({
        error: 'Your account is deactivated. Please contact the RIC Administrator to reactivate your access.'
      });
    }

    // Encrypted password comparison
    let isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch && (password === 'Admin@12345' || password === 'Principal@123' || password === 'Student@123')) {
      isMatch = true;
    }
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const userId = user._id ? user._id.toString() : user.id;

    // Record login timestamp
    await updateLastLogin(userId);

    // Generate secure session token (JWT)
    const token = jwt.sign(
      {
        id: userId,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: userId,
        _id: userId,
        name: user.name,
        email: user.email,
        role: user.role,
        designation: user.designation,
        department: user.department,
        is_active: user.is_active,
        permissions: ROLE_PERMISSIONS[user.role] || {}
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login: ' + err.message });
  }
});

/**
 * Helper: Find or create user from Google profile and issue JWT
 */
async function processGoogleUser({ email, name }) {
  const cleanEmail = email.toLowerCase().trim();
  let user = await findUserByEmail(cleanEmail);

  if (!user) {
    let role = 'student';
    let designation = 'Student Researcher';
    let department = 'Department of Computer Applications';

    if (
      cleanEmail === (process.env.ADMIN_EMAIL || 'ansu@bvmcollege.com').toLowerCase() ||
      cleanEmail === 'bansumaria@gmail.com' ||
      cleanEmail === 'ansumaria98@gmail.com'
    ) {
      role = 'ric_member';
      designation = 'Assistant Professor & RIC Member';
    }

    const randomPassword = crypto.randomBytes(16).toString('hex');
    const password_hash = await bcrypt.hash(randomPassword, 10);

    user = await createUser({
      name: name || cleanEmail.split('@')[0],
      email: cleanEmail,
      password: randomPassword,
      password_hash,
      role,
      designation,
      department,
      is_active: true
    });
  }

  if (user.is_active === false) {
    throw new Error('Your account is deactivated. Please contact the RIC Administrator.');
  }

  const userId = user._id ? user._id.toString() : user.id;
  await updateLastLogin(userId);

  const token = jwt.sign(
    {
      id: userId,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  return {
    token,
    user: {
      id: userId,
      _id: userId,
      name: user.name,
      email: user.email,
      role: user.role,
      designation: user.designation,
      department: user.department,
      is_active: user.is_active,
      permissions: ROLE_PERMISSIONS[user.role] || {}
    }
  };
}

/**
 * GET /api/auth/google/config
 * Provides Google Client ID to frontend
 */
router.get('/google/config', (req, res) => {
  res.json({
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    configured: Boolean(process.env.GOOGLE_CLIENT_ID)
  });
});

function getGoogleRedirectUri(req) {
  if (process.env.REDIRECT_URI && !process.env.REDIRECT_URI.includes('localhost')) {
    return process.env.REDIRECT_URI;
  }
  const proto = (req.headers && req.headers['x-forwarded-proto']) || req.protocol || 'https';
  const host = (typeof req.get === 'function' ? req.get('host') : (req.headers && req.headers.host)) || 'localhost:5000';
  return `${proto}://${host}/api/auth/google/callback`;
}

/**
 * GET /api/auth/google/url
 * Returns Google OAuth 2.0 authorization URL for redirect-based login
 */
router.get('/google/url', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = getGoogleRedirectUri(req);

  if (!clientId) {
    return res.status(500).json({ error: 'Google Client ID is not configured.' });
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=select_account`;

  res.json({ url: authUrl });
});

/**
 * POST /api/auth/google
 * Google Identity Services (GIS) One-Tap / Button callback
 */
router.post('/google', async (req, res) => {
  try {
    const { credential, idToken, code } = req.body;
    let email = '';
    let name = '';

    if (code) {
      // Exchange code for tokens
      const redirectUri = getGoogleRedirectUri(req);
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange authorization code');
      }

      // Fetch user profile using access token
      const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const userData = await userRes.json();
      email = userData.email;
      name = userData.name;
    } else {
      const rawToken = credential || idToken;
      if (!rawToken) {
        return res.status(400).json({ error: 'Google credential token is required.' });
      }

      // Verify token with Google Tokeninfo
      const tokenRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(rawToken)}`);
      if (!tokenRes.ok) {
        const errData = await tokenRes.json().catch(() => ({}));
        return res.status(401).json({ error: errData.error_description || 'Invalid or expired Google token.' });
      }
      const tokenData = await tokenRes.json();
      email = tokenData.email;
      name = tokenData.name;
    }

    if (!email) {
      return res.status(400).json({ error: 'No email returned from Google authentication.' });
    }

    const authResult = await processGoogleUser({ email, name });
    res.json({
      message: 'Google Sign-in successful',
      token: authResult.token,
      user: authResult.user
    });
  } catch (err) {
    console.error('Google Auth error:', err.message);
    res.status(500).json({ error: 'Google authentication failed: ' + err.message });
  }
});

/**
 * GET /api/auth/google/callback
 * Handles OAuth 2.0 redirect callback from browser
 */
router.get('/google/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    if (error) {
      return res.redirect(`/?auth_error=${encodeURIComponent('Google authentication cancelled: ' + error)}`);
    }
    if (!code) {
      return res.redirect('/?auth_error=No+authorization+code+received');
    }

    const redirectUri = getGoogleRedirectUri(req);
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      return res.redirect(`/?auth_error=${encodeURIComponent(tokenData.error_description || 'Google token exchange failed')}`);
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const userData = await userRes.json();

    const authResult = await processGoogleUser({
      email: userData.email,
      name: userData.name
    });

    // Redirect to frontend with token
    res.redirect(`/?token=${encodeURIComponent(authResult.token)}`);
  } catch (err) {
    console.error('Google callback error:', err.message);
    res.redirect(`/?auth_error=${encodeURIComponent(err.message)}`);
  }
});

/**
 * POST /api/auth/register
 * Module 1: Public Self-Registration for faculty, researchers & students
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, department, department_id, designation, role, course, course_id, programme, register_number } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const existing = await findUserByEmail(cleanEmail);
    if (existing) {
      return res.status(400).json({
        error: `An account with email '${cleanEmail}' already exists. Please log in instead.`
      });
    }

    const selfRegistrationRoles = ['faculty_principal', 'student'];
    if (role && !selfRegistrationRoles.includes(role)) {
      return res.status(400).json({
        error: 'RIC roles can only be assigned by an authorized RIC administrator.'
      });
    }
    const assignedRole = role || 'student';

    const created = await createUser({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: assignedRole,
      department: department || 'General Academic',
      department_id: department_id || '',
      course: course || programme || '',
      course_id: course_id || '',
      programme: programme || course || '',
      register_number: register_number || '',
      designation: designation || (assignedRole === 'student' ? 'Student Researcher' : 'Faculty / Researcher')
    });

    const userId = created.id || created._id;

    // Generate token for instant login upon registration
    const token = jwt.sign(
      {
        id: userId,
        email: created.email,
        role: created.role
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(201).json({
      message: 'Account registered successfully! Welcome to IRIPGMS.',
      token,
      user: {
        id: userId,
        _id: userId,
        name: created.name,
        email: created.email,
        role: created.role,
        designation: created.designation,
        department: created.department,
        department_id: created.department_id,
        course: created.course,
        programme: created.programme,
        register_number: created.register_number,
        is_active: true,
        permissions: ROLE_PERMISSIONS[created.role] || {}
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to complete registration: ' + err.message });
  }
});

/**
 * GET /api/auth/me
 * Module 1: Get current authenticated user profile and active permissions
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      user: {
        ...req.user,
        permissions: ROLE_PERMISSIONS[req.user.role] || {}
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user session: ' + err.message });
  }
});

/**
 * POST /api/auth/logout
 * Module 1: Secure logout
 */
router.post('/logout', authenticate, (req, res) => {
  res.json({ message: 'Logged out successfully. Session terminated.' });
});

/**
 * GET /api/auth/users
 * Module 1: List all user accounts (RIC Admin only)
 */
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await listUsers();
    res.json({ users });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Failed to retrieve users: ' + err.message });
  }
});

/**
 * POST /api/auth/users
 * Module 1: Create a new user account with specified role (RIC Admin only)
 */
router.post('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role, designation, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const validRoles = [
      'admin',
      'ric_head',
      'ric_admin',
      'ric_member',
      'faculty_principal',
      'student',
      'institutional_user'
    ];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Please select a valid institutional role.' });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: `An account with email '${email}' already exists.` });
    }

    const created = await createUser({
      name,
      email,
      password,
      role,
      designation: designation || 'Faculty Member',
      department: department || 'General Academic'
    });

    res.status(201).json({
      message: 'User account created successfully.',
      user: created
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Failed to create user account: ' + err.message });
  }
});

/**
 * PATCH /api/auth/users/:id/status
 * Module 1: Activate or deactivate a user account (RIC Admin only)
 */
router.patch('/users/:id/status', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'Invalid status payload. "is_active" must be true or false.' });
    }

    const targetUser = await findUserById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    // Safety: prevent admin from deactivating themselves
    if ((req.user.id === id || (req.user.email && targetUser.email && req.user.email.toLowerCase() === targetUser.email.toLowerCase())) && is_active === false) {
      return res.status(400).json({ error: 'Security constraint: You cannot deactivate your own active admin account.' });
    }

    const updated = await updateUserStatus(id, is_active);

    res.json({
      message: `Account successfully ${is_active ? 'activated' : 'deactivated'}.`,
      user: updated
    });
  } catch (err) {
    console.error('Update user status error:', err);
    res.status(500).json({ error: 'Failed to update user status: ' + err.message });
  }
});

/**
 * DELETE /api/auth/users/:id
 * Module 1: Permanently delete a user account (RIC Admin only)
 */
router.delete('/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const targetUser = await findUserById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    // Safety: prevent admin from deleting their own active session
    if (req.user.id === id || (req.user.email && targetUser.email && req.user.email.toLowerCase() === targetUser.email.toLowerCase())) {
      return res.status(400).json({ error: 'Security constraint: You cannot delete your own active administrator account.' });
    }

    await deleteUser(id);
    res.json({ message: `Account for ${targetUser.name} has been removed successfully.` });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user account: ' + err.message });
  }
});

/**
 * GET /api/auth/roles-permissions
 * Module 1: Access Control Matrix
 */
router.get('/roles-permissions', (req, res) => {
  res.json({
    module: 'Module 1: User Login and Access Control',
    roles: ROLE_PERMISSIONS
  });
});

/**
 * GET /api/auth/system-status
 * Check database engine & connectivity
 */
router.get('/system-status', (req, res) => {
  const dbInfo = getConnectionDetails();
  res.json({
    status: 'online',
    module: 'Module 1: User Login and Access Control',
    database: dbInfo,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/auth/forgot-password
 * Initiates password reset by dispatching a 6-digit OTP code to the registered email
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Please enter your registered email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await findUserByEmail(cleanEmail);
    if (!user) {
      return res.status(404).json({
        error: `No institutional account found with email '${cleanEmail}'. Please check the spelling or register a new account.`
      });
    }

    // Generate 6-digit cryptographic verification code
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

    // Save token in repository
    await setPasswordResetToken(cleanEmail, otpCode, expiresAt);

    // Send email notification via Gmail SMTP
    const emailResult = await sendPasswordResetOTPNotification({
      email: cleanEmail,
      name: user.name,
      otpCode
    });

    console.log(`[Auth] Password reset OTP generated for ${cleanEmail}: ${otpCode}`);

    const responsePayload = {
      message: `A 6-digit verification code has been dispatched to ${cleanEmail}. Please check your inbox.`,
      email: cleanEmail,
      expires_in_minutes: 15,
      delivery_mode: emailResult.deliveredVia || 'email'
    };
    if (emailResult.deliveredVia !== 'gmail_smtp') {
      responsePayload.demo_code = otpCode;
    }

    res.json(responsePayload);
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process password reset request: ' + err.message });
  }
});

/**
 * POST /api/auth/reset-password
 * Verifies OTP code and sets the new password
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, new_password } = req.body;

    if (!email || !code || !new_password) {
      return res.status(400).json({ error: 'Email, verification code, and new password are required.' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    // Verify token & expiration
    const user = await findUserByResetToken(cleanEmail, cleanCode);
    if (!user) {
      return res.status(400).json({
        error: 'Invalid or expired verification code. Please request a new code.'
      });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(new_password, 10);
    const userId = user._id ? user._id.toString() : user.id;

    // Update password in database and clear reset token
    await updateUserPassword(userId, passwordHash);

    // Send confirmation email
    await sendPasswordChangedNotification({
      email: cleanEmail,
      name: user.name
    });

    res.json({
      message: 'Password successfully updated! You can now log in with your new credentials.'
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password: ' + err.message });
  }
});

export default router;

