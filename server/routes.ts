import express from 'express';
import type { Request, Response } from 'express';
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  previewPlan,
  recomputeProject,
} from './db.js';
import type { ProjectPayload } from '../shared/planner.js';

export const apiRouter = express.Router();

apiRouter.get('/projects', (_req: Request, res: Response) => {
  res.json(listProjects());
});

apiRouter.get('/projects/:id', (req, res) => {
  const project = getProject(Number(req.params.id));
  if (!project) {
    res.status(404).json({ error: '方案不存在' });
    return;
  }
  res.json(project);
});

apiRouter.post('/projects', (req, res) => {
  const { project, errors } = createProject(req.body as ProjectPayload);
  if (errors.length > 0) {
    res.status(400).json({ error: '参数校验失败', details: errors });
    return;
  }
  res.status(201).json(project);
});

apiRouter.put('/projects/:id', (req, res) => {
  const id = Number(req.params.id);
  const { project, errors, notFound } = recomputeProject(id, req.body as Partial<ProjectPayload>);
  if (notFound) {
    res.status(404).json({ error: '方案不存在' });
    return;
  }
  if (errors.length > 0) {
    res.status(400).json({ error: '参数校验失败', details: errors });
    return;
  }
  res.json(project);
});

apiRouter.delete('/projects/:id', (req, res) => {
  const ok = deleteProject(Number(req.params.id));
  if (!ok) {
    res.status(404).json({ error: '方案不存在' });
    return;
  }
  res.status(204).end();
});

/** 不落库试算：提交参数直接返回全部候选切点 */
apiRouter.post('/plan/preview', (req, res) => {
  const { result, errors } = previewPlan(req.body as ProjectPayload);
  if (errors.length > 0) {
    res.status(400).json({ error: '参数校验失败', details: errors });
    return;
  }
  res.json(result);
});
