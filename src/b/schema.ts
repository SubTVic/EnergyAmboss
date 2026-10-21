import { z } from 'zod';
import { findCycle } from './derive';
import type { BpNode, Patch, Project } from './types';

const OwnStatusSchema = z.enum(['belegt', 'sorry', 'widerlegt', 'in_arbeit', 'entfallen']);

export const BpNodeSchema: z.ZodType<BpNode> = z.object({
  id: z.string().min(1),
  parentId: z.string().nullable(),
  title: z.string(),
  kind: z.enum(['ziel', 'teilziel', 'annahme', 'schritt', 'alternative']),
  ownStatus: OwnStatusSchema.optional(),
  deps: z.array(z.string()),
  evidence: z.string().optional(),
  owner: z.string().optional(),
  damageIfWrong: z.number().optional(),
  alternativeFor: z.string().optional(),
  adopted: z.boolean().optional(),
  hidden: z.boolean().optional(),
  knowledgeIds: z.array(z.string()).optional(),
});

const PatchOpSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('setStatus'), nodeId: z.string(), status: OwnStatusSchema }),
  z.object({ op: z.literal('addNode'), node: BpNodeSchema }),
  z.object({ op: z.literal('reveal'), nodeId: z.string() }),
]);

export const PatchSchema: z.ZodType<Patch> = z.object({
  id: z.string(),
  title: z.string(),
  caseId: z.string(),
  ops: z.array(PatchOpSchema),
  explanation: z.string(),
});

export const ProjectSchema: z.ZodType<Project> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nodes: z.array(BpNodeSchema).min(1),
  events: z.array(PatchSchema),
  applied: z.array(z.string()),
});

/** Prüft ein importiertes Projekt: Schema, eindeutige IDs, gültige Verweise, keine Zyklen. Gibt Fehlertexte zurück. */
export function validateProject(raw: unknown): { project?: Project; errors: string[] } {
  const parsed = ProjectSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join('.') || 'Projekt'}: ${i.message}`) };
  }
  const project = parsed.data;
  const errors: string[] = [];
  const ids = new Set(project.nodes.map((n) => n.id));
  if (ids.size !== project.nodes.length) errors.push('Knoten-IDs sind nicht eindeutig.');
  for (const n of project.nodes) {
    if (n.parentId !== null && !ids.has(n.parentId)) errors.push(`Knoten „${n.id}“ hat einen unbekannten Elternknoten „${n.parentId}“.`);
    for (const d of n.deps) if (!ids.has(d)) errors.push(`Knoten „${n.id}“ setzt unbekannten Knoten „${d}“ voraus.`);
  }
  if (errors.length === 0) {
    const cycle = findCycle(project.nodes);
    if (cycle) errors.push(`Zyklus im Beweisbaum: ${cycle.join(' → ')}`);
  }
  return errors.length ? { errors } : { project, errors: [] };
}
