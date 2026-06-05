import { useEffect, useState } from 'react';
import { useWorkflow } from '../context/WorkflowContext';
import { api } from '../api/client';

export function SummaryReview() {
  const { state, dispatch } = useWorkflow();
  const [markedForSummarize, setMarkedForSummarize] = useState<Set<string>>(new Set());
  const [markedForBackground, setMarkedForBackground] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [continueLoading, setContinueLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quotes = state.quotePosts;

  // Re-fetch on mount so summary/image_filename reflect work done in prior visits
  useEffect(() => {
    if (!state.project) return;
    api.quotes.list(state.project.id).then(fresh => {
      dispatch({ type: 'SET_QUOTE_POSTS', posts: fresh });
    }).catch(() => { /* non-fatal */ });
  }, [state.project?.id, dispatch]);

  function markSummarize(id: string) {
    setMarkedForSummarize(prev => new Set([...prev, id]));
    setMarkedForBackground(prev => { const s = new Set(prev); s.delete(id); return s; });
  }

  function markBackground(id: string) {
    setMarkedForBackground(prev => new Set([...prev, id]));
    setMarkedForSummarize(prev => { const s = new Set(prev); s.delete(id); return s; });
  }

  async function deleteEntry(quoteId: string) {
    if (!state.project || deletingId !== null) return;
    setDeletingId(quoteId);
    setError(null);
    try {
      await api.quotes.delete(state.project.id, quoteId);
      dispatch({ type: 'SET_QUOTE_POSTS', posts: quotes.filter(q => q.id !== quoteId) });
      setMarkedForSummarize(prev => { const s = new Set(prev); s.delete(quoteId); return s; });
      setMarkedForBackground(prev => { const s = new Set(prev); s.delete(quoteId); return s; });
    } catch (e) {
      setError(String(e));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleContinue() {
    if (!state.project || continueLoading) return;
    setContinueLoading(true);
    setError(null);
    const firstPending = quotes.find(q => !q.image_filename);
    if (!firstPending) { setContinueLoading(false); return; }
    try {
      if (markedForBackground.has(firstPending.id)) {
        dispatch({ type: 'SET_SUMMARY', summary: firstPending.raw_body });
      } else if (firstPending.summary) {
        dispatch({ type: 'SET_SUMMARY', summary: firstPending.summary });
      } else {
        const res = await api.quotes.summarize(state.project.id, firstPending.id, '');
        dispatch({ type: 'SET_SUMMARY', summary: res.summary });
      }
      dispatch({ type: 'SET_QUOTE', quoteId: firstPending.id });
      dispatch({ type: 'SET_STEP', step: 'BACKGROUND_CHOICE' });
    } catch (e) {
      setError(String(e));
    } finally {
      setContinueLoading(false);
    }
  }

  // An entry counts as marked if the user assigned it a path this session,
  // or if it was already summarized in a previous session.
  function isMarked(q: (typeof quotes)[0]) {
    return markedForSummarize.has(q.id) || markedForBackground.has(q.id) || !!q.summary;
  }

  const pendingQuotes = quotes.filter(q => !q.image_filename);
  const allMarked = pendingQuotes.length > 0 && pendingQuotes.every(isMarked);

  if (quotes.length === 0) {
    return <p className="text-gray-400">No entries found.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">Review Entries</h2>
          <p className="mt-1 text-sm text-gray-400">
            Choose a path for each entry, then continue.
          </p>
        </div>
        {allMarked && (
          <button
            onClick={handleContinue}
            disabled={continueLoading}
            className="shrink-0 rounded-lg bg-purple-600 px-5 py-2 font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
          >
            {continueLoading ? 'Processing…' : 'Continue →'}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
        {quotes.map(q => {
          const isAccepted = !!q.image_filename;
          const isMarkedBg = markedForBackground.has(q.id);
          // Entries already summarized from a prior session auto-count as summarize-marked
          // unless the user has explicitly switched them to background this session.
          const isMarkedSum = markedForSummarize.has(q.id) || (!!q.summary && !isMarkedBg);
          const isDeleting = deletingId === q.id;
          const busy = isDeleting || continueLoading;

          return (
            <div
              key={q.id}
              className={`rounded-xl border p-4 transition-colors ${
                isAccepted
                  ? 'border-green-700 bg-green-900/20'
                  : isMarkedBg
                  ? 'border-violet-700 bg-violet-900/10'
                  : isMarkedSum
                  ? 'border-blue-700 bg-blue-900/10'
                  : 'border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-white">{q.term}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isAccepted && (
                    <span className="rounded-full bg-green-800 px-2 py-0.5 text-xs font-medium text-green-300">
                      Card created
                    </span>
                  )}
                  {!isAccepted && isMarkedBg && (
                    <span className="rounded-full bg-violet-800 px-2 py-0.5 text-xs font-medium text-violet-300">
                      Choose Background
                    </span>
                  )}
                  {!isAccepted && isMarkedSum && !isMarkedBg && (
                    <span className="rounded-full bg-blue-800 px-2 py-0.5 text-xs font-medium text-blue-300">
                      Summarize
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-400 line-clamp-3">{q.raw_body}</p>
              {!isAccepted && (
                <div className="mt-3 flex gap-2 flex-wrap items-center">
                  <button
                    onClick={() => markSummarize(q.id)}
                    disabled={busy}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
                      isMarkedSum && !isMarkedBg
                        ? 'bg-blue-600 text-white hover:bg-blue-500'
                        : 'border border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white'
                    }`}
                  >
                    Summarize
                  </button>
                  <button
                    onClick={() => markBackground(q.id)}
                    disabled={busy}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
                      isMarkedBg
                        ? 'bg-violet-600 text-white hover:bg-violet-500'
                        : 'border border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white'
                    }`}
                  >
                    Choose Background
                  </button>
                  <button
                    onClick={() => deleteEntry(q.id)}
                    disabled={busy}
                    className="ml-auto rounded-lg border border-red-900/60 px-3 py-1.5 text-sm font-medium text-red-500 hover:border-red-700 hover:text-red-400 disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              )}
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
