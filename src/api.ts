import type { PlanResult, Project, ProjectPayload } from './types';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.details ? body.details.join('；') : body.error || detail;
    } catch {
      /* 忽略 JSON 解析失败 */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listProjects: () => request<Project[]>('/api/projects'),
  getProject: (id: number) => request<Project>(`/api/projects/${id}`),
  createProject: (payload: ProjectPayload) =>
    request<Project>('/api/projects', { method: 'POST', body: JSON.stringify(payload) }),
  updateProject: (id: number, payload: Partial<ProjectPayload>) =>
    request<Project>(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteProject: (id: number) =>
    request<void>(`/api/projects/${id}`, { method: 'DELETE' }),
  preview: (payload: ProjectPayload) =>
    request<PlanResult>('/api/plan/preview', { method: 'POST', body: JSON.stringify(payload) }),
};
