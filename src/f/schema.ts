import { z } from 'zod';
import type { DecisionLog } from './types';

const text = z.string().min(1);

export const DecisionLogSchema: z.ZodType<DecisionLog> = z.object({
  project: text,
  log: z.array(z.object({ id: text, date: z.string().regex(/^\d{2}\/\d{4}$/), who: text, what: text, why: text })).min(1),
  decision: z.object({
    date: z.string().regex(/^\d{2}\/\d{4}$/),
    who: text,
    question: text,
    links: z.array(z.object({ id: text, why: text })).min(1),
    options: z.array(text).min(2),
  }),
});
