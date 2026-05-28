export interface FormInput {
  subject: string;
  action: string;
  background: string;
  style: string;
  lighting_mood: string;
  color: string;
  image_model: string;
}

export interface Project {
  id: string;
  name: string;
  created_at: string;
  scene_ids: string[];
}

export interface Scene {
  id: string;
  project_id: string;
  order: number;
  form_input: FormInput;
  llm_prompt_sent: string;
  generated_prompt: string;
  accepted_prompt: string;
  image_filename: string;
  created_at: string;
}

export interface GeneratePromptResponse {
  llm_prompt_sent: string;
  generated_prompt: string;
}

export interface GenerateImagesResponse {
  scene_id: string;
  candidate_urls: string[];
}

export interface ImageModelInfo {
  id: string;
  name: string;
}

export interface ColorPaletteInfo {
  id: string;
  label: string;
}

export interface LightingMoodInfo {
  id: string;
  label: string;
  color_palettes: ColorPaletteInfo[];
}

export interface StyleInfo {
  id: string;
  label: string;
  lighting_moods: LightingMoodInfo[];
}

export type WorkflowStep =
  | 'FORM'
  | 'PROMPT_REVIEW'
  | 'IMAGE_GENERATION'
  | 'IMAGE_REVIEW'
  | 'STORYBOARD';
