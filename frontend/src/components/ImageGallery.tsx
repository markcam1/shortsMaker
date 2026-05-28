import { useState } from 'react';
import { useWorkflow } from '../context/WorkflowContext';
import { api } from '../api/client';

export function ImageGallery() {
  const { state, dispatch } = useWorkflow();
  const [selected, setSelected] = useState<number | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    if (selected === null || !state.project || !state.sceneId || !state.formInput) return;
    setLoading(true);
    try {
      const scene = await api.images.accept(
        state.project.id,
        state.sceneId,
        selected,
        state.formInput,
        state.editedPrompt
      );
      dispatch({ type: 'SCENE_ACCEPTED', scene });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: String(err) });
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit() {
    if (!state.project || !state.formInput || !editPrompt.trim()) return;
    setLoading(true);
    dispatch({ type: 'SET_ERROR', error: null });
    try {
      dispatch({ type: 'SET_EDITED_PROMPT', prompt: editPrompt });
      dispatch({ type: 'SET_STEP', step: 'IMAGE_GENERATION' });
      const res = await api.images.generate(
        state.project.id,
        state.formInput,
        editPrompt,
        state.formInput.image_model,
        state.sceneId ?? undefined
      );
      dispatch({ type: 'SET_CANDIDATES', sceneId: res.scene_id, urls: res.candidate_urls });
      setEditMode(false);
      setSelected(null);
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: String(err) });
      dispatch({ type: 'SET_STEP', step: 'IMAGE_REVIEW' });
    } finally {
      setLoading(false);
    }
  }

  function rejectToPrompt() {
    dispatch({ type: 'SET_STEP', step: 'PROMPT_REVIEW' });
  }

  function rejectToForm() {
    dispatch({ type: 'RESET_TO_FORM', keepForm: true });
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-2xl font-semibold text-white">Select an Image</h2>
      <p className="text-sm text-gray-400">Click an image to select it, then accept to add it as a scene.</p>

      <div className="grid grid-cols-2 gap-3">
        {state.candidateUrls.map((url, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className={`relative overflow-hidden rounded-xl border-2 transition ${
              selected === i
                ? 'border-purple-500 ring-2 ring-purple-500/40'
                : 'border-gray-700 hover:border-gray-500'
            }`}
          >
            <img src={url} alt={`candidate ${i + 1}`} className="w-full object-cover" />
            {selected === i && (
              <div className="absolute inset-0 flex items-center justify-center bg-purple-600/20">
                <span className="rounded-full bg-purple-600 px-3 py-1 text-sm font-medium text-white">
                  Selected
                </span>
              </div>
            )}
          </button>
        ))}
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-900/40 px-4 py-3 text-sm text-red-400">{state.error}</p>
      )}

      {/* Edit mode */}
      {editMode && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-400">Edit prompt then regenerate:</label>
          <textarea
            rows={4}
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-purple-500 focus:outline-none resize-y"
            value={editPrompt}
            onChange={e => setEditPrompt(e.target.value)}
            placeholder="Adjust the prompt…"
          />
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              disabled={loading || !editPrompt.trim()}
              className="flex-1 rounded-lg bg-purple-600 px-4 py-2 font-medium text-white transition hover:bg-purple-500 disabled:opacity-50"
            >
              {loading ? 'Regenerating…' : 'Regenerate Images →'}
            </button>
            <button
              onClick={() => setEditMode(false)}
              className="rounded-lg border border-gray-700 px-4 py-2 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleAccept}
          disabled={selected === null || loading}
          className="flex-1 rounded-lg bg-purple-600 px-4 py-2.5 font-medium text-white transition hover:bg-purple-500 disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Add to Storyboard ✓'}
        </button>
        {!editMode && (
          <button
            onClick={() => {
              setEditPrompt(state.editedPrompt);
              setEditMode(true);
            }}
            disabled={loading}
            className="rounded-lg border border-gray-700 px-4 py-2.5 text-gray-300 hover:bg-gray-800 disabled:opacity-50"
          >
            Edit Prompt
          </button>
        )}
        <button
          onClick={rejectToPrompt}
          disabled={loading}
          className="rounded-lg border border-gray-700 px-4 py-2.5 text-gray-300 hover:bg-gray-800 disabled:opacity-50"
        >
          ← Back to Prompt
        </button>
        <button
          onClick={rejectToForm}
          disabled={loading}
          className="rounded-lg border border-gray-700 px-4 py-2.5 text-gray-300 hover:bg-gray-800 disabled:opacity-50"
        >
          ← Back to Form
        </button>
      </div>
    </div>
  );
}
