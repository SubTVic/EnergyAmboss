import startJson from '../../content/f-start.json';
import { StartBoardSchema } from './schema';
import type { StartBoard } from './types';

export const startBoard: StartBoard = StartBoardSchema.parse(startJson);
