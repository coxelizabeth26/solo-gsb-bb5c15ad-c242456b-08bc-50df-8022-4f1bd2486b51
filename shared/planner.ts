/**
 * 前后端共享的数据契约与规划算法。
 *
 * 物理模型：
 *  - 唱片以恒定角速度转动（rpm 转/分钟）。
 *  - 每一面的总转数  revolutions = totalSeconds / 60 * rpm。
 *  - 每一条沟纹占据一个沟距 pitch（mm/转），因此一面所需的径向宽度为
 *        requiredWidth = revolutions * pitch。
 *  - 有效径向宽度需先扣除曲间留白（每两个相邻曲目之间一段无纹间隙，
 *    以转数计量）：
 *        usableWidth = (outerRadius - innerRadius) - totalGapWidth
 *      其中 totalGapWidth = (该面曲目数 - 1) * gapSeconds / 60 * rpm * minPitch?
 *    注意：留白宽度应使用实际沟距还是固定宽度？本模型把留白视为固定径向宽度，
 *    由留白时间按「最小沟距 minPitch」折算，即最坏情况下留白不会占用更多宽度：
 *        gapWidth = gapRevolutions * minPitch。
 *    这样「扣除留白后的径向宽度」与「按总转数求恒定沟距」的口径为：
 *        pitch = usableWidth / revolutions
 *    即留白折算宽度 + 全部曲纹宽度之和正好填满有效半径区间。
 */

/** 用户录入的单首曲目（按播放顺序排列） */
export interface TrackInput {
  title: string;
  /** 时长（秒） */
  seconds: number;
}

/** 计算后返回给前端的曲目信息 */
export interface TrackResult {
  index: number;
  title: string;
  seconds: number;
}

/** 规划器输入参数 */
export interface PlanInput {
  name: string;
  rpm: number;
  /** 外侧有效半径（mm） */
  outerRadius: number;
  /** 内侧有效半径（mm） */
  innerRadius: number;
  /** 曲间留白（秒，相邻两首曲目之间的无纹时间） */
  gapSeconds: number;
  /** 最小沟距安全阈值（mm/转） */
  minPitch: number;
  tracks: TrackInput[];
}

export interface SideResult {
  side: 'A' | 'B';
  trackIndexes: number[];
  trackCount: number;
  totalSeconds: number;
  /** 总转数（含播放与留白时间，二者都在旋转） */
  revolutions: number;
  gapCount: number;
  gapRevolutions: number;
  /** 曲间留白折算的径向宽度（mm） */
  gapWidth: number;
  /** 总有效径向宽度（mm） */
  grossWidth: number;
  /** 扣除留白后可用于沟纹的宽度（mm） */
  usableWidth: number;
  /** 恒定沟距（mm/转） */
  pitch: number;
  passes: boolean;
  reasons: string[];
}

export interface Candidate {
  /** A 面曲目数量（切点在第 cut 首与第 cut+1 首之间，1..n-1） */
  cut: number;
  cutLabel: string;
  a: SideResult;
  b: SideResult;
  /** 较差一面的沟距（min(pitchA, pitchB)） */
  worsePitch: number;
  /** 两面时长差（秒） */
  durationDiff: number;
  feasible: boolean;
  /** 淘汰原因（不可行时） */
  rejectionReasons: string[];
  /** 在可行方案中的排名（从 1 开始，不可行为 null） */
  rank: number | null;
  /** 是否为推荐（最优）方案 */
  best: boolean;
}

export interface PlanResult {
  candidates: Candidate[];
  feasibleCount: number;
  bestCut: number | null;
}

