// CunMusic 播放器逻辑 (双音源)
const audio = document.getElementById('audio');
const songList = document.getElementById('songList');
const searchInput = document.getElementById('searchInput');

let playlist = [];
let currentIndex = -1;
let currentSource = 'auto';

function fmt(t) {
  if (!t || isNaN(t)) return '0:00';
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

async function search() {
  const kw = searchInput.value.trim();
  if (!kw) return;
  songList.innerHTML = '<div class="welcome"><p>搜索中…</p></div>';
  try {
    const r = await fetch(`/api/search?keywords=${encodeURIComponent(kw)}&limit=30&source=${currentSource}`);
    const d = await r.json();
    const songs = d.songs || [];
    if (!songs.length) {
      songList.innerHTML = '<div class="welcome"><p>没找到，换个关键词试试</p></div>';
      return;
    }
    playlist = songs;
    const srcName = d.source === 'qq' ? 'QQ音乐' : '网易云';
    const coverFallback = "this.style.display='none';this.nextElementSibling.style.display='flex'";
    songList.innerHTML = `<div style="padding:8px 12px;color:var(--muted);font-size:0.8rem">音源: ${srcName} · ${songs.length} 首</div>` +
      songs.map((s, i) => `
      <div class="song-item" data-i="${i}">
        <div style="position:relative;width:48px;height:48px;flex-shrink:0">
          ${s.cover ? `<img src="${s.cover}" loading="lazy" alt="" style="width:48px;height:48px;border-radius:8px;object-fit:cover" onerror="${coverFallback}">` : ''}
          <div style="width:48px;height:48px;border-radius:8px;background:linear-gradient(135deg,#1db954,#0d1117);display:${s.cover ? 'none' : 'flex'};align-items:center;justify-content:center;font-size:1.4rem;position:${s.cover ? 'absolute' : 'static'};top:0;left:0">🎵</div>
        </div>
        <div class="info">
          <div class="name">${esc(s.name)}</div>
          <div class="artist">${esc(s.artist)}${s.album ? ' · ' + esc(s.album) : ''}</div>
        </div>
        <div class="duration">${s.duration > 0 ? fmt(s.duration) : ''}</div>
      </div>
    `).join('');
    songList.querySelectorAll('.song-item').forEach(el => {
      el.onclick = () => play(+el.dataset.i);
    });
  } catch (e) {
    songList.innerHTML = '<div class="welcome"><p>搜索失败，稍后再试</p></div>';
  }
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function play(i) {
  currentIndex = i;
  const s = playlist[i];
  document.querySelectorAll('.song-item').forEach((el, j) => {
    el.classList.toggle('playing', j === i);
  });
  document.getElementById('songName').textContent = s.name;
  document.getElementById('singer').textContent = s.artist;
  document.getElementById('cover').src = s.cover || '';

  try {
    const r = await fetch(`/api/song/url?id=${encodeURIComponent(s.id)}&source=${s.source}`);
    const d = await r.json();
    if (!d.url) { alert('这首歌没有版权，换一首吧'); return; }
    audio.src = d.url;
    audio.play();
    document.getElementById('playBtn').textContent = '⏸';
  } catch (e) {
    alert('播放失败');
  }
}

function prev() { if (currentIndex > 0) play(currentIndex - 1); }
function next() { if (currentIndex < playlist.length - 1) play(currentIndex + 1); }

document.getElementById('searchBtn').onclick = search;
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') search(); });
document.getElementById('playBtn').onclick = () => {
  if (!audio.src) return;
  if (audio.paused) { audio.play(); document.getElementById('playBtn').textContent = '⏸'; }
  else { audio.pause(); document.getElementById('playBtn').textContent = '▶'; }
};
document.getElementById('prevBtn').onclick = prev;
document.getElementById('nextBtn').onclick = next;
audio.onended = next;

audio.ontimeupdate = () => {
  document.getElementById('curTime').textContent = fmt(audio.currentTime);
  document.getElementById('duration').textContent = fmt(audio.duration);
  if (audio.duration) {
    document.getElementById('progress').value = audio.currentTime / audio.duration * 100;
  }
};
document.getElementById('progress').oninput = (e) => {
  if (audio.duration) audio.currentTime = e.target.value / 100 * audio.duration;
};
document.getElementById('volume').oninput = (e) => { audio.volume = e.target.value / 100; };
audio.volume = 0.8;
