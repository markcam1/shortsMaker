import { useWorkflow } from '../context/WorkflowContext';
import { api } from '../api/client';

export function CollectionView() {
  const { state, dispatch } = useWorkflow();

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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">Collection</h2>
        <button
          onClick={downloadAll}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500"
        >
          Download all
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {accepted.map(q => (
          <div key={q.id} className="flex flex-col gap-1">
            <img
              src={`/api/projects/${q.project_id}/quotes/${q.id}/image`}
              alt={q.term}
              className="w-full rounded-xl border border-gray-700 object-cover"
            />
            <p className="text-xs text-gray-400 truncate">{q.term}</p>
          </div>
        ))}
      </div>

      {accepted.length === 0 && (
        <p className="text-gray-500">No accepted cards yet.</p>
      )}

      {unfinished.length > 0 && (
        <button
          onClick={() => dispatch({ type: 'SET_STEP', step: 'SUMMARY_REVIEW' })}
          className="rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 transition"
        >
          ← Continue working · {unfinished.length} card{unfinished.length !== 1 ? 's' : ''} remaining
        </button>
      )}
    </div>
  );
}
