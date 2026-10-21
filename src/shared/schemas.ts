import { z } from 'zod';
import type { Case, KnowledgeEdge, KnowledgeNode, Region } from './types';

export const DomainSchema = z.enum([
  'recht',
  'netz',
  'natur',
  'vertraege',
  'technik',
  'finanzen',
  'logistik',
  'genehmigung',
]);

export const CaseSchema: z.ZodType<Case> = z.object({
  id: z.string().regex(/^F\d+$/),
  title: z.string().min(1),
  situation: z.string().min(1),
  domains: z.array(DomainSchema).min(1),
  source: z.enum(['Interview', 'Recherche']),
});

export const KnowledgeNodeSchema: z.ZodType<KnowledgeNode> = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(['norm', 'akteur', 'schritt', 'risiko', 'kennzahl']),
  domain: DomainSchema,
  summary: z.string().min(1),
  caseIds: z.array(z.string()),
  verify: z.boolean().optional(),
});

export const KnowledgeEdgeSchema: z.ZodType<KnowledgeEdge> = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  kind: z.enum(['setzt_voraus', 'verzoegert', 'verteuert', 'schliesst_aus']),
  note: z.string().optional(),
});

export const KnowledgeSchema = z.object({
  nodes: z.array(KnowledgeNodeSchema),
  edges: z.array(KnowledgeEdgeSchema),
});

const Point = z.tuple([z.number(), z.number()]);

export const RegionSchema: z.ZodType<Region> = z.object({
  viewBox: Point,
  villages: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      x: z.number(),
      y: z.number(),
      bufferRadius: z.number(),
    }),
  ),
  substations: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      x: z.number(),
      y: z.number(),
      operator: z.enum(['nord', 'sued']),
    }),
  ),
  lines: z.array(
    z.object({
      id: z.string(),
      points: z.array(Point),
      kind: z.enum(['netz', 'alt_110kv', 'autobahn', 'strasse']),
    }),
  ),
  areas: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(['schutzgebiet', 'wald', 'netzgrenze']),
      polygon: z.array(Point),
    }),
  ),
  sites: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      polygon: z.array(Point),
      caseIds: z.array(z.string()),
      tech: z.enum(['wind', 'pv']),
    }),
  ),
});
