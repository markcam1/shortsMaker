import { useEffect, useState } from 'react';
import { useWorkflow } from '../context/WorkflowContext';
import { api } from '../api/client';
import type { QuotePost } from '../api/types';

export function SummaryReview() {
  const { state, dispatch } = useWorkflow();
  const [requireAllMarked, setRequireAllMarked] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [continueLoading, setContinueLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quotes = state.quotePosts;

  // Re-fetch on mount so summary/image_filename/pending_action reflect prior sessions
  useEffect(() => {
    if (!state.project) return;
    api.quotes.list(state.project.id).then(fresh => {
      dispatch({ type: 'SET_QUOTE_POSTS', posts: fresh });
    }).catch(() => { /* non-fatal */ });
  }, [state.project?.id, dispatch]);

  // Fetch workflow config once
  useEffect(() => {
    api.config.workflow().then(cfg => setRequireAllMarked(cfg.require_all_marked)).catch(() => {});
  }, []);

  function setAction(q: QuotePost, action: 'summarize' | 'background') {
    const updated = { ...q, pending_action: action };
    dispatch({
      type: 'SET_QUOTE_POSTS',
      posts: quotes.map(x => x.id === q.id ? updated : x),
    });
    // Fire-and-forget persist to backend
    if (state.project) {
      api.quotes.updateQuote(state.project.id, q.id, {
        term: q.term,
        raw_body: q.raw_body,
        pending_action: action,
      }).catch(() => {});
    }
  }

  async function deleteEntry(quoteId: string) {
    if (!state.project || deletingId !== null) return;
    setDeletingId(quoteId);
    setError(null);
    try {
      await api.quotes.delete(state.project.id, quoteId);
      dispatch({ type: 'SET_QUOTE_POSTS', posts: quotes.filter(q => q.id !== quoteId) });
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
      const useBackground = firstPending.pending_action === 'background';
      if (useBackground) {
        dispatch({ type: 'SET_SUMMARY', summary: firstPending.raw_body });
      } else if (firstPending.summary) {
        dispatch({ type: 'SET_SUMMARY', summary: firstPending.summary });
      } else {
        const res = await api.quotes.summarize(state.project.id, firstPending.id, '');
        // Persist the summary back to state.quotePosts so re-visits show correct status
        dispatch({ type: 'SET_QUOTE_POSTS', posts: quotes.map(q => q.id === firstPending.id ? { ...q, summary: res.summary } : q) });
        dispatch({ type: 'SET_SUMMARY', summary: res.summary });
      }
      dispatch({ type: 'SET_BATCH_MODE', batch: false });
      dispatch({ type: 'SET_QUOTE', quoteId: firstPending.id });
      dispatch({ type: 'SET_STEP', step: 'BACKGROUND_CHOICE' });
    } catch (e) {
      setError(String(e));
    } finally {
      setContinueLoading(false);
    }
  }

  function handleContinueAll() {
    const firstPending = quotes.find(q => !q.image_filename);
    if (!firstPending || !state.project) return;
    dispatch({ type: 'SET_BATCH_MODE', batch: true });
    dispatch({ type: 'SET_QUOTE', quoteId: firstPending.id });
    dispatch({ type: 'SET_STEP', step: 'BACKGROUND_CHOICE' });
  }

  const pendingQuotes = quotes.filter(q => !q.image_filename);
  const allMarked = !requireAllMarked ||
    pendingQuotes.every(q => q.pending_action != null || !!q.summary);

  if (quotes.length === 0) {
    return <p className="text-gray-400">No entries found.</p>;
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Review Entries</h2>
          <p className="mt-1.5 text-sm text-gray-400 leading-relaxed">
            Choose a path for each entry, then continue.
          </p>
        </div>
        {pendingQuotes.length > 0 && (
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex gap-2">
              <button
                onClick={handleContinue}
                disabled={continueLoading || !allMarked}
                className="rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-purple-500 disabled:opacity-50 cursor-pointer shadow-md hover:shadow-purple-500/10 active:scale-[0.98]"
              >
                {continueLoading ? 'Processing…' : 'Next Card →'}
              </button>
              <button
                onClick={handleContinueAll}
                disabled={continueLoading || !allMarked}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-500 disabled:opacity-50 cursor-pointer shadow-md active:scale-[0.98]"
              >
                Continue All →
              </button>
            </div>
            {requireAllMarked && !allMarked && (
              <p className="text-xs text-gray-500 text-right">Choose an action for each entry</p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
        {quotes.map(q => {
          const isAccepted = !!q.image_filename;
          const isMarkedBg = q.pending_action === 'background';
          // Quotes already summarized in a prior session auto-count as summarize-marked
          const isMarkedSum = q.pending_action === 'summarize' || (!!q.summary && !isMarkedBg);
          const isDeleting = deletingId === q.id;
          const busy = isDeleting || continueLoading;

          return (
            <div
              key={q.id}
              className={`rounded-xl border p-5 transition-all duration-200 ${
                isAccepted
                  ? 'border-green-700 bg-green-950/20'
                  : isMarkedBg
                  ? 'border-purple-700 bg-purple-950/10'
                  : isMarkedSum
                  ? 'border-blue-700 bg-blue-950/10'
                  : 'border-gray-800 bg-gray-900/10'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-white">{q.term}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isAccepted && (
                    <span className="rounded bg-green-900/40 px-2 py-0.5 text-xs font-semibold text-green-300 border border-green-800/50">
                      Card created
                    </span>
                  )}
                  {!isAccepted && isMarkedBg && (
                    <span className="rounded bg-purple-900/40 px-2 py-0.5 text-xs font-semibold text-purple-300 border border-purple-800/50 animate-fade-in">
                      Choose Background
                    </span>
                  )}
                  {!isAccepted && isMarkedSum && !isMarkedBg && (
                    <span className="rounded bg-blue-900/40 px-2 py-0.5 text-xs font-semibold text-blue-300 border border-blue-800/50 animate-fade-in">
                      Summarize
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-400 line-clamp-3">{q.raw_body}</p>
              {!isAccepted && (
                <div className="mt-4 flex gap-3 flex-wrap items-center">
                  <button
                    onClick={() => setAction(q, 'summarize')}
                    disabled={busy}
                    className={`rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-all duration-200 disabled:opacity-50 cursor-pointer ${
                      isMarkedSum && !isMarkedBg
                        ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-950/25 active:scale-95'
                        : 'border border-gray-800 bg-gray-900/30 text-gray-300 hover:border-gray-700 hover:bg-gray-800 active:scale-95'
                    }`}
                  >
                    Summarize
                  </button>
                  <button
                    onClick={() => setAction(q, 'background')}
                    disabled={busy}
                    className={`rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-all duration-200 disabled:opacity-50 cursor-pointer ${
                      isMarkedBg
                        ? 'bg-purple-600 text-white hover:bg-purple-500 shadow-md shadow-purple-950/25 active:scale-95'
                        : 'border border-gray-800 bg-gray-900/30 text-gray-300 hover:border-gray-700 hover:bg-gray-800 active:scale-95'
                    }`}
                  >
                    Choose Background
                  </button>
                  <button
                    onClick={() => deleteEntry(q.id)}
                    disabled={busy}
                    className="ml-auto rounded-xl border border-red-950/40 bg-red-950/10 px-3.5 py-1.5 text-sm font-semibold text-red-400 hover:bg-red-900/35 hover:text-red-300 transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-50"
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
        <p className="rounded-lg bg-red-900/40 px-4 py-3 text-sm text-red-400 mt-2">{error}</p>
      )}
    </div>
  );
}
