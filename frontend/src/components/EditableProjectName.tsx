import { useState, useEffect, useRef } from 'react';
import { useWorkflow } from '../context/WorkflowContext';
import { api } from '../api/client';

export function EditableProjectName() {
  const { state, dispatch } = useWorkflow();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync value when project or context state updates
  useEffect(() => {
    if (state.project) {
      setValue(state.project.name);
    } else {
      setValue(state.projectName || 'Untitled Project');
    }
  }, [state.project, state.projectName]);

  async function handleSave() {
    const trimmed = value.trim();
    if (!trimmed) {
      // Revert if empty
      if (state.project) {
        setValue(state.project.name);
      } else {
        setValue(state.projectName || 'Untitled Project');
      }
      setIsEditing(false);
      return;
    }

    setIsEditing(false);

    if (state.project) {
      try {
        const updated = await api.projects.rename(state.project.id, trimmed);
        dispatch({ type: 'SET_PROJECT', project: updated });
      } catch (err) {
        console.error('Failed to rename project:', err);
      }
    } else {
      dispatch({ type: 'SET_PROJECT_NAME', name: trimmed });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      if (state.project) {
        setValue(state.project.name);
      } else {
        setValue(state.projectName || 'Untitled Project');
      }
      setIsEditing(false);
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        className="bg-gray-800 text-white border border-purple-500 rounded px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 max-w-xs sm:max-w-md w-full"
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        autoFocus
        onFocus={e => e.target.select()}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="group flex items-center gap-1.5 cursor-pointer hover:bg-gray-800/80 px-2 py-1 rounded transition max-w-xs sm:max-w-md"
      title="Click to rename"
    >
      <span className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
        {value || 'Untitled Project'}
      </span>
      <span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
        ✏️
      </span>
    </div>
  );
}
