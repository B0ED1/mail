document.addEventListener('DOMContentLoaded', async () => {
  initStarsBg();

  // Parse Message ID from URL path or query params
  const pathParts = window.location.pathname.split('/');
  let messageId = null;
  
  if (pathParts.length >= 3 && pathParts[1] === 'm') {
    messageId = pathParts[2];
  } else {
    const urlParams = new URLSearchParams(window.location.search);
    messageId = urlParams.get('id');
  }

  if (!messageId) {
    alert('ID pesan tidak valid atau tidak ditemukan dalam URL.');
    return;
  }

  // DOM Elements
  const envelopeStage = document.getElementById('envelopeStage');
  const envelope3d = document.getElementById('envelope3d');
  const waxSeal = document.getElementById('waxSeal');
  const envelopeRecipientLabel = document.getElementById('envelopeRecipientLabel');
  const envelopeHint = document.getElementById('envelopeHint');

  const letterCard = document.getElementById('letterCard');
  const letterRecipient = document.getElementById('letterRecipient');
  const letterSender = document.getElementById('letterSender');
  const letterBody = document.getElementById('letterBody');

  const vinylPlayerCard = document.getElementById('vinylPlayerCard');
  const vinylDisc = document.getElementById('vinylDisc');
  const vinylCoverArt = document.getElementById('vinylCoverArt');
  const playerSongTitle = document.getElementById('playerSongTitle');
  const playerArtistName = document.getElementById('playerArtistName');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const playPauseIcon = document.getElementById('playPauseIcon');
  const audioStatusText = document.getElementById('audioStatusText');
  const recipientAudioPlayer = document.getElementById('recipientAudioPlayer');

  let messageData = null;

  try {
    // Fetch message data from server
    const res = await fetch(`/api/messages/${encodeURIComponent(messageId)}`);
    const result = await res.json();

    if (res.ok && result.success && result.data) {
      messageData = result.data;
    }
  } catch (err) {
    console.warn('Backend fetch failed, attempting URL payload fallback:', err);
  }

  // Fallback: Decode payload directly from URL hash or query param if backend didn't return data
  if (!messageData) {
    try {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const urlParams = new URLSearchParams(window.location.search);
      const encoded = hashParams.get('d') || urlParams.get('d');
      if (encoded) {
        const decodedStr = decodeURIComponent(escape(atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))));
        const p = JSON.parse(decodedStr);
        messageData = {
          id: messageId,
          sender: p.s || 'Seseorang',
          recipient: p.r || 'Seseorang',
          message: p.m || '',
          songTitle: p.st || '',
          artistName: p.an || '',
          albumArt: p.aa || '',
          previewUrl: p.pu || '',
          platform: 'itunes'
        };
      }
    } catch (e) {
      console.error('Failed to parse URL payload:', e);
    }
  }

  if (!messageData) {
    envelopeRecipientLabel.textContent = 'Pesan Tidak Ditemukan';
    envelopeHint.textContent = 'Maaf, tautan pesan ini tidak valid atau telah kedaluwarsa.';
    return;
  }

    // Populate envelope label
    envelopeRecipientLabel.textContent = messageData.recipient || 'Seseorang';
    document.title = `Melody Mail - Pesan untuk ${messageData.recipient || 'Kamu'}`;

    // Pre-fill letter contents
    letterRecipient.textContent = `Untuk: ${messageData.recipient}`;
    letterSender.textContent = messageData.sender;

    // Handle parent message quote if this is a reply
    if (messageData.replyToMessage) {
      const parentReplyQuote = document.getElementById('parentReplyQuote');
      const parentSenderName = document.getElementById('parentSenderName');
      const parentMessageSnippet = document.getElementById('parentMessageSnippet');

      if (parentReplyQuote && parentSenderName && parentMessageSnippet) {
        parentSenderName.textContent = messageData.replyToMessage.sender;
        parentMessageSnippet.textContent = `"${messageData.replyToMessage.messageSnippet}"`;
        parentReplyQuote.style.display = 'block';
      }
    }

    // Setup Reply button navigation
    const replyBtn = document.getElementById('replyBtn');
    if (replyBtn) {
      replyBtn.addEventListener('click', () => {
        window.location.href = `/?replyTo=${messageData.id}`;
      });
    }

    // Music card setup
    if (messageData.songTitle) {
      playerSongTitle.textContent = messageData.songTitle;
      playerArtistName.textContent = messageData.artistName || 'Penyanyi Spesial';
      if (messageData.albumArt) {
        vinylCoverArt.src = messageData.albumArt;
      }
      if (messageData.previewUrl) {
        recipientAudioPlayer.src = messageData.previewUrl;
      } else {
        audioStatusText.textContent = 'Lagu tidak memiliki pratinjau audio';
        playPauseBtn.style.opacity = '0.5';
      }
    } else {
      vinylPlayerCard.style.display = 'none';
    }

  } catch (err) {
    console.error('Failed to load message:', err);
    envelopeRecipientLabel.textContent = 'Terjadi Kesalahan';
    envelopeHint.textContent = 'Gagal menghubungkan ke server.';
    return;
  }

  // Interactive Envelope Open Handler
  let isOpened = false;

  envelopeStage.addEventListener('click', () => {
    if (isOpened || !messageData) return;
    isOpened = true;

    // Trigger animations
    envelope3d.classList.add('opened');
    envelopeHint.style.opacity = '0';

    // Play soft open sound / start music if available
    setTimeout(() => {
      envelopeStage.style.display = 'none';
      letterCard.classList.add('visible');

      // Typewriter effect for letter body
      typewriterText(letterBody, messageData.message, 30);

      // Auto-play music if preview URL exists
      if (recipientAudioPlayer.src) {
        playMusic();
      }
    }, 900);
  });

  // Play / Pause Toggle
  playPauseBtn.addEventListener('click', () => {
    if (!recipientAudioPlayer.src) return;

    if (recipientAudioPlayer.paused) {
      playMusic();
    } else {
      pauseMusic();
    }
  });

  recipientAudioPlayer.addEventListener('ended', () => {
    pauseMusic();
    audioStatusText.textContent = 'Putar Ulang Lagu';
  });

  function playMusic() {
    recipientAudioPlayer.play().then(() => {
      vinylDisc.classList.add('spinning');
      playPauseIcon.className = 'fa-solid fa-pause';
      audioStatusText.textContent = 'Memutar melodi...';
    }).catch(err => {
      console.log('Autoplay prevented:', err);
      audioStatusText.textContent = 'Klik tombol play untuk mendengarkan';
    });
  }

  function pauseMusic() {
    recipientAudioPlayer.pause();
    vinylDisc.classList.remove('spinning');
    playPauseIcon.className = 'fa-solid fa-play';
    audioStatusText.textContent = 'Audio di-pause';
  }
});

/**
 * Typewriter effect for letter content
 */
function typewriterText(element, text, speed = 35) {
  element.textContent = '';
  let i = 0;
  function type() {
    if (i < text.length) {
      element.textContent += text.charAt(i);
      i++;
      setTimeout(type, speed);
    }
  }
  type();
}

/**
 * Initialize Starry Background Particles
 */
function initStarsBg() {
  const container = document.getElementById('starsBg');
  if (!container) return;

  const count = 40;
  for (let i = 0; i < count; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.width = `${Math.random() * 3 + 1}px`;
    star.style.height = star.style.width;
    star.style.setProperty('--duration', `${Math.random() * 3 + 2}s`);
    star.style.setProperty('--opacity', `${Math.random() * 0.7 + 0.3}`);
    container.appendChild(star);
  }
}
