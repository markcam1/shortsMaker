import type {
  Project,
  Scene,
  QuotePost,
  FormInput,
  ParsedItem,
  GeneratePromptResponse,
  GenerateImagesResponse,
  SummarizeResponse,
  GenerateQuoteCandidatesResponse,
  ImageModelInfo,
  StyleInfo,
  TemplateInfo,
} from './types';

const BASE = '/api';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    headers: init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

export const api = {
  models: {
    list: () => request<ImageModelInfo[]>('/config/models'),
  },
  styles: {
    list: () => request<StyleInfo[]>('/config/styles'),
  },
  templates: {
    list: () => request<TemplateInfo[]>('/config/templates'),
  },
  projects: {
    create: (formData: FormData) =>
      request<Project>('/projects', { method: 'POST', body: formData }),
    list: () => request<Project[]>('/projects'),
    get: (id: string) => request<Project>(`/projects/${id}`),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/projects/${id}`, { method: 'DELETE' }),
    export: (id: string) => fetch(`${BASE}/projects/${id}/export`),
  },
  prompts: {
    generate: (projectId: string, formInput: FormInput) =>
      request<GeneratePromptResponse>(`/projects/${projectId}/prompt`, {
        method: 'POST',
        body: JSON.stringify({ form_input: formInput }),
      }),
  },
  images: {
    generate: (
      projectId: string,
      formInput: FormInput,
      acceptedPrompt: string,
      imageModelId: string,
      sceneId?: string,
      referenceSceneId?: string | null,
    ) =>
      request<GenerateImagesResponse>(`/projects/${projectId}/images`, {
        method: 'POST',
        body: JSON.stringify({
          scene_id: sceneId ?? null,
          reference_scene_id: referenceSceneId ?? null,
          form_input: formInput,
          accepted_prompt: acceptedPrompt,
          image_model_id: imageModelId,
        }),
      }),
    accept: (
      projectId: string,
      sceneId: string,
      candidateIndex: number,
      formInput: FormInput,
      acceptedPrompt: string
    ) =>
      request<Scene>(`/projects/${projectId}/scenes`, {
        method: 'POST',
        body: JSON.stringify({
          scene_id: sceneId,
          candidate_index: candidateIndex,
          form_input: formInput,
          accepted_prompt: acceptedPrompt,
        }),
      }),
    listScenes: (projectId: string) =>
      request<Scene[]>(`/projects/${projectId}/scenes`),
    parseScenes: (projectId: string, items: ParsedItem[]) =>
      request<Scene[]>(`/projects/${projectId}/scenes/parse`, {
        method: 'POST',
        body: JSON.stringify({ items }),
      }),
  },
  quotes: {
    list: (projectId: string) =>
      request<QuotePost[]>(`/projects/${projectId}/quotes`),
    get: (projectId: string, quoteId: string) =>
      request<QuotePost>(`/projects/${projectId}/quotes/${quoteId}`),
    summarize: (projectId: string, quoteId: string, templateId: string) =>
      request<SummarizeResponse>(`/projects/${projectId}/quotes/${quoteId}/summarize`, {
        method: 'POST',
        body: JSON.stringify({ template_id: templateId }),
      }),
    generatePrompt: (projectId: string, quoteId: string, backgroundDesc: string) =>
      request<GeneratePromptResponse>(`/projects/${projectId}/quotes/${quoteId}/prompt`, {
        method: 'POST',
        body: JSON.stringify({ background_desc: backgroundDesc }),
      }),
    generateCandidates: (
      projectId: string,
      quoteId: string,
      payload: {
        summary: string;
        background_mode: 'simple' | 'complex';
        template_id: string;
        color_scheme_id: string;
        font_pairing_id: string;
        background_desc?: string;
        accepted_prompt?: string;
        image_model_id?: string;
      }
    ) =>
      request<GenerateQuoteCandidatesResponse>(
        `/projects/${projectId}/quotes/${quoteId}/candidates`,
        { method: 'POST', body: JSON.stringify(payload) }
      ),
    accept: (
      projectId: string,
      quoteId: string,
      payload: {
        candidate_index: number;
        summary: string;
        template_id: string;
        color_scheme_id: string;
        font_pairing_id: string;
      }
    ) =>
      request<QuotePost>(`/projects/${projectId}/quotes/${quoteId}/accept`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },
};
