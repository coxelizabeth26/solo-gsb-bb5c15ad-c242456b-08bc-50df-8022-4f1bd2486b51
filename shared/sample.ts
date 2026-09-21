import type { PlanInput } from './planner.js';

/**
 * 示例专辑（10 首，总时长约 46 分 40 秒）。
 * 转速 33⅓ RPM、有效半径 146.5→60 mm、曲间留白 3 秒、最小沟距 0.07 mm/转。
 * 在此参数下，切点过于偏向单侧（A1/B9、A2/B8、A8/B2、A9/B1）会因
 * 长面沟距低于阈值被淘汰，中部切点可行，可直观展示排名与淘汰原因。
 */
export const sampleProject: PlanInput = {
  name: '示例专辑 · Night Grooves',
  rpm: 33.333,
  outerRadius: 146.5,
  innerRadius: 60,
  gapSeconds: 3,
  minPitch: 0.07,
  tracks: [
    { title: 'Opening Sides', seconds: 4 * 60 + 12 },
    { title: 'Dust Light', seconds: 3 * 60 + 28 },
    { title: 'Paper Sleeve', seconds: 5 * 60 + 3 },
    { title: '33 Rounds', seconds: 3 * 60 + 55 },
    { title: 'Inner Edge', seconds: 4 * 60 + 41 },
    { title: 'Blank Band', seconds: 6 * 60 + 18 },
    { title: 'Lead-In Dream', seconds: 3 * 60 + 47 },
    { title: 'Runout Shuffle', seconds: 4 * 60 + 59 },
    { title: 'Wax Equation', seconds: 5 * 60 + 24 },
    { title: 'Last Groove', seconds: 4 * 60 + 53 },
  ],
};
