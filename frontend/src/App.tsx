import { WorkflowProvider, useWorkflow } from './context/WorkflowContext';
import { ProjectSelector } from './components/ProjectSelector';
import { ImageCreationForm } from './components/ImageCreationForm';
import { PromptReview } from './components/PromptReview';
import { ImageGallery } from './components/ImageGallery';
import { StoryboardView } from './components/StoryboardView';

const STEP_LABELS: Record<string, string> = {
  FORM: 'New Scene',
  PROMPT_REVIEW: 'Review Prompt',
  IMAGE_GENERATION: 'Generating…',
  IMAGE_REVIEW: 'Pick Image',
  STORYBOARD: 'Storyboard',
};

function StepIndicator({ step }: { step: string }) {
  const steps = ['FORM', 'PROMPT_REVIEW', 'IMAGE_REVIEW', 'STORYBOARD'];
  const current = steps.indexOf(step === 'IMAGE_GENERATION' ? 'IMAGE_REVIEW' : step);
  return (
    <div className="flex items-center gap-1 text-xs">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <span
            className={`rounded-full px-2.5 py-0.5 font-medium transition ${
              i === current
                ? 'bg-purple-600 text-white'
                : i < current
                ? 'bg-gray-700 text-gray-300'
                : 'text-gray-600'
            }`}
          >
            {STEP_LABELS[s]}
          </span>
          {i < steps.length - 1 && <span className="text-gray-700">›</span>}
        </div>
      ))}
    </div>
  );
}

function AppInner() {
  const { state, dispatch } = useWorkflow();

  if (!state.project) {
    return (
      <div className="flex min-h-screen items-start justify-center p-8">
        <div className="w-full max-w-lg">
          <ProjectSelector />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col gap-4 border-r border-gray-800 p-5">
        <div>
          <button
            onClick={() => dispatch({ type: 'SET_PROJECT', project: null as any })}
            className="text-xs text-gray-600 hover:text-gray-400"
          >
            ← All projects
          </button>
          <h3 className="mt-1 font-semibold text-white truncate">{state.project.name}</h3>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-600">Scenes</p>
          {state.scenes.length === 0 && (
            <p className="text-xs text-gray-700 italic">No scenes yet</p>
          )}
          {state.scenes.map((scene, i) => (
            <div
              key={scene.id}
              className="flex items-center gap-2 rounded-lg border border-gray-800 p-2"
            >
              <img
                src={`/api/projects/${scene.project_id}/scenes/${scene.id}/image`}
                alt=""
                className="h-10 w-14 rounded object-cover"
              />
              <span className="text-xs text-gray-400">Scene {i + 1}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto">
          <button
            onClick={() => dispatch({ type: 'RESET_TO_FORM', keepForm: false })}
            className="w-full rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
          >
            + Add Scene
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-3">
          <StepIndicator step={state.step} />
        </div>

        <div className="flex flex-1 items-start justify-center p-8">
          <div className="w-full max-w-xl">
            {state.step === 'IMAGE_GENERATION' && (
              <div className="flex flex-col items-center gap-4 py-20 text-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
                <p className="text-gray-400">Generating images…</p>
              </div>
            )}
            {state.step === 'FORM' && <ImageCreationForm />}
            {state.step === 'PROMPT_REVIEW' && <PromptReview />}
            {state.step === 'IMAGE_REVIEW' && <ImageGallery />}
            {state.step === 'STORYBOARD' && <StoryboardView />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <WorkflowProvider>
      <AppInner />
    </WorkflowProvider>
  );
}
