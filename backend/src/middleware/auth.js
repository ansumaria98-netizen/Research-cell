import jwt from 'jsonwebtoken';
import { findUserById } from '../db/userRepository.js';

const JWT_SECRET = process.env.JWT_SECRET || 'iripgms_college_super_secret_jwt_key_2026_ric';

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No authentication token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await findUserById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User account no longer exists.' });
    }
    if (user.is_active === false) {
      return res.status(403).json({ error: 'Account has been deactivated. Please contact the RIC Administrator.' });
    }

    req.user = {
      id: user._id ? user._id.toString() : user.id,
      _id: user._id ? user._id.toString() : user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      designation: user.designation,
      department: user.department,
      is_active: user.is_active
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token. Please log in again.' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (!['ric_head', 'ric_admin', 'ric_member', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      error: 'Permission denied. Only Research & Innovation Cell members and administrators can perform this action.'
    });
  }
  next();
}

export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Permission denied. This action requires one of the following roles: ${allowedRoles.join(', ')}.`
      });
    }
    next();
  };
}
