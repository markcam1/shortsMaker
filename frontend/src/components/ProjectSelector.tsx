import { useEffect, useState } from 'react';
import { useWorkflow } from '../context/WorkflowContext';
import { api } from '../api/client';
import type { Project } from '../api/types';

export function ProjectSelector() {
  const { dispatch } = useWorkflow();
  const [projects, setProjects] = useState<Project[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    api.projects.list().then(setProjects);
  }, []);

  async function create() {
    if (!newName.trim()) return;
    setLoading(true);
    const p = await api.projects.create(newName.trim());
    setNewName('');
    setProjects(prev => [...prev, p]);
    dispatch({ type: 'SET_PROJECT', project: p });
    dispatch({ type: 'RESET_TO_FORM', keepForm: false });
    setLoading(false);
  }

  function open(p: Project) {
    dispatch({ type: 'SET_PROJECT', project: p });
    dispatch({ type: 'SET_STEP', step: 'STORYBOARD' });
    api.images.listScenes(p.id).then(scenes => dispatch({ type: 'SET_SCENES', scenes }));
  }

  async function deleteProject(id: string) {
    await api.projects.delete(id);
    setProjects(prev => prev.filter(p => p.id !== id));
    setConfirmDelete(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold text-white">Storyboard Maker</h1>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-400">Create a new storyboard</label>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none"
            placeholder="Project name…"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && create()}
          />
          <button
            onClick={create}
            disabled={loading || !newName.trim()}
            className="rounded-lg bg-purple-600 px-4 py-2 font-medium text-white transition hover:bg-purple-500 disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>

      {projects.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-400">Open existing storyboard</label>
          {projects.map(p => (
            <div key={p.id} className="flex items-center gap-2">
              <button
                onClick={() => open(p)}
                className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-left text-white transition hover:border-purple-500 hover:bg-gray-800"
              >
                <span className="font-medium">{p.name}</span>
                <span className="ml-2 text-xs text-gray-500">
                  {new Date(p.created_at).toLocaleDateString()}
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
      )}
    </div>
  );
}
