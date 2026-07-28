const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'messages.json');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Ensure database file exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf-8');
}

/**
 * Read all messages from database file
 */
function readMessages() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading database:', err);
    return [];
  }
}

/**
 * Save messages array to database file
 */
function writeMessages(messages) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(messages, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing database:', err);
  }
}

/**
 * Generate unique 8-character ID
 */
function generateId() {
  return crypto.randomBytes(5).toString('hex').substring(0, 8);
}

/**
 * Save a new message
 */
function saveMessage(data) {
  const messages = readMessages();
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

  messages.push(newMessage);
  writeMessages(messages);
  return newMessage;
}

/**
 * Find a message by ID
 */
function getMessageById(id) {
  const messages = readMessages();
  return messages.find(m => m.id === id) || null;
}

/**
 * Search messages by recipient name (case-insensitive)
 */
function searchMessagesByRecipient(recipientName) {
  if (!recipientName || recipientName.trim() === '') return [];
  const messages = readMessages();
  const search = recipientName.trim().toLowerCase();
  
  return messages
    .filter(m => m.recipient && m.recipient.toLowerCase().includes(search))
    .map(m => ({
      id: m.id,
      sender: m.sender,
      recipient: m.recipient,
      songTitle: m.songTitle,
      artistName: m.artistName,
      createdAt: m.createdAt
    }))
    .reverse(); // Latest first
}

module.exports = {
  saveMessage,
  getMessageById,
  searchMessagesByRecipient
};
