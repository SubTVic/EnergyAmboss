import projectJson from '../../content/b-project-windpark-x.json';
import lawJson from '../../content/b-law-updates.json';
import { readJson, removeKey, writeJson } from '../shared/storage';
import { PatchSchema, ProjectSchema } from './schema';
import type { Patch, Project } from './types';

const KEY = 'b-projects';

export const DEMO_PROJECT: Project = ProjectSchema.parse(projectJson);
export const LAW_UPDATES: Patch[] = (lawJson as unknown[]).map((l) => PatchSchema.parse(l));

export function loadProjects(): Project[] {
  const stored = readJson<Project[] | null>(KEY, null);
  return stored && stored.length ? stored : [structuredClone(DEMO_PROJECT)];
}

export function saveProjects(projects: Project[]): void {
  writeJson(KEY, projects);
}

export function resetB(): void {
  removeKey(KEY);
}
