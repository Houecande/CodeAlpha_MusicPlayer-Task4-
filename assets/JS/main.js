/* ════════════════════════════════════════════════════════════
   JAMENDO CONFIG
   Free, open music catalog. Create a free account at
   https://devportal.jamendo.com/ to get your client_id,
   then paste it below.
   ════════════════════════════════════════════════════════════ */
const JAMENDO_CLIENT_ID = "444b0916"; // replace with your own client_id
const JAMENDO_LIMIT = 15;

// audioformat=mp31 (lighter, mobile/4G friendly) or mp32 (better quality, heavier)
function buildJamendoUrl() {
  const randomOffset = Math.floor(Math.random() * 200); // varies the selection on each visit
  return `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}` +
    `&format=json&limit=${JAMENDO_LIMIT}&include=musicinfo&audioformat=mp32` +
    `&imagesize=300&order=popularity_month&offset=${randomOffset}`;
}

/* ── TRACK DATA ──
   TRACKS = local songs (assets/songs) + a fresh Jamendo selection,
   combined every time the site loads. Nothing is cached: closing and
   reopening the site fetches a new Jamendo batch.
*/
let TRACKS = [];

// Local songs, always included in the playlist
const LOCAL_TRACKS = [
  {
    name: "Back In Black",
    artist: "AC/DC",
    album: "Back In Black",
    year: 1980,
    genre: "Hard Rock",
    src: "assets/songs/AC_DC - Back In Black.mp3",
    color: "#E53935",
    c2: "#212121"
  },
  {
    name: "I Against I",
    artist: "Bad Brains",
    album: "I Against I",
    year: 1986,
    genre: "Hardcore Punk",
    src: "assets/songs/I Against I.mp3",
    color: "#FFB300",
    c2: "#3E2723"
  },
  {
    name: "Like A Prayer",
    artist: "Madonna",
    album: "Like A Prayer",
    year: 1989,
    genre: "Pop",
    src: "assets/songs/Madonna - Like A Prayer.mp3",
    color: "#EC407A",
    c2: "#4A148C"
  }
];

// Backup color pairs used for tracks that don't return cover art
const PALETTE = [
  ['#42A5F5', '#0D47A1'],
  ['#66BB6A', '#1B5E20'],
  ['#AB47BC', '#4A148C'],
  ['#FFA726', '#E65100'],
  ['#26C6DA', '#006064'],
  ['#EF5350', '#B71C1C']
];
let paletteIdx = 0;
function nextColorPair() {
  const c = PALETTE[paletteIdx % PALETTE.length];
  paletteIdx++;
  return c;
}

/* Fetches a batch of free tracks from Jamendo and maps them
   to the track shape used by the player. */
async function fetchJamendoTracks() {
  const res = await fetch(buildJamendoUrl());
  if (!res.ok) throw new Error('Invalid Jamendo response: ' + res.status);
  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    throw new Error('Jamendo returned no tracks');
  }
  return data.results
    .filter(t => !!t.audio) // skip tracks with no playable link
    .map(t => {
      const [c1, c2] = nextColorPair();
      const genre = (t.musicinfo && t.musicinfo.tags && t.musicinfo.tags.genres && t.musicinfo.tags.genres[0]) || 'Jamendo';
      return {
        name: t.name || 'Unknown title',
        artist: t.artist_name || 'Unknown artist',
        album: t.album_name || '',
        year: t.releasedate ? t.releasedate.slice(0, 4) : '',
        genre: genre,
        src: t.audio,
        image: t.image || '',
        duration: t.duration ? parseInt(t.duration, 10) : null, // duration in seconds, no audio probe needed
        color: c1,
        c2: c2
      };
    });
}

/* ── HELPERS ── */
function fmtTime(s) {
  if (isNaN(s) || s === null) return '0:00';
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return m + ':' + (sec < 10 ? '0' : '') + sec;
}

/* ── ARTWORK GENERATOR ──
   Draws the real cover art when available, otherwise falls back
   to a generated abstract visual.
*/
function drawArt(canvas, track, size) {
  const ctx = canvas.getContext('2d');
  if (track.image) {
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, size, size);
    img.onerror = () => drawGeneratedArt(ctx, track.color, track.c2, size); // silent fallback, no visible error
    img.src = track.image;
  } else {
    drawGeneratedArt(ctx, track.color, track.c2, size);
  }
}

