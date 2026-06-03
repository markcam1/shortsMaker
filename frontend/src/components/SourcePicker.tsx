import { useRef, useState } from 'react';
import { useWorkflow } from '../context/WorkflowContext';

const btnClass =
  'rounded-lg bg-purple-600 px-4 py-2.5 font-medium text-white transition hover:bg-purple-500 disabled:opacity-50';

export function SourcePicker() {
  const { state, dispatch } = useWorkflow();
  const [file, setFile] = useState<File | null>(null);
  const [aspect, setAspect] = useState<'9:16' | '16:9'>(state.aspect ?? '9:16');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }

  function proceed() {
    dispatch({ type: 'SET_ASPECT', aspect });
    if (file) {
      // store file reference in state via a custom action — we'll carry it to FORMAT step
      // The file itself will be submitted when the project is created in FormatChooser
      dispatch({ type: 'SET_STEP', step: 'FORMAT' });
      // Stash file name for display; actual File object held in module-level ref
      _pendingFile = file;
    } else {
      dispatch({ type: 'SET_STEP', step: 'FORMAT' });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">Choose Content</h2>
        <p className="mt-1 text-sm text-gray-400">
          Upload a glossary or content file to get started.
        </p>
      </div>

      {/* Aspect picker */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-400">Aspect Ratio</label>
        <div className="flex gap-3">
          {(['9:16', '16:9'] as const).map(a => (
            <button
              key={a}
              onClick={() => setAspect(a)}
              className={`rounded-lg border px-5 py-2 font-medium transition ${
                aspect === a
                  ? 'border-purple-500 bg-purple-600/20 text-purple-300'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* File drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-700 p-10 transition hover:border-purple-500"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.md,.csv"
          className="hidden"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
        />
        <p className="text-gray-400">
          {file ? (
            <span className="text-purple-300">{file.name}</span>
          ) : (
            'Drop a file here or click to browse'
          )}
        </p>
        <p className="text-xs text-gray-600">.txt · .md · .csv</p>
      </div>

      <button
        onClick={proceed}
        disabled={!file}
        className={btnClass}
      >
        Choose Format →
      </button>
    </div>
  );
}

// Module-level storage for the File object (can't put File in localStorage/reducer)
export let _pendingFile: File | null = null;
