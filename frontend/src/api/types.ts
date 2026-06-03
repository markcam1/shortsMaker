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
  format: 'image' | 'quote';
  aspect: '9:16' | '16:9';
  source_filename: string | null;
  created_at: string;
  scene_ids: string[];
  quote_ids: string[];
}

export interface ParsedItem {
  term: string;
  body: string;
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

export interface QuotePost {
  id: string;
  project_id: string;
  order: number;
  term: string;
  raw_body: string;
  summary: string;
  background_mode: 'simple' | 'complex';
  background_desc: string;
  llm_prompt_sent: string;
  generated_prompt: string;
  accepted_prompt: string;
  template_id: string;
  color_scheme_id: string;
  font_pairing_id: string;
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

export interface SummarizeResponse {
  summary: string;
}

export interface GenerateQuoteCandidatesResponse {
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

export interface FontPairingInfo {
  id: string;
  label: string;
}

export interface ColorSchemeInfo {
  id: string;
  label: string;
  text_color: string;
  bg_type: string;
  bg_value: string;
  font_pairings: FontPairingInfo[];
}

export interface TemplateInfo {
  id: string;
  label: string;
  max_chars: number;
  safe_area_pct: number;
  alignment: string;
  term_size_pt: number;
  body_size_pt: number;
  color_schemes: ColorSchemeInfo[];
}

export type WorkflowStep =
  | 'SOURCE'
  | 'FORMAT'
  | 'ENTRY_REVIEW'
  | 'FORM'
  | 'PROMPT_REVIEW'
  | 'IMAGE_GENERATION'
  | 'IMAGE_REVIEW'
  | 'STORYBOARD'
  | 'SUMMARY_REVIEW'
  | 'BACKGROUND_CHOICE'
  | 'CARD_REVIEW'
  | 'COLLECTION';
