import type { ProjectPayload } from './types';

/** 与后端 shared/sample.ts 保持一致的客户端示例负载（用于一键填充表单） */
export function samplePayload(): ProjectPayload {
  return {
    name: '示例专辑 · Night Grooves',
    rpm: 33.333,
    outerRadius: 146.5,
    innerRadius: 60,
    gapSeconds: 3,
    minPitch: 0.07,
    tracks: [
      { title: 'Opening Sides', seconds: 252 },
      { title: 'Dust Light', seconds: 208 },
      { title: 'Paper Sleeve', seconds: 303 },
      { title: '33 Rounds', seconds: 235 },
      { title: 'Inner Edge', seconds: 281 },
      { title: 'Blank Band', seconds: 378 },
      { title: 'Lead-In Dream', seconds: 227 },
      { title: 'Runout Shuffle', seconds: 299 },
      { title: 'Wax Equation', seconds: 324 },
      { title: 'Last Groove', seconds: 293 },
    ],
  };
}
