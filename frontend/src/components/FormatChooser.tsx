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
      const name = state.projectName || (file
        ? file.name.replace(/\.[^.]+$/, '')
        : `Project ${new Date().toLocaleDateString()}`);
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
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Choose Format</h2>
        <p className="mt-1.5 text-sm text-gray-400 leading-relaxed">
          Select the output format you want to generate for this content.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <button
          onClick={() => pick('image')}
          disabled={loading}
          className="group flex flex-col justify-between items-start gap-4 rounded-2xl border border-gray-800 bg-gray-900/10 p-6 text-left transition duration-200 hover:border-purple-500 hover:bg-gray-900/30 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
        >
          <div className="flex items-center gap-3">
            <span className="text-4xl group-hover:scale-110 transition duration-200 select-none">🖼️</span>
            <div>
              <span className="text-lg font-bold text-white block">Image Post</span>
              <span className="text-xs text-purple-400 font-medium">Full AI Art Flow</span>
            </div>
          </div>
          <span className="text-sm text-gray-400 leading-relaxed mt-2">
            Each item in your list generates an AI-illustrated scene. Ideal for visual storytelling, tutorials, and concept showcases.
          </span>
        </button>

        <button
          onClick={() => pick('quote')}
          disabled={loading}
          className="group flex flex-col justify-between items-start gap-4 rounded-2xl border border-gray-800 bg-gray-900/10 p-6 text-left transition duration-200 hover:border-purple-500 hover:bg-gray-900/30 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
        >
          <div className="flex items-center gap-3">
            <span className="text-4xl group-hover:scale-110 transition duration-200 select-none">💬</span>
            <div>
              <span className="text-lg font-bold text-white block">Quote Post</span>
              <span className="text-xs text-purple-400 font-medium">Text Cards & Overlays</span>
            </div>
          </div>
          <span className="text-sm text-gray-400 leading-relaxed mt-2">
            Each item becomes a beautiful text card layout, summarized by AI and composited with high-quality backgrounds. Ideal for quotes and vocabulary.
          </span>
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-sm text-gray-400 bg-gray-900/30 border border-gray-850 px-4 py-3 rounded-xl mt-2 max-w-sm">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          <span>Uploading and generating database entries…</span>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-900/40 px-4 py-3 text-sm text-red-400 mt-2">{error}</p>
      )}
    </div>
  );
}
