import { useState, useEffect } from 'react';
import { useWorkflow } from '../context/WorkflowContext';
import { api } from '../api/client';
import type { FormInput, ImageModelInfo, StyleInfo, LightingMoodInfo } from '../api/types';

const EMPTY_FORM: FormInput = {
  subject: '',
  action: '',
  background: '',
  style: '',
  lighting_mood: '',
  color: '',
  image_model: '',
};

const CUSTOM = '__custom__';

const selectClass =
  'rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-purple-500 focus:outline-none';
const inputClass =
  'rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none';

interface CascadeFieldProps {
  label: string;
  options: { id: string; label: string }[];
  value: string;
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string, id: string | null) => void;
}

function CascadeField({ label, options, value, placeholder, disabled, onChange }: CascadeFieldProps) {
  const matchedId = options.find(o => o.label === value)?.id ?? null;
  const isCustom = value !== '' && matchedId === null;
  const selectValue = isCustom ? CUSTOM : (matchedId ?? '');

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val === CUSTOM) {
      onChange('', null);
    } else if (val === '') {
      onChange('', null);
    } else {
      const opt = options.find(o => o.id === val);
      if (opt) onChange(opt.label, opt.id);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-400">{label}</label>
      <select
        className={selectClass}
        value={isCustom ? CUSTOM : selectValue}
        disabled={disabled}
        onChange={handleSelectChange}
      >
        <option value="">— select —</option>
        {options.map(o => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
        <option value={CUSTOM}>Custom…</option>
      </select>
      {(isCustom || selectValue === CUSTOM) && (
        <input
          className={inputClass}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value, null)}
        />
      )}
    </div>
  );
}

export function ImageCreationForm() {
  const { state, dispatch } = useWorkflow();
  const [form, setForm] = useState<FormInput>(state.formInput ?? EMPTY_FORM);
  const [models, setModels] = useState<ImageModelInfo[]>([]);
  const [styles, setStyles] = useState<StyleInfo[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [selectedMoodId, setSelectedMoodId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.models.list().then(m => {
      setModels(m);
      if (!form.image_model && m.length > 0) {
        setForm(f => ({ ...f, image_model: m[0].id }));
      }
    });
    api.styles.list().then(setStyles);
  }, []);

  function field(label: string, key: keyof FormInput, placeholder: string) {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-400">{label}</label>
        <input
          className={inputClass}
          placeholder={placeholder}
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        />
      </div>
    );
  }

  const activeMoods: LightingMoodInfo[] = selectedStyleId
    ? (styles.find(s => s.id === selectedStyleId)?.lighting_moods ?? [])
    : [];

  const activePalettes = selectedMoodId
    ? (activeMoods.find(m => m.id === selectedMoodId)?.color_palettes ?? [])
    : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!state.project) return;
    setLoading(true);
    dispatch({ type: 'SET_ERROR', error: null });
    try {
      dispatch({ type: 'SET_FORM', form });
      const res = await api.prompts.generate(state.project.id, form);
      dispatch({ type: 'SET_PROMPT', llmSent: res.llm_prompt_sent, generated: res.generated_prompt });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: String(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <h2 className="text-2xl font-semibold text-white">New Scene</h2>

      {field('Subject', 'subject', 'e.g. A lone astronaut')}
      {field('Action', 'action', 'e.g. gazing at the horizon')}
      {field('Background', 'background', 'e.g. barren red desert landscape')}

      <CascadeField
        label="Style"
        options={styles}
        value={form.style}
        placeholder="e.g. cinematic, photorealistic"
        onChange={(label, id) => {
          setForm(f => ({ ...f, style: label, lighting_mood: '', color: '' }));
          setSelectedStyleId(id);
          setSelectedMoodId(null);
        }}
      />

      <CascadeField
        label="Lighting / Mood"
        options={activeMoods}
        value={form.lighting_mood}
        placeholder="e.g. dramatic golden hour"
        disabled={activeMoods.length === 0 && !selectedStyleId}
        onChange={(label, id) => {
          setForm(f => ({ ...f, lighting_mood: label, color: '' }));
          setSelectedMoodId(id);
        }}
      />

      <CascadeField
        label="Color Palette"
        options={activePalettes}
        value={form.color}
        placeholder="e.g. warm earth tones, burnt orange"
        onChange={(label, _id) => setForm(f => ({ ...f, color: label }))}
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-400">Image Model</label>
        <select
          className={selectClass}
          value={form.image_model}
          onChange={e => setForm(f => ({ ...f, image_model: e.target.value }))}
        >
          {models.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {state.scenes.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-400">Character Reference</label>
          <select
            className={selectClass}
            value={state.referenceSceneId ?? ''}
            onChange={e => dispatch({ type: 'SET_REFERENCE_SCENE', sceneId: e.target.value || null })}
          >
            <option value="">None</option>
            {state.scenes.map((scene, i) => (
              <option key={scene.id} value={scene.id}>Scene {i + 1}</option>
            ))}
          </select>
          <p className="text-xs text-gray-600">Gemini Flash only — Imagen ignores this.</p>
        </div>
      )}

      {state.error && (
        <p className="rounded-lg bg-red-900/40 px-4 py-3 text-sm text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !form.subject || !form.image_model}
        className="rounded-lg bg-purple-600 px-4 py-2.5 font-medium text-white transition hover:bg-purple-500 disabled:opacity-50"
      >
        {loading ? 'Generating prompt…' : 'Generate Prompt →'}
      </button>
    </form>
  );
}
