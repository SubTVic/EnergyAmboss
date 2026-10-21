import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { uuid } from '../shared/tester';
import { validateProject } from './schema';
import { newProjectFromTemplate } from './template';
import type { Project } from './types';

export function BList({ projects, onChange }: { projects: Project[]; onChange: (p: Project[]) => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const freshId = (base: string) => `${base.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'projekt'}-${uuid().slice(0, 4)}`;

  function create() {
    const title = name.trim() || 'Neues Projekt';
    const p = newProjectFromTemplate(title, freshId(title));
    onChange([...projects, p]);
    navigate(`/b/${p.id}`);
  }

  async function importFile(file: File) {
    setErrors([]);
    try {
      const raw = JSON.parse(await file.text());
      const { project, errors: errs } = validateProject(raw);
      if (!project) {
        setErrors(errs);
        return;
      }
      const clash = projects.some((p) => p.id === project.id);
      const imported = clash ? { ...project, id: freshId(project.id) } : project;
      onChange([...projects, imported]);
      navigate(`/b/${imported.id}`);
    } catch (e) {
      setErrors([`Datei konnte nicht gelesen werden: ${e instanceof Error ? e.message : String(e)}`]);
    }
  }

  return (
    <div className="stack">
      <section className="stack">
        <h3 style={{ margin: 0 }}>Projekte</h3>
        <table className="simple">
          <thead>
            <tr>
              <th>Projekt</th>
              <th>Knoten</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link to={`/b/${p.id}`}>{p.name}</Link>
                </td>
                <td>{p.nodes.filter((n) => !n.hidden).length}</td>
                <td className="right">
                  <button
                    className="btn-small btn-danger"
                    onClick={() => {
                      if (window.confirm(`Projekt „${p.name}“ löschen?`)) onChange(projects.filter((x) => x.id !== p.id));
                    }}
                  >
                    Löschen
                  </button>
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan={3} className="muted">
                  Keine Projekte. Lege eins aus der Vorlage an oder importiere eine JSON-Datei.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="box stack" style={{ maxWidth: 560 }}>
        <h4 style={{ margin: 0 }}>Neues Projekt aus Vorlage</h4>
        <p className="small muted" style={{ margin: 0 }}>
          Ziel plus die Teilziele Fläche, Netzanschluss, Genehmigung, Transport, EEG-Zuschlag und Wirtschaftlichkeit, jeweils mit leeren Annahmen.
        </p>
        <label>
          Projektname
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Windpark Y" />
        </label>
        <div>
          <button onClick={create}>Projekt anlegen</button>
        </div>
      </section>

      <section className="box stack" style={{ maxWidth: 560 }}>
        <h4 style={{ margin: 0 }}>JSON-Import</h4>
        <p className="small muted" style={{ margin: 0 }}>
          Ein zuvor exportiertes Projekt (JSON) wieder einlesen. Du kannst auch ein echtes, anonymisiertes Projekt von Hand als JSON anlegen.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importFile(f);
            if (fileRef.current) fileRef.current.value = '';
          }}
        />
        {errors.length > 0 && (
          <ul style={{ margin: 0, color: 'var(--broken)' }}>
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