export interface Project {
  id: number;
  name: string;
  rpm: number;
  outerRadius: number;
  innerRadius: number;
  gapSeconds: number;
  minPitch: number;
  tracks: TrackResult[];
  result: PlanResult | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectPayload {
  name: string;
  rpm: number;
  outerRadius: number;
  innerRadius: number;
  gapSeconds: number;
  minPitch: number;
  tracks: TrackInput[];
}

const round = (n: number): number => Math.round(n * 10000) / 10000;

export function validateInput(input: PlanInput): string[] {
  const errors: string[] = [];
  if (!input.name || !input.name.trim()) errors.push('方案名称不能为空');
  if (!(input.rpm > 0)) errors.push('转速必须大于 0');
  if (!(input.outerRadius > 0)) errors.push('外有效半径必须大于 0');
  if (!(input.innerRadius > 0)) errors.push('内有效半径必须大于 0');
  if (input.innerRadius >= input.outerRadius)
    errors.push('内有效半径必须小于外有效半径');
  if (!(input.gapSeconds >= 0)) errors.push('曲间留白不能为负');
  if (!(input.minPitch > 0)) errors.push('最小沟距必须大于 0');
  if (!Array.isArray(input.tracks) || input.tracks.length < 2)
    errors.push('至少需要 2 首曲目才能枚举 A/B 面切点');
  else {
    input.tracks.forEach((t, i) => {
      if (!t.title || !String(t.title).trim())
        errors.push(`第 ${i + 1} 首曲目缺少标题`);
      if (!(t.seconds > 0)) errors.push(`第 ${i + 1} 首曲目时长必须大于 0`);
    });
  }
  return errors;
}

function evalSide(
  side: 'A' | 'B',
  tracks: TrackInput[],
  indexes: number[],
  input: PlanInput,
): SideResult {
  const reasons: string[] = [];
  const trackCount = indexes.length;
  const totalSeconds = indexes.reduce((s, i) => s + tracks[i].seconds, 0);
  const revolutions = (totalSeconds / 60) * input.rpm;

  // 曲间留白：该面内相邻曲目之间的无纹段（同样消耗唱片转数与径向宽度）
  const gapCount = Math.max(0, trackCount - 1);
  const gapRevolutions = (gapCount * input.gapSeconds / 60) * input.rpm;
  // 留白按安全最小沟距折算成固定径向宽度
  const gapWidth = gapRevolutions * input.minPitch;
  const grossWidth = input.outerRadius - input.innerRadius;
  const usableWidth = grossWidth - gapWidth;

  if (usableWidth <= 0) {
    reasons.push(
      `留白折算宽度 ${round(gapWidth)} mm 已占满/超过有效宽度 ${round(grossWidth)} mm`,
    );
  }

  const pitch = revolutions > 0 && usableWidth > 0 ? usableWidth / revolutions : 0;

  const passes = trackCount > 0 && pitch >= input.minPitch && usableWidth > 0;
  if (trackCount === 0) reasons.push('该面没有分配曲目');
  else if (usableWidth > 0 && pitch < input.minPitch) {
    reasons.push(
      `恒定沟距 ${round(pitch)} mm/转 低于安全阈值 ${input.minPitch} mm/转`,
    );
  }

  return {
    side,
    trackIndexes: indexes.map((i) => i + 1),
    trackCount,
    totalSeconds: round(totalSeconds),
    revolutions: round(revolutions),
    gapCount,
    gapRevolutions: round(gapRevolutions),
    gapWidth: round(gapWidth),
    grossWidth: round(grossWidth),
    usableWidth: round(usableWidth),
    pitch: round(pitch),
    passes,
    reasons,
  };
}

/**
 * 枚举全部切点并计算每个候选方案。
 * 切点 cut 表示 A 面放前 cut 首、B 面放其余曲目，cut ∈ [1, n-1]。
 */
export function plan(input: PlanInput): PlanResult {
  const n = input.tracks.length;
  const candidates: Candidate[] = [];

  for (let cut = 1; cut < n; cut++) {
    const aIdx = Array.from({ length: cut }, (_, i) => i);
    const bIdx = Array.from({ length: n - cut }, (_, i) => cut + i);
    const a = evalSide('A', input.tracks, aIdx, input);
    const b = evalSide('B', input.tracks, bIdx, input);

    const rejectionReasons: string[] = [];
    if (!a.passes) rejectionReasons.push(...a.reasons.map((r) => `A 面：${r}`));
    if (!b.passes) rejectionReasons.push(...b.reasons.map((r) => `B 面：${r}`));

    candidates.push({
      cut,
      cutLabel: `A${cut}/B${n - cut}（切点：第 ${cut} 首之后）`,
      a,
      b,
      worsePitch: round(Math.min(a.pitch, b.pitch)),
      durationDiff: round(Math.abs(a.totalSeconds - b.totalSeconds)),
      feasible: rejectionReasons.length === 0,
      rejectionReasons,
      rank: null,
      best: false,
    });
  }

  // 排序目标：1) 较差一面沟距最大化  2) 两面时长差最小化
  const feasible = candidates
    .filter((c) => c.feasible)
    .sort(
      (x, y) =>
        y.worsePitch - x.worsePitch || x.durationDiff - y.durationDiff || x.cut - y.cut,
    );

  feasible.forEach((c, i) => {
    c.rank = i + 1;
  });
  if (feasible[0]) feasible[0].best = true;

  // 结果按切点顺序展示
  candidates.sort((x, y) => x.cut - y.cut);

  return {
    candidates,
    feasibleCount: feasible.length,
    bestCut: feasible[0]?.cut ?? null,
  };
}
