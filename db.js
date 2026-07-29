require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');

const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'messages.json');

let isMongoConnected = false;
let MessageModel = null;

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;

if (MONGODB_URI) {
  const messageSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, index: true },
    replyToId: { type: String, default: null },
    sender: { type: String, default: 'Seseorang' },
    recipient: { type: String, default: 'Seseorang' },
    message: { type: String, default: '' },
    songTitle: { type: String, default: '' },
    artistName: { type: String, default: '' },
    albumArt: { type: String, default: '' },
    previewUrl: { type: String, default: '' },
    platform: { type: String, default: 'itunes' },
    createdAt: { type: Date, default: Date.now }
  });

  MessageModel = mongoose.models.Message || mongoose.model('Message', messageSchema);
}

/**
 * Connect to MongoDB if URI is configured
 */
async function connectDb() {
  if (!MONGODB_URI) return false;
  if (isMongoConnected && mongoose.connection.readyState === 1) return true;

  try {
    await mongoose.connect(MONGODB_URI);
    isMongoConnected = true;
    console.log('⚡ Connected to MongoDB Cloud Database');
    return true;
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    isMongoConnected = false;
    return false;
  }
}

// Ensure local fallback storage exists
if (!fs.existsSync(DB_DIR)) {
  try { fs.mkdirSync(DB_DIR, { recursive: true }); } catch (e) {}
}
if (!fs.existsSync(DB_FILE)) {
  try { fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf-8'); } catch (e) {}
}

function readLocalMessages() {
  try {
    if (!fs.existsSync(DB_FILE)) return [];
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading local database file:', err);
    return [];
  }
}

function writeLocalMessages(messages) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(messages, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local database file:', err);
  }
}

function generateId() {
  return crypto.randomBytes(5).toString('hex').substring(0, 8);
}

/**
 * Save a new message
 */
async function saveMessage(data) {
  const id = generateId();
  const newMessage = {
    id,
    replyToId: data.replyToId || null,
    sender: data.sender || 'Seseorang',
    recipient: data.recipient || 'Seseorang',
    message: data.message || '',
    songTitle: data.songTitle || 'Unknown Title',
    artistName: data.artistName || 'Unknown Artist',
    albumArt: data.albumArt || '',
    previewUrl: data.previewUrl || '',
    platform: data.platform || 'itunes',
    createdAt: new Date().toISOString()
  };

  const connected = await connectDb();
  if (connected && MessageModel) {
    try {
      const doc = new MessageModel(newMessage);
      await doc.save();
      return newMessage;
    } catch (err) {
      console.error('Error saving to MongoDB, falling back to local file:', err.message);
    }
  }

  // Fallback to local file storage
  const messages = readLocalMessages();
  messages.push(newMessage);
  writeLocalMessages(messages);
  return newMessage;
}

/**
 * Find a message by ID
 */
async function getMessageById(id) {
  const connected = await connectDb();
  if (connected && MessageModel) {
    try {
      const doc = await MessageModel.findOne({ id }).lean();
      if (doc) {
        return {
          id: doc.id,
          replyToId: doc.replyToId || null,
          sender: doc.sender,
          recipient: doc.recipient,
          message: doc.message,
          songTitle: doc.songTitle,
          artistName: doc.artistName,
          albumArt: doc.albumArt,
          previewUrl: doc.previewUrl,
          platform: doc.platform,
          createdAt: doc.createdAt
        };
      }
    } catch (err) {
      console.error('Error fetching from MongoDB, trying local file:', err.message);
    }
  }

  // Fallback to local file storage
  const messages = readLocalMessages();
  return messages.find(m => m.id === id) || null;
}

/**
 * Search messages by recipient name
 */
async function searchMessagesByRecipient(recipientName) {
  if (!recipientName || recipientName.trim() === '') return [];
  const search = recipientName.trim();

  const connected = await connectDb();
  if (connected && MessageModel) {
    try {
      const docs = await MessageModel.find({
        recipient: { $regex: search, $options: 'i' }
      })
      .sort({ createdAt: -1 })
      .lean();

      return docs.map(m => ({
        id: m.id,
        sender: m.sender,
        recipient: m.recipient,
        songTitle: m.songTitle,
        artistName: m.artistName,
        createdAt: m.createdAt
      }));
    } catch (err) {
      console.error('Error searching MongoDB, trying local file:', err.message);
    }
  }

  // Fallback to local file storage
  const messages = readLocalMessages();
  const searchLower = search.toLowerCase();
  return messages
    .filter(m => m.recipient && m.recipient.toLowerCase().includes(searchLower))
    .map(m => ({
      id: m.id,
      sender: m.sender,
      recipient: m.recipient,
      songTitle: m.songTitle,
      artistName: m.artistName,
      createdAt: m.createdAt
    }))
    .reverse();
}

module.exports = {
  connectDb,
  saveMessage,
  getMessageById,
  searchMessagesByRecipient
};
