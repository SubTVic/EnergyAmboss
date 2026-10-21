import { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { PageHeader, ResetDemoButton } from '../shared/ui';
import { BList } from './BList';
import { BProject } from './BProject';
import { loadProjects, resetB, saveProjects } from './projects';
import type { Project } from './types';

export default function BRoutes() {
  const [projects, setProjectsRaw] = useState<Project[]>(loadProjects);

  const setProjects = (next: Project[]) => {
    saveProjects(next);
    setProjectsRaw(next);
  };
  const updateProject = (p: Project) =>
    setProjectsRaw((prev) => {
      const next = prev.map((x) => (x.id === p.id ? p : x));
      saveProjects(next);
      return next;
    });

  return (
    <div className="stack">
      <PageHeader
        title="B · Projekt als Beweis"
        lead="Das Projekt ist ein Beweisbaum: Jede Annahme ist belegt, offen (sorry), in Arbeit oder widerlegt. Eine Lücke weit unten färbt alles darüber um."
        actions={
          <ResetDemoButton
            onReset={() => {
              resetB();
              setProjectsRaw(loadProjects());
            }}
          />
        }
      />
      <Routes>
        <Route index element={<BList projects={projects} onChange={setProjects} />} />
        <Route path=":projectId" element={<BProject projects={projects} onUpdate={updateProject} />} />
      </Routes>
    </div>
  );
}
