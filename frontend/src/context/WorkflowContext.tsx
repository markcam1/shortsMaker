import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from 'react';
import type { FormInput, WorkflowStep, Scene, Project } from '../api/types';

interface WorkflowState {
  step: WorkflowStep;
  project: Project | null;
  formInput: FormInput | null;
  llmPromptSent: string;
  generatedPrompt: string;
  editedPrompt: string;
  sceneId: string | null;
  referenceSceneId: string | null;
  candidateUrls: string[];
  scenes: Scene[];
  error: string | null;
}

type Action =
  | { type: 'SET_PROJECT'; project: Project }
  | { type: 'SET_STEP'; step: WorkflowStep }
  | { type: 'SET_FORM'; form: FormInput }
  | { type: 'SET_PROMPT'; llmSent: string; generated: string }
  | { type: 'SET_EDITED_PROMPT'; prompt: string }
  | { type: 'SET_CANDIDATES'; sceneId: string; urls: string[] }
  | { type: 'SCENE_ACCEPTED'; scene: Scene }
  | { type: 'SET_SCENES'; scenes: Scene[] }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_REFERENCE_SCENE'; sceneId: string | null }
  | { type: 'RESET_TO_FORM'; keepForm: boolean };

const STORAGE_KEY = 'storyboard_workflow';

function defaultState(): WorkflowState {
  return {
    step: 'FORM',
    project: null,
    formInput: null,
    llmPromptSent: '',
    generatedPrompt: '',
    editedPrompt: '',
    sceneId: null,
    referenceSceneId: null,
    candidateUrls: [],
    scenes: [],
    error: null,
  };
}

function reducer(state: WorkflowState, action: Action): WorkflowState {
  switch (action.type) {
    case 'SET_PROJECT':
      return { ...state, project: action.project, scenes: [] };
    case 'SET_STEP':
      return { ...state, step: action.step, error: null };
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
        formInput: state.formInput,
        error: null,
      };
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
