import Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import { handleWallRead, readWall, type ParseClient } from '../../api/_wallRead';

const image = 'a'.repeat(200);

function fakeClient(result: unknown): ParseClient {
  return { parse: vi.fn().mockResolvedValue(result) } as unknown as ParseClient;
}

const output = {
  notes: [
    { id: 'n1', text: 'Interesse an Pacht', box: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 } },
    { id: 'n2', text: 'Kein Umspannwerk', box: { x: 0.5, y: 0.1, w: 0.2, h: 0.2 } },
  ],
  references: [
    { noteId: 'n1', targetId: 'bgb-581', why: 'Pacht' },
    { noteId: 'n1', targetId: 'bgb-9999', why: 'erfunden' },
  ],
  noteLinks: [{ a: 'n1', b: 'n2', why: 'hängt zusammen' }],
};

describe('Projektwand: Bilderkennung (gemocktes SDK)', () => {
  it('liefert gelesene Post-its und verwirft erfundene Gesetze', async () => {
    const client = fakeClient({ stop_reason: 'end_turn', parsed_output: output });
    const r = await readWall(client, image, 'claude-opus-5-5');
    expect(r.status).toBe(200);
    const body = r.body as typeof output;
    expect(body.notes).toHaveLength(2);
    expect(body.references.map((x) => x.targetId)).toEqual(['bgb-581']);
    expect(body.noteLinks).toHaveLength(1);
    // Bild und Kataloge gehen mit, Fallbacks sind an
    const params = (client.parse as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(params.messages[0].content[0].source.data).toBe(image);
    expect(params.messages[0].content[1].text).toContain('bgb-581');
    expect(params.fallbacks).toBe('default');
  });

  it('meldet Ablehnung und ungültige Antworten als Fehler', async () => {
    expect((await readWall(fakeClient({ stop_reason: 'refusal', parsed_output: null }), image, 'm')).status).toBe(502);
    expect((await readWall(fakeClient({ stop_reason: 'end_turn', parsed_output: null }), image, 'm')).body).toEqual({
      error: 'invalid_model_output',
    });
  });

  it('meldet eine Zeitüberschreitung', async () => {
    const client = { parse: vi.fn().mockRejectedValue(new Anthropic.APIConnectionTimeoutError()) } as unknown as ParseClient;
    expect(await readWall(client, image, 'm')).toEqual({ status: 504, body: { error: 'timeout' } });
  });

  it('braucht einen Schlüssel und ein Bild', async () => {
    expect((await handleWallRead({ image }, {})).status).toBe(503);
    expect((await handleWallRead({ image: 'zu kurz' }, { ANTHROPIC_API_KEY: 'x' })).status).toBe(400);
  });
});
