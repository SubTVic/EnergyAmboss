import { useCallback, useEffect, useRef, useState } from 'react';
import { readJson, writeJson } from '../shared/storage';
import { demo, laws, steps } from './data';
import { findTarget, firstNotes } from './logic';
import { WallReadingSchema, type WallReading } from './schema';
import './wall.css';

const PROJECT = 'Windpark Feldmark (fiktiv)';
const CAMERA_KEY = 'wand-kamera';
const MAX_WIDTH = 1600;
const NUMBERS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨'];

type Status = { kind: 'idle' | 'busy' | 'ok' | 'error'; text: string };

const numberOf = (reading: WallReading, id: string) => NUMBERS[reading.notes.findIndex((n) => n.id === id)] ?? '?';

/** Standbild aus dem Video als JPEG (Base64 ohne Präfix), höchstens 1600 px breit. */
function grabFrame(video: HTMLVideoElement): string | null {
  if (!video.videoWidth) return null;
  const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
}

export function Wall() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastFrame = useRef<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [cameraId, setCameraId] = useState<string>(() => readJson(CAMERA_KEY, ''));
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [reading, setReading] = useState<WallReading | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle', text: 'Bereit. Leertaste: Wand lesen · 1–3: Demo' });

  // Kamera starten; bei Wechsel der Kamera neu
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: cameraId ? { deviceId: { exact: cameraId } } : { width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (cancelled) return;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraError(null);
        const devices = await navigator.mediaDevices.enumerateDevices();
        setCameras(devices.filter((d) => d.kind === 'videoinput'));
      } catch {
        setCameraError('Keine Kamera. Der Demo-Modus (Tasten 1–3) geht trotzdem.');
      }
    })();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraId]);

  const capture = useCallback(async () => {
    const video = videoRef.current;
    const frame = video ? grabFrame(video) : null;
    if (!frame) {
      setStatus({ kind: 'error', text: 'Kein Kamerabild. Demo mit den Tasten 1–3.' });
      return;
    }
    lastFrame.current = frame;
    setStatus({ kind: 'busy', text: 'Lese die Wand …' });
    try {
      const res = await fetch('/api/wall-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: frame }),
      });
      const parsed = WallReadingSchema.safeParse(await res.json());
      if (!res.ok || !parsed.success || parsed.data.notes.length === 0) throw new Error();
      setReading(parsed.data);
      setIsDemo(false);
      setStatus({ kind: 'ok', text: `Erkannt: ${parsed.data.notes.length} Post-its` });
    } catch {
      setStatus({ kind: 'error', text: 'Nicht erkannt, bitte erneut erfassen.' });
    }
  }, []);

  const showDemo = useCallback((count: number) => {
    setReading(firstNotes(demo, count));
    setIsDemo(true);
    setStatus({ kind: 'ok', text: `Demo: ${count} ${count === 1 ? 'Post-it' : 'Post-its'}` });
  }, []);

  // Tastatur und Presenter-Klicker
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLSelectElement) return;
      if (e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        void capture();
      } else if (['1', '2', '3'].includes(e.key)) {
        showDemo(Number(e.key));
      } else if (e.key === '0') {
        setReading(null);
        setIsDemo(false);
        setStatus({ kind: 'idle', text: 'Bereit. Leertaste: Wand lesen · 1–3: Demo' });
      } else if (e.key === 's' && lastFrame.current) {
        const a = document.createElement('a');
        a.href = `data:image/jpeg;base64,${lastFrame.current}`;
        a.download = 'wand.jpg';
        a.click();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [capture, showDemo]);

  return (
    <div className="wall">
      <header className="wall-bar">
        <strong>{PROJECT}</strong>
        <span className={`wall-status ${status.kind}`}>{status.text}</span>
        {isDemo && <span className="wall-tag">Demo</span>}
        <span className="wall-spacer" />
        {cameras.length > 1 && (
          <select
            value={cameraId}
            onChange={(e) => {
              setCameraId(e.target.value);
              writeJson(CAMERA_KEY, e.target.value);
            }}
          >
            <option value="">Standardkamera</option>
            {cameras.map((c, i) => (
              <option key={c.deviceId} value={c.deviceId}>
                {c.label || `Kamera ${i + 1}`}
              </option>
            ))}
          </select>
        )}
        <button className="wall-button" onClick={() => void capture()} disabled={status.kind === 'busy'}>
          Wand lesen
        </button>
      </header>

      <main className="wall-main">
        <section className="wall-camera">
          <div className="wall-video">
            <video ref={videoRef} autoPlay playsInline muted />
            {!isDemo &&
              reading?.notes.map(
                (n, i) =>
                  n.box && (
                    <div
                      key={n.id}
                      className="wall-box"
                      style={{ left: `${n.box.x * 100}%`, top: `${n.box.y * 100}%`, width: `${n.box.w * 100}%`, height: `${n.box.h * 100}%` }}
                    >
                      <span>{NUMBERS[i]}</span>
                    </div>
                  ),
              )}
          </div>
          {cameraError && <p className="wall-hint">{cameraError}</p>}
          {reading && reading.noteLinks.length > 0 && (
            <div className="wall-links">
              <h3>Zusammenhänge</h3>
              {reading.noteLinks.map((l) => (
                <div key={`${l.a}-${l.b}`} className="wall-link">
                  {numberOf(reading, l.a)} ↔ {numberOf(reading, l.b)} {l.why}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="wall-notes">
          {!reading && <p className="wall-empty">Post-its an die Wand kleben, dann Leertaste.</p>}
          {reading?.notes.map((note, i) => {
            const refs = reading.references.filter((r) => r.noteId === note.id);
            return (
              <article key={note.id} className="wall-card">
                <h2>
                  <span className="wall-num">{NUMBERS[i]}</span> {note.text}
                </h2>
                {refs.map((r) => {
                  const t = findTarget(r.targetId, laws, steps);
                  if (!t) return null;
                  return (
                    <div key={r.targetId} className={`wall-ref ${t.kind}`}>
                      <div className="wall-ref-head">
                        {t.kind === 'law' ? (
                          <>
                            <span className="wall-kind">Gesetz</span> {t.law.title}
                            {t.law.verify && <span className="wall-unverified">ungeprüft</span>}
                          </>
                        ) : (
                          <>
                            <span className="wall-kind">Früherer Schritt</span> {t.step.date} · {t.step.who}: {t.step.text}
                          </>
                        )}
                      </div>
                      <div className="wall-why">{r.why}</div>
                    </div>
                  );
                })}
              </article>
            );
          })}
        </section>
      </main>
      <footer className="wall-foot">Projektdaten fiktiv · Gesetze vor Nutzung prüfen · Leertaste: lesen · 1–3: Demo · 0: leeren</footer>
    </div>
  );
}
