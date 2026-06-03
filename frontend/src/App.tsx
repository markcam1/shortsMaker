import { WorkflowProvider, useWorkflow } from './context/WorkflowContext';
import { SourcePicker } from './components/SourcePicker';
import { ProjectSelector } from './components/ProjectSelector';
import { FormatChooser } from './components/FormatChooser';
import { EntryList } from './components/EntryList';
import { ImageCreationForm } from './components/ImageCreationForm';
import { PromptReview } from './components/PromptReview';
import { ImageGallery } from './components/ImageGallery';
import { StoryboardView } from './components/StoryboardView';
import { SummaryReview } from './components/SummaryReview';
import { BackgroundChooser } from './components/BackgroundChooser';
import { CardGallery } from './components/CardGallery';
import { CollectionView } from './components/CollectionView';

const IMAGE_STEPS = ['FORM', 'PROMPT_REVIEW', 'IMAGE_REVIEW', 'STORYBOARD'];
const STEP_LABELS: Record<string, string> = {
  FORM: 'New Scene',
  PROMPT_REVIEW: 'Review Prompt',
  IMAGE_GENERATION: 'Generating…',
  IMAGE_REVIEW: 'Pick Image',
  STORYBOARD: 'Storyboard',
  SUMMARY_REVIEW: 'Summary',
  BACKGROUND_CHOICE: 'Background',
  CARD_REVIEW: 'Pick Card',
  COLLECTION: 'Collection',
};

function StepIndicator({ step, format }: { step: string; format: string | null }) {
  const steps =
    format === 'quote'
      ? ['SUMMARY_REVIEW', 'BACKGROUND_CHOICE', 'CARD_REVIEW', 'COLLECTION']
      : IMAGE_STEPS;
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

const PRE_PROJECT_STEPS = ['SOURCE', 'FORMAT'];

function AppInner() {
  const { state, dispatch } = useWorkflow();

  if (PRE_PROJECT_STEPS.includes(state.step) || !state.project) {
    return (
      <div className="flex min-h-screen items-start justify-center p-8">
        <div className="w-full max-w-lg">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white">shortsMaker</h1>
          </div>
          {state.step === 'SOURCE' && (
            <>
              <SourcePicker />
              <ProjectSelector />
            </>
          )}
          {state.step === 'FORMAT' && <FormatChooser />}
        </div>
      </div>
    );
  }

  const isImagePost = state.project.format === 'image';

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col gap-4 border-r border-gray-800 p-5">
        <div>
          <button
            onClick={() => dispatch({ type: 'RESET_TO_SOURCE' })}
            className="text-xs text-gray-600 hover:text-gray-400"
          >
            ← New project
          </button>
          <h3 className="mt-1 font-semibold text-white truncate">{state.project.name}</h3>
          <p className="text-xs text-gray-600">
            {state.project.format} · {state.project.aspect}
          </p>
        </div>

        {isImagePost ? (
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
            <button
              onClick={() => dispatch({ type: 'RESET_TO_FORM', keepForm: false })}
              className="mt-1 w-full rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
            >
              + Add Scene
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-600">Cards</p>
            {state.quotePosts.length === 0 && (
              <p className="text-xs text-gray-700 italic">No cards yet</p>
            )}
            {state.quotePosts.map((q, i) => (
              <button
                key={q.id}
                onClick={() => dispatch({ type: 'SET_STEP', step: 'SUMMARY_REVIEW' })}
                className="flex items-center gap-2 rounded-lg border border-gray-800 p-2 w-full text-left hover:border-gray-700 hover:bg-gray-900/60 transition"
              >
                {q.image_filename ? (
                  <img
                    src={`/api/projects/${q.project_id}/quotes/${q.id}/image`}
                    alt=""
                    className="h-10 w-14 rounded object-cover"
                  />
                ) : (
                  <div className="h-10 w-14 rounded bg-gray-800 shrink-0" />
                )}
                <span className="text-xs text-gray-400 truncate">
                  {q.term || `Card ${i + 1}`}
                </span>
              </button>
            ))}
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-3">
          <StepIndicator step={state.step} format={state.project.format} />
        </div>

        <div className="flex flex-1 items-start justify-center p-8">
          <div className="w-full max-w-xl">
            {state.step === 'ENTRY_REVIEW' && <EntryList />}

            {/* Image post steps */}
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

            {/* Quote post steps */}
            {state.step === 'SUMMARY_REVIEW' && <SummaryReview />}
            {state.step === 'BACKGROUND_CHOICE' && <BackgroundChooser />}
            {state.step === 'CARD_REVIEW' && <CardGallery />}
            {state.step === 'COLLECTION' && <CollectionView />}
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
