/**
 * CunMusic - Telegram 频道音乐播放器
 * 从 Telegram 频道读取用户上传的音乐文件并播放
 *
 * 环境变量:
 *   TELEGRAM_BOT_TOKEN - Bot Token
 *   TELEGRAM_CHANNEL_ID - 频道 ID (如 -1004428670443)
 *   PORT - 端口
 */
require('dotenv').config();
const express = require('express');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '';

if (!BOT_TOKEN) console.log('⚠️  未配置 TELEGRAM_BOT_TOKEN');
if (!CHANNEL_ID) console.log('⚠️  未配置 TELEGRAM_CHANNEL_ID');

const TG = `https://api.telegram.org/bot${BOT_TOKEN}`;

// 简单的 GET 请求封装
function tgGet(apiPath) {
  return new Promise((resolve, reject) => {
    https.get(TG + apiPath, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// 歌曲库 (内存)
let library = [];   // { file_id, name, artist, size, date }
let lastUpdateId = 0;

// 从 Telegram 更新拉取新歌曲
async function syncLibrary() {
  if (!BOT_TOKEN) return;
  try {
    const d = await tgGet(`/getUpdates?offset=${lastUpdateId + 1}&limit=100&timeout=0`);
    const updates = d.result || [];
    for (const u of updates) {
      lastUpdateId = Math.max(lastUpdateId, u.update_id);
      const msg = u.channel_post || u.message;
      if (!msg) continue;
      // 只收目标频道的
      if (String(msg.chat?.id) !== String(CHANNEL_ID)) continue;
      const audio = msg.audio || msg.document;
      if (!audio) continue;
      // 只收音频文件 (mp3/flac/m4a/ogg/wav)
      const fname = audio.file_name || '';
      if (!/\.(mp3|flac|m4a|ogg|wav|aac)$/i.test(fname)) continue;
      // 20MB 以上 Bot API 下载不了, 跳过
      if ((audio.file_size || 0) > 20 * 1024 * 1024) continue;
      if (library.find(s => s.file_id === audio.file_id)) continue;

      // 解析歌名 - 歌手
      let name = fname.replace(/\.(mp3|flac|m4a|ogg|wav|aac)$/i, '');
      let artist = '';
      const m = name.match(/^(.+?)[-_–—](.+)$/);
      if (m) { artist = m[1].trim(); name = m[2].trim(); }
      // Telegram audio 自带的标题信息更准
      if (msg.audio?.title) name = msg.audio.title;
      if (msg.audio?.performer) artist = msg.audio.performer;

      library.push({
        file_id: audio.file_id,
        name, artist,
        size: audio.file_size || 0,
        duration: msg.audio?.duration || 0,
        date: msg.date || 0,
      });
      console.log(`🎵 新歌: ${artist} - ${name}`);
    }
    // 按时间倒序
    library.sort((a, b) => b.date - a.date);
  } catch (e) {
    console.error('同步失败:', e.message?.slice(0, 80));
  }
}

// 启动时同步一次, 之后每 60 秒同步
syncLibrary();
setInterval(syncLibrary, 60 * 1000);

// ---------- API: 歌曲列表 ----------
app.get('/api/songs', (req, res) => {
  res.json({ songs: library, count: library.length });
});

// ---------- API: 手动同步 ----------
app.get('/api/sync', async (req, res) => {
  await syncLibrary();
  res.json({ songs: library, count: library.length });
});

// ---------- API: 播放 (代理 Telegram 文件, 不暴露 Token) ----------
app.get('/api/stream', async (req, res) => {
  const file_id = req.query.file_id;
  if (!file_id) return res.status(400).send('缺少 file_id');
  try {
    const d = await tgGet(`/getFile?file_id=${encodeURIComponent(file_id)}`);
    const filePath = d.result?.file_path;
    if (!filePath) return res.status(404).send('文件太大或不存在 (Bot API 仅支持 20MB 以内)');
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
    // 代理流式传输
    https.get(fileUrl, (tgRes) => {
      res.setHeader('Content-Type', tgRes.headers['content-type'] || 'audio/mpeg');
      if (tgRes.headers['content-length']) res.setHeader('Content-Length', tgRes.headers['content-length']);
      res.setHeader('Accept-Ranges', 'bytes');
      tgRes.pipe(res);
    }).on('error', () => res.status(502).send('读取失败'));
  } catch (e) {
    res.status(500).send('获取失败');
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, songs: library.length, channel: !!CHANNEL_ID });
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`🎵 CunMusic (Telegram) 运行在 http://localhost:${PORT}`);
});
