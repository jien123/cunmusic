// CunMusic - Telegram 频道播放器
const audio = document.getElementById('audio');
const songList = document.getElementById('songList');

let playlist = [];
let currentIndex = -1;

function fmt(t) {
  if (!t || isNaN(t)) return '0:00';
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function sizeFmt(b) {
  if (!b) return '';
  return (b / 1024 / 1024).toFixed(1) + 'MB';
}

async function loadSongs() {
  songList.innerHTML = '<div class="welcome"><div class="welcome-icon">🎧</div><p>加载中…</p></div>';
  try {
    const r = await fetch('/api/songs');
    const d = await r.json();
    playlist = d.songs || [];
    if (!playlist.length) {
      songList.innerHTML = '<div class="welcome"><div class="welcome-icon">🎧</div><p>频道里还没有歌<br><small>往 Telegram 频道发 MP3 吧</small></p></div>';
      return;
    }
    render();
  } catch (e) {
    songList.innerHTML = '<div class="welcome"><p>加载失败</p></div>';
  }
}

function render() {
  songList.innerHTML = `<div style="padding:8px 12px;color:var(--muted);font-size:0.8rem">${playlist.length} 首 · 来自 Telegram 频道</div>` +
    playlist.map((s, i) => `
    <div class="song-item" data-i="${i}">
      <div style="width:48px;height:48px;border-radius:8px;background:linear-gradient(135deg,#1db954,#0d1117);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0">🎵</div>
      <div class="info">
        <div class="name">${esc(s.name)}</div>
        <div class="artist">${esc(s.artist || '未知歌手')} · ${sizeFmt(s.size)}</div>
      </div>
      <div class="duration">${s.duration ? fmt(s.duration) : ''}</div>
    </div>`).join('');
  songList.querySelectorAll('.song-item').forEach(el => {
    el.onclick = () => play(+el.dataset.i);
  });
}

function play(i) {
  currentIndex = i;
  const s = playlist[i];
  document.querySelectorAll('.song-item').forEach((el, j) => el.classList.toggle('playing', j === i));
  document.getElementById('songName').textContent = s.name;
  document.getElementById('singer').textContent = s.artist || '未知歌手';
  audio.src = `/api/stream?file_id=${encodeURIComponent(s.file_id)}`;
  audio.play().catch(() => alert('播放失败'));
  document.getElementById('playBtn').textContent = '⏸';
}

document.getElementById('refreshBtn').onclick = async () => {
  document.getElementById('refreshBtn').textContent = '⏳ 同步中…';
  try { await fetch('/api/sync'); } catch (e) {}
  await loadSongs();
  document.getElementById('refreshBtn').textContent = '🔄 同步';
};
document.getElementById('playBtn').onclick = () => {
  if (!audio.src) return;
  if (audio.paused) { audio.play(); document.getElementById('playBtn').textContent = '⏸'; }
  else { audio.pause(); document.getElementById('playBtn').textContent = '▶'; }
};
document.getElementById('prevBtn').onclick = () => { if (currentIndex > 0) play(currentIndex - 1); };
document.getElementById('nextBtn').onclick = () => { if (currentIndex < playlist.length - 1) play(currentIndex + 1); };
audio.onended = () => { if (currentIndex < playlist.length - 1) play(currentIndex + 1); };
audio.ontimeupdate = () => {
  document.getElementById('curTime').textContent = fmt(audio.currentTime);
  document.getElementById('duration').textContent = fmt(audio.duration);
  if (audio.duration) document.getElementById('progress').value = audio.currentTime / audio.duration * 100;
};
document.getElementById('progress').oninput = (e) => {
  if (audio.duration) audio.currentTime = e.target.value / 100 * audio.duration;
};
document.getElementById('volume').oninput = (e) => { audio.volume = e.target.value / 100; };
audio.volume = 0.8;

loadSongs();
