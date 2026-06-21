/* ── TRACK DATA ──
   Real audio files from assets/songs
*/
const TRACKS = [
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

/* ── HELPERS ── */
function fmtTime(s) {
  if (isNaN(s) || s === null) return '0:00';
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return m + ':' + (sec < 10 ? '0' : '') + sec;
}

/* ── ARTWORK GENERATOR ──
   Generates a unique abstract artwork per track using Canvas.
   Replace with <img src="covers/track-N.jpg"> if you have real artwork.
*/
function drawArt(canvas, color, c2, size) {
  const ctx = canvas.getContext('2d');
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
  const gr2 = ctx.createRadialGradient(size*.4, size*.4, 0, size*.5, size*.5, size*.6);
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

/* ── INIT ARTWORK ── */
const artMainCanvas = document.getElementById('art-main');
drawArt(artMainCanvas, TRACKS[0].color, TRACKS[0].c2, 376);

/* ── UPDATE PLAYLIST COUNT ── */
const sbLabel = document.querySelector('.sb-label');
if (sbLabel) {
  sbLabel.textContent = `Playlist — ${TRACKS.length} titre${TRACKS.length > 1 ? 's' : ''}`;
}

/* ── BUILD TRACK LIST ── */
const trackListEl = document.getElementById('track-list');
const trackEls = [];

TRACKS.forEach((t, i) => {
  const item = document.createElement('div');
  item.className = 'track-item' + (i === 0 ? ' active' : '');
  item.dataset.index = i;
  item.setAttribute('role', 'listitem');
  item.setAttribute('tabindex', '0');
  item.setAttribute('aria-label', `${t.name} par ${t.artist}`);

  const artWrap = document.createElement('div');
  artWrap.className = 't-art';
  const cvs = document.createElement('canvas');
  cvs.width = 76; cvs.height = 76;
  drawArt(cvs, t.color, t.c2, 76);
  artWrap.appendChild(cvs);

  item.innerHTML = `
    <div class="t-info">
      <div class="t-name">${t.name}</div>
      <div class="t-artist">${t.artist}</div>
    </div>
    <div class="t-dur">--:--</div>
  `;
  item.insertBefore(artWrap, item.firstChild);

  // We can load the duration dynamically for each track in the playlist
  const tempAudio = new Audio(t.src);
  tempAudio.addEventListener('loadedmetadata', () => {
    const durEl = item.querySelector('.t-dur');
    if (durEl) {
      durEl.textContent = fmtTime(tempAudio.duration);
    }
  });

  item.addEventListener('click', () => selectTrack(i, true));
  item.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectTrack(i, true); }
  });

  trackListEl.appendChild(item);
  trackEls.push(item);
});

/* ── STATE ── */
let curIdx   = 0;
let playing  = false;
let shuffle  = false;
let repeat   = false;
const liked  = new Set();

/* ── ELEMENTS ── */
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

// Set initial audio source
audio.src = TRACKS[0].src;
audio.volume = volSlider.value / 100;

/* ── SELECT TRACK ── */
function selectTrack(i, autoplay) {
  curIdx  = i;
  const t = TRACKS[i];

  sName.textContent   = t.name;
  sArtist.textContent = t.artist;
  sAlbum.textContent  = t.album + ' · ' + t.year;
  sGenre.textContent  = t.genre;
  tDur.textContent    = '--:--';
  tCur.textContent    = '0:00';
  progFill.style.width = '0%';
  progWrap.setAttribute('aria-valuenow', 0);

  drawArt(artMainCanvas, t.color, t.c2, 376);
  trackEls.forEach((el, idx) => el.classList.toggle('active', idx === i));

  /* scroll active item into view */
  trackEls[i].scrollIntoView({ block: 'nearest', behavior: 'smooth' });

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
  document.getElementById('btn-play').setAttribute('aria-label', playing ? 'Pause' : 'Lecture');
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

/* ── NAVIGATION ── */
function nextTrack() {
  let next;
  if (shuffle) { next = Math.floor(Math.random() * TRACKS.length); }
  else { next = (curIdx + 1) % TRACKS.length; }
  selectTrack(next, true);
}

function prevTrack() {
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
  btnLike.setAttribute('aria-label', isLiked ? 'Retirer des favoris' : 'Ajouter aux favoris');
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
