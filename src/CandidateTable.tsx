import { useState } from 'react';
import type { Candidate, PlanResult } from './types';
import { fmt, formatDuration } from './format';
import { SideDetail } from './SideDetail';

interface Props {
  result: PlanResult;
}

type SortKey = 'cut' | 'worsePitch' | 'durationDiff';

export function CandidateTable({ result }: Props) {
  const [onlyFeasible, setOnlyFeasible] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('cut');
  const [expanded, setExpanded] = useState<number | null>(result.bestCut);

  let rows = [...result.candidates];
  if (onlyFeasible) rows = rows.filter((c) => c.feasible);
  if (sortKey === 'worsePitch') {
    rows.sort((a, b) => b.worsePitch - a.worsePitch || a.durationDiff - b.durationDiff);
  } else if (sortKey === 'durationDiff') {
    rows.sort((a, b) => a.durationDiff - b.durationDiff || b.worsePitch - a.worsePitch);
  } else {
    rows.sort((a, b) => a.cut - b.cut);
  }

  return (
    <section className="card">
      <div className="table-head">
        <h2>
          候选切点明细
          <span className="muted">
            {' '}
            （共 {result.candidates.length} 个，可行 {result.feasibleCount} 个）
          </span>
        </h2>
        <div className="table-tools">
          <label className="switch">
            <input
              type="checkbox"
              checked={onlyFeasible}
              onChange={(e) => setOnlyFeasible(e.target.checked)}
            />
            只看可行
          </label>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
            <option value="cut">按切点顺序</option>
            <option value="worsePitch">按较差面沟距↓</option>
            <option value="durationDiff">按时长差↑</option>
          </select>
        </div>
      </div>

      <div className="table-wrap">
        <table className="cand-table">
          <thead>
            <tr>
              <th>状态</th>
              <th>切点</th>
              <th>A 面时长</th>
              <th>A 沟距</th>
              <th>B 面时长</th>
              <th>B 沟距</th>
              <th>较差面沟距</th>
              <th>时长差</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <CandidateRow
                key={c.cut}
                c={c}
                open={expanded === c.cut}
                onToggle={() => setExpanded(expanded === c.cut ? null : c.cut)}
              />
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="muted center">当前过滤条件下没有候选方案。</p>}
    </section>
  );
}

function CandidateRow({ c, open, onToggle }: { c: Candidate; open: boolean; onToggle: () => void }) {
  return (
    <>
      <tr
        className={`cand-row ${c.feasible ? '' : 'rejected'} ${c.best ? 'best-row' : ''}`}
        onClick={onToggle}
      >
        <td>
          {c.feasible ? (
            <span className="badge">可行 #{c.rank}</span>
          ) : (
            <span className="badge reject">淘汰</span>
          )}
          {c.best && <span className="badge best-badge">★ 最优</span>}
        </td>
        <td>A{c.cut}/B{c.b.trackCount}</td>
        <td>{formatDuration(c.a.totalSeconds)}</td>
        <td className={c.a.passes ? 'num ok' : 'num bad'}>{fmt(c.a.pitch)}</td>
        <td>{formatDuration(c.b.totalSeconds)}</td>
        <td className={c.b.passes ? 'num ok' : 'num bad'}>{fmt(c.b.pitch)}</td>
        <td className="num strong">{fmt(c.worsePitch)}</td>
        <td>{formatDuration(c.durationDiff)}</td>
        <td className="caret">{open ? '▾' : '▸'}</td>
      </tr>
      {open && (
        <tr className="detail-row">
          <td colSpan={9}>
            <div className="detail-inner">
              <div className="sides-grid">
                <SideDetail side={c.a} />
                <SideDetail side={c.b} />
              </div>
              {c.feasible ? (
                <p className="reasons-ok">
                  ✓ 两面沟距均不低于安全阈值；较差面沟距 {fmt(c.worsePitch)} mm/转，时长差{' '}
                  {formatDuration(c.durationDiff)}。
                </p>
              ) : (
                <div className="reasons-box">
                  <strong>淘汰原因：</strong>
                  <ul>
                    {c.rejectionReasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
