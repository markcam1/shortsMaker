import { useState, useEffect } from 'react';
import { WorkflowProvider, useWorkflow } from './context/WorkflowContext';
import { SourcePicker } from './components/SourcePicker';
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
import { HomePage } from './components/HomePage';
import { LibraryPage } from './components/LibraryPage';
import { EditableProjectName } from './components/EditableProjectName';
import { api } from './api/client';
import type { Project } from './api/types';

type AppPage = 'home' | 'library' | 'content';

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

function AppInner({
  appPage,
  setAppPage,
}: {
  appPage: AppPage;
  setAppPage: (p: AppPage) => void;
}) {
  const { state, dispatch } = useWorkflow();
  const [showSidebar, setShowSidebar] = useState(false);

  // 1. Sync React State -> URL Hash
  useEffect(() => {
    let targetHash = '';
    if (appPage === 'home') {
      targetHash = '#/home';
    } else if (appPage === 'library') {
      targetHash = '#/library';
    } else if (appPage === 'content') {
      if (state.project) {
        targetHash = `#/project/${state.project.id}/${state.step}`;
      } else {
        targetHash = `#/new-project/${state.step}`;
      }
    }
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  }, [appPage, state.step, state.project?.id]);

  // 2. Sync URL Hash -> React State (handles back/forward buttons & direct deep links)
  useEffect(() => {
    let isMounted = true;

    async function handleHashChange() {
      const hash = window.location.hash;
      if (!hash || hash === '#/home') {
        if (appPage !== 'home') setAppPage('home');
      } else if (hash === '#/library') {
        if (appPage !== 'library') setAppPage('library');
      } else if (hash.startsWith('#/new-project/')) {
        const step = hash.replace('#/new-project/', '');
        if (appPage !== 'content') setAppPage('content');
        if (state.step !== step) {
          dispatch({ type: 'SET_STEP', step: step as any });
        }
      } else if (hash.startsWith('#/project/')) {
        const parts = hash.replace('#/project/', '').split('/');
        const projectId = parts[0];
        const step = parts[1];
        if (appPage !== 'content') setAppPage('content');

        if (!state.project || state.project.id !== projectId) {
          try {
            const p = await api.projects.get(projectId);
            if (!isMounted) return;
            dispatch({ type: 'SET_PROJECT', project: p });
            dispatch({ type: 'SET_FORMAT', format: p.format });
            dispatch({ type: 'SET_ASPECT', aspect: p.aspect });
            if (p.format === 'image') {
              const scenes = await api.images.listScenes(p.id);
              if (!isMounted) return;
              dispatch({ type: 'SET_SCENES', scenes });
            } else {
              const posts = await api.quotes.list(p.id);
              if (!isMounted) return;
              dispatch({ type: 'SET_QUOTE_POSTS', posts });
            }
          } catch (e) {
            console.error('Failed to load project from hash:', e);
            if (isMounted) setAppPage('home');
            return;
          }
        }

        if (state.step !== step) {
          dispatch({ type: 'SET_STEP', step: step as any });
        }
      }
    }

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => {
      isMounted = false;
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [appPage, state.step, state.project?.id, dispatch, setAppPage]);

  async function openProject(p: Project) {
    dispatch({ type: 'SET_PROJECT', project: p });
    dispatch({ type: 'SET_FORMAT', format: p.format });
    dispatch({ type: 'SET_ASPECT', aspect: p.aspect });
    if (p.format === 'image') {
      const scenes = await api.images.listScenes(p.id);
      dispatch({ type: 'SET_SCENES', scenes });
      dispatch({ type: 'SET_STEP', step: 'STORYBOARD' });
    } else {
      const posts = await api.quotes.list(p.id);
      dispatch({ type: 'SET_QUOTE_POSTS', posts });
      dispatch({ type: 'SET_STEP', step: 'COLLECTION' });
    }
    setAppPage('content');
  }

  if (appPage === 'home') {
    return (
      <HomePage
        onNewProject={() => {
          dispatch({ type: 'RESET_TO_SOURCE' });
          setAppPage('content');
        }}
        onLibrary={() => setAppPage('library')}
        onOpen={openProject}
      />
    );
  }

  if (appPage === 'library') {
    return (
      <LibraryPage
        onBack={() => setAppPage('home')}
        onOpen={openProject}
      />
    );
  }

  // content page — SOURCE / FORMAT pre-project, or active workflow
  if (PRE_PROJECT_STEPS.includes(state.step) || !state.project) {
    return (
      <div className="flex min-h-screen flex-col bg-[#0f0f11]">
        {/* Header */}
        <header className="flex items-center gap-4 border-b border-gray-800 px-4 py-4 sm:px-8 bg-[#0a0a0c]">
          <button
            onClick={() => setAppPage('home')}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600/10 hover:bg-purple-600/20 text-3xl transition shadow-md cursor-pointer shrink-0 border border-purple-500/10 hover:border-purple-500/30"
            title="Go Home"
          >
            🎬
          </button>
          <div className="flex-1 ml-2">
            <EditableProjectName />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 flex items-start justify-center p-8">
          <div className="w-full max-w-5xl">
            {state.step === 'SOURCE' && <SourcePicker />}
            {state.step === 'FORMAT' && <FormatChooser />}
          </div>
        </main>
      </div>
    );
  }

  const isImagePost = state.project.format === 'image';

  return (
    <div className="flex min-h-screen flex-col bg-[#0f0f11]">
      {/* Standardized Header */}
      <header className="flex items-center justify-between border-b border-gray-800 px-4 py-4 sm:px-8 bg-[#0a0a0c] gap-4 z-10">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => setAppPage('home')}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600/10 hover:bg-purple-600/20 text-3xl transition shadow-md cursor-pointer shrink-0 border border-purple-500/10 hover:border-purple-500/30"
            title="Go Home"
          >
            🎬
          </button>
          
          <div className="flex flex-col min-w-0">
            <EditableProjectName />
            <span className="text-[10px] text-gray-500 mt-0.5 truncate">
              {state.project.format === 'quote' ? '💬 Quote Post' : '🖼️ Image Post'} · {state.project.aspect}
            </span>
          </div>
        </div>

        {/* Right side: Step Indicator and/or Mobile Menu Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:block">
            <StepIndicator step={state.step} format={state.project.format} />
          </div>
          
          <button
            onClick={() => setShowSidebar(prev => !prev)}
            className="md:hidden flex h-10 px-3 items-center gap-1.5 rounded-xl border border-gray-800 bg-gray-900/50 hover:bg-gray-800 text-xs font-semibold text-white transition cursor-pointer shadow-sm active:scale-95"
          >
            📋 {isImagePost ? 'Scenes' : 'Cards'}
          </button>
        </div>
      </header>

      {/* Main Body with Sidebar Drawer */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Backdrop for mobile drawer */}
        {showSidebar && (
          <div
            className="fixed inset-0 z-25 bg-black/60 transition-opacity duration-300 md:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-64 bg-[#0f0f11] border-r border-gray-800 p-5 flex flex-col gap-4 transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
            showSidebar ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Header for mobile sidebar */}
          <div className="flex md:hidden justify-between items-center pb-2 border-b border-gray-900">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Navigation</span>
            <button
              onClick={() => setShowSidebar(false)}
              className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 border border-gray-800 rounded bg-gray-900/40 cursor-pointer"
            >
              ✕ Close
            </button>
          </div>

          {isImagePost ? (
            <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Scenes</p>
              {state.scenes.length === 0 && (
                <p className="text-xs text-gray-700 italic">No scenes yet</p>
              )}
              {state.scenes.map((scene, i) => (
                <div
                  key={scene.id}
                  className="flex items-center gap-2.5 rounded-xl border border-gray-850 bg-gray-900/20 p-2.5 hover:border-gray-750 transition"
                >
                  <img
                    src={`/api/projects/${scene.project_id}/scenes/${scene.id}/image`}
                    alt=""
                    className="h-10 w-14 rounded-lg object-cover"
                  />
                  <span className="text-xs text-gray-400 font-medium">Scene {i + 1}</span>
                </div>
              ))}
              <button
                onClick={() => {
                  dispatch({ type: 'RESET_TO_FORM', keepForm: false });
                  setShowSidebar(false);
                }}
                className="mt-2 w-full rounded-xl border border-gray-800 bg-gray-900/30 px-3 py-2.5 text-xs font-semibold text-gray-300 hover:bg-gray-800 cursor-pointer hover:border-gray-700 transition"
              >
                + Add Scene
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Cards</p>
              {state.quotePosts.length === 0 && (
                <p className="text-xs text-gray-700 italic">No cards yet</p>
              )}
              {state.quotePosts.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => {
                    dispatch({ type: 'SET_QUOTE', quoteId: q.id });
                    if (q.summary) {
                      dispatch({ type: 'SET_SUMMARY', summary: q.summary });
                      dispatch({ type: 'SET_STEP', step: 'BACKGROUND_CHOICE' });
                    } else {
                      dispatch({ type: 'SET_STEP', step: 'SUMMARY_REVIEW' });
                    }
                    setShowSidebar(false);
                  }}
                  className={`flex items-center gap-2.5 rounded-xl border p-2.5 w-full text-left transition cursor-pointer ${
                    state.quoteId === q.id
                      ? 'border-purple-500 bg-purple-950/20'
                      : 'border-gray-800 hover:border-gray-700 hover:bg-gray-900/60'
                  }`}
                >
                  {q.image_filename ? (
                    <img
                      src={`/api/projects/${q.project_id}/quotes/${q.id}/image`}
                      alt=""
                      className="h-10 w-14 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-10 w-14 rounded-lg bg-gray-850 shrink-0" />
                  )}
                  <span className="text-xs text-gray-300 font-medium truncate">
                    {q.term || `Card ${i + 1}`}
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-[#0a0a0c]">
          {/* Mobile only step indicator subheader */}
          <div className="sm:hidden border-b border-gray-900 px-6 py-2 bg-[#09090b]">
            <StepIndicator step={state.step} format={state.project.format} />
          </div>

          <div className="flex flex-1 items-start justify-center p-6 md:p-8">
            <div className={`w-full transition-all duration-300 ${['ENTRY_REVIEW', 'BACKGROUND_CHOICE'].includes(state.step) ? 'max-w-5xl' : 'max-w-xl'}`}>
              {state.step === 'ENTRY_REVIEW' && <EntryList />}

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

              {state.step === 'SUMMARY_REVIEW' && <SummaryReview />}
              {state.step === 'BACKGROUND_CHOICE' && <BackgroundChooser />}
              {state.step === 'CARD_REVIEW' && <CardGallery />}
              {state.step === 'COLLECTION' && <CollectionView />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [appPage, setAppPage] = useState<AppPage>('home');

  return (
    <WorkflowProvider>
      <AppInner appPage={appPage} setAppPage={setAppPage} />
    </WorkflowProvider>
  );
}
