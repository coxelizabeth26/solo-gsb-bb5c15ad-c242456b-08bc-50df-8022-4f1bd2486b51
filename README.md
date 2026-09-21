# 🎵 黑胶唱片分面规划 Web 应用（Vinyl Facet Planner）

给定一张黑胶唱片的曲目清单与物理参数，系统枚举所有 **A/B 面切点**，按每面总转数与
扣除曲间留白后的径向宽度计算**恒定沟距**，过滤掉沟距低于安全阈值的方案，并依次按：

1. **较差一面沟距最大化**（`min(pitchA, pitchB)` 越大越好）
2. **两面时长差最小化**（`|timeA − timeB|` 越小越好）

对可行方案排序，页面展示每个候选切点的完整计算明细与淘汰原因。

技术栈：**React 18 + TypeScript + Vite**（前端）／**Node.js + Express + TypeScript**
（后端）／**SQLite（better-sqlite3）**（持久化）／**Docker & Docker Compose**（一键启动）。

---

## 一、一键启动（Docker）

```bash
docker compose up --build
```

启动后访问 **http://localhost:3000** 。

- 首次启动时 SQLite 数据库为空，会自动写入一份示例专辑（可在 Compose 中设置
  `SEED_SAMPLE=0` 关闭）。
- 数据库通过命名卷 `vinyl-data` 持久化到 `/data/vinyl.db`，容器重建不丢数据。
- 停止：`docker compose down`；连数据一起清除：`docker compose down -v`。

---

## 二、本地开发

要求 Node.js ≥ 20。

```bash
npm install

# 终端 1：后端（tsx 热重载，:3001）
npm run dev:server

# 终端 2：前端（Vite，:5173，/api 代理到 3001）
npm run dev:client
```

- 前端开发地址：http://localhost:5173
- 后端开发地址：http://localhost:3001（可用 `PORT` 环境变量修改，代理目标可用
  `DEV_API_TARGET` 修改）
- 本地数据库默认 `./data/vinyl.db`（可用 `DB_PATH` 覆盖）。

构建与生产运行（单进程同时提供 API 与前端静态资源）：

```bash
npm run build
npm start          # http://localhost:3000
```

---

## 三、输入参数

| 参数 | 单位 | 说明 |
| --- | --- | --- |
| 曲目（标题 + 时长） | 秒，界面支持 `mm:ss` | 按刻录顺序排列；切点只能在相邻曲目之间 |
| 转速 `rpm` | 转/分钟 | 整张唱片统一（如 33⅓ = 33.333、45） |
| 外有效半径 `outerRadius` | mm | 音频纹区最外侧半径 |
| 内有效半径 `innerRadius` | mm | 音频纹区最内侧半径（必须小于外径） |
| 曲间留白 `gapSeconds` | 秒 | 同面相邻曲目之间无纹段（Band）的时长 |
| 最小沟距 `minPitch` | mm/转 | 安全阈值，沟距低于此值的方案被淘汰 |

---

## 四、计算模型

对每个切点 `cut`（A 面放前 `cut` 首，B 面放其余曲目，`cut = 1 … n−1`），分别计算两面：

```
总转数        revolutions  = 总时长(秒) / 60 × rpm
留白段数      gapCount      = 该面曲目数 − 1
留白转数      gapRevolutions = gapCount × gapSeconds / 60 × rpm
留白宽度      gapWidth      = gapRevolutions × minPitch        （留白按安全阈值折算为固定径向宽度）
有效宽度      grossWidth    = outerRadius − innerRadius
扣留白后宽度  usableWidth   = grossWidth − gapWidth
恒定沟距      pitch         = usableWidth / revolutions
```

**判定**：某一面 `pitch < minPitch`（或留白已占满有效宽度）即判该方案不可行，
系统会给出具体淘汰原因（哪一面、实际沟距、阈值）。

可行方案按字典序目标排序：先最大化 `min(pitchA, pitchB)`，平手时最小化
`|timeA − timeB|`，再平手取切点靠前者。第一名即为页面顶部的「★ 推荐切点」。

