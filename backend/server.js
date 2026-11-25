import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import dotenv from 'dotenv';
import { connectDB, getConnectionDetails } from './src/db/connect.js';
import { seedDefaultUsersIfEmpty } from './src/db/userRepository.js';
import { seedDefaultProjectsIfEmpty } from './src/db/projectRepository.js';
import { seedInstitutionalCollectionsIfEmpty } from './src/db/initDatabase.js';
import authRoutes from './src/routes/auth.js';
import dashboardRoutes from './src/routes/dashboard.js';
import projectRoutes from './src/routes/projects.js';
import institutionRoutes from './src/routes/institution.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
const INITIAL_PORT = parseInt(process.env.PORT, 10) || 5000;

// Enable CORS and JSON parsing
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount Module Routes
app.use('/api/auth', authRoutes);          // Module 1: User Login & Access Control
app.use('/api/dashboard', dashboardRoutes); // Module 2: Dashboard Overview
app.use('/api/projects', projectRoutes); // Module 3: Project Registration
app.use('/api/institution', institutionRoutes); // Module 3: Departments & Permitted Faculty

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    institution: 'BVM Holy Cross College, Cherpunkal, Kottayam, Kerala',
    system: 'IRIPGMS - Institutional Research Governance Management System',
    modules: [
      'User Login & Access Control',
      'Institutional Departments & Permitted Faculty',
      'Project Submission & Repository',
      'RIC Review & Similarity Checking',
      'Role-Based Project Visibility'
    ],
    database: getConnectionDetails(),
    timestamp: new Date().toISOString()
  });
});

// Serve frontend directly from public/ (Zero Vite, Zero Bundler Needed)
const publicDir = path.resolve(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    const indexPath = path.join(publicDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    next();
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: 'Internal Server Error: ' + (err.message || 'Unknown error') });
});

function openBrowser(url) {
  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  const cmd = isWin ? `start "" "${url}"` : isMac ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd, () => {
    // silently continue
  });
}

async function startServerWithPort(port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      const liveUrl = `http://localhost:${port}`;
      console.log(`================================================================`);
      console.log(`  >>> BVM Holy Cross College IRIPGMS is LIVE on: ${liveUrl}`);
      console.log(`  >>> Health Check:  ${liveUrl}/api/health`);
      console.log(`================================================================`);
      console.log(`  Launching your default browser automatically to: ${liveUrl}`);

      // Automatically launch browser for the user
      setTimeout(() => openBrowser(liveUrl), 500);

      resolve(server);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[Port Alert] Port ${port} is occupied. Trying port ${port + 1}...`);
        startServerWithPort(port + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

async function startServer() {
  console.log('================================================================');
  console.log('  BVM HOLY CROSS COLLEGE, CHERPUNKAL, KOTTAYAM, KERALA');
  echoBanner();
  console.log('================================================================');

  // Start listening immediately so the application launches instantly
  await startServerWithPort(INITIAL_PORT);

  // Initialize persistent data stores in background
  connectDB().then(async () => {
    await seedDefaultUsersIfEmpty();
    await seedDefaultProjectsIfEmpty();
    await seedInstitutionalCollectionsIfEmpty();
    const dbInfo = getConnectionDetails();
    console.log(`[DB] Active Storage Engine: ${dbInfo.mode}`);
  }).catch((err) => {
    console.warn('[DB] Storage fallback active:', err.message);
  });
}

function echoBanner() {
  console.log('  Institutional Research, Innovation & Project Governance (IRIPGMS)');
  console.log('  Single-Server Node.js + Express (Zero Vite, Zero Extra Bundlers)');
}

startServer().catch(err => {
  console.error('[Fatal Error] Failed to start server:', err);
  process.exit(1);
});
