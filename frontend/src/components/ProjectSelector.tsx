import { useEffect, useState } from 'react';
import { useWorkflow } from '../context/WorkflowContext';
import { api } from '../api/client';
import type { Project } from '../api/types';

export function ProjectSelector() {
  const { dispatch } = useWorkflow();
  const [projects, setProjects] = useState<Project[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    api.projects.list().then(setProjects);
  }, []);

  async function open(p: Project) {
    dispatch({ type: 'SET_PROJECT', project: p });
    dispatch({ type: 'SET_FORMAT', format: p.format });
    dispatch({ type: 'SET_ASPECT', aspect: p.aspect });
    if (p.format === 'image') {
      const scenes = await api.images.listScenes(p.id);
      dispatch({ type: 'SET_SCENES', scenes });
      dispatch({ type: 'SET_STEP', step: 'STORYBOARD' });
    } else {
      const posts = await api.quotes.list(p.id);
      dispatch({ type: 'SET_QUOTE_POSTS', posts });
      dispatch({ type: 'SET_STEP', step: 'COLLECTION' });
    }
  }

  async function deleteProject(id: string) {
    await api.projects.delete(id);
    setProjects(prev => prev.filter(p => p.id !== id));
    setConfirmDelete(null);
  }

  if (projects.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 border-t border-gray-800 pt-6 mt-2">
      <p className="text-sm font-medium text-gray-400">Past projects</p>
      {projects.map(p => (
        <div key={p.id} className="flex items-center gap-2">
          <button
            onClick={() => open(p)}
            className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-left transition hover:border-purple-500 hover:bg-gray-800"
          >
            <span className="font-medium text-white">{p.name}</span>
            <span className="ml-2 text-xs text-gray-500">
              {p.format} · {p.aspect} · {new Date(p.created_at).toLocaleDateString()}
            </span>
          </button>
          {confirmDelete === p.id ? (
            <div className="flex gap-1">
              <button
                onClick={() => deleteProject(p.id)}
                className="rounded-lg bg-red-700 px-3 py-2 text-xs font-medium text-white hover:bg-red-600"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(p.id)}
              className="rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-600 hover:border-red-700 hover:text-red-400"
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
