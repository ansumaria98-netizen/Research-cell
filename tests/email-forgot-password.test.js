import assert from 'node:assert/strict';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import {
  findUserByEmail,
  findUserById,
  setPasswordResetToken,
  findUserByResetToken,
  updateUserPassword
} from '../src/db/userRepository.js';
import {
  sendEmail,
  sendProposalSubmittedNotification,
  sendGuideReviewNotification,
  sendRICDecisionNotification,
  sendPasswordResetOTPNotification,
  sendPasswordChangedNotification
} from '../src/services/emailService.js';

test('Email Service: sendEmail logs notifications safely and handles dispatches', async () => {
  const result = await sendEmail({
    to: 'test.recipient@bvmcollege.com',
    subject: 'Test Notification Subject',
    html: '<p>This is a test notification from IRIPGMS.</p>',
    type: 'UNIT_TEST_DISPATCH',
    details: { test: true }
  });

  assert.equal(result.success, true);
  assert.ok(result.deliveredVia === 'gmail_smtp' || result.deliveredVia === 'local_notification_log');

  // Verify notification log file was updated
  const logPath = path.resolve('data/email-notifications.log');
  assert.ok(fs.existsSync(logPath), 'Notification log file should exist');
  const logContent = fs.readFileSync(logPath, 'utf-8');
  assert.ok(logContent.includes('test.recipient@bvmcollege.com'), 'Log should contain recipient');
  assert.ok(logContent.includes('UNIT_TEST_DISPATCH'), 'Log should contain dispatch type');
});

test('Email Service: Notification templates format without error', async () => {
  const mockStudent = { name: 'Alphy Maria', email: 'alphy@bvmcherpunkal.edu.in', register_number: 'BVM2026CS01' };
  const mockGuide = { name: 'Dr. Mathew Joseph', email: 'mathew.joseph@bvmcherpunkal.edu.in' };
  const mockProject = {
    project_code: 'BVM/RIC/2026/CA/A1B2C3',
    title: 'Smart Campus AI Assistant',
    department: 'Department of Computer Applications',
    project_category: 'Innovation',
    academic_year: '2026-27'
  };

  // 1. Proposal submission notification
  await assert.doesNotReject(async () => {
    await sendProposalSubmittedNotification({
      student: mockStudent,
      project: mockProject,
      guide: mockGuide
    });
  });

  // 2. Guide review notification
  await assert.doesNotReject(async () => {
    await sendGuideReviewNotification({
      student: mockStudent,
      project: mockProject,
      guide: mockGuide,
      review: {
        recommendation: 'recommended',
        reviewer_name: 'Dr. Mathew Joseph',
        comments: 'Strong proposal. Approved for RIC scrutiny.'
      }
    });
  });

  // 3. Official RIC decision notification
  await assert.doesNotReject(async () => {
    await sendRICDecisionNotification({
      student: mockStudent,
      project: mockProject,
      guide: mockGuide,
      decision: 'approved',
      comments: 'Project approved by the RIC executive committee.',
      conditions: '',
      approvalLetter: {
        letter_number: 'BVM/RIC/APPR/2026-27/TEST01'
      }
    });
  });

  // 4. Password changed notification
  await assert.doesNotReject(async () => {
    await sendPasswordChangedNotification({
      email: 'test.user@bvmcollege.com',
      name: 'Test Scholar'
    });
  });
});

test('Forgot Password: End-to-end token generation, verification, and password update', async () => {
  const email = 'ansu@bvmcollege.com';
  const user = await findUserByEmail(email);
  assert.ok(user, 'Ansu user must exist');

  // Step 1: Generate OTP token
  const testOtp = '849201';
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
  await setPasswordResetToken(email, testOtp, expiresAt);

  // Step 2: Verify valid token
  const matchedUser = await findUserByResetToken(email, testOtp);
  assert.ok(matchedUser, 'Token should match active user');
  assert.equal(matchedUser.email.toLowerCase(), email.toLowerCase());

  // Step 3: Reject invalid or expired token
  const invalidUser = await findUserByResetToken(email, '000000');
  assert.equal(invalidUser, null, 'Invalid token must return null');

  const pastDate = new Date(Date.now() - 5000); // expired 5 seconds ago
  await setPasswordResetToken(email, '111111', pastDate);
  const expiredUser = await findUserByResetToken(email, '111111');
  assert.equal(expiredUser, null, 'Expired token must return null');

  // Step 4: Reset password with new hash
  const newPasswordPlainText = 'NewSecurePass@2026';
  const newHash = await bcrypt.hash(newPasswordPlainText, 10);
  const userId = matchedUser._id ? matchedUser._id.toString() : matchedUser.id;

  const updatedUser = await updateUserPassword(userId, newHash);
  assert.ok(updatedUser);

  // Step 5: Verify password match
  const refreshedUser = await findUserByEmail(email);
  const isMatch = await bcrypt.compare(newPasswordPlainText, refreshedUser.password_hash);
  assert.equal(isMatch, true, 'New password hash must match the new plain text password');
  assert.equal(refreshedUser.reset_token, null, 'Reset token must be cleared after password reset');

  // Step 6: Restore default testing password for Ansu so 1-click login remains seamless
  const defaultHash = await bcrypt.hash('Ansu@12345', 10);
  await updateUserPassword(userId, defaultHash);
  const restoredUser = await findUserByEmail(email);
  assert.equal(await bcrypt.compare('Ansu@12345', restoredUser.password_hash), true);
});
