import { useEffect, useState, useRef } from 'react';
import { useWorkflow } from '../context/WorkflowContext';
import { api } from '../api/client';
import type { Scene, QuotePost } from '../api/types';

interface SceneEntryRowProps {
  scene: Scene;
  index: number;
  projectId: string;
  onUpdate: (updated: Scene) => void;
}

function SceneEntryRow({ scene, index, projectId, onUpdate }: SceneEntryRowProps) {
  const [subject, setSubject] = useState(scene.form_input.subject);
  const [isSaving, setIsSaving] = useState(false);
  const [savedBadge, setSavedBadge] = useState(false);

  async function handleBlur() {
    if (subject.trim() === scene.form_input.subject) return;
    setIsSaving(true);
    try {
      const updated = await api.images.updateScene(projectId, scene.id, subject.trim());
      onUpdate(updated);
      setSavedBadge(true);
      setTimeout(() => setSavedBadge(false), 2000);
    } catch (err) {
      console.error('Failed to update scene:', err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/10 p-5 flex flex-col gap-3 transition duration-200 hover:border-gray-700">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
          Entry {index + 1}
        </span>
        <div className="flex items-center gap-1.5 min-h-[1.25rem]">
          {isSaving && (
            <span className="text-xs text-gray-500 animate-pulse">Saving…</span>
          )}
          {savedBadge && (
            <span className="text-xs text-green-400 font-semibold transition-all">✓ Saved</span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</label>
        <input
          type="text"
          className="text-lg font-medium text-white bg-gray-950/40 border border-gray-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-lg px-3 py-2 w-full transition outline-none"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          onBlur={handleBlur}
          placeholder="e.g. A lone astronaut"
        />
      </div>
    </div>
  );
}

interface QuoteEntryRowProps {
  quote: QuotePost;
  index: number;
  projectId: string;
  onUpdate: (updated: QuotePost) => void;
}

function QuoteEntryRow({ quote, index, projectId, onUpdate }: QuoteEntryRowProps) {
  const [term, setTerm] = useState(quote.term);
  const [rawBody, setRawBody] = useState(quote.raw_body || '');
  const [isSaving, setIsSaving] = useState(false);
  const [savedBadge, setSavedBadge] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize the textarea height to fit content without scrollbars
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [rawBody]);

  async function handleBlur() {
    if (term.trim() === quote.term && rawBody.trim() === (quote.raw_body || '')) return;
    setIsSaving(true);
    try {
      const updated = await api.quotes.updateQuote(projectId, quote.id, {
        term: term.trim(),
        raw_body: rawBody.trim(),
      });
      onUpdate(updated);
      setSavedBadge(true);
      setTimeout(() => setSavedBadge(false), 2000);
    } catch (err) {
      console.error('Failed to update quote:', err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/10 p-5 flex flex-col gap-3 transition duration-200 hover:border-gray-700">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
          Entry {index + 1}
        </span>
        <div className="flex items-center gap-1.5 min-h-[1.25rem]">
          {isSaving && (
            <span className="text-xs text-gray-500 animate-pulse">Saving…</span>
          )}
          {savedBadge && (
            <span className="text-xs text-green-400 font-semibold transition-all">✓ Saved</span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Term / Key Phrase</label>
        <input
          type="text"
          className="text-lg font-bold text-white bg-gray-950/40 border border-gray-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-lg px-3 py-2 w-full transition outline-none"
          value={term}
          onChange={e => setTerm(e.target.value)}
          onBlur={handleBlur}
          placeholder="e.g. Gravity"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Raw Text / Definition</label>
        <textarea
          ref={textareaRef}
          rows={3}
          className="text-base text-gray-300 bg-gray-950/40 border border-gray-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-lg px-3 py-2 w-full transition outline-none resize-none overflow-hidden"
          value={rawBody}
          onChange={e => setRawBody(e.target.value)}
          onBlur={handleBlur}
          placeholder="Enter quote or text content description here..."
        />
      </div>
    </div>
  );
}

export function EntryList() {
  const { state, dispatch } = useWorkflow();
  const project = state.project!;

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [quotes, setQuotes] = useState<QuotePost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      if (project.format === 'image') {
        const s = await api.images.listScenes(project.id);
        setScenes(s);
      } else {
        const q = await api.quotes.list(project.id);
        setQuotes(q);
      }
      setLoading(false);
    }
    load();
  }, [project.id, project.format]);

  function handleSceneUpdate(updated: Scene) {
    setScenes(prev => prev.map(s => (s.id === updated.id ? updated : s)));
  }

  function handleQuoteUpdate(updated: QuotePost) {
    setQuotes(prev => prev.map(q => (q.id === updated.id ? updated : q)));
  }

  function proceed() {
    if (project.format === 'image') {
      dispatch({ type: 'SET_SCENES', scenes });
      dispatch({ type: 'SET_STEP', step: 'FORM' });
    } else {
      dispatch({ type: 'SET_QUOTE_POSTS', posts: quotes });
      dispatch({ type: 'SET_STEP', step: 'SUMMARY_REVIEW' });
    }
  }

  const entries = project.format === 'image' ? scenes : quotes;
  const isEmpty = entries.length === 0;

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Review Entries</h2>
          <p className="mt-1 text-sm text-gray-400 leading-relaxed">
            {loading
              ? 'Loading parsed entries…'
              : `${entries.length} entries parsed${state.skippedCount > 0 ? ` · ${state.skippedCount} skipped` : ''}. Review and edit the fields below for accuracy.`}
          </p>
        </div>
        <button
          onClick={proceed}
          disabled={loading || isEmpty}
          className="rounded-lg bg-purple-600 px-6 py-2.5 font-semibold text-white transition hover:bg-purple-500 disabled:opacity-50 cursor-pointer shadow-md hover:shadow-purple-950/20 shrink-0"
        >
          Continue →
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
        </div>
      ) : isEmpty ? (
        <div className="text-center py-20 border border-gray-800 rounded-xl bg-gray-900/10">
          <p className="text-gray-400">No entries were successfully parsed from the uploaded file.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
          {project.format === 'image'
            ? scenes.map((s, i) => (
                <SceneEntryRow
                  key={s.id}
                  scene={s}
                  index={i}
                  projectId={project.id}
                  onUpdate={handleSceneUpdate}
                />
              ))
            : quotes.map((q, i) => (
                <QuoteEntryRow
                  key={q.id}
                  quote={q}
                  index={i}
                  projectId={project.id}
                  onUpdate={handleQuoteUpdate}
                />
              ))}
        </div>
      )}
    </div>
  );
}
