import { z } from 'zod';
import actionsJson from '../../content/d-actions.json';
import eventsJson from '../../content/d-events.json';
import { region } from '../shared/content';
import type { ActionCard, Condition, Effect, EventCard, GameData } from './types';

const Range = z.object({ gte: z.number().optional(), lte: z.number().optional() }).strict();
const Grid = z.enum(['keine', 'angefragt', 'vage', 'zusage', 'absage']);
const Survey = z.enum(['keins', 'laeuft', 'fertig', 'problem']);
const Permit = z.enum(['keine', 'beantragt', 'erteilt']);
const SiteStatus = z.enum(['frei', 'gesichert', 'verloren']);

// strict(): Tippfehler in den JSON-Karten werden beim Laden sofort gemeldet
export const ConditionSchema: z.ZodType<Condition> = z
  .object({
    grid: z.union([Grid, z.array(Grid)]).optional(),
    survey: z.union([Survey, z.array(Survey)]).optional(),
    permit: z.union([Permit, z.array(Permit)]).optional(),
    award: z.boolean().optional(),
    round: Range.optional(),
    budget: Range.optional(),
    contacts: Range.optional(),
    support: Range.optional(),
    securedSites: Range.optional(),
    freeSites: Range.optional(),
    designatedSecured: Range.optional(),
    siteStatus: z.object({ site: z.string(), status: SiteStatus }).strict().optional(),
    flag: z.string().optional(),
    noFlag: z.string().optional(),
  })
  .strict();

export const EffectSchema: z.ZodType<Effect> = z.lazy(() =>
  z
    .object({
      budget: z.number().optional(),
      months: z.number().optional(),
      contacts: z.number().optional(),
      support: z.number().optional(),
      grid: Grid.optional(),
      survey: Survey.optional(),
      permit: Permit.optional(),
      award: z.boolean().optional(),
      site: z.string().optional(),
      status: SiteStatus.optional(),
      flag: z.string().optional(),
      clearFlag: z.string().optional(),
      if: ConditionSchema.optional(),
      then: z.array(EffectSchema).optional(),
      later: z.number().optional(),
      text: z.string().optional(),
      effects: z.array(EffectSchema).optional(),
    })
    .strict(),
);

const ReasonSchema = z.object({ id: z.string(), text: z.string(), valid: z.boolean(), why: z.string() }).strict();

export const ActionCardSchema: z.ZodType<ActionCard> = z
  .object({
    id: z.string(),
    label: z.string(),
    summary: z.string(),
    cost: z.number(),
    target: z.number(),
    needsSite: SiteStatus.optional(),
    tags: z.array(z.enum(['eigentuemer', 'gemeinde'])).optional(),
    requires: z.array(ConditionSchema),
    modifiers: z.array(z.object({ when: ConditionSchema, delta: z.number(), why: z.string() }).strict()).optional(),
    onSuccess: z.array(EffectSchema),
    onFailure: z.array(EffectSchema),
    successText: z.string(),
    failureText: z.string(),
    caseId: z.string().regex(/^F\d$/),
    knowledgeIds: z.array(z.string()).min(1).max(2),
    reasons: z.array(ReasonSchema).min(4).max(6),
  })
  .strict();

export const EventCardSchema: z.ZodType<EventCard> = z
  .object({
    id: z.string(),
    title: z.string(),
    text: z.string(),
    caseId: z.string().regex(/^F\d$/),
    when: z.array(ConditionSchema),
    weight: z.number().positive(),
    effects: z.array(EffectSchema),
    causedBy: z.string().optional(),
    resist: z.object({ target: z.number(), label: z.string() }).strict().optional(),
    resistEffects: z.array(EffectSchema).optional(),
    knowledgeIds: z.array(z.string()).min(1).max(2),
  })
  .strict();

export const actions: ActionCard[] = z.array(ActionCardSchema).parse(actionsJson);
export const events: EventCard[] = z.array(EventCardSchema).parse(eventsJson);

export const gameData: GameData = {
  actions,
  events,
  siteIds: region.sites.map((s) => s.id),
  pvSiteIds: region.sites.filter((s) => s.tech === 'pv').map((s) => s.id),
};
