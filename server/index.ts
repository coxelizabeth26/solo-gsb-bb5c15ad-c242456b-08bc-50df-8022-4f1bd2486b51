import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { openDatabase } from './db.js';
import { apiRouter } from './routes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// 编译后位于 dist/server/，前端静态资源位于 dist/public/
const publicDir = resolve(__dirname, '../public');

openDatabase();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api', apiRouter);

if (existsSync(publicDir)) {
  app.use(express.static(publicDir));
  // 非 /api 路由统一回退到 SPA 入口
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(resolve(publicDir, 'index.html'));
  });
}

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`🎵 黑胶分面规划服务已启动: http://localhost:${port}`);
});
