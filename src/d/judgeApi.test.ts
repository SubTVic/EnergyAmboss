import { beforeEach, describe, expect, it, vi } from 'vitest';

// Anthropic-SDK mocken: kein Netzwerk, aber die Fehlerklassen, die der Handler prüft
const create = vi.fn();
vi.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error {
    status?: number;
    constructor(status?: number) {
      super('api error');
      this.status = status;
    }
  }
  class RateLimitError extends APIError {}
  class APIConnectionTimeoutError extends APIError {}
  class Anthropic {
    static APIError = APIError;
    static RateLimitError = RateLimitError;
    static APIConnectionTimeoutError = APIConnectionTimeoutError;
    messages = { create };
  }
  return { default: Anthropic };
});

import handler from '../../api/judge';

function call(body: unknown, method = 'POST') {
  let statusCode = 0;
  let payload: unknown;
  const res = {
    setHeader: () => undefined,
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(b: unknown) {
      payload = b;
    },
  };
  return handler({ method, body }, res).then(() => ({ status: statusCode, body: payload as Record<string, unknown> }));
}

const valid = {
  action: { id: 'sichern', label: 'Fläche sichern' },
  state: { round: 1, budget: 1_500_000, grid: 'keine' },
  reasoning: 'Konkurrenten würden die Fläche sonst wegnehmen.',
  facts: ['Flächen werden lieber vor der Ausweisung gesichert, weil Konkurrenten sie sonst wegnehmen.'],
};
const toolUse = (input: unknown) => ({ stop_reason: 'tool_use', content: [{ type: 'tool_use', name: 'report_judgement', input }] });

beforeEach(() => {
  create.mockReset();
  process.env.ANTHROPIC_API_KEY = 'test-key';
});

describe('POST /api/judge', () => {
  it('lehnt andere Methoden ab', async () => {
    expect((await call(valid, 'GET')).status).toBe(405);
  });

  it('antwortet 503 ohne Schlüssel, ohne das Modell aufzurufen', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect((await call(valid)).status).toBe(503);
    expect(create).not.toHaveBeenCalled();
  });

  it('prüft die Anfrage', async () => {
    expect((await call({ ...valid, reasoning: '' })).status).toBe(400);
    expect((await call({ ...valid, facts: [] })).status).toBe(400);
    expect((await call({ ...valid, reasoning: 'x'.repeat(601) })).status).toBe(400);
    expect((await call(undefined)).status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('gibt die geprüfte Bewertung zurück und schickt Fakten und Begründung an das Modell', async () => {
    create.mockResolvedValue(toolUse({ validReasons: 2, feedback: 'Gut begründet.', missing: '' }));
    const r = await call(valid);
    expect(r).toEqual({ status: 200, body: { validReasons: 2, feedback: 'Gut begründet.', missing: '' } });
    const [body, options] = create.mock.calls[0];
    expect(body.tools).toHaveLength(1);
    expect(body.tools[0].name).toBe('report_judgement');
    expect(body.tool_choice).toEqual({ type: 'auto' });
    expect(body.messages[0].content).toContain('Konkurrenten würden die Fläche sonst wegnehmen');
    expect(body.messages[0].content).toContain('Fakten:');
    expect(options.timeout).toBe(10_000);
  });

  it('weist ungültige Modellantworten ab (zod)', async () => {
    create.mockResolvedValue(toolUse({ validReasons: 7, feedback: 'x', missing: '' }));
    expect((await call(valid)).status).toBe(502);
    create.mockResolvedValue({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Hallo' }] });
    expect((await call(valid)).status).toBe(502);
  });

  it('meldet Refusal, Rate-Limit, Timeout und andere Fehler als Fehlerstatus', async () => {
    create.mockResolvedValue({ stop_reason: 'refusal', content: [] });
    expect((await call(valid)).body.error).toBe('refusal');

    const mod = (await import('@anthropic-ai/sdk')) as unknown as { default: { RateLimitError: new () => Error; APIConnectionTimeoutError: new () => Error; APIError: new (s: number) => Error } };
    create.mockRejectedValue(new mod.default.RateLimitError());
    expect((await call(valid)).status).toBe(429);
    create.mockRejectedValue(new mod.default.APIConnectionTimeoutError());
    expect((await call(valid)).status).toBe(504);
    create.mockRejectedValue(new mod.default.APIError(500));
    expect((await call(valid)).status).toBe(502);
    create.mockRejectedValue(new Error('boom'));
    expect((await call(valid)).status).toBe(500);
  });
});
