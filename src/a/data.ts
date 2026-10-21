import { z } from 'zod';
import questionsJson from '../../content/a-questions.json';
import { QuestionSchema } from './schema';
import type { Question } from './types';

export const questions: Question[] = z.array(QuestionSchema).parse(questionsJson);
export const questionById = (id: string): Question | undefined => questions.find((q) => q.id === id);

export const questionTitle = (q: Question): string => (q.type === 'sct' ? q.hypothesis : q.stem);
