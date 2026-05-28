import { useWorkflow } from '../context/WorkflowContext';
import { api } from '../api/client';
import { useState } from 'react';

export function PromptReview() {
  const { state, dispatch } = useWorkflow();
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    if (!state.project || !state.formInput) return;
    setLoading(true);
    dispatch({ type: 'SET_ERROR', error: null });
    try {
      dispatch({ type: 'SET_STEP', step: 'IMAGE_GENERATION' });
      const res = await api.images.generate(
        state.project.id,
        state.formInput,
        state.editedPrompt,
        state.formInput.image_model,
        state.sceneId ?? undefined,
        state.referenceSceneId,
      );
      dispatch({ type: 'SET_CANDIDATES', sceneId: res.scene_id, urls: res.candidate_urls });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: String(err) });
      dispatch({ type: 'SET_STEP', step: 'PROMPT_REVIEW' });
    } finally {
      setLoading(false);
    }
  }

  function handleReject() {
    dispatch({ type: 'RESET_TO_FORM', keepForm: true });
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-2xl font-semibold text-white">Review Prompt</h2>
      <p className="text-sm text-gray-400">
        Claude generated this text-to-image prompt. Edit it freely before sending to the image model.
      </p>

      <textarea
        rows={8}
        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none resize-y"
        value={state.editedPrompt}
        onChange={e => dispatch({ type: 'SET_EDITED_PROMPT', prompt: e.target.value })}
      />

      {state.error && (
        <p className="rounded-lg bg-red-900/40 px-4 py-3 text-sm text-red-400">{state.error}</p>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleAccept}
          disabled={loading || !state.editedPrompt.trim()}
          className="flex-1 rounded-lg bg-purple-600 px-4 py-2.5 font-medium text-white transition hover:bg-purple-500 disabled:opacity-50"
        >
          {loading ? 'Generating images…' : 'Accept & Generate Images →'}
        </button>
        <button
          onClick={handleReject}
          disabled={loading}
          className="rounded-lg border border-gray-700 px-4 py-2.5 font-medium text-gray-300 transition hover:bg-gray-800"
        >
          ← Reject
        </button>
      </div>
    </div>
  );
}
