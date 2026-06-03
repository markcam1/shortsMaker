import { useEffect, useState } from 'react';
import { useWorkflow } from '../context/WorkflowContext';
import { api } from '../api/client';

export function SummaryReview() {
  const { state, dispatch } = useWorkflow();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const quotes = state.quotePosts;

  // Re-fetch on mount so summary/image_filename reflect work done in prior visits
  useEffect(() => {
    if (!state.project) return;
    api.quotes.list(state.project.id).then(fresh => {
      dispatch({ type: 'SET_QUOTE_POSTS', posts: fresh });
    }).catch(() => { /* non-fatal — stale data still renders */ });
  }, [state.project?.id, dispatch]);

  async function summarize(quoteId: string) {
    if (!state.project || loadingId !== null) return;
    setLoadingId(quoteId);
    setError(null);
    try {
      const res = await api.quotes.summarize(state.project.id, quoteId, '');
      dispatch({ type: 'SET_SUMMARY', summary: res.summary });
      dispatch({ type: 'SET_QUOTE', quoteId });
      dispatch({ type: 'SET_STEP', step: 'BACKGROUND_CHOICE' });
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingId(null);
    }
  }

  if (quotes.length === 0) {
    return <p className="text-gray-400">No entries found.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">Review Entries</h2>
        <p className="mt-1 text-sm text-gray-400">Select an entry to summarize and turn into a card.</p>
      </div>

      <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
        {quotes.map(q => {
          const isAccepted = !!q.image_filename;
          const isSummarized = !!q.summary;
          const isLoading = loadingId === q.id;

          return (
            <div
              key={q.id}
              className={`rounded-xl border p-4 transition-colors ${
                isAccepted
                  ? 'border-green-700 bg-green-900/20'
                  : isSummarized
                  ? 'border-blue-700 bg-blue-900/10'
                  : 'border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-white">{q.term}</p>
                {isAccepted && (
                  <span className="shrink-0 rounded-full bg-green-800 px-2 py-0.5 text-xs font-medium text-green-300">
                    Card created
                  </span>
                )}
                {!isAccepted && isSummarized && (
                  <span className="shrink-0 rounded-full bg-blue-800 px-2 py-0.5 text-xs font-medium text-blue-300">
                    Summarized
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-400 line-clamp-3">{q.raw_body}</p>
              <button
                onClick={() => summarize(q.id)}
                disabled={isLoading}
                className="mt-3 rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
              >
                {isLoading ? 'Summarizing…' : isAccepted ? 'Re-summarize →' : 'Summarize →'}
              </button>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="rounded-lg bg-red-900/40 px-4 py-3 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