function drawGeneratedArt(ctx, color, c2, size) {
  ctx.fillStyle = '#0A0A0E';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 5; i++) {
    const gx = Math.random() * size, gy = Math.random() * size;
    const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, size * .55);
    gr.addColorStop(0, color + '55');
    gr.addColorStop(1, 'transparent');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, size, size);
  }
  const gr2 = ctx.createRadialGradient(size * .4, size * .4, 0, size * .5, size * .5, size * .6);
  gr2.addColorStop(0, c2 + 'AA');
  gr2.addColorStop(.5, color + '44');
  gr2.addColorStop(1, 'transparent');
  ctx.fillStyle = gr2;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = color + '30';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(size * .5, size * .5, 18 + i * 20, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/* ── AUDIO INSTANCE ── */
const audio = new Audio();

/* ── DOM ELEMENTS ── */
const artMainCanvas = document.getElementById('art-main');
const sbLabel    = document.querySelector('.sb-label');
const trackListEl = document.getElementById('track-list');
const trackEls   = [];

const sName    = document.getElementById('s-name');
const sArtist  = document.getElementById('s-artist');
const sAlbum   = document.getElementById('s-album');
const sGenre   = document.getElementById('s-genre');
const progFill = document.getElementById('prog-fill');
const progWrap = document.getElementById('prog-wrap');
const tCur     = document.getElementById('t-cur');
const tDur     = document.getElementById('t-dur');
const playIcon = document.getElementById('play-icon');
const eqBars   = document.getElementById('eq-bars').querySelectorAll('.eq-bar');
const btnLike  = document.getElementById('btn-like');
const volVal   = document.getElementById('vol-val');
const volSlider = document.getElementById('vol-slider');

/* ── STATE ── */
let curIdx   = 0;
let playing  = false;
let shuffle  = false;
let repeat   = false;
const liked  = new Set();
const failedIndices = new Set(); // prevents an infinite skip loop if several tracks fail

/* Limits the visible track list to ~8 rows, then makes it scrollable.
   Computed from the actual rendered row height, so it adapts to any CSS. */
function applyScrollLimit(visibleCount = 8) {
  const firstItem = trackListEl.querySelector('.track-item');
  if (!firstItem) return;
  const rowHeight = firstItem.getBoundingClientRect().height;
  if (rowHeight > 0) {
    trackListEl.style.maxHeight = (rowHeight * visibleCount) + 'px';
    trackListEl.style.overflowY = 'auto';
  }
}

/* Nice animated placeholder shown while Jamendo is being queried */
function showLoadingState() {
  if (sbLabel) sbLabel.textContent = 'Finding music...';
  trackListEl.innerHTML = `
    <div class="playlist-loading">
      <div class="loading-spinner"></div>
      <p class="loading-text">Finding fresh tracks for you…</p>
      <div class="skeleton-row"></div>
      <div class="skeleton-row"></div>
      <div class="skeleton-row"></div>
    </div>
  `;
}

/* ── RENDER TRACK LIST (called on load and whenever a track is added) ── */
function renderTrackList() {
  trackListEl.innerHTML = '';
  trackEls.length = 0;

  if (sbLabel) {
    sbLabel.textContent = `Playlist — ${TRACKS.length} track${TRACKS.length !== 1 ? 's' : ''}`;
  }

  TRACKS.forEach((t, i) => {
    const item = document.createElement('div');
    item.className = 'track-item' + (i === curIdx ? ' active' : '');
    item.dataset.index = i;
    item.setAttribute('role', 'listitem');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', `${t.name} by ${t.artist}`);

    const artWrap = document.createElement('div');
    artWrap.className = 't-art';
    const cvs = document.createElement('canvas');
    cvs.width = 76; cvs.height = 76;
    drawArt(cvs, t, 76);
    artWrap.appendChild(cvs);

    item.innerHTML = `
      <div class="t-info">
        <div class="t-name">${t.name}</div>
        <div class="t-artist">${t.artist}</div>
      </div>
      <div class="t-dur">--:--</div>
    `;
    item.insertBefore(artWrap, item.firstChild);

    // Duration: use Jamendo's own value directly when available (no audio probe = no errors)
    if (typeof t.duration === 'number') {
      const durEl = item.querySelector('.t-dur');
      if (durEl) durEl.textContent = fmtTime(t.duration);
    } else {
      // Local / imported tracks: read duration from file metadata, fail silently
      const probe = new Audio(t.src);
      probe.addEventListener('loadedmetadata', () => {
        const durEl = item.querySelector('.t-dur');
        if (durEl) durEl.textContent = fmtTime(probe.duration);
      });
      // No visible error indicator on failure — keeps the "--:--" placeholder
    }

    item.addEventListener('click', () => selectTrack(i, true));
    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectTrack(i, true); }
    });

    trackListEl.appendChild(item);
    trackEls.push(item);
  });

  applyScrollLimit(8);
}

