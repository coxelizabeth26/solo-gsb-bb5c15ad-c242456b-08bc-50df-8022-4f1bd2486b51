# ---- 构建阶段：编译前端 + 后端，并编译 better-sqlite3 原生模块 ----
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# 先复制依赖清单，尽量利用构建缓存
COPY package.json package-lock.json* ./
RUN npm install

# 复制源码并构建
COPY tsconfig.json vite.config.ts index.html ./
COPY shared ./shared
COPY server ./server
COPY src ./src
RUN npm run build

# 剔除开发依赖并重新落地生产依赖（保证原生模块为发布版构建）
RUN npm prune --omit=dev

# ---- 运行阶段 ----
FROM node:20-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production
ENV DB_PATH=/data/vinyl.db
ENV PORT=3000

# better-sqlite3 运行时需要其预编译 .node 文件与 Node 标准库，slim 镜像已满足
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/package.json ./package.json

# SQLite 数据目录（由 compose 挂载命名卷）
RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 3000

# 简单健康检查：项目列表接口
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/projects').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server/index.js"]
