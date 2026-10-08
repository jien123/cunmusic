/**
 * CunMusic - 个人在线音乐播放器
 * 双音源: 网易云音乐 + QQ 音乐, 自动切换
 */
const express = require('express');
const path = require('path');

const netease = require('NeteaseCloudMusicApi');
const qqMusic = require('qq-music-api');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- 统一歌曲格式 ----------
// { id, name, artist, album, cover, duration(秒), source }

// 网易云搜索
async function searchNetease(keywords, limit) {
  const r = await netease.search({ keywords, limit, type: 1 });
  const songs = r.body?.result?.songs || [];
  return songs.map(s => ({
    id: String(s.id),
    name: s.name,
    artist: (s.ar || []).map(a => a.name).join(' / '),
    album: s.al?.name || '',
    cover: (s.al?.picUrl || '') + '?param=96y96',
    duration: Math.round((s.dt || 0) / 1000),
    source: 'netease',
  }));
}

// QQ 音乐搜索
async function searchQQ(keywords, limit) {
  const r = await qqMusic.api('search', { key: keywords, pageSize: limit });
  const list = r?.data?.list || [];
  return list.map(s => ({
    id: String(s.songmid),
    name: s.songname,
    artist: (s.singer || []).map(a => a.name).join(' / '),
    album: s.albumname || '',
    cover: s.albummid ? `https://y.gtimg.cn/music/photo_new/T002R96x96M000${s.albummid}.jpg` : '',
    duration: s.interval || 0,
    source: 'qq',
  }));
}

// ---------- API: 搜索 ----------
app.get('/api/search', async (req, res) => {
  const keywords = (req.query.keywords || '').trim();
  const limit = parseInt(req.query.limit) || 30;
  const source = req.query.source || 'auto';
  if (!keywords) return res.json({ songs: [] });

  const trySources = source === 'auto' ? ['netease', 'qq'] : [source];
  for (const src of trySources) {
    try {
      const songs = src === 'qq'
        ? await searchQQ(keywords, limit)
        : await searchNetease(keywords, limit);
      if (songs.length) return res.json({ songs, source: src });
    } catch (e) {
      console.error(`[${src}] 搜索失败:`, e.message?.slice(0, 100));
    }
  }
  res.json({ songs: [], source: null });
});

// ---------- API: 播放链接 ----------
app.get('/api/song/url', async (req, res) => {
  const { id, source } = req.query;
  if (!id) return res.status(400).json({ error: '缺少 id' });

  try {
    if (source === 'qq') {
      const r = await qqMusic.api('song/url', { id });
      const url = r?.data?.[id] || r?.data?.sip?.[0] && null;
      // qq-music-api 返回格式: { data: { songmid: url } }
      const playUrl = typeof r?.data === 'object' ? (r.data[id] || Object.values(r.data)[0]) : null;
      if (playUrl) return res.json({ url: playUrl });
    } else {
      const r = await netease.song_url({ id, br: 320000 });
      const url = r.body?.data?.[0]?.url;
      if (url) return res.json({ url });
    }
    res.status(404).json({ error: '无版权' });
  } catch (e) {
    console.error('获取播放链接失败:', e.message?.slice(0, 100));
    res.status(500).json({ error: '获取失败' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`🎵 CunMusic 运行在 http://localhost:${PORT}`);
});
