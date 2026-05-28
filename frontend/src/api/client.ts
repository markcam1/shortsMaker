import type {
  Project,
  Scene,
  FormInput,
  GeneratePromptResponse,
  GenerateImagesResponse,
  ImageModelInfo,
  StyleInfo,
} from './types';

const BASE = '/api';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json' },
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
  projects: {
    create: (name: string) =>
      request<Project>('/projects', { method: 'POST', body: JSON.stringify({ name }) }),
    list: () => request<Project[]>('/projects'),
    get: (id: string) => request<Project>(`/projects/${id}`),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/projects/${id}`, { method: 'DELETE' }),
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
  },
};