> 沟距越大意味着相同时间占用的径向宽度越多（纹距更宽、通常响度/音质更好）；
> 当一面时长过长、转数过多时，只能用更密的沟纹塞进固定半径区间，沟距便会跌破
> 安全阈值而被淘汰。

---

## 五、页面功能

- **左侧**：参数录入表单（动态增删曲目、时长支持 `mm:ss`）、「填充示例数据」、
  已保存方案列表（切换 / 编辑 / 删除）。
- **右侧**：
  - 当前方案参数与曲目顺序；
  - **★ 推荐切点**卡片：最优切点、两面曲目编号、较差面沟距、时长差，以及两面的
    总转数 / 留白转数 / 留白宽度 / 有效宽度 / 扣留白后宽度 / 恒定沟距明细；
  - **候选切点表**：每个切点一行（状态徽标、A/B 面时长与沟距、较差面沟距、时长差），
    点击展开查看两面完整计算明细；不可行方案标红并列出**淘汰原因**；
    支持「只看可行」过滤与三种排序（切点顺序 / 较差面沟距 / 时长差）。

示例数据（10 首、约 46 分 40 秒，最小沟距 0.07 mm/转）下，切点严重偏向一侧的方案
（如 A1/B9、A2/B8 等）会因长面沟距不足被淘汰，中部切点可行，便于直观对比。

---

## 六、HTTP API

基础路径 `/api`，请求/响应均为 JSON。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/projects` | 方案列表（含计算结果） |
| `GET` | `/projects/:id` | 单个方案 |
| `POST` | `/projects` | 录入并计算（参数非法返回 400 与错误明细） |
| `PUT` | `/projects/:id` | 修改参数并重新计算 |
| `DELETE` | `/projects/:id` | 删除方案 |
| `POST` | `/plan/preview` | 试算（不落库），直接返回全部候选切点 |

用示例数据快速验证：

```bash
curl -s http://localhost:3000/api/projects | jq '.[0].result.feasibleCount'

curl -s -X POST http://localhost:3000/api/plan/preview \
  -H 'Content-Type: application/json' \
  --data @examples/sample-project.json | jq '.bestCut'
```

`POST /projects` 与 `POST /plan/preview` 的请求体见
[`examples/sample-project.json`](examples/sample-project.json)。

响应中的 `result` 结构（摘要）：

```jsonc
{
  "bestCut": 5,
  "feasibleCount": 3,
  "candidates": [
    {
      "cut": 5,
      "cutLabel": "A5/B5（切点：第 5 首之后）",
      "feasible": true,
      "rank": 1,
      "best": true,
      "worsePitch": 0.0731,
      "durationDiff": 12,
      "a": { "totalSeconds": 1279, "revolutions": 710.49, "gapWidth": 4.67,
             "grossWidth": 86.5, "usableWidth": 81.83, "pitch": 0.1152, "passes": true },
      "b": { "...": "..." }
    }
  ]
}
```

---

## 七、目录结构

```
.
├── Dockerfile                # 多阶段构建（编译 + 精简运行镜像）
├── docker-compose.yml        # 一键启动 + 命名卷持久化
├── index.html
├── package.json
├── vite.config.ts            # 前端构建 / 开发代理
├── tsconfig.json             # 前端 TS 配置
├── examples/
│   └── sample-project.json   # 示例请求数据（可直接 curl 提交）
├── shared/                   # 前后端共享
│   ├── planner.ts            # 校验、枚举切点、沟距计算、排序（核心算法）
│   └── sample.ts             # 首启自动写入的示例方案
├── server/                   # Node.js + Express + better-sqlite3
│   ├── index.ts              # 入口（API + 静态资源托管）
│   ├── routes.ts
│   ├── db.ts                 # 建表 / CRUD / 计算落库 / 示例种子
│   └── tsconfig.json
└── src/                      # React 前端
    ├── main.tsx / App.tsx
    ├── ProjectForm.tsx       # 参数与曲目录入
    ├── BestPlan.tsx          # 推荐切点卡片
    ├── CandidateTable.tsx    # 候选切点表 + 淘汰原因
    ├── SideDetail.tsx        # 单面计算明细
    ├── api.ts / types.ts / format.ts / sample.ts
    └── styles.css
```
