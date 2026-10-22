import { z } from 'zod';
import { DomainSchema } from '../shared/schemas';
import type { DecisionLog } from './types';

const DeptSchema = z.enum(['projektleitung', 'netzplanung', 'flaechensicherung', 'naturschutz', 'genehmigung', 'controlling']);
const LinkSchema = z.object({ id: z.string().min(1), why: z.string().min(1) });

export const DecisionLogSchema: z.ZodType<DecisionLog> = z.object({
  project: z.string().min(1),
  site: z.string().min(1),
  log: z.array(
    z.object({
      id: z.string().min(1),
      date: z.string().regex(/^\d{2}\/\d{4}$/),
      title: z.string().min(1),
      dept: DeptSchema,
      domains: z.array(DomainSchema).min(1),
      reasons: z.array(z.string().min(1)).min(1),
      assumptions: z.array(
        z.object({ text: z.string().min(1), status: z.enum(['belegt', 'offen', 'widerlegt']), note: z.string().optional() }),
      ),
      knowledgeIds: z.array(z.string()),
    }),
  ),
  decisions: z.array(
    z.object({
      id: z.string().min(1),
      date: z.string().regex(/^\d{2}\/\d{4}$/),
      question: z.string().min(1),
      situation: z.string().min(1),
      dept: DeptSchema,
      domains: z.array(DomainSchema).min(1),
      breaks: z.array(z.string()).optional(),
      logLinks: z.array(LinkSchema).min(1),
      knowledgeLinks: z.array(LinkSchema),
      options: z
        .array(z.object({ id: z.string().min(1), label: z.string().min(1), restsOn: z.array(z.string()), outlook: z.string().min(1) }))
        .min(2),
      estimate: z
        .object({
          question: z.string().min(1),
          value: z.number().positive(),
          pRest: z.number().min(0).max(1),
          planning: z.number().min(0),
          waitCost: z.number().min(0),
          waitNote: z.string().min(1),
          optionIds: z.object({ now: z.string(), wait: z.string(), giveUp: z.string() }),
        })
        .optional(),
    }),
  ),
});
