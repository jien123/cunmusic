/**
 * CunMusic - 个人在线音乐播放器
 * 内置网易云音乐 API, 无需外部依赖
 */
const express = require('express');
const path = require('path');

// 网易云 API (通过 main.js 的封装调用)
const api = require('NeteaseCloudMusicApi');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- API: 搜索 ----------
app.get('/api/search', async (req, res) => {
  try {
    const keywords = req.query.keywords || '';
    const limit = parseInt(req.query.limit) || 30;
    if (!keywords) return res.json({ result: { songs: [] } });

    const result = await api.search({ keywords, limit, type: 1 });
    res.json(result.body);
  } catch (e) {
    console.error('搜索失败:', e.message);
    res.status(500).json({ error: '搜索失败' });
  }
});

// ---------- API: 获取播放链接 ----------
app.get('/api/song/url', async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: '缺少 id' });

    const result = await api.song_url({ id, br: 320000 });
    res.json(result.body);
  } catch (e) {
    console.error('获取播放链接失败:', e.message);
    res.status(500).json({ error: '获取播放链接失败' });
  }
});

// ---------- 静态文件 ----------
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`🎵 CunMusic 运行在 http://localhost:${PORT}`);
});