/* Shows the first track on the main panel and queues it for playback */
function showFirstTrack() {
  const first = TRACKS[0];
  if (!first) return;
  drawArt(artMainCanvas, first, 376);
  sName.textContent   = first.name;
  sArtist.textContent = first.artist;
  sAlbum.textContent  = (first.album || '—') + (first.year ? ' · ' + first.year : '');
  sGenre.textContent  = first.genre || '';
  audio.src = first.src;
  audio.volume = volSlider.value / 100;
}

/* ── SELECT TRACK ── */
function selectTrack(i, autoplay) {
  curIdx  = i;
  const t = TRACKS[i];
  if (!t) return;

  sName.textContent   = t.name;
  sArtist.textContent = t.artist;
  sAlbum.textContent  = (t.album || '—') + (t.year ? ' · ' + t.year : '');
  sGenre.textContent  = t.genre || '';
  tDur.textContent    = '--:--';
  tCur.textContent    = '0:00';
  progFill.style.width = '0%';
  progWrap.setAttribute('aria-valuenow', 0);

  drawArt(artMainCanvas, t, 376);
  trackEls.forEach((el, idx) => el.classList.toggle('active', idx === i));

  /* scroll active item into view */
  if (trackEls[i]) trackEls[i].scrollIntoView({ block: 'nearest', behavior: 'smooth' });

  updateLikeBtn();

  audio.src = t.src;
  audio.load();

  if (autoplay) {
    audio.play().then(() => {
      playing = true;
      updatePlayState();
    }).catch(err => {
      console.log("Autoplay failed/blocked:", err);
      playing = false;
      updatePlayState();
    });
  } else {
    playing = false;
    updatePlayState();
  }
}

/* ── PLAY / PAUSE ── */
function togglePlay() {
  if (TRACKS.length === 0) return;
  if (audio.paused) {
    audio.play().then(() => {
      playing = true;
      updatePlayState();
    }).catch(err => console.log(err));
  } else {
    audio.pause();
    playing = false;
    updatePlayState();
  }
}

function updatePlayState() {
  playIcon.className = playing ? 'ti ti-player-pause' : 'ti ti-player-play';
  document.getElementById('btn-play').setAttribute('aria-label', playing ? 'Pause' : 'Play');
  animEQ(playing);
}

/* ── AUDIO EVENT LISTENERS ── */
audio.addEventListener('loadedmetadata', () => {
  tDur.textContent = fmtTime(audio.duration);
});

audio.addEventListener('timeupdate', () => {
  const curTime = audio.currentTime;
  const duration = audio.duration || 1;
  const pct = Math.round((curTime / duration) * 100);
  progFill.style.width = pct + '%';
  progWrap.setAttribute('aria-valuenow', pct);
  tCur.textContent = fmtTime(curTime);
});

audio.addEventListener('ended', () => {
  if (repeat) {
    audio.currentTime = 0;
    audio.play().catch(err => console.log(err));
  } else {
    nextTrack();
  }
});

audio.addEventListener('play', () => {
  playing = true;
  updatePlayState();
});

audio.addEventListener('pause', () => {
  playing = false;
  updatePlayState();
});

