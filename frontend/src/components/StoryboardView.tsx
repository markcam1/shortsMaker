import { useWorkflow } from '../context/WorkflowContext';

export function StoryboardView() {
  const { state, dispatch } = useWorkflow();

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Storyboard — {state.scenes.length} scene{state.scenes.length !== 1 ? 's' : ''}
        </h2>
        <button
          onClick={() => dispatch({ type: 'RESET_TO_FORM', keepForm: false })}
          className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-purple-500 disabled:opacity-50 cursor-pointer shadow-md hover:shadow-purple-500/10 active:scale-[0.98]"
        >
          + Add Scene
        </button>
      </div>

      {state.scenes.length === 0 && (
        <p className="py-16 text-center text-gray-500 italic border border-dashed border-gray-800 rounded-xl bg-gray-955/20">No scenes yet. Add your first one!</p>
      )}

      <div className="flex flex-col gap-6">
        {state.scenes.map((scene, i) => (
          <div key={scene.id} className="flex gap-4 rounded-xl border border-gray-800 bg-gray-900/40 p-5 transition hover:border-gray-700">
            <div className="w-8 shrink-0 text-center text-lg font-bold text-purple-400">
              {i + 1}
            </div>
            <div className="flex flex-1 flex-col gap-3">
              <img
                src={`/api/projects/${scene.project_id}/scenes/${scene.id}/image`}
                alt={`Scene ${i + 1}`}
                className="w-full rounded-lg object-cover max-h-72 shadow-sm border border-gray-800"
              />
              <div className="flex flex-wrap gap-2">
                {(['subject', 'action', 'style'] as const).map(k => (
                  <span
                    key={k}
                    className="rounded-full border border-gray-850 bg-gray-900/60 px-2.5 py-0.5 text-xs text-gray-400 font-medium"
                  >
                    {k}: {scene.form_input[k]}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 italic">"{scene.accepted_prompt}"</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
