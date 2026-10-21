import { useEffect } from 'react';

type Proto = 'a' | 'b' | 'c' | 'd' | 'e';

// Prototypen können Zusatzdaten (z. B. AAR-Antworten aus D, Punktestand aus A)
// registrieren, die mit dem Feedback im Feld `payload` gespeichert werden.
const payloads: Partial<Record<Proto, unknown>> = {};

export function setFeedbackPayload(proto: Proto, data: unknown): void {
  payloads[proto] = data;
}

export function getFeedbackPayload(proto: Proto): unknown {
  return payloads[proto];
}

export function useFeedbackPayload(proto: Proto, data: unknown): void {
  useEffect(() => {
    setFeedbackPayload(proto, data);
  }, [proto, data]);
}

const OPEN_EVENT = 'open-feedback';

export function openFeedback(): void {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

export function onOpenFeedback(handler: () => void): () => void {
  window.addEventListener(OPEN_EVENT, handler);
  return () => window.removeEventListener(OPEN_EVENT, handler);
}
