import { useState } from 'react';
import { useWorkflow } from '../context/WorkflowContext';
import { api } from '../api/client';

export function CardGallery() {
  const { state, dispatch } = useWorkflow();
  const [selected, setSelected] = useState<number | null>(null);
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
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Pick a Card</h2>
          <p className="mt-1 text-sm text-gray-400">
            {state.quoteCandidateUrls.length} candidates generated. Click an image to select it, then add to collection.
          </p>
        </div>
        <button
          onClick={() => selected !== null && accept(selected)}
          disabled={selected === null || accepting}
          className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-purple-500 disabled:opacity-50 cursor-pointer shadow-md hover:shadow-purple-500/10 active:scale-[0.98] shrink-0"
        >
          {accepting ? 'Adding…' : 'Add to Collection ✓'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {state.quoteCandidateUrls.map((url, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className={`relative overflow-hidden rounded-xl border-2 transition-all duration-200 cursor-pointer ${
              selected === i
                ? 'border-purple-500 ring-4 ring-purple-500/20'
                : 'border-gray-800 hover:border-gray-600 bg-gray-900/10'
            }`}
          >
            <img src={url} alt={`Candidate ${i + 1}`} className="w-full object-cover" />
            {selected === i && (
              <div className="absolute inset-0 flex items-center justify-center bg-purple-900/10">
                <span className="rounded-full bg-purple-600 px-3 py-1 text-xs font-semibold text-white shadow-lg">
                  Selected
                </span>
              </div>
            )}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-lg bg-red-900/40 px-4 py-3 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
