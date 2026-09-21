import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type {
  Candidate,
  PlanResult,
  Project,
  ProjectPayload,
  TrackResult,
} from '../shared/planner.js';
import { plan, validateInput, type PlanInput } from '../shared/planner.js';
import { sampleProject } from '../shared/sample.js';

const DB_PATH = process.env.DB_PATH || 'data/vinyl.db';

let db: Database.Database;

interface ProjectRow {
  id: number;
  name: string;
  rpm: number;
  outer_radius: number;
  inner_radius: number;
  gap_seconds: number;
  min_pitch: number;
  tracks_json: string;
  result_json: string | null;
  created_at: string;
  updated_at: string;
}

export function openDatabase(): void {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT    NOT NULL,
      rpm          REAL    NOT NULL,
      outer_radius REAL    NOT NULL,
      inner_radius REAL    NOT NULL,
      gap_seconds  REAL    NOT NULL,
      min_pitch    REAL    NOT NULL,
      tracks_json  TEXT    NOT NULL,
      result_json  TEXT,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  if (process.env.SEED_SAMPLE !== '0') seedSampleIfEmpty();
}

function seedSampleIfEmpty(): void {
  const row = db.prepare('SELECT COUNT(*) AS c FROM projects').get() as { c: number };
  if (row.c > 0) return;

  const payload: PlanInput = sampleProject;
  const result = plan(payload);
  db.prepare(
    `INSERT INTO projects
       (name, rpm, outer_radius, inner_radius, gap_seconds, min_pitch, tracks_json, result_json)
     VALUES
       (@name, @rpm, @outerRadius, @innerRadius, @gapSeconds, @minPitch, @tracksJson, @resultJson)`,
  ).run({
    name: payload.name,
    rpm: payload.rpm,
    outerRadius: payload.outerRadius,
    innerRadius: payload.innerRadius,
    gapSeconds: payload.gapSeconds,
    minPitch: payload.minPitch,
    tracksJson: JSON.stringify(payload.tracks),
    resultJson: JSON.stringify(result),
  });
}

function rowToProject(row: ProjectRow): Project {
  const tracks = JSON.parse(row.tracks_json) as TrackResult[];
  return {
    id: row.id,
    name: row.name,
    rpm: row.rpm,
    outerRadius: row.outer_radius,
    innerRadius: row.inner_radius,
    gapSeconds: row.gap_seconds,
    minPitch: row.min_pitch,
    tracks: tracks.map((t, i) => ({ index: i + 1, title: t.title, seconds: t.seconds })),
    result: (row.result_json ? JSON.parse(row.result_json) : null) as PlanResult | null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listProjects(): Project[] {
  const rows = db.prepare('SELECT * FROM projects ORDER BY updated_at DESC, id DESC').all() as ProjectRow[];
  return rows.map(rowToProject);
}

export function getProject(id: number): Project | undefined {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow | undefined;
  return row ? rowToProject(row) : undefined;
}

/** 校验、计算并持久化；errors 非空表示参数非法 */
export function createProject(payload: ProjectPayload): { project?: Project; errors: string[] } {
  const input: PlanInput = { ...payload };
  const errors = validateInput(input);
  if (errors.length > 0) return { errors };

  const result = plan(input);
  const info = db
    .prepare(
      `INSERT INTO projects
         (name, rpm, outer_radius, inner_radius, gap_seconds, min_pitch, tracks_json, result_json)
       VALUES
         (@name, @rpm, @outerRadius, @innerRadius, @gapSeconds, @minPitch, @tracksJson, @resultJson)`,
    )
    .run({
      name: input.name.trim(),
      rpm: input.rpm,
      outerRadius: input.outerRadius,
      innerRadius: input.innerRadius,
      gapSeconds: input.gapSeconds,
      minPitch: input.minPitch,
      tracksJson: JSON.stringify(input.tracks),
      resultJson: JSON.stringify(result),
    });

  return { project: getProject(Number(info.lastInsertRowid)), errors: [] };
}

/** 基于已存储参数（可用 payload 覆盖）重新计算全部候选方案 */
export function recomputeProject(
  id: number,
  payload: Partial<ProjectPayload>,
): { project?: Project; errors: string[]; notFound?: boolean } {
  const existing = getProject(id);
  if (!existing) return { errors: [], notFound: true };

  const merged: PlanInput = {
    name: payload.name ?? existing.name,
    rpm: payload.rpm ?? existing.rpm,
    outerRadius: payload.outerRadius ?? existing.outerRadius,
    innerRadius: payload.innerRadius ?? existing.innerRadius,
    gapSeconds: payload.gapSeconds ?? existing.gapSeconds,
    minPitch: payload.minPitch ?? existing.minPitch,
    tracks: payload.tracks ?? existing.tracks.map(({ title, seconds }) => ({ title, seconds })),
  };
  const errors = validateInput(merged);
  if (errors.length > 0) return { errors };

  const result: PlanResult = plan(merged);
  db.prepare(
    `UPDATE projects SET
        name = @name, rpm = @rpm, outer_radius = @outerRadius, inner_radius = @innerRadius,
        gap_seconds = @gapSeconds, min_pitch = @minPitch, tracks_json = @tracksJson,
        result_json = @resultJson, updated_at = datetime('now')
      WHERE id = @id`,
  ).run({
    id,
    name: merged.name.trim(),
    rpm: merged.rpm,
    outerRadius: merged.outerRadius,
    innerRadius: merged.innerRadius,
    gapSeconds: merged.gapSeconds,
    minPitch: merged.minPitch,
    tracksJson: JSON.stringify(merged.tracks),
    resultJson: JSON.stringify(result),
  });

  return { project: getProject(id), errors: [] };
}

export function deleteProject(id: number): boolean {
  const info = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  return info.changes > 0;
}

/** 仅供测试/调试：重算但不写库 */
export function previewPlan(payload: ProjectPayload): { result?: PlanResult; errors: string[] } {
  const input: PlanInput = { ...payload };
  const errors = validateInput(input);
  if (errors.length > 0) return { errors };
  return { result: plan(input), errors: [] };
}

export type { Candidate };
