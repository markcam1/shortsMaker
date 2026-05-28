import { useWorkflow } from '../context/WorkflowContext';

export function StoryboardView() {
  const { state, dispatch } = useWorkflow();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">
          Storyboard — {state.scenes.length} scene{state.scenes.length !== 1 ? 's' : ''}
        </h2>
        <button
          onClick={() => dispatch({ type: 'RESET_TO_FORM', keepForm: false })}
          className="rounded-lg bg-purple-600 px-4 py-2 font-medium text-white transition hover:bg-purple-500"
        >
          + Add Scene
        </button>
      </div>

      {state.scenes.length === 0 && (
        <p className="py-16 text-center text-gray-500">No scenes yet. Add your first one!</p>
      )}

      <div className="flex flex-col gap-6">
        {state.scenes.map((scene, i) => (
          <div key={scene.id} className="flex gap-4 rounded-xl border border-gray-700 bg-gray-900 p-4">
            <div className="w-8 shrink-0 text-center text-lg font-bold text-purple-400">
              {i + 1}
            </div>
            <div className="flex flex-1 flex-col gap-3">
              <img
                src={`/api/projects/${scene.project_id}/scenes/${scene.id}/image`}
                alt={`Scene ${i + 1}`}
                className="w-full rounded-lg object-cover max-h-72"
              />
              <div className="flex flex-wrap gap-2">
                {(['subject', 'action', 'style'] as const).map(k => (
                  <span
                    key={k}
                    className="rounded-full border border-gray-700 px-2.5 py-0.5 text-xs text-gray-400"
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
