import { useEffect } from 'react';
import { useWorkflow } from '../context/WorkflowContext';
import { api } from '../api/client';

export function CollectionView() {
  const { state, dispatch } = useWorkflow();

  // Re-fetch on mount so accepted counts and thumbnails reflect the latest backend state
  useEffect(() => {
    if (!state.project) return;
    api.quotes.list(state.project.id).then(fresh => {
      dispatch({ type: 'SET_QUOTE_POSTS', posts: fresh });
    }).catch(() => {});
  }, [state.project?.id, dispatch]);

  async function downloadAll() {
    if (!state.project) return;
    const res = await api.projects.export(state.project.id);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.project.name}-cards.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const accepted = state.quotePosts.filter(q => q.image_filename);
  const unfinished = state.quotePosts.filter(q => !q.image_filename);

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white tracking-tight">Collection</h2>
        <button
          onClick={downloadAll}
          className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-purple-500 disabled:opacity-50 cursor-pointer shadow-md hover:shadow-purple-500/10 active:scale-[0.98]"
        >
          Download all
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {accepted.map(q => (
          <div key={q.id} className="flex flex-col gap-1.5">
            <img
              src={`/api/projects/${q.project_id}/quotes/${q.id}/image`}
              alt={q.term}
              className="w-full rounded-xl border border-gray-800 object-cover shadow-sm"
            />
            <p className="text-xs text-gray-400 font-medium truncate px-1">{q.term}</p>
          </div>
        ))}
      </div>

      {accepted.length === 0 && (
        <p className="text-gray-500 italic py-8 text-center border border-dashed border-gray-800 rounded-xl bg-gray-950/20">No accepted cards yet.</p>
      )}

      {unfinished.length > 0 && (
        <button
          onClick={() => dispatch({ type: 'SET_STEP', step: 'SUMMARY_REVIEW' })}
          className="w-full rounded-xl border border-gray-800 bg-gray-900/30 px-5 py-3 text-sm font-semibold text-gray-300 transition-all duration-200 hover:bg-gray-800 hover:border-gray-700 cursor-pointer active:scale-[0.98] text-center"
        >
          ← Continue working · {unfinished.length} card{unfinished.length !== 1 ? 's' : ''} remaining
        </button>
      )}
    </div>
  );
}
