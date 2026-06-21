/* ── TRACK DATA ──
   Pour utiliser de vrais fichiers audio, ajoute un champ `src` à chaque objet :
   src: 'audio/celestial-drift.mp3'
   Puis dans selectTrack() : audioEl.src = t.src; audioEl.play();
*/
const TRACKS = [
  { name:"Celestial Drift",   artist:"Nova Ether",    album:"Signals from the Void", year:2024, genre:"Ambient",     dur:225, color:"#8B7CF8", c2:"#3D2B8A" },
  { name:"Neon Tide",         artist:"Solara",         album:"Ultraviolet",           year:2024, genre:"Electronic",  dur:198, color:"#4FC3F7", c2:"#0D47A1" },
  { name:"Velvet Hours",      artist:"Mira Dawn",      album:"Soft Architecture",     year:2023, genre:"Chill",       dur:242, color:"#F48FB1", c2:"#880E4F" },
  { name:"Obsidian Flow",     artist:"Deep Current",   album:"Undertow",              year:2024, genre:"Electronic",  dur:187, color:"#80CBC4", c2:"#00695C" },
  { name:"Golden Static",     artist:"Auric",          album:"Frequency",             year:2023, genre:"Ambient",     dur:263, color:"#FFD54F", c2:"#E65100" },
  { name:"Particle Rain",     artist:"Nova Ether",     album:"Signals from the Void", year:2024, genre:"Chill",       dur:211, color:"#CE93D8", c2:"#4A148C" },
  { name:"Shoreline Echo",    artist:"Mira Dawn",      album:"Soft Architecture",     year:2023, genre:"Ambient",     dur:234, color:"#A5D6A7", c2:"#1B5E20" },
  { name:"Infrared Pulse",    artist:"Deep Current",   album:"Undertow",              year:2024, genre:"Electronic",  dur:176, color:"#EF9A9A", c2:"#B71C1C" },
];

/* ── HELPERS ── */
function fmtTime(s) {
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

/* ── INIT ARTWORK ── */
const artMainCanvas = document.getElementById('art-main');
drawArt(artMainCanvas, TRACKS[0].color, TRACKS[0].c2, 376);

/* ── BUILD TRACK LIST ── */
const trackListEl = document.getElementById('track-list');
const trackEls = [];

TRACKS.forEach((t, i) => {
  const item = document.createElement('div');
  item.className = 'track-item' + (i === 0 ? ' active' : '');
  item.dataset.index = i;
  item.setAttribute('role', 'listitem');
  item.setAttribute('tabindex', '0');
  item.setAttribute('aria-label', `${t.name} par ${t.artist}, ${fmtTime(t.dur)}`);

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
    <div class="t-dur">${fmtTime(t.dur)}</div>
  `;
  item.insertBefore(artWrap, item.firstChild);

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
let curTime  = 0;
let interval = null;
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

/* ── SELECT TRACK ── */
function selectTrack(i, autoplay) {
  curIdx  = i;
  curTime = 0;
  const t = TRACKS[i];

  sName.textContent   = t.name;
  sArtist.textContent = t.artist;
  sAlbum.textContent  = t.album + ' · ' + t.year;
  sGenre.textContent  = t.genre;
  tDur.textContent    = fmtTime(t.dur);
  tCur.textContent    = '0:00';
  progFill.style.width = '0%';
  progWrap.setAttribute('aria-valuenow', 0);

  drawArt(artMainCanvas, t.color, t.c2, 376);
  trackEls.forEach((el, idx) => el.classList.toggle('active', idx === i));

  /* scroll active item into view */
  trackEls[i].scrollIntoView({ block: 'nearest', behavior: 'smooth' });

  updateLikeBtn();

  if (autoplay) { playing = false; togglePlay(); }
}

/* ── PLAY / PAUSE ── */
function togglePlay() {
  playing = !playing;
  playIcon.className = playing ? 'ti ti-player-pause' : 'ti ti-player-play';
  document.getElementById('btn-play').setAttribute('aria-label', playing ? 'Pause' : 'Lecture');

  if (playing) {
    interval = setInterval(tick, 500);
    animEQ(true);
  } else {
    clearInterval(interval);
    animEQ(false);
  }
}

/* ── TICK (simulates playback) ── */
function tick() {
  curTime += 0.5;
  const t = TRACKS[curIdx];
  if (curTime >= t.dur) {
    if (repeat) { curTime = 0; }
    else { nextTrack(); return; }
  }
  const pct = Math.round((curTime / t.dur) * 100);
  progFill.style.width = pct + '%';
  progWrap.setAttribute('aria-valuenow', pct);
  tCur.textContent = fmtTime(curTime);
}

/* ── NAVIGATION ── */
function nextTrack() {
  let next;
  if (shuffle) { next = Math.floor(Math.random() * TRACKS.length); }
  else { next = (curIdx + 1) % TRACKS.length; }
  selectTrack(next, true);
}

function prevTrack() {
  if (curTime > 3) {
    curTime = 0;
    progFill.style.width = '0%';
    tCur.textContent = '0:00';
    return;
  }
  const prev = (curIdx - 1 + TRACKS.length) % TRACKS.length;
  selectTrack(prev, playing);
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
  curTime = pct * TRACKS[curIdx].dur;
  progFill.style.width = Math.round(pct * 100) + '%';
  tCur.textContent = fmtTime(curTime);
}

progWrap.addEventListener('click', scrub);

/* ── VOLUME ── */
document.getElementById('vol-slider').addEventListener('input', function () {
  volVal.textContent = this.value;
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
    const vol = document.getElementById('vol-slider');
    vol.value = vol.value > 0 ? 0 : 75;
    volVal.textContent = vol.value;
  }
});

/* ── SWIPE (mobile) ── */
let touchX = 0;
document.getElementById('mp').addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
document.getElementById('mp').addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 60) { dx < 0 ? nextTrack() : prevTrack(); }
});