/* If a track's stream is temporarily unreachable, skip to the next one
   automatically instead of showing an error or freezing playback. */
audio.addEventListener('error', () => {
  console.warn('Playback failed for current track, skipping to next.');
  failedIndices.add(curIdx);
  if (failedIndices.size >= TRACKS.length) {
    // All tracks failed: stop quietly, no alarming message shown to the user
    playing = false;
    updatePlayState();
    return;
  }
  nextTrack();
});

/* ── NAVIGATION ── */
function nextTrack() {
  if (TRACKS.length === 0) return;
  let next;
  if (shuffle) { next = Math.floor(Math.random() * TRACKS.length); }
  else { next = (curIdx + 1) % TRACKS.length; }
  selectTrack(next, true);
}

function prevTrack() {
  if (TRACKS.length === 0) return;
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  const prev = (curIdx - 1 + TRACKS.length) % TRACKS.length;
  selectTrack(prev, true);
}

/* ── EQ ANIMATION ── */
let eqAnim;
const eqHeights = [6, 11, 8, 14, 9];

function animEQ(on) {
  cancelAnimationFrame(eqAnim);
  if (!on) {
    eqBars.forEach((b, i) => { b.style.height = eqHeights[i] + 'px'; });
    return;
  }
  function frame() {
    eqBars.forEach((b, i) => {
      const h = Math.max(2, Math.min(16, eqHeights[i] + Math.round((Math.random() - .4) * 8)));
      eqHeights[i] = h;
      b.style.height = h + 'px';
    });
    eqAnim = requestAnimationFrame(frame);
  }
  frame();
}

/* ── LIKE ── */
function updateLikeBtn() {
  const isLiked = liked.has(curIdx);
  btnLike.innerHTML = isLiked
    ? '<i class="ti ti-heart-filled" aria-hidden="true"></i>'
    : '<i class="ti ti-heart" aria-hidden="true"></i>';
  btnLike.classList.toggle('liked', isLiked);
  btnLike.setAttribute('aria-label', isLiked ? 'Remove from favorites' : 'Add to favorites');
}

btnLike.addEventListener('click', () => {
  if (liked.has(curIdx)) { liked.delete(curIdx); }
  else { liked.add(curIdx); }
  updateLikeBtn();
});

/* ── PROGRESS SCRUB ── */
function scrub(e) {
  const rect  = progWrap.getBoundingClientRect();
  const pct   = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  if (audio.duration) {
    audio.currentTime = pct * audio.duration;
  }
}

progWrap.addEventListener('click', scrub);

/* ── VOLUME ── */
volSlider.addEventListener('input', function () {
  volVal.textContent = this.value;
  audio.volume = this.value / 100;
});

/* ── BUTTONS ── */
document.getElementById('btn-play').addEventListener('click', togglePlay);
document.getElementById('btn-next').addEventListener('click', nextTrack);
document.getElementById('btn-prev').addEventListener('click', prevTrack);

document.getElementById('btn-shuffle').addEventListener('click', function () {
  shuffle = !shuffle;
  this.classList.toggle('active', shuffle);
  this.setAttribute('aria-pressed', shuffle ? 'true' : 'false');
});

document.getElementById('btn-repeat').addEventListener('click', function () {
  repeat = !repeat;
  this.classList.toggle('active', repeat);
  this.setAttribute('aria-pressed', repeat ? 'true' : 'false');
});

/* ── KEYBOARD SHORTCUTS ── */
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space')       { e.preventDefault(); togglePlay(); }
  if (e.code === 'ArrowRight')  { e.preventDefault(); nextTrack(); }
  if (e.code === 'ArrowLeft')   { e.preventDefault(); prevTrack(); }
  if (e.code === 'KeyM')        {
    volSlider.value = volSlider.value > 0 ? 0 : 75;
    volVal.textContent = volSlider.value;
    audio.volume = volSlider.value / 100;
  }
});

/* ── SWIPE (mobile) ── */
let touchX = 0;
document.getElementById('mp').addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
document.getElementById('mp').addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 60) { dx < 0 ? nextTrack() : prevTrack(); }
});

