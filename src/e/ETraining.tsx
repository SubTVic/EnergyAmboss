import { Markdown } from '../shared/Markdown';
import training from './training.md?raw';

export function ETraining() {
  return (
    <section className="box" style={{ maxWidth: 760 }}>
      <Markdown source={training} />
    </section>
  );
}
