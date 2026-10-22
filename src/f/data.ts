import logJson from '../../content/f-decisions.json';
import { DecisionLogSchema } from './schema';
import type { DecisionLog } from './types';

export const decisionLog: DecisionLog = DecisionLogSchema.parse(logJson);
