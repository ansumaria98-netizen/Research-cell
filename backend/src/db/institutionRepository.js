import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Department from '../models/Department.js';
import Faculty from '../models/Faculty.js';
import { isMongoDBConnected } from './connect.js';
import {
  attachCourseProgrammes,
  reconcileCourseCatalogDepartments
} from '../services/courseCatalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const LOCAL_DEPARTMENTS_FILE = path.join(DATA_DIR, 'departments.json');
const LOCAL_FACULTY_FILE = path.join(DATA_DIR, 'faculty.json');
const CODE_INDEX_NAME = 'department_code_nonempty_unique';
const seededCatalogStores = new Set();
const catalogSeedPromises = new Map();
const initializedCodeIndexes = new Set();

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readRecords(filePath) {
  try {
    return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : [];
  } catch (error) {
    console.error('[InstitutionRepository] Read error:', error.message);
    return [];
  }
}

function writeRecords(filePath, records) {
  fs.writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf-8');
}

function normalizeRecord(record) {
  const id = record._id ? record._id.toString() : record.id;
  return { ...record, code: record.code || '', id, _id: id };
}

function duplicateDepartment(departments, candidate, excludedId = '') {
  return departments.some((department) =>
    department.id !== excludedId &&
    ((candidate.code &&
      String(department.code || '').toLowerCase() === candidate.code.toLowerCase()) ||
      department.name.toLowerCase() === candidate.name.toLowerCase())
  );
}

async function ensureDepartmentCodeIndex() {
  if (!isMongoDBConnected()) return;
  const storeKey = 'mongodb';
  if (initializedCodeIndexes.has(storeKey)) return;

  const collection = Department.collection;
  let indexes = [];
  try {
    indexes = await collection.indexes();
  } catch (error) {
    if (error.code !== 26 && error.codeName !== 'NamespaceNotFound') throw error;
  }

  const legacyCodeIndex = indexes.find((index) =>
    index.name === 'code_1' && index.unique
  );
  if (legacyCodeIndex) {
    await collection.dropIndex(legacyCodeIndex.name);
    indexes = indexes.filter((index) => index.name !== legacyCodeIndex.name);
  }

  if (!indexes.some((index) => index.name === CODE_INDEX_NAME)) {
    await collection.createIndex(
      { code: 1 },
      {
        name: CODE_INDEX_NAME,
        unique: true,
        partialFilterExpression: { code: { $type: 'string', $gt: '' } }
      }
    );
  }
  initializedCodeIndexes.add(storeKey);
}

async function readDepartmentRecords() {
  return isMongoDBConnected()
    ? (await Department.find().lean()).map(normalizeRecord)
    : readRecords(LOCAL_DEPARTMENTS_FILE).map(normalizeRecord);
}

async function persistCourseCatalogDepartments() {
  const isMongo = isMongoDBConnected();
  const storeKey = isMongo ? 'mongodb' : 'local';
  if (seededCatalogStores.has(storeKey)) return;
  if (catalogSeedPromises.has(storeKey)) return catalogSeedPromises.get(storeKey);

  const seedPromise = (async () => {
    const rawLocalRecords = isMongo ? null : readRecords(LOCAL_DEPARTMENTS_FILE);
    const existing = isMongo
      ? await readDepartmentRecords()
      : rawLocalRecords.map(normalizeRecord);
    const reconciled = reconcileCourseCatalogDepartments(existing);
    const existingById = new Map(existing.map((department) => [department.id, department]));
    const additions = reconciled.filter((department) => !department.id);
    const keyUpdates = reconciled.filter((department) => {
      const previous = existingById.get(department.id);
      return previous &&
        previous.course_catalog_key !== department.course_catalog_key &&
        department.course_catalog_key;
    });

    if (isMongo) {
      for (const department of keyUpdates) {
        await Department.updateOne(
          { _id: department.id },
          { $set: { course_catalog_key: department.course_catalog_key } }
        );
      }
      if (additions.length) {
        await Department.insertMany(additions.map(({ name, code, course_catalog_key }) => ({
          name,
          code,
          course_catalog_key
        })));
      }
    } else if (additions.length || keyUpdates.length) {
      const records = rawLocalRecords.map((record) => {
        const id = record._id || record.id;
        const updated = keyUpdates.find((item) => item.id === id);
        return updated
          ? { ...record, course_catalog_key: updated.course_catalog_key, updatedAt: new Date().toISOString() }
          : record;
      });
      const now = new Date().toISOString();
      additions.forEach((department) => records.push({
        ...department,
        id: randomUUID(),
        createdAt: now,
        updatedAt: now
      }));
      writeRecords(LOCAL_DEPARTMENTS_FILE, records);
    }

    seededCatalogStores.add(storeKey);
  })();

  catalogSeedPromises.set(storeKey, seedPromise);
  try {
    await seedPromise;
  } finally {
    catalogSeedPromises.delete(storeKey);
  }
}

