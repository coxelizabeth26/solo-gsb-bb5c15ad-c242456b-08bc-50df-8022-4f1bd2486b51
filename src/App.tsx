import { useEffect, useState } from 'react';
import type { Project, ProjectPayload } from './types';
import { api } from './api';
import { ProjectForm } from './ProjectForm';
import { CandidateTable } from './CandidateTable';
import { BestPlan } from './BestPlan';

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Project | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showBest, setShowBest] = useState(true);

  const refresh = async (selectId?: number) => {
    try {
      const list = await api.listProjects();
      setProjects(list);
      if (selectId !== undefined) setSelectedId(selectId);
      else if (selectedId === null && list.length > 0) setSelectedId(list[0].id);
      else if (selectedId !== null && !list.some((p) => p.id === selectedId))
        setSelectedId(list[0]?.id ?? null);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = projects.find((p) => p.id === selectedId) ?? null;

  const handleCreate = async (payload: ProjectPayload) => {
    setBusy(true);
    try {
      const created = await api.createProject(payload);
      await refresh(created.id);
      setEditing(null);
      setShowBest(true);
      setNotice(`已保存方案「${created.name}」，枚举出 ${created.result?.candidates.length ?? 0} 个切点。`);
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async (payload: ProjectPayload) => {
    if (!editing) return;
    setBusy(true);
    try {
      const updated = await api.updateProject(editing.id, payload);
      await refresh(updated.id);
      setEditing(null);
      setShowBest(true);
      setNotice(`方案「${updated.name}」已重新计算。`);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (p: Project) => {
    if (!confirm(`确定删除方案「${p.name}」？此操作不可撤销。`)) return;
    setBusy(true);
    try {
      await api.deleteProject(p.id);
      if (editing?.id === p.id) setEditing(null);
      await refresh();
      setNotice(`已删除「${p.name}」。`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="disc" aria-hidden>
          <span className="disc-label">33⅓</span>
        </div>
        <div>
          <h1>黑胶分面规划</h1>
          <p className="muted">枚举 A/B 面切点 · 恒定沟距计算 · 安全阈值过滤 · 双目标排序</p>
        </div>
      </header>

      {(notice || loadError) && (
        <div className={`alert ${loadError ? 'error' : 'info'}`}>
          {loadError ?? notice}
          <button type="button" className="btn icon" onClick={() => { setNotice(null); setLoadError(null); }}>
            ✕
          </button>
        </div>
      )}

      <main className="layout">
        <div className="col-left">
          {editing ? (
            <ProjectForm
              editing={editing}
              busy={busy}
              onSubmit={handleUpdate}
              onCancelEdit={() => setEditing(null)}
            />
          ) : (
            <ProjectForm
              editing={null}
              busy={busy}
              onSubmit={handleCreate}
              onCancelEdit={() => setEditing(null)}
            />
          )}

          <section className="card">
            <h2>已保存方案（SQLite）</h2>
            {projects.length === 0 && <p className="muted">暂无方案。首次启动会自动写入一份示例数据。</p>}
            <ul className="project-list">
              {projects.map((p) => (
                <li key={p.id} className={p.id === selectedId ? 'active' : ''}>
                  <button type="button" className="project-item" onClick={() => { setSelectedId(p.id); setEditing(null); }}>
                    <strong>{p.name}</strong>
                    <span className="muted">
                      {p.tracks.length} 首 · {p.rpm} RPM · 可行 {p.result?.feasibleCount ?? 0}/
                      {p.result?.candidates.length ?? 0}
                    </span>
                  </button>
                  <span className="project-ops">
                    <button type="button" className="btn ghost sm" onClick={() => setEditing(p)}>
                      编辑
                    </button>
                    <button type="button" className="btn ghost sm danger" disabled={busy} onClick={() => handleDelete(p)}>
                      删除
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="col-right">
          {!selected && <EmptyHint />}
          {selected && (
            <>
              <section className="card params-card">
                <h2>{selected.name}</h2>
                <div className="params-grid">
                  <span>转速 <strong>{selected.rpm}</strong> RPM</span>
                  <span>外半径 <strong>{selected.outerRadius}</strong> mm</span>
                  <span>内半径 <strong>{selected.innerRadius}</strong> mm</span>
                  <span>留白 <strong>{selected.gapSeconds}</strong> 秒</span>
                  <span>最小沟距 <strong>{selected.minPitch}</strong> mm/转</span>
                  <span>
                    曲目 <strong>{selected.tracks.length}</strong> 首
                  </span>
                </div>
                <ol className="track-chips">
                  {selected.tracks.map((t) => (
                    <li key={t.index} title={t.title}>
                      {t.index}. {t.title}
                    </li>
                  ))}
                </ol>
              </section>

              {selected.result && selected.result.bestCut !== null && showBest && (
                <BestPlan project={selected} onClose={() => setShowBest(false)} />
              )}

              {selected.result ? (
                <CandidateTable result={selected.result} />
              ) : (
                <p className="muted">该方案尚无计算结果，请点击「编辑」重新计算。</p>
              )}
            </>
          )}
        </div>
      </main>

      <footer className="footer muted">
        沟距 = (外半径 − 内半径 − 曲间留白折算宽度) ÷ 每面总转数；过滤低于最小沟距的切点，
        先最大化较差面沟距，再最小化两面时长差。
      </footer>
    </div>
  );
}

function EmptyHint() {
  return (
    <section className="card empty-hint">
      <h2>还没有选中的方案</h2>
      <p>在左侧录入曲目时长、转速、内外半径、曲间留白与最小沟距，保存后将：</p>
      <ol>
        <li>枚举所有 A/B 面切点（A1/B(n-1) … A(n-1)/B1）；</li>
        <li>按每面总转数与扣除留白后的径向宽度计算恒定沟距；</li>
        <li>淘汰沟距低于安全阈值的方案并给出原因；</li>
        <li>依次按「较差一面沟距最大化、两面时长差最小化」排名。</li>
      </ol>
    </section>
  );
}
