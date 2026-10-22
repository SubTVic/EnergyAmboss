import { z } from 'zod';

export const LawSchema = z.object({ id: z.string().min(1), title: z.string().min(1), summary: z.string().min(1), verify: z.boolean() });
export const StepSchema = z.object({ id: z.string().min(1), date: z.string().min(1), who: z.string().min(1), text: z.string().min(1) });

const Box = z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() });

/** Was die Wand anzeigt: gelesene Post-its, Verweise auf die Kataloge, Verbindungen zwischen Post-its. */
export const WallReadingSchema = z.object({
  notes: z.array(z.object({ id: z.string(), text: z.string(), box: Box.optional() })),
  references: z.array(z.object({ noteId: z.string(), targetId: z.string(), why: z.string() })),
  noteLinks: z.array(z.object({ a: z.string(), b: z.string(), why: z.string() })),
});

export type Law = z.infer<typeof LawSchema>;
export type Step = z.infer<typeof StepSchema>;
export type WallReading = z.infer<typeof WallReadingSchema>;
