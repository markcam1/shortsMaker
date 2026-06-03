import { useState } from 'react';
import { useWorkflow } from '../context/WorkflowContext';
import { api } from '../api/client';
import { _pendingFile } from './SourcePicker';

export function FormatChooser() {
  const { state, dispatch } = useWorkflow();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(format: 'image' | 'quote') {
    setLoading(true);
    setError(null);
    try {
      const file = _pendingFile;
      const formData = new FormData();
      const name = file
        ? file.name.replace(/\.[^.]+$/, '')
        : `Project ${new Date().toLocaleDateString()}`;
      formData.append('name', name);
      formData.append('format', format);
      formData.append('aspect', state.aspect);
      if (file) formData.append('file', file);

      const project = await api.projects.create(formData);
      dispatch({ type: 'SET_PROJECT', project });
      dispatch({ type: 'SET_FORMAT', format });

      // Build entries from what the server parsed (project carries scene_ids / quote_ids)
      // We'll load them in EntryList; for now just advance
      dispatch({ type: 'SET_STEP', step: 'ENTRY_REVIEW' });
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">Choose Format</h2>
        <p className="mt-1 text-sm text-gray-400">
          How do you want to turn this content into posts?
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <button
          onClick={() => pick('image')}
          disabled={loading}
          className="flex flex-col gap-1 rounded-xl border border-gray-700 p-5 text-left transition hover:border-purple-500 hover:bg-gray-800 disabled:opacity-50"
        >
          <span className="text-lg font-semibold text-white">Image Post</span>
          <span className="text-sm text-gray-400">
            Each entry seeds an AI-illustrated image through the full prompt→image flow.
          </span>
        </button>

        <button
          onClick={() => pick('quote')}
          disabled={loading}
          className="flex flex-col gap-1 rounded-xl border border-gray-700 p-5 text-left transition hover:border-purple-500 hover:bg-gray-800 disabled:opacity-50"
        >
          <span className="text-lg font-semibold text-white">Quote Post</span>
          <span className="text-sm text-gray-400">
            Each entry becomes a text card — LLM-summarized and composited over a background.
          </span>
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          Uploading and parsing…
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-900/40 px-4 py-3 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
