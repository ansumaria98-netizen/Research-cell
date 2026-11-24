import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let isConnected = false;
let connectionUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/iripgms';

export async function connectDB() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/iripgms';
  connectionUri = uri;

  const maskedUri = uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  console.log(`[DB] Attempting MongoDB connection to: ${maskedUri}`);

  try {
    // 3 second timeout for cloud Atlas or local MongoDB
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000
    });
    isConnected = true;
    console.log(`[DB] Connected successfully to MongoDB (${mongoose.connection.host}/${mongoose.connection.name})`);
    return { success: true, mode: 'mongodb', host: mongoose.connection.host, db: mongoose.connection.name };
  } catch (err) {
    isConnected = false;
    console.log(`[DB] Notice: Could not connect to MongoDB server (${err.message})`);
    console.log(`[DB] Resilient Local Mode enabled so your application works immediately.`);
    return { success: false, mode: 'offline-store', error: err.message };
  }
}

export function isMongoDBConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

export function getConnectionDetails() {
  if (isMongoDBConnected()) {
    return {
      connected: true,
      mode: 'MongoDB Live',
      host: mongoose.connection.host,
      database: mongoose.connection.name,
      uri: connectionUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
    };
  }
  return {
    connected: false,
    mode: 'Local MongoDB File Store (Zero-Crash Fallback)',
    host: 'localhost (offline)',
    database: 'iripgms (local data store)',
    note: 'Start MongoDB service or check your internet connection for MongoDB Atlas.'
  };
}
