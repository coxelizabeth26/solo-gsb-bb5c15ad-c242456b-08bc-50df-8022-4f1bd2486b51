import type { Candidate, Project } from './types';
import { formatDuration } from './format';
import { SideDetail } from './SideDetail';

interface Props {
  project: Project;
  onClose: () => void;
}

export function BestPlan({ project, onClose }: Props) {
  const result = project.result;
  if (!result || result.bestCut === null) return null;
  const best = result.candidates.find((c) => c.cut === result.bestCut) as Candidate;

  return (
    <section className="card best-card">
      <div className="best-head">
        <div>
          <span className="badge best-badge">★ 推荐切点</span>
          <h2>{best.cutLabel}</h2>
        </div>
        <button type="button" className="btn ghost" onClick={onClose}>
          收起 ✕
        </button>
      </div>
      <p className="best-metrics">
        <span>
          较差一面沟距 <strong>{best.worsePitch.toFixed(4)}</strong> mm/转
        </span>
        <span>
          两面时长差 <strong>{formatDuration(best.durationDiff)}</strong>
        </span>
        <span className="muted">
          A 面曲目 #{best.a.trackIndexes.join('、')} ／ B 面曲目 #{best.b.trackIndexes.join('、')}
        </span>
      </p>
      <div className="sides-grid">
        <SideDetail side={best.a} />
        <SideDetail side={best.b} />
      </div>
    </section>
  );
}
