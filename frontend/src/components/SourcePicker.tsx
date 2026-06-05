import { useRef, useState } from 'react';
import { useWorkflow } from '../context/WorkflowContext';

const btnClass =
  'rounded-lg bg-purple-600 px-4 py-2.5 font-medium text-white transition hover:bg-purple-500 disabled:opacity-50 cursor-pointer shadow-md hover:shadow-purple-950/20';

export function SourcePicker() {
  const { state, dispatch } = useWorkflow();
  const [file, setFile] = useState<File | null>(null);
  const [aspect, setAspect] = useState<'9:16' | '16:9'>(state.aspect ?? '9:16');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) {
      setFile(f);
      const defaultName = f.name.replace(/\.[^.]+$/, '');
      dispatch({ type: 'SET_PROJECT_NAME', name: defaultName });
    }
  }

  function proceed() {
    dispatch({ type: 'SET_ASPECT', aspect });
    if (file) {
      dispatch({ type: 'SET_STEP', step: 'FORMAT' });
      _pendingFile = file;
    } else {
      dispatch({ type: 'SET_STEP', step: 'FORMAT' });
    }
  }

  return (
    <div className="flex flex-col gap-8 w-full animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Choose Content</h2>
        <p className="mt-1.5 text-sm text-gray-400 leading-relaxed">
          Upload a glossary or text file to feed into your new video content project.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left: Aspect Ratio & Proceed */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Aspect Ratio
            </label>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setAspect('9:16')}
                className={`flex items-center gap-4 rounded-xl border p-4 text-left transition duration-200 cursor-pointer ${
                  aspect === '9:16'
                    ? 'border-purple-500 bg-purple-600/10 text-purple-300 shadow-md shadow-purple-950/20'
                    : 'border-gray-800 text-gray-400 hover:border-gray-700 hover:bg-gray-900/40'
                }`}
              >
                <div className="text-3xl shrink-0 select-none">📱</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm sm:text-base">9:16 (Vertical)</div>
                  <div className="text-xs text-gray-500 mt-0.5">Shorts, TikToks & Reels</div>
                </div>
                {/* Visual Ratio Box */}
                <div className="flex items-center justify-center w-12 h-12 border border-dashed border-gray-700 rounded bg-gray-950/40 shrink-0">
                  <div className="w-4 h-8 border border-purple-500 bg-purple-500/20 rounded-sm transition-all" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAspect('16:9')}
                className={`flex items-center gap-4 rounded-xl border p-4 text-left transition duration-200 cursor-pointer ${
                  aspect === '16:9'
                     ? 'border-purple-500 bg-purple-600/10 text-purple-300 shadow-md shadow-purple-950/20'
                     : 'border-gray-800 text-gray-400 hover:border-gray-700 hover:bg-gray-900/40'
                }`}
              >
                <div className="text-3xl shrink-0 select-none">💻</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm sm:text-base">16:9 (Horizontal)</div>
                  <div className="text-xs text-gray-500 mt-0.5">YouTube videos & PC screens</div>
                </div>
                {/* Visual Ratio Box */}
                <div className="flex items-center justify-center w-12 h-12 border border-dashed border-gray-700 rounded bg-gray-950/40 shrink-0">
                  <div className="w-8 h-4 border border-purple-500 bg-purple-500/20 rounded-sm transition-all" />
                </div>
              </button>
            </div>
          </div>

          <button
            onClick={proceed}
            disabled={!file}
            className={btnClass}
          >
            Choose Format →
          </button>
        </div>

        {/* Right: File Drop Zone */}
        <div className="lg:col-span-7 flex flex-col gap-3 min-h-[300px]">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Content File
          </label>
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-gray-800 bg-gray-900/10 p-10 text-center transition duration-200 hover:border-purple-500 hover:bg-gray-900/25 min-h-[250px]"
          >
            <input
              ref={inputRef}
              type="file"
              accept=".txt,.md,.csv"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f) {
                  const defaultName = f.name.replace(/\.[^.]+$/, '');
                  dispatch({ type: 'SET_PROJECT_NAME', name: defaultName });
                }
              }}
            />
            <div className="text-4xl select-none">📁</div>
            <div className="max-w-md">
              <p className="text-gray-300 font-medium text-sm sm:text-base">
                {file ? (
                  <span className="text-purple-300 bg-purple-950/30 border border-purple-800/40 px-3 py-1.5 rounded-lg inline-block break-all">
                    {file.name}
                  </span>
                ) : (
                  'Drag & drop a content file here, or click to browse'
                )}
              </p>
              <p className="text-xs text-gray-600 mt-2 font-mono">.txt · .md · .csv files supported</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Module-level storage for the File object (can't put File in localStorage/reducer)
export let _pendingFile: File | null = null;