export async function listDepartments() {
  await ensureDepartmentCodeIndex();
  await persistCourseCatalogDepartments();
  const departments = await readDepartmentRecords();
  return departments
    .map(attachCourseProgrammes)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveDepartment(data, id = '') {
  const departments = await listDepartments();
  if (duplicateDepartment(departments, data, id)) {
    const error = new Error('A department with this name or code already exists.');
    error.code = 'DUPLICATE_DEPARTMENT';
    throw error;
  }

  if (isMongoDBConnected()) {
    if (id) {
      const department = await Department.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
      ).lean();
      return department ? normalizeRecord(department) : null;
    }
    return normalizeRecord((await Department.create(data)).toObject());
  }

  const records = readRecords(LOCAL_DEPARTMENTS_FILE);
  const index = records.findIndex((department) => (department.id || department._id) === id);
  const now = new Date().toISOString();
  if (id && index === -1) return null;
  const saved = {
    ...(index >= 0 ? records[index] : {}),
    ...data,
    id: index >= 0 ? id : randomUUID(),
    createdAt: index >= 0 ? records[index].createdAt : now,
    updatedAt: now
  };
  if (index >= 0) records[index] = saved;
  else records.push(saved);
  writeRecords(LOCAL_DEPARTMENTS_FILE, records);
  return normalizeRecord(saved);
}

export async function listFaculty(departmentId = '') {
  const faculty = isMongoDBConnected()
    ? await Faculty.find(departmentId ? { department_id: departmentId } : {}).sort({ name: 1 }).lean()
    : readRecords(LOCAL_FACULTY_FILE).filter((person) =>
      !departmentId || person.department_id === departmentId
    );
  return faculty.map(normalizeRecord).sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveFaculty(data, id = '') {
  if (isMongoDBConnected()) {
    if (id) {
      const person = await Faculty.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
      ).lean();
      return person ? normalizeRecord(person) : null;
    }
    return normalizeRecord((await Faculty.create(data)).toObject());
  }

  const records = readRecords(LOCAL_FACULTY_FILE);
  const index = records.findIndex((person) => (person.id || person._id) === id);
  const now = new Date().toISOString();
  if (id && index === -1) return null;
  const saved = {
    ...(index >= 0 ? records[index] : {}),
    ...data,
    id: index >= 0 ? id : randomUUID(),
    is_active: index >= 0 ? records[index].is_active !== false : true,
    createdAt: index >= 0 ? records[index].createdAt : now,
    updatedAt: now
  };
  if (index >= 0) records[index] = saved;
  else records.push(saved);
  writeRecords(LOCAL_FACULTY_FILE, records);
  return normalizeRecord(saved);
}

export async function getDepartmentFacultyCounts() {
  const faculty = await listFaculty();
  return faculty.reduce((counts, person) => {
    counts[person.department_id] = (counts[person.department_id] || 0) + 1;
    return counts;
  }, {});
}
