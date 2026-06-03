import { useState } from 'react';
import { useWorkflow } from '../context/WorkflowContext';
import { api } from '../api/client';

export function CardGallery() {
  const { state, dispatch } = useWorkflow();
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept(index: number) {
    if (!state.project || !state.quoteId) return;
    setAccepting(true);
    setError(null);
    try {
      const quote = await api.quotes.accept(state.project.id, state.quoteId, {
        candidate_index: index,
        summary: state.summary,
        template_id: '',
        color_scheme_id: '',
        font_pairing_id: '',
      });
      dispatch({ type: 'QUOTE_ACCEPTED', quote });
    } catch (e) {
      setError(String(e));
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">Pick a Card</h2>
        <p className="mt-1 text-sm text-gray-400">
          {state.quoteCandidateUrls.length} candidates generated.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {state.quoteCandidateUrls.map((url, i) => (
          <div key={i} className="flex flex-col gap-2">
            <img
              src={url}
              alt={`Candidate ${i + 1}`}
              className="w-full rounded-xl border border-gray-700 object-cover"
            />
            <button
              onClick={() => accept(i)}
              disabled={accepting}
              className="rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
            >
              Use this →
            </button>
          </div>
        ))}
      </div>

      {error && (
        <p className="rounded-lg bg-red-900/40 px-4 py-3 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
