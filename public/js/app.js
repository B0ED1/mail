document.addEventListener('DOMContentLoaded', () => {
  // Generate Starry Background
  initStarsBg();

  // Elements
  const melodyForm = document.getElementById('melodyForm');
  const messageInput = document.getElementById('messageInput');
  const charCount = document.getElementById('charCount');
  
  const songSearchInput = document.getElementById('songSearchInput');
  const searchResultsDropdown = document.getElementById('searchResultsDropdown');
  const selectedSongCard = document.getElementById('selectedSongCard');
  const selectedArt = document.getElementById('selectedArt');
  const selectedTitle = document.getElementById('selectedTitle');
  const selectedArtist = document.getElementById('selectedArtist');
  const previewAudioBtn = document.getElementById('previewAudioBtn');
  const previewAudioIcon = document.getElementById('previewAudioIcon');
  const removeSongBtn = document.getElementById('removeSongBtn');
  const globalAudioPlayer = document.getElementById('globalAudioPlayer');

  // Hidden form fields
  const selectedSongTitle = document.getElementById('selectedSongTitle');
  const selectedArtistName = document.getElementById('selectedArtistName');
  const selectedAlbumArt = document.getElementById('selectedAlbumArt');
  const selectedPreviewUrl = document.getElementById('selectedPreviewUrl');
  const replyToId = document.getElementById('replyToId');

  // Check if replying to an existing message
  const replyBanner = document.getElementById('replyBanner');
  const urlParams = new URLSearchParams(window.location.search);
  const replyIdParam = urlParams.get('replyTo');
  if (replyIdParam) {
    checkAndSetupReply(replyIdParam);
  } else if (replyBanner) {
    replyBanner.style.display = 'none';
  }

  // Inbox Modal Elements
  const openInboxBtn = document.getElementById('openInboxBtn');
  const closeInboxBtn = document.getElementById('closeInboxBtn');
  const inboxModal = document.getElementById('inboxModal');
  const inboxSearchInput = document.getElementById('inboxSearchInput');
  const inboxResultsList = document.getElementById('inboxResultsList');

  if (openInboxBtn && inboxModal) {
    openInboxBtn.addEventListener('click', () => {
      inboxModal.classList.add('active');
      inboxSearchInput.focus();
      if (!inboxSearchInput.value.trim()) {
        renderLocalHistory();
      }
    });

    closeInboxBtn.addEventListener('click', () => {
      inboxModal.classList.remove('active');
    });

    let inboxDebounce = null;
    inboxSearchInput.addEventListener('input', (e) => {
      const name = e.target.value.trim();
      clearTimeout(inboxDebounce);

      if (name.length < 2) {
        renderLocalHistory();
        return;
      }

      inboxDebounce = setTimeout(async () => {
        inboxResultsList.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Mencari pesan...</div>';
        try {
          const res = await fetch(`/api/inbox?name=${encodeURIComponent(name)}`);
          const data = await res.json();

          if (!data.results || data.results.length === 0) {
            inboxResultsList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px;">Belum ada pesan untuk "${escapeHtml(name)}".</div>`;
            return;
          }

          inboxResultsList.innerHTML = '';
          data.results.forEach(msg => {
            const card = document.createElement('div');
            card.style.cssText = 'background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 12px 16px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;';
            card.innerHTML = `
              <div>
                <div style="font-weight: 600; color: #fff; font-size: 0.95rem;">Dari: ${escapeHtml(msg.sender)} (Untuk: ${escapeHtml(msg.recipient)})</div>
                <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 2px;">🎵 ${escapeHtml(msg.songTitle || 'Tanpa lagu')}</div>
              </div>
              <a href="/m/${msg.id}" class="btn-submit" style="padding: 8px 14px; font-size: 0.85rem; text-decoration: none; width: auto;">
                <i class="fa-solid fa-envelope-open"></i> Buka Surat
              </a>
            `;
            inboxResultsList.appendChild(card);
          });
        } catch (err) {
          console.error(err);
          inboxResultsList.innerHTML = '<div style="text-align: center; color: #ef4444; padding: 20px;">Gagal memuat pesan.</div>';
        }
      }, 350);
    });
  }

  function getLocalHistory() {
    try {
      return JSON.parse(localStorage.getItem('melody_mail_history') || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveLocalHistory(item) {
    try {
      const history = getLocalHistory();
      const filtered = history.filter(h => h.id !== item.id);
      filtered.unshift(item);
      localStorage.setItem('melody_mail_history', JSON.stringify(filtered.slice(0, 20)));
    } catch (e) {
      console.error(e);
    }
  }

  function renderLocalHistory() {
    const history = getLocalHistory();
    if (!history || history.length === 0) {
      inboxResultsList.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">Ketik namamu di atas untuk mencari pesan.</div>';
      return;
    }

    inboxResultsList.innerHTML = '<div style="font-size: 0.85rem; color: var(--primary-pink); font-weight: 600; margin-bottom: 12px;"><i class="fa-solid fa-clock-rotate-left"></i> Pesan Terakhir yang Pernah Kamu Buat:</div>';
    
    history.forEach(msg => {
      const card = document.createElement('div');
      card.style.cssText = 'background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 12px 16px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; gap: 10px;';
      const openUrl = msg.shareUrl || `/m/${msg.id}`;
      card.innerHTML = `
        <div style="overflow: hidden; text-overflow: ellipsis;">
          <div style="font-weight: 600; color: #fff; font-size: 0.92rem;">Untuk: ${escapeHtml(msg.recipient)} <span style="font-weight:400; font-size:0.8rem; color:var(--text-muted);">(Dari: ${escapeHtml(msg.sender)})</span></div>
          <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 2px;">🎵 ${escapeHtml(msg.songTitle || 'Tanpa lagu')}</div>
        </div>
        <a href="${escapeHtml(openUrl)}" class="btn-submit" style="padding: 8px 14px; font-size: 0.85rem; text-decoration: none; width: auto; white-space: nowrap;">
          <i class="fa-solid fa-envelope-open"></i> Buka
        </a>
      `;
      inboxResultsList.appendChild(card);
    });
  }

  let searchDebounceTimeout = null;

  // Character counter listener
  messageInput.addEventListener('input', () => {
    charCount.textContent = messageInput.value.length;
  });

  // Song Search Input Debounce
  songSearchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    clearTimeout(searchDebounceTimeout);

    if (query.length < 2) {
      searchResultsDropdown.classList.remove('active');
      searchResultsDropdown.innerHTML = '';
      return;
    }

    searchDebounceTimeout = setTimeout(() => {
      fetchSongs(query);
    }, 350);
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!songSearchInput.contains(e.target) && !searchResultsDropdown.contains(e.target)) {
      searchResultsDropdown.classList.remove('active');
    }
  });

  /**
   * Fetch songs from backend proxy (/api/search)
   */
  async function fetchSongs(query) {
    try {
      searchResultsDropdown.innerHTML = '<div style="padding:14px; text-align:center; color:#9ca3af;"><i class="fa-solid fa-spinner fa-spin"></i> Mencari lagu...</div>';
      searchResultsDropdown.classList.add('active');

      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (!data.results || data.results.length === 0) {
        searchResultsDropdown.innerHTML = '<div style="padding:14px; text-align:center; color:#9ca3af;">Lagu tidak ditemukan</div>';
        return;
      }

      renderSearchResults(data.results);
    } catch (err) {
      console.error('Failed to search songs:', err);
      searchResultsDropdown.innerHTML = '<div style="padding:14px; text-align:center; color:#ef4444;">Gagal memuat hasil pencarian</div>';
    }
  }

  /**
   * Render song items in dropdown
   */
  function renderSearchResults(songs) {
    searchResultsDropdown.innerHTML = '';
    songs.forEach(song => {
      const item = document.createElement('div');
      item.className = 'song-item';
      item.innerHTML = `
        <img src="${song.albumArt || 'https://via.placeholder.com/100'}" alt="${song.title}">
        <div class="song-info">
          <div class="song-title">${escapeHtml(song.title)}</div>
          <div class="song-artist">${escapeHtml(song.artist)}</div>
        </div>
      `;

      item.addEventListener('click', () => selectSong(song));
      searchResultsDropdown.appendChild(item);
    });
  }

  /**
   * Select a song
   */
  function selectSong(song) {
    selectedSongTitle.value = song.title;
    selectedArtistName.value = song.artist;
    selectedAlbumArt.value = song.albumArt;
    selectedPreviewUrl.value = song.previewUrl;

    selectedArt.src = song.albumArt || 'https://via.placeholder.com/100';
    selectedTitle.textContent = song.title;
    selectedArtist.textContent = song.artist;

    if (song.previewUrl) {
      globalAudioPlayer.src = song.previewUrl;
      previewAudioBtn.style.display = 'flex';
    } else {
      globalAudioPlayer.src = '';
      previewAudioBtn.style.display = 'none';
    }

    selectedSongCard.style.display = 'flex';
    searchResultsDropdown.classList.remove('active');
    songSearchInput.value = '';
  }

  // Audio Preview Toggle
  previewAudioBtn.addEventListener('click', () => {
    if (!globalAudioPlayer.src) return;

    if (globalAudioPlayer.paused) {
      globalAudioPlayer.play();
      previewAudioIcon.className = 'fa-solid fa-pause';
    } else {
      globalAudioPlayer.pause();
      previewAudioIcon.className = 'fa-solid fa-play';
    }
  });

  globalAudioPlayer.addEventListener('ended', () => {
    previewAudioIcon.className = 'fa-solid fa-play';
  });

  // Remove Selected Song
  removeSongBtn.addEventListener('click', () => {
    selectedSongTitle.value = '';
    selectedArtistName.value = '';
    selectedAlbumArt.value = '';
    selectedPreviewUrl.value = '';
    
    globalAudioPlayer.pause();
    globalAudioPlayer.src = '';
    previewAudioIcon.className = 'fa-solid fa-play';

    selectedSongCard.style.display = 'none';
  });

  // Form Submit Handler
  melodyForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const sender = document.getElementById('senderInput').value.trim();
    const recipient = document.getElementById('recipientInput').value.trim();
    const message = messageInput.value.trim();

    if (!sender || !recipient || !message) {
      alert('Mohon lengkapi nama pengirim, penerima, dan isi pesan.');
      return;
    }

    // Stop audio preview if playing
    globalAudioPlayer.pause();

    // Show delivery overlay animation
    deliveryOverlay.classList.add('active');
    successModal.classList.remove('active');
    deliveryStatus.style.display = 'block';

    try {
      // POST API request
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender,
          recipient,
          message,
          songTitle: selectedSongTitle.value,
          artistName: selectedArtistName.value,
          albumArt: selectedAlbumArt.value,
          previewUrl: selectedPreviewUrl.value,
          platform: 'itunes',
          replyToId: replyToId ? replyToId.value : null
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan pesan');
      }

      // Save to local browser history
      saveLocalHistory({
        id: data.data.id,
        sender,
        recipient,
        songTitle: selectedSongTitle.value,
        shareUrl: data.shareUrl,
        createdAt: new Date().toISOString()
      });

      // Wait for carrier pigeon flight animation (3.5 seconds)
      setTimeout(() => {
        deliveryStatus.style.display = 'none';
        shareLinkInput.value = data.shareUrl;
        previewLinkBtn.href = data.shareUrl;
        successModal.classList.add('active');
      }, 3500);

    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan: ' + err.message);
      deliveryOverlay.classList.remove('active');
    }
  });

  // Copy Link Button
  copyLinkBtn.addEventListener('click', () => {
    shareLinkInput.select();
    navigator.clipboard.writeText(shareLinkInput.value).then(() => {
      copyLinkBtn.innerHTML = '<i class="fa-solid fa-check"></i> Tersalin!';
      setTimeout(() => {
        copyLinkBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Salin';
      }, 2000);
    });
  });

  // Create Another Message Button
  createAnotherBtn.addEventListener('click', () => {
    deliveryOverlay.classList.remove('active');
    melodyForm.reset();
    charCount.textContent = '0';
    selectedSongCard.style.display = 'none';
  });
});

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

function escapeHtml(str) {
  return str ? str.replace(/[&<>"']/g, match => {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match];
  }) : '';
}

/**
 * Fetch original message payload when replying to a message
 */
async function checkAndSetupReply(id) {
  try {
    const res = await fetch(`/api/messages/${encodeURIComponent(id)}`);
    const data = await res.json();

    if (res.ok && data.success && data.data) {
      const parentMsg = data.data;
      const recipientInput = document.getElementById('recipientInput');
      const senderInput = document.getElementById('senderInput');
      const replyToId = document.getElementById('replyToId');
      const replyBanner = document.getElementById('replyBanner');
      const replyBannerSender = document.getElementById('replyBannerSender');

      if (recipientInput && senderInput && replyToId) {
        recipientInput.value = parentMsg.sender || '';
        senderInput.value = parentMsg.recipient || '';
        replyToId.value = parentMsg.id;

        if (replyBanner && replyBannerSender) {
          replyBannerSender.textContent = parentMsg.sender || 'Seseorang';
          replyBanner.style.display = 'flex';
        }
      }
    }
  } catch (err) {
    console.error('Failed to setup reply:', err);
  }
}
