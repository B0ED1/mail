const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Endpoint: Search Songs via iTunes API
 */
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query || query.trim() === '') {
    return res.json({ results: [] });
  }

  try {
    const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=10`);
    if (!response.ok) {
      throw new Error(`iTunes API responded with status ${response.status}`);
    }
    const data = await response.json();

    const results = (data.results || []).map(track => ({
      trackId: track.trackId,
      title: track.trackName,
      artist: track.artistName,
      albumArt: track.artworkUrl100 ? track.artworkUrl100.replace('100x100bb', '300x300bb') : '',
      previewUrl: track.previewUrl || '',
      collectionName: track.collectionName || ''
    }));

    return res.json({ results });
  } catch (error) {
    console.error('Error searching songs:', error);
    return res.status(500).json({ error: 'Failed to search songs', results: [] });
  }
});

/**
 * Endpoint: Create Message
 */
app.post('/api/messages', (req, res) => {
  const { sender, recipient, message, songTitle, artistName, albumArt, previewUrl, platform, replyToId } = req.body;

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Isi pesan tidak boleh kosong.' });
  }

  const savedMessage = db.saveMessage({
    sender,
    recipient,
    message,
    songTitle,
    artistName,
    albumArt,
    previewUrl,
    platform: platform || 'itunes',
    replyToId: replyToId || null
  });

  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  const shareUrl = `${protocol}://${host}/m/${savedMessage.id}`;

  return res.status(201).json({
    success: true,
    data: savedMessage,
    shareUrl
  });
});

/**
 * Endpoint: Get Message by ID
 */
app.get('/api/messages/:id', (req, res) => {
  const message = db.getMessageById(req.params.id);
  if (!message) {
    return res.status(404).json({ error: 'Pesan tidak ditemukan.' });
  }

  // If this message is a reply to another message, attach parent message info
  let replyToMessage = null;
  if (message.replyToId) {
    const parent = db.getMessageById(message.replyToId);
    if (parent) {
      replyToMessage = {
        id: parent.id,
        sender: parent.sender,
        recipient: parent.recipient,
        messageSnippet: parent.message.length > 80 ? parent.message.substring(0, 80) + '...' : parent.message,
        songTitle: parent.songTitle
      };
    }
  }

  return res.json({ success: true, data: { ...message, replyToMessage } });
});

/**
 * Endpoint: Search Inbox by Recipient Name
 */
app.get('/api/inbox', (req, res) => {
  const name = req.query.name;
  if (!name || name.trim() === '') {
    return res.json({ results: [] });
  }

  const results = db.searchMessagesByRecipient(name);
  return res.json({ results });
});

/**
 * Route: /m/:id -> Serve read.html
 */
app.get('/m/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'read.html'));
});

// Fallback route to index.html for unknown routes
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🎵 Melody Mail Server running on http://localhost:${PORT}`);
});
