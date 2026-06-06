import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from 'react';
import type {
  FormInput,
  WorkflowStep,
  Scene,
  QuotePost,
  Project,
  ParsedItem,
} from '../api/types';

interface WorkflowState {
  step: WorkflowStep;
  project: Project | null;
  projectName: string;
  // image-post fields
  formInput: FormInput | null;
  llmPromptSent: string;
  generatedPrompt: string;
  editedPrompt: string;
  sceneId: string | null;
  referenceSceneId: string | null;
  candidateUrls: string[];
  scenes: Scene[];
  // shared
  format: 'image' | 'quote' | null;
  aspect: '9:16' | '16:9';
  entries: ParsedItem[];
  skippedCount: number;
  // quote-post fields
  quoteId: string | null;
  summary: string;
  backgroundMode: 'simple' | 'complex' | null;
  backgroundDesc: string;
  quotePosts: QuotePost[];
  quoteCandidateUrls: string[];
  batchMode: boolean;
  error: string | null;
}

type Action =
  | { type: 'SET_PROJECT'; project: Project }
  | { type: 'SET_PROJECT_NAME'; name: string }
  | { type: 'SET_STEP'; step: WorkflowStep }
  | { type: 'SET_FORMAT'; format: 'image' | 'quote' }
  | { type: 'SET_ASPECT'; aspect: '9:16' | '16:9' }
  | { type: 'SET_ENTRIES'; entries: ParsedItem[]; skippedCount: number }
  | { type: 'SET_FORM'; form: FormInput }
  | { type: 'SET_PROMPT'; llmSent: string; generated: string }
  | { type: 'SET_EDITED_PROMPT'; prompt: string }
  | { type: 'SET_CANDIDATES'; sceneId: string; urls: string[] }
  | { type: 'SCENE_ACCEPTED'; scene: Scene }
  | { type: 'SET_SCENES'; scenes: Scene[] }
  | { type: 'SET_REFERENCE_SCENE'; sceneId: string | null }
  | { type: 'SET_QUOTE'; quoteId: string }
  | { type: 'SET_SUMMARY'; summary: string }
  | { type: 'SET_BG_MODE'; mode: 'simple' | 'complex' }
  | { type: 'SET_BG_DESC'; desc: string }
  | { type: 'SET_QUOTE_CANDIDATES'; urls: string[] }
  | { type: 'SET_QUOTE_POSTS'; posts: QuotePost[] }
  | { type: 'QUOTE_ACCEPTED'; quote: QuotePost }
  | { type: 'SET_BATCH_MODE'; batch: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'RESET_TO_FORM'; keepForm: boolean }
  | { type: 'RESET_TO_SOURCE' };

const STORAGE_KEY = 'shortsmaker_workflow';

function defaultState(): WorkflowState {
  return {
    step: 'SOURCE',
    project: null,
    projectName: 'Untitled Project',
    formInput: null,
    llmPromptSent: '',
    generatedPrompt: '',
    editedPrompt: '',
    sceneId: null,
    referenceSceneId: null,
    candidateUrls: [],
    scenes: [],
    format: null,
    aspect: '9:16',
    entries: [],
    skippedCount: 0,
    quoteId: null,
    summary: '',
    backgroundMode: null,
    backgroundDesc: '',
    quotePosts: [],
    quoteCandidateUrls: [],
    batchMode: false,
    error: null,
  };
}

function reducer(state: WorkflowState, action: Action): WorkflowState {
  switch (action.type) {
    case 'SET_PROJECT':
      return { ...state, project: action.project, projectName: action.project.name, scenes: [], quotePosts: [] };
    case 'SET_PROJECT_NAME':
      return { ...state, projectName: action.name };
    case 'SET_STEP':
      return { ...state, step: action.step, error: null };
    case 'SET_FORMAT':
      return { ...state, format: action.format };
    case 'SET_ASPECT':
      return { ...state, aspect: action.aspect };
    case 'SET_ENTRIES':
      return { ...state, entries: action.entries, skippedCount: action.skippedCount };
    case 'SET_FORM':
      return { ...state, formInput: action.form };
    case 'SET_PROMPT':
      return {
        ...state,
        llmPromptSent: action.llmSent,
        generatedPrompt: action.generated,
        editedPrompt: action.generated,
        step: 'PROMPT_REVIEW',
      };
    case 'SET_EDITED_PROMPT':
      return { ...state, editedPrompt: action.prompt };
    case 'SET_CANDIDATES':
      return {
        ...state,
        sceneId: action.sceneId,
        candidateUrls: action.urls,
        step: 'IMAGE_REVIEW',
      };
    case 'SCENE_ACCEPTED':
      return {
        ...state,
        scenes: [...state.scenes.filter(s => s.id !== action.scene.id), action.scene].sort(
          (a, b) => a.order - b.order
        ),
        step: 'STORYBOARD',
        sceneId: null,
        candidateUrls: [],
        referenceSceneId: action.scene.id,
      };
    case 'SET_REFERENCE_SCENE':
      return { ...state, referenceSceneId: action.sceneId };
    case 'SET_SCENES':
      return { ...state, scenes: action.scenes };
    case 'SET_QUOTE':
      return { ...state, quoteId: action.quoteId };
    case 'SET_SUMMARY':
      return { ...state, summary: action.summary };
    case 'SET_BG_MODE':
      return { ...state, backgroundMode: action.mode };
    case 'SET_BG_DESC':
      return { ...state, backgroundDesc: action.desc };
    case 'SET_QUOTE_CANDIDATES':
      return { ...state, quoteCandidateUrls: action.urls, step: 'CARD_REVIEW' };
    case 'SET_QUOTE_POSTS':
      return { ...state, quotePosts: action.posts };
    case 'QUOTE_ACCEPTED':
      return {
        ...state,
        quotePosts: [
          ...state.quotePosts.filter(q => q.id !== action.quote.id),
          action.quote,
        ].sort((a, b) => a.order - b.order),
        step: 'COLLECTION',
        quoteId: null,
        quoteCandidateUrls: [],
      };
    case 'SET_BATCH_MODE':
      return { ...state, batchMode: action.batch };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'RESET_TO_FORM':
      return {
        ...state,
        step: 'FORM',
        llmPromptSent: '',
        generatedPrompt: '',
        editedPrompt: '',
        sceneId: null,
        candidateUrls: [],
        formInput: action.keepForm ? state.formInput : null,
        error: null,
      };
    case 'RESET_TO_SOURCE':
      return defaultState();
    default:
      return state;
  }
}

interface WorkflowContextValue {
  state: WorkflowState;
  dispatch: React.Dispatch<Action>;
}

const WorkflowContext = createContext<WorkflowContextValue | null>(null);

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const saved = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as WorkflowState) : defaultState();
    } catch {
      return defaultState();
    }
  })();

  const [state, dispatch] = useReducer(reducer, saved);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return (
    <WorkflowContext.Provider value={{ state, dispatch }}>
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow() {
  const ctx = useContext(WorkflowContext);
  if (!ctx) throw new Error('useWorkflow must be used inside WorkflowProvider');
  return ctx;
}
