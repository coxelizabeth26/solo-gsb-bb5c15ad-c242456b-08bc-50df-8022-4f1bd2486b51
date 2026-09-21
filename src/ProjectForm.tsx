import { useState } from 'react';
import type { Project, ProjectPayload, TrackInput } from './types';
import { parseDuration } from './format';
import { samplePayload } from './sample';

interface Props {
  /** 非 null 时为编辑该方案模式 */
  editing: Project | null;
  onSubmit: (payload: ProjectPayload) => Promise<void>;
  onCancelEdit: () => void;
  busy: boolean;
}

interface TrackRow {
  title: string;
  duration: string;
}

const emptyRows = (): TrackRow[] => [
  { title: '', duration: '' },
  { title: '', duration: '' },
];

function rowsFromTracks(tracks: TrackInput[]): TrackRow[] {
  return tracks.map((t) => ({ title: t.title, duration: String(t.seconds) }));
}
export function ProjectForm({ editing, onSubmit, onCancelEdit, busy }: Props) {
  const [name, setName] = useState(editing?.name ?? '');
  const [rpm, setRpm] = useState(String(editing?.rpm ?? '33.333'));
  const [outerRadius, setOuterRadius] = useState(String(editing?.outerRadius ?? '146.5'));
  const [innerRadius, setInnerRadius] = useState(String(editing?.innerRadius ?? '60'));
  const [gapSeconds, setGapSeconds] = useState(String(editing?.gapSeconds ?? '3'));
  const [minPitch, setMinPitch] = useState(String(editing?.minPitch ?? '0.07'));
  const [rows, setRows] = useState<TrackRow[]>(
    editing ? rowsFromTracks(editing.tracks) : emptyRows(),
  );
  const [error, setError] = useState<string | null>(null);

  const updateRow = (i: number, patch: Partial<TrackRow>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const handleSubmit = async () => {
    setError(null);
    const tracks: TrackInput[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const seconds = parseDuration(row.duration);
      if (!row.title.trim()) {
        setError(`第 ${i + 1} 首曲目缺少标题`);
        return;
      }
      if (seconds === null) {
        setError(`第 ${i + 1} 首曲目时长无效（支持 mm:ss 或秒数）`);
        return;
      }
      tracks.push({ title: row.title.trim(), seconds });
    }

    const payload: ProjectPayload = {
      name: name.trim(),
      rpm: Number(rpm),
      outerRadius: Number(outerRadius),
      innerRadius: Number(innerRadius),
      gapSeconds: Number(gapSeconds),
      minPitch: Number(minPitch),
      tracks,
    };
    try {
      await onSubmit(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const fillSample = () => {
    const s = samplePayload();
    setName(s.name);
    setRpm(String(s.rpm));
    setOuterRadius(String(s.outerRadius));
    setInnerRadius(String(s.innerRadius));
    setGapSeconds(String(s.gapSeconds));
    setMinPitch(String(s.minPitch));
    setRows(rowsFromTracks(s.tracks));
    setError(null);
  };

  return (
    <section className="card form-card">
      <h2>{editing ? `编辑方案：${editing.name}` : '录入唱片参数'}</h2>

      <label className="field">
        <span>方案名称</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="专辑 / 测试名" />
      </label>

      <div className="grid-3">
        <label className="field">
          <span>转速 RPM</span>
          <input value={rpm} onChange={(e) => setRpm(e.target.value)} inputMode="decimal" />
        </label>
        <label className="field">
          <span>外有效半径 (mm)</span>
          <input
            value={outerRadius}
            onChange={(e) => setOuterRadius(e.target.value)}
            inputMode="decimal"
          />
        </label>
        <label className="field">
          <span>内有效半径 (mm)</span>
          <input
            value={innerRadius}
            onChange={(e) => setInnerRadius(e.target.value)}
            inputMode="decimal"
          />
        </label>
        <label className="field">
          <span>曲间留白 (秒)</span>
          <input
            value={gapSeconds}
            onChange={(e) => setGapSeconds(e.target.value)}
            inputMode="decimal"
          />
        </label>
        <label className="field">
          <span>最小沟距 (mm/转)</span>
          <input
            value={minPitch}
            onChange={(e) => setMinPitch(e.target.value)}
            inputMode="decimal"
          />
        </label>
      </div>

      <div className="tracks-head">
        <h3>曲目顺序（从上至下为刻录顺序）</h3>
        <div className="row-actions">
          <button type="button" className="btn ghost" onClick={() => setRows((rs) => [...rs, { title: '', duration: '' }])}>
            + 添加曲目
          </button>
        </div>
      </div>

      <ol className="track-rows">
        {rows.map((row, i) => (
          <li key={i} className="track-row">
            <span className="track-no">{i + 1}</span>
            <input
              placeholder="曲名"
              value={row.title}
              onChange={(e) => updateRow(i, { title: e.target.value })}
            />
            <input
              className="dur"
              placeholder="时长 mm:ss 或秒"
              value={row.duration}
              onChange={(e) => updateRow(i, { duration: e.target.value })}
              inputMode="numeric"
            />
            <button
              type="button"
              className="btn icon"
              title="删除该曲目"
              disabled={rows.length <= 2}
              onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
            >
              ✕
            </button>
          </li>
        ))}
      </ol>

      {error && <div className="alert error">{error}</div>}

      <div className="form-actions">
        <button type="button" className="btn primary" disabled={busy} onClick={handleSubmit}>
          {editing ? '保存并重新计算' : '保存并枚举切点'}
        </button>
        {editing ? (
          <button type="button" className="btn ghost" onClick={onCancelEdit} disabled={busy}>
            取消编辑
          </button>
        ) : (
          <button type="button" className="btn ghost" onClick={fillSample} disabled={busy}>
            填充示例数据
          </button>
        )}
      </div>
    </section>
  );
}
