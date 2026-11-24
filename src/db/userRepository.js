import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { isMongoDBConnected } from './connect.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const LOCAL_STORE_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper to read local JSON store
function readLocalUsers() {
  try {
    if (!fs.existsSync(LOCAL_STORE_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(LOCAL_STORE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[Repository] Error reading local user file:', err.message);
    return [];
  }
}

// Helper to write local JSON store
function writeLocalUsers(users) {
  try {
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Repository] Error writing local user file:', err.message);
  }
}

// Default Seed Accounts for BVM Holy Cross College, Cherpunkal (3 Core Roles)
function getSeedAccounts() {
  const accounts = [
    // -------------------------------------------------------------
    // Authorized Research and Innovation Cell members
    // -------------------------------------------------------------
    {
      name: 'Ansu Maria Benny',
      email: 'ansu@bvmcollege.com',
      password: 'Ansu@12345',
      role: 'ric_member',
      designation: 'Assistant Professor & RIC Member',
      department: 'Department of Computer Applications'
    },
    {
      name: 'Ansu Maria Benny',
      email: 'bansumaria@gmail.com',
      password: 'Ansu@12345',
      role: 'admin',
      designation: 'RIC Administrator & Assistant Professor',
      department: 'Department of Computer Applications'
    },
    {
      name: 'Dr. Angelin Thomas',
      email: 'angelin.thomas@gmail.com',
      password: 'Admin@12345',
      role: 'ric_member',
      designation: 'Assistant Professor & RIC Member',
      department: 'Department of Computer Applications'
    }
  ];
  return accounts;
}

export async function seedDefaultUsersIfEmpty() {
  const isMongo = isMongoDBConnected();
  const accountsToSeed = getSeedAccounts();

  if (isMongo) {
    try {
      const count = await User.countDocuments();
      if (count === 0) {
        console.log('[Seed] Seeding default accounts into MongoDB...');
        for (const acc of accountsToSeed) {
          const password_hash = await bcrypt.hash(acc.password, 10);
          await User.create({
            name: acc.name,
            email: acc.email.toLowerCase(),
            password_hash,
            role: acc.role,
            designation: acc.designation,
            department: acc.department,
            is_active: true
          });
        }
        console.log('[Seed] Default accounts seeded into MongoDB successfully.');
      }
    } catch (err) {
      console.error('[Seed] MongoDB seed error:', err.message);
    }
  } else {
    // Local JSON store seeding
    const users = readLocalUsers();
    if (users.length === 0) {
      console.log('[Seed] Seeding default accounts into local data store...');
      const seeded = [];
      for (const acc of accountsToSeed) {
        const password_hash = await bcrypt.hash(acc.password, 10);
        seeded.push({
          _id: 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5),
          name: acc.name,
          email: acc.email.toLowerCase(),
          password_hash,
          role: acc.role,
          designation: acc.designation,
          department: acc.department,
          is_active: true,
          last_login: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      writeLocalUsers(seeded);
      console.log('[Seed] Default accounts seeded into local store successfully.');
    }
  }
}

export async function findUserByEmail(email) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (isMongoDBConnected()) {
    return await User.findOne({ email: cleanEmail });
  } else {
    const users = readLocalUsers();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);
    return user || null;
  }
}

export async function findUserById(id) {
  if (isMongoDBConnected()) {
    if (mongoose.Types.ObjectId.isValid(id)) {
      const u = await User.findById(id);
      if (u) return u;
    }
    // Also look up by email or local ID store fallback if id is a custom string
    const localUsers = readLocalUsers();
    const local = localUsers.find(u => (u._id && u._id.toString() === id.toString()) || (u.id && u.id.toString() === id.toString()));
    if (local && local.email) {
      return await User.findOne({ email: local.email.toLowerCase() });
    }
    return null;
  } else {
    const users = readLocalUsers();
    const user = users.find(u => (u._id && u._id.toString() === id.toString()) || (u.id && u.id.toString() === id.toString()));
    return user || null;
  }
}

export async function listUsers() {
  if (isMongoDBConnected()) {
    const users = await User.find().select('-password_hash').sort({ createdAt: -1 });
    return users.map(u => ({
      _id: u._id.toString(),
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      designation: u.designation,
      department: u.department,
      is_active: u.is_active,
      last_login: u.last_login,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt
    }));
  } else {
    const users = readLocalUsers();
    return users
      .map(u => {
        const { password_hash, ...safeUser } = u;
        return {
          ...safeUser,
          id: u._id || u.id,
          _id: u._id || u.id
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

export async function createUser({ name, email, password, password_hash, role, designation, department }) {
  const cleanEmail = email.trim().toLowerCase();
  const finalHash = password_hash || (password ? await bcrypt.hash(password, 10) : await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10));

  if (isMongoDBConnected()) {
    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password_hash: finalHash,
      role: role || 'institutional_user',
      designation: designation || 'Faculty Member',
      department: department || 'General Academic',
      is_active: true
    });
    return {
      _id: newUser._id.toString(),
      id: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      designation: newUser.designation,
      department: newUser.department,
      is_active: newUser.is_active,
      createdAt: newUser.createdAt
    };
  } else {
    const users = readLocalUsers();
    const newUser = {
      _id: 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5),
      name: name.trim(),
      email: cleanEmail,
      password_hash: finalHash,
      role: role || 'institutional_user',
      designation: designation || 'Faculty Member',
      department: department || 'General Academic',
      is_active: true,
      last_login: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    users.push(newUser);
    writeLocalUsers(users);

    const { password_hash: _, ...safeUser } = newUser;
    return { ...safeUser, id: newUser._id };
  }
}

export async function updateUserStatus(id, isActive) {
  if (isMongoDBConnected()) {
    let updated = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      updated = await User.findByIdAndUpdate(
        id,
        { is_active: isActive },
        { new: true }
      ).select('-password_hash');
    }
    if (!updated) {
      const localUsers = readLocalUsers();
      const local = localUsers.find(u => (u._id && u._id.toString() === id.toString()) || (u.id && u.id.toString() === id.toString()));
      if (local && local.email) {
        updated = await User.findOneAndUpdate(
          { email: local.email.toLowerCase() },
          { is_active: isActive },
          { new: true }
        ).select('-password_hash');
      }
    }
    return updated;
  } else {
    const users = readLocalUsers();
    const index = users.findIndex(u => (u._id && u._id.toString() === id.toString()) || (u.id && u.id.toString() === id.toString()));
    if (index === -1) return null;

    users[index].is_active = Boolean(isActive);
    users[index].updatedAt = new Date().toISOString();
    writeLocalUsers(users);

    const { password_hash, ...safeUser } = users[index];
    return { ...safeUser, id: safeUser._id };
  }
}

export async function updateLastLogin(id) {
  const now = new Date();
  if (isMongoDBConnected()) {
    await User.findByIdAndUpdate(id, { last_login: now });
  } else {
    const users = readLocalUsers();
    const index = users.findIndex(u => (u._id && u._id.toString() === id.toString()) || (u.id && u.id.toString() === id.toString()));
    if (index !== -1) {
      users[index].last_login = now.toISOString();
      writeLocalUsers(users);
    }
  }
}

export async function setPasswordResetToken(email, token, expiresAt) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (isMongoDBConnected()) {
    return await User.findOneAndUpdate(
      { email: cleanEmail },
      { reset_token: token, reset_token_expires: expiresAt },
      { new: true }
    );
  } else {
    const users = readLocalUsers();
    const index = users.findIndex(u => u.email && u.email.toLowerCase() === cleanEmail);
    if (index === -1) return null;
    users[index].reset_token = token;
    users[index].reset_token_expires = expiresAt instanceof Date ? expiresAt.toISOString() : expiresAt;
    users[index].updatedAt = new Date().toISOString();
    writeLocalUsers(users);
    return users[index];
  }
}

export async function findUserByResetToken(email, token) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanToken = (token || '').trim();
  const now = new Date();

  if (isMongoDBConnected()) {
    return await User.findOne({
      email: cleanEmail,
      reset_token: cleanToken,
      reset_token_expires: { $gt: now }
    });
  } else {
    const users = readLocalUsers();
    const user = users.find(u => 
      u.email && u.email.toLowerCase() === cleanEmail &&
      u.reset_token === cleanToken &&
      u.reset_token_expires && new Date(u.reset_token_expires) > now
    );
    return user || null;
  }
}

export async function updateUserPassword(id, passwordHash) {
  if (isMongoDBConnected()) {
    const updated = await User.findByIdAndUpdate(
      id,
      {
        password_hash: passwordHash,
        reset_token: null,
        reset_token_expires: null,
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password_hash');
    return updated;
  } else {
    const users = readLocalUsers();
    const index = users.findIndex(u => (u._id && u._id.toString() === id.toString()) || (u.id && u.id.toString() === id.toString()));
    if (index === -1) return null;

    users[index].password_hash = passwordHash;
    users[index].reset_token = null;
    users[index].reset_token_expires = null;
    users[index].updatedAt = new Date().toISOString();
    writeLocalUsers(users);

    const { password_hash: _, ...safeUser } = users[index];
    return { ...safeUser, id: safeUser._id };
  }
}

export async function deleteUser(id) {
  if (isMongoDBConnected()) {
    let deleted = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      deleted = await User.findByIdAndDelete(id);
    }
    if (!deleted) {
      const localUsers = readLocalUsers();
      const local = localUsers.find(u => (u._id && u._id.toString() === id.toString()) || (u.id && u.id.toString() === id.toString()));
      if (local && local.email) {
        deleted = await User.findOneAndDelete({ email: local.email.toLowerCase() });
      } else {
        deleted = await User.findOneAndDelete({ $or: [{ id: id }, { email: id }] });
      }
    }
    return Boolean(deleted);
  } else {
    const users = readLocalUsers();
    const index = users.findIndex(u => (u._id && u._id.toString() === id.toString()) || (u.id && u.id.toString() === id.toString()));
    if (index === -1) return false;
    users.splice(index, 1);
    writeLocalUsers(users);
    return true;
  }
}


