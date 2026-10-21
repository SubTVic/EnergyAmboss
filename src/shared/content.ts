import casesJson from '../../content/cases.json';
import knowledgeJson from '../../content/knowledge.json';
import regionJson from '../../content/region.json';
import { CaseSchema, KnowledgeSchema, RegionSchema } from './schemas';
import type { Case, Domain, KnowledgeEdge, KnowledgeNode, Region } from './types';
import { z } from 'zod';

// Inhalte liegen als JSON im Repository und werden beim Start geprüft.
export const cases: Case[] = z.array(CaseSchema).parse(casesJson);
const knowledge = KnowledgeSchema.parse(knowledgeJson);
export const knowledgeNodes: KnowledgeNode[] = knowledge.nodes;
export const knowledgeEdges: KnowledgeEdge[] = knowledge.edges;
export const region: Region = RegionSchema.parse(regionJson);

export const caseById = (id: string): Case | undefined => cases.find((c) => c.id === id);
export const nodeById = (id: string): KnowledgeNode | undefined =>
  knowledgeNodes.find((n) => n.id === id);

/** Alle Kanten, die einen Knoten berühren (in beide Richtungen). */
export function edgesOf(nodeId: string): KnowledgeEdge[] {
  return knowledgeEdges.filter((e) => e.from === nodeId || e.to === nodeId);
}

export function neighborIds(nodeId: string): string[] {
  const ids = new Set<string>();
  for (const e of edgesOf(nodeId)) ids.add(e.from === nodeId ? e.to : e.from);
  return [...ids];
}

export const domainOfNode = (id: string): Domain | undefined => nodeById(id)?.domain;
