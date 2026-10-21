import { z } from 'zod';
import { DomainSchema } from '../shared/schemas';
import type { Question } from './types';

const Base = {
  id: z.string().min(1),
  caseId: z.string().regex(/^F[1-9]$/),
  domains: z.array(DomainSchema).min(1),
  nodeIds: z.array(z.string()).min(1),
  verify: z.boolean().optional(),
};

export const QuestionSchema: z.ZodType<Question> = z.discriminatedUnion('type', [
  z.object({
    ...Base,
    type: z.literal('single'),
    stem: z.string().min(1),
    options: z
      .array(z.object({ id: z.string(), text: z.string(), correct: z.boolean(), explanation: z.string().min(1) }))
      .length(5)
      .refine((o) => o.filter((x) => x.correct).length === 1, 'genau eine richtige Option'),
  }),
  z.object({
    ...Base,
    type: z.literal('sct'),
    hypothesis: z.string().min(1),
    newInfo: z.string().min(1),
    explanation: z.string().min(1),
    seedPanel: z.tuple([z.number().min(0), z.number().min(0), z.number().min(0), z.number().min(0), z.number().min(0)]),
  }),
  z.object({
    ...Base,
    type: z.literal('cascade'),
    stem: z.string().min(1),
    correctDomains: z.array(DomainSchema).length(3),
    explanation: z.string().min(1),
  }),
]);
