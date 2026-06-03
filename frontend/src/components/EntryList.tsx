import { useEffect, useState } from 'react';
import { useWorkflow } from '../context/WorkflowContext';
import { api } from '../api/client';
import type { Scene, QuotePost } from '../api/types';

export function EntryList() {
  const { state, dispatch } = useWorkflow();
  const project = state.project!;

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [quotes, setQuotes] = useState<QuotePost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      if (project.format === 'image') {
        const s = await api.images.listScenes(project.id);
        setScenes(s);
      } else {
        const q = await api.quotes.list(project.id);
        setQuotes(q);
      }
      setLoading(false);
    }
    load();
  }, [project.id, project.format]);

  function proceed() {
    if (project.format === 'image') {
      dispatch({ type: 'SET_SCENES', scenes });
      dispatch({ type: 'SET_STEP', step: 'FORM' });
    } else {
      dispatch({ type: 'SET_QUOTE_POSTS', posts: quotes });
      dispatch({ type: 'SET_STEP', step: 'SUMMARY_REVIEW' });
    }
  }

  const entries = project.format === 'image' ? scenes : quotes;
  const isEmpty = entries.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">Review Entries</h2>
        <p className="mt-1 text-sm text-gray-400">
          {loading
            ? 'Loading…'
            : `${entries.length} entries parsed${state.skippedCount > 0 ? ` · ${state.skippedCount} skipped` : ''}`}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
          {project.format === 'image'
            ? scenes.map((s, i) => (
                <div key={s.id} className="rounded-lg border border-gray-700 p-3">
                  <p className="text-xs text-gray-500">Entry {i + 1}</p>
                  <p className="text-white">{s.form_input.subject}</p>
                </div>
              ))
            : quotes.map((q, i) => (
                <div key={q.id} className="rounded-lg border border-gray-700 p-3">
                  <p className="text-xs text-gray-500">Entry {i + 1}</p>
                  <p className="font-medium text-white">{q.term}</p>
                  {q.raw_body && (
                    <p className="mt-0.5 text-xs text-gray-400 line-clamp-2">{q.raw_body}</p>
                  )}
                </div>
              ))}
        </div>
      )}

      <button
        onClick={proceed}
        disabled={loading || isEmpty}
        className="rounded-lg bg-purple-600 px-4 py-2.5 font-medium text-white transition hover:bg-purple-500 disabled:opacity-50"
      >
        Continue →
      </button>
    </div>
  );
}
