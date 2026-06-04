import { useEffect, useState } from 'react';
import { useWorkflow } from '../context/WorkflowContext';
import { api } from '../api/client';
import type { TemplateInfo, ColorSchemeInfo, FontPairingInfo, ImageModelInfo } from '../api/types';

const selectClass =
  'rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-purple-500 focus:outline-none';

export function BackgroundChooser() {
  const { state, dispatch } = useWorkflow();
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateInfo | null>(null);
  const [selectedScheme, setSelectedScheme] = useState<ColorSchemeInfo | null>(null);
  const [selectedFont, setSelectedFont] = useState<FontPairingInfo | null>(null);
  const [imageModels, setImageModels] = useState<ImageModelInfo[]>([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [bgMode, setBgMode] = useState<'simple' | 'complex'>('simple');
  const [bgDesc, setBgDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Complex mode prompt review phase
  const [promptPhase, setPromptPhase] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState('');

  useEffect(() => {
    api.templates.list().then(ts => {
      setTemplates(ts);
      const currentQuote = state.quotePosts.find(q => q.id === state.quoteId);
      let t = ts[0];
      if (currentQuote?.template_id) {
        t = ts.find(x => x.id === currentQuote.template_id) || ts[0];
      }
      if (t) {
        setSelectedTemplate(t);
        let cs = t.color_schemes[0];
        if (currentQuote?.color_scheme_id) {
          cs = t.color_schemes.find(x => x.id === currentQuote.color_scheme_id) || t.color_schemes[0];
        }
        if (cs) {
          setSelectedScheme(cs);
          let fp = cs.font_pairings[0];
          if (currentQuote?.font_pairing_id) {
            fp = cs.font_pairings.find(x => x.id === currentQuote.font_pairing_id) || cs.font_pairings[0];
          }
          if (fp) {
            setSelectedFont(fp);
          }
        }
      }
    });
    api.models.list().then(ms => {
      setImageModels(ms);
      const currentQuote = state.quotePosts.find(q => q.id === state.quoteId);
      if (currentQuote?.background_mode) {
        setBgMode(currentQuote.background_mode);
      }
      if (currentQuote?.background_desc) {
        setBgDesc(currentQuote.background_desc);
      }
      if (ms.length > 0) {
        setSelectedModelId(ms[0].id);
      }
    });
  }, [state.quoteId, state.quotePosts]);

  async function handleGeneratePrompt() {
    if (!state.project || !state.quoteId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.quotes.generatePrompt(state.project.id, state.quoteId, bgDesc);
      setEditedPrompt(res.generated_prompt);
      setPromptPhase(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function generateCandidates(acceptedPrompt?: string) {
    if (!state.project || !state.quoteId || !selectedTemplate || !selectedScheme || !selectedFont) return;
    setLoading(true);
    setError(null);
    try {
      dispatch({ type: 'SET_BG_MODE', mode: bgMode });
      dispatch({ type: 'SET_BG_DESC', desc: bgDesc });

      const res = await api.quotes.generateCandidates(state.project.id, state.quoteId, {
        summary: state.summary,
        background_mode: bgMode,
        template_id: selectedTemplate.id,
        color_scheme_id: selectedScheme.id,
        font_pairing_id: selectedFont.id,
        background_desc: bgMode === 'complex' ? bgDesc : '',
        accepted_prompt: acceptedPrompt,
        image_model_id: bgMode === 'complex' ? selectedModelId : '',
      });
      dispatch({ type: 'SET_QUOTE_CANDIDATES', urls: res.candidate_urls });
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function generate() {
    if (bgMode === 'complex') {
      await handleGeneratePrompt();
    } else {
      await generateCandidates();
    }
  }

  const schemes = selectedTemplate?.color_schemes ?? [];
  const fonts = selectedScheme?.font_pairings ?? [];

  if (promptPhase) {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="text-2xl font-semibold text-white">Review Background Prompt</h2>
          <p className="mt-1 text-sm text-gray-400">
            Edit the AI-generated prompt before sending to the image model.
          </p>
        </div>

        <textarea
          rows={8}
          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none resize-y"
          value={editedPrompt}
          onChange={e => setEditedPrompt(e.target.value)}
        />

        {error && (
          <p className="rounded-lg bg-red-900/40 px-4 py-3 text-sm text-red-400">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => generateCandidates(editedPrompt)}
            disabled={loading || !editedPrompt.trim()}
            className="flex-1 rounded-lg bg-purple-600 px-4 py-2.5 font-medium text-white transition hover:bg-purple-500 disabled:opacity-50"
          >
            {loading ? 'Generating cards…' : 'Accept & Generate Cards →'}
          </button>
          <button
            onClick={() => { setPromptPhase(false); setError(null); }}
            disabled={loading}
            className="rounded-lg border border-gray-700 px-4 py-2.5 font-medium text-gray-300 transition hover:bg-gray-800"
          >
            ← Edit Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-semibold text-white">Choose Background</h2>
        {state.summary && (
          <p className="mt-1 text-sm text-gray-400 italic">"{state.summary}"</p>
        )}
      </div>

      {/* Background mode */}
      <div className="flex gap-3">
        {(['simple', 'complex'] as const).map(m => (
          <button
            key={m}
            onClick={() => setBgMode(m)}
            className={`rounded-lg border px-5 py-2 capitalize font-medium transition ${
              bgMode === m
                ? 'border-purple-500 bg-purple-600/20 text-purple-300'
                : 'border-gray-700 text-gray-400 hover:border-gray-500'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {bgMode === 'complex' && (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-400">Background description</label>
            <textarea
              className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none"
              rows={3}
              placeholder="e.g. Abstract financial graph, dark blue, minimalist"
              value={bgDesc}
              onChange={e => setBgDesc(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-400">Image Model</label>
            <select
              className={selectClass}
              value={selectedModelId}
              onChange={e => setSelectedModelId(e.target.value)}
            >
              {imageModels.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Template */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-400">Layout</label>
        <select
          className={selectClass}
          value={selectedTemplate?.id ?? ''}
          onChange={e => {
            const t = templates.find(t => t.id === e.target.value) ?? null;
            setSelectedTemplate(t);
            setSelectedScheme(t?.color_schemes[0] ?? null);
            setSelectedFont(t?.color_schemes[0]?.font_pairings[0] ?? null);
          }}
        >
          {templates.map(t => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Color scheme */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-400">Color Scheme</label>
        <select
          className={selectClass}
          value={selectedScheme?.id ?? ''}
          disabled={schemes.length === 0}
          onChange={e => {
            const cs = schemes.find(cs => cs.id === e.target.value) ?? null;
            setSelectedScheme(cs);
            setSelectedFont(cs?.font_pairings[0] ?? null);
          }}
        >
          {schemes.map(cs => (
            <option key={cs.id} value={cs.id}>{cs.label}</option>
          ))}
        </select>
      </div>

      {/* Font pairing */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-400">Font Pairing</label>
        <select
          className={selectClass}
          value={selectedFont?.id ?? ''}
          disabled={fonts.length === 0}
          onChange={e => setSelectedFont(fonts.find(f => f.id === e.target.value) ?? null)}
        >
          {fonts.map(f => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="rounded-lg bg-red-900/40 px-4 py-3 text-sm text-red-400">{error}</p>
      )}

      <button
        onClick={generate}
        disabled={loading || !selectedTemplate || !selectedScheme || !selectedFont || (bgMode === 'complex' && !selectedModelId)}
        className="rounded-lg bg-purple-600 px-4 py-2.5 font-medium text-white transition hover:bg-purple-500 disabled:opacity-50"
      >
        {loading
          ? bgMode === 'complex' ? 'Generating prompt…' : 'Generating cards…'
          : bgMode === 'complex' ? 'Generate Prompt →' : 'Generate Cards →'}
      </button>
    </div>
  );
}
