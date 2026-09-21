import type { SideResult } from './types';
import { fmt, formatDuration } from './format';

/** 单面计算明细（总转数 / 留白宽度 / 有效宽度 / 恒定沟距） */
export function SideDetail({ side }: { side: SideResult }) {
  return (
    <div className={`side-detail ${side.passes ? 'ok' : 'bad'}`}>
      <header>
        <strong>{side.side} 面</strong>
        <span className="muted">
          {side.trackCount} 首 · {formatDuration(side.totalSeconds)}
        </span>
      </header>
      <dl>
        <div>
          <dt>总转数</dt>
          <dd>{fmt(side.revolutions, 2)} 转</dd>
        </div>
        <div>
          <dt>留白段数</dt>
          <dd>{side.gapCount} 段</dd>
        </div>
        <div>
          <dt>留白转数</dt>
          <dd>{fmt(side.gapRevolutions, 2)} 转</dd>
        </div>
        <div>
          <dt>留白宽度</dt>
          <dd>{fmt(side.gapWidth)} mm</dd>
        </div>
        <div>
          <dt>有效宽度</dt>
          <dd>{fmt(side.grossWidth)} mm</dd>
        </div>
        <div>
          <dt>扣留白后宽度</dt>
          <dd>{fmt(side.usableWidth)} mm</dd>
        </div>
        <div className="pitch-row">
          <dt>恒定沟距</dt>
          <dd className={side.passes ? 'pitch-ok' : 'pitch-bad'}>
            {fmt(side.pitch)} mm/转
          </dd>
        </div>
      </dl>
      {side.reasons.length > 0 && (
        <ul className="side-reasons">
          {side.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