/* ════════════════════════════════════════════════════════════
   IMPORT FROM DEVICE (PC / phone) + DRAG & DROP
   The file never leaves the device: the browser only keeps a
   temporary local reference (blob:) to play it.
   ════════════════════════════════════════════════════════════ */
function addLocalFile(file) {
  if (!file.type.startsWith('audio/')) {
    alert(`"${file.name}" doesn't look like an audio file.`);
    return;
  }
  const objectUrl = URL.createObjectURL(file);
  const [c1, c2] = nextColorPair();
  const cleanName = file.name.replace(/\.[^/.]+$/, '');
  TRACKS.push({
    name: cleanName || 'Untitled track',
    artist: 'Local file',
    album: '',
    year: '',
    genre: 'Imported',
    src: objectUrl,
    color: c1,
    c2: c2,
    custom: true,
    objectUrl
  });
  renderTrackList();
}

function buildImportControls() {
  const wrap = document.createElement('div');
  wrap.className = 'lib-controls';
  wrap.innerHTML = `
    <button type="button" id="btn-add-file" class="lib-btn">
      <i class="ti ti-upload" aria-hidden="true"></i> Add from device
    </button>
    <input type="file" id="file-input" accept="audio/*" multiple hidden>
  `;
  trackListEl.parentElement.insertBefore(wrap, trackListEl);

  document.getElementById('btn-add-file').addEventListener('click', () => {
    document.getElementById('file-input').click();
  });

  document.getElementById('file-input').addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(addLocalFile);
    e.target.value = ''; // allows re-selecting the same file later
  });
}

function buildDragAndDrop() {
  const mpEl = document.getElementById('mp');
  ['dragover'].forEach(evt => mpEl.addEventListener(evt, e => {
    e.preventDefault();
    mpEl.classList.add('drag-over');
  }));
  ['dragleave', 'drop'].forEach(evt => mpEl.addEventListener(evt, e => {
    e.preventDefault();
    mpEl.classList.remove('drag-over');
  }));
  mpEl.addEventListener('drop', e => {
    const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('audio/'));
    files.forEach(addLocalFile);
  });
}

/* Small injected styles for the new controls and the loading state,
   so nothing needs to be touched in the existing CSS file. */
function injectExtraStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .lib-controls { display: flex; gap: 8px; padding: 10px 14px; flex-wrap: wrap; }
    .lib-btn {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
      color: #fff; font-size: 13px; padding: 7px 12px; border-radius: 8px;
      cursor: pointer; transition: background .15s ease, transform .1s ease;
    }
    .lib-btn:hover { background: rgba(139,124,246,0.18); border-color: rgba(139,124,246,0.4); }
    .lib-btn:active { transform: scale(0.97); }
    #mp.drag-over { outline: 2px dashed #8b7cf6; outline-offset: -6px; }

    .playlist-loading {
      display: flex; flex-direction: column; align-items: center; gap: 14px;
      padding: 30px 14px 18px;
    }
    .loading-spinner {
      width: 28px; height: 28px;
      border: 3px solid rgba(139,124,246,0.25);
      border-top-color: #8b7cf6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .loading-text { font-size: 13px; color: rgba(255,255,255,0.5); margin: 0 0 4px; }
    .skeleton-row {
      width: 100%; height: 56px; border-radius: 10px;
      background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.1) 37%, rgba(255,255,255,0.04) 63%);
      background-size: 400% 100%;
      animation: shimmer 1.4s ease infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }
  `;
  document.head.appendChild(style);
}

injectExtraStyles();
buildImportControls();
buildDragAndDrop();

/* ════════════════════════════════════════════════════════════
   STARTUP
   Combine local songs with a fresh Jamendo selection every time
   the site loads. If Jamendo is unreachable, fall back to local
   songs only — the player never breaks.
   ════════════════════════════════════════════════════════════ */
(async function start() {
  showLoadingState();

  try {
    const jamendoTracks = await fetchJamendoTracks();
    TRACKS = [...LOCAL_TRACKS, ...jamendoTracks];
  } catch (err) {
    console.warn('Jamendo unavailable, using local tracks only:', err);
    TRACKS = LOCAL_TRACKS;
  }

  renderTrackList();
  showFirstTrack();
})();