import { z } from 'zod';
import type { StartBoard } from './types';

const text = z.string().min(1);

export const StartBoardSchema: z.ZodType<StartBoard> = z.object({
  project: text,
  depts: z.array(text).min(1),
  statements: z.array(z.object({ id: text, text, who: text, kbIds: z.array(text) })),
  links: z.array(z.object({ from: text, to: text, why: z.string() })),
});
