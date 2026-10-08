// CunMusic 播放器逻辑
const audio = document.getElementById('audio');
const songList = document.getElementById('songList');
const searchInput = document.getElementById('searchInput');

let playlist = [];
let currentIndex = -1;

// 格式化时间
function fmt(t) {
  if (!t || isNaN(t)) return '0:00';
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// 搜索
async function search() {
  const kw = searchInput.value.trim();
  if (!kw) return;
  songList.innerHTML = '<div class="welcome"><p>搜索中…</p></div>';
  try {
    const r = await fetch(`/api/search?keywords=${encodeURIComponent(kw)}&limit=30`);
    const d = await r.json();
    const songs = d.result?.songs || [];
    if (!songs.length) {
      songList.innerHTML = '<div class="welcome"><p>没找到，换个关键词试试</p></div>';
      return;
    }
    playlist = songs;
    songList.innerHTML = songs.map((s, i) => `
      <div class="song-item" data-i="${i}">
        <img src="${s.al?.picUrl}?param=96y96" loading="lazy" alt="">
        <div class="info">
          <div class="name">${s.name}</div>
          <div class="artist">${s.ar?.map(a => a.name).join(' / ') || ''} · ${s.al?.name || ''}</div>
        </div>
        <div class="duration">${fmt(s.dt / 1000)}</div>
      </div>
    `).join('');
    songList.querySelectorAll('.song-item').forEach(el => {
      el.onclick = () => play(+el.dataset.i);
    });
  } catch (e) {
    songList.innerHTML = '<div class="welcome"><p>搜索失败，API 可能挂了，稍后再试</p></div>';
  }
}

// 播放
async function play(i) {
  currentIndex = i;
  const s = playlist[i];
  document.querySelectorAll('.song-item').forEach((el, j) => {
    el.classList.toggle('playing', j === i);
  });
  document.getElementById('songName').textContent = s.name;
  document.getElementById('singer').textContent = (s.ar?.map(a => a.name).join(' / ') || '');
  document.getElementById('cover').src = s.al?.picUrl + '?param=96y96';

  try {
    const r = await fetch(`/api/song/url?id=${s.id}`);
    const d = await r.json();
    const url = d.data?.[0]?.url;
    if (!url) { alert('这首歌没有版权，换一首吧'); return; }
    audio.src = url;
    audio.play();
    document.getElementById('playBtn').textContent = '⏸';
  } catch (e) {
    alert('播放失败');
  }
}

// 上一首 / 下一首
function prev() { if (currentIndex > 0) play(currentIndex - 1); }
function next() { if (currentIndex < playlist.length - 1) play(currentIndex + 1); }

// 事件
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

// 进度条
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
