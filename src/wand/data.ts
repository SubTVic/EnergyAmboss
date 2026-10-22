import { z } from 'zod';
import demoJson from '../../content/wall-demo.json';
import lawsJson from '../../content/wall-laws.json';
import stepsJson from '../../content/wall-steps.json';
import { LawSchema, StepSchema, WallReadingSchema, type Law, type Step, type WallReading } from './schema';

export const laws: Law[] = z.array(LawSchema).parse(lawsJson);
export const steps: Step[] = z.array(StepSchema).parse(stepsJson);
export const demo: WallReading = WallReadingSchema.parse(demoJson);
