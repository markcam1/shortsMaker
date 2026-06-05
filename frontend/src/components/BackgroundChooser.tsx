import { useEffect, useState } from 'react';
import { useWorkflow } from '../context/WorkflowContext';
import { api } from '../api/client';
import type { TemplateInfo, ColorSchemeInfo, FontPairingInfo, ImageModelInfo } from '../api/types';

const selectClass =
  'rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none w-full transition duration-150 cursor-pointer text-sm';

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
      <div className="flex flex-col gap-6 w-full animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Review Background Prompt</h2>
          <p className="mt-1.5 text-sm text-gray-400 leading-relaxed">
            Edit the AI-generated prompt before sending to the image model.
          </p>
        </div>

        <textarea
          rows={8}
          className="w-full rounded-xl border border-gray-800 bg-gray-950/40 px-4 py-3 text-white placeholder-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none resize-y text-base leading-relaxed"
          value={editedPrompt}
          onChange={e => setEditedPrompt(e.target.value)}
        />

        {error && (
          <p className="rounded-lg bg-red-900/40 px-4 py-3 text-sm text-red-400">{error}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <button
            onClick={() => generateCandidates(editedPrompt)}
            disabled={loading || !editedPrompt.trim()}
            className="flex-1 rounded-xl bg-purple-600 px-4 py-3 font-semibold text-white transition hover:bg-purple-500 disabled:opacity-50 cursor-pointer shadow-md"
          >
            {loading ? 'Generating cards…' : 'Accept & Generate Cards →'}
          </button>
          <button
            onClick={() => { setPromptPhase(false); setError(null); }}
            disabled={loading}
            className="rounded-xl border border-gray-700 px-5 py-3 font-semibold text-gray-300 transition hover:bg-gray-800 cursor-pointer"
          >
            ← Edit Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Choose Background</h2>
        {state.summary && (
          <div className="mt-3 rounded-xl bg-purple-950/20 border border-purple-900/30 p-4">
            <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">Active Quote Content</p>
            <p className="text-sm text-gray-300 font-medium leading-relaxed">"{state.summary}"</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start mt-2">
        {/* Left Side: Background Source (Simple vs Complex) */}
        <div className="flex flex-col gap-5 bg-gray-900/10 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400">Background Source</h3>
          
          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              {(['simple', 'complex'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setBgMode(m)}
                  className={`flex-1 rounded-xl border py-2.5 capitalize font-semibold transition cursor-pointer text-center text-sm ${
                    bgMode === m
                      ? 'border-purple-500 bg-purple-600/15 text-purple-300 shadow-md shadow-purple-950/20'
                      : 'border-gray-800 text-gray-400 hover:border-gray-700 hover:bg-gray-900/40'
                  }`}
                >
                  {m === 'simple' ? '🎨 Simple (Gradient)' : '🌌 Complex (AI Art)'}
                </button>
              ))}
            </div>

            {bgMode === 'complex' ? (
              <div className="flex flex-col gap-4 animate-fade-in">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">AI Background Prompt / Description</label>
                  <textarea
                    className="rounded-lg border border-gray-850 bg-gray-950/40 px-3 py-2 text-white placeholder-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition resize-none text-sm"
                    rows={3}
                    placeholder="e.g. Abstract financial graph, dark blue, minimalist style, 4k"
                    value={bgDesc}
                    onChange={e => setBgDesc(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Image Generation Model</label>
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
              </div>
            ) : (
              <div className="py-6 px-4 rounded-xl border border-dashed border-gray-800/80 bg-gray-950/20 text-center text-xs text-gray-500 leading-relaxed">
                Simple mode uses clean color gradients based on the selected Color Scheme. Fast generation and perfect readability.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Typography & Colors */}
        <div className="flex flex-col gap-5 bg-gray-900/10 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400">Typography & Color Layout</h3>

          <div className="flex flex-col gap-4">
            {/* Template */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Card Layout Style</label>
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
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Color Palette Scheme</label>
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
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Font Pairing Style</label>
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
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-900/40 px-4 py-3 text-sm text-red-400 mt-2">{error}</p>
      )}

      <button
        onClick={generate}
        disabled={loading || !selectedTemplate || !selectedScheme || !selectedFont || (bgMode === 'complex' && !selectedModelId)}
        className="mt-4 rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white transition hover:bg-purple-500 disabled:opacity-50 cursor-pointer shadow-md hover:shadow-purple-950/20"
      >
        {loading
          ? bgMode === 'complex' ? 'Generating prompt…' : 'Generating cards…'
          : bgMode === 'complex' ? 'Generate Prompt →' : 'Generate Cards →'}
      </button>
    </div>
  );
}
