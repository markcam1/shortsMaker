import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { api } from '../api/client';
import type { Project } from '../api/types';

interface Props {
  onBack: () => void;
  onOpen: (project: Project) => void;
}

type ViewMode = 'tiles' | 'list';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function thumbnailUrl(p: Project): string | null {
  if (p.format === 'quote' && p.quote_ids.length > 0) {
    return `/api/projects/${p.id}/quotes/${p.quote_ids[0]}/image`;
  }
  if (p.format === 'image' && p.scene_ids.length > 0) {
    return `/api/projects/${p.id}/scenes/${p.scene_ids[0]}/image`;
  }
  return null;
}

function Thumbnail({ url, aspect, size = 'sm' }: { url: string | null; aspect: string; size?: 'sm' | 'lg' }) {
  const [failed, setFailed] = useState(false);
  const isPortrait = aspect === '9:16';

  const dimensions = size === 'lg'
    ? (isPortrait ? 'h-36 w-20' : 'h-20 w-36')
    : (isPortrait ? 'h-20 w-12' : 'h-12 w-20');

  if (!url || failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg bg-gray-800 text-gray-600 shrink-0 ${dimensions}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-1 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt=""
      onError={() => setFailed(true)}
      className={`rounded-lg object-cover shrink-0 ${dimensions}`}
    />
  );
}

// Inline rename input
function RenameInput({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  function commit() {
    const trimmed = value.trim();
    if (trimmed && trimmed !== initial) onCommit(trimmed);
    else onCancel();
  }

  return (
    <input
      ref={ref}
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') onCancel();
      }}
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      className="rounded border border-purple-500 bg-gray-900 px-2 py-0.5 text-sm font-medium text-white outline-none focus:ring-1 focus:ring-purple-500"
      style={{ width: `${Math.max(value.length, 8)}ch` }}
    />
  );
}

// Delete confirmation dialog
function DeleteDialog({
  project,
  open,
  onCancel,
  onConfirm,
}: {
  project: Project;
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (open) setTyped('');
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
          <Dialog.Title className="text-base font-semibold text-white">
            Delete &ldquo;{project.name}&rdquo;?
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-gray-400">
            This cannot be undone. Type the project name to confirm.
          </Dialog.Description>
          <input
            autoFocus
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder={project.name}
            className="mt-4 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              disabled={typed !== project.name}
              onClick={onConfirm}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Delete
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Per-project action menu (⋮ dropdown)
function ActionMenu({
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
}: {
  onOpen: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function action(fn: () => void) {
    setOpen(false);
    fn();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 text-gray-500 transition hover:border-gray-550 hover:bg-gray-800/50 hover:text-white cursor-pointer"
        aria-label="Project actions"
      >
        ⋮
      </button>
      {open && (
        <div
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          className="absolute right-0 top-9 z-30 min-w-[130px] rounded-xl border border-gray-700 bg-gray-900 py-1 shadow-xl"
        >
          {[
            { label: 'Open', fn: () => action(onOpen) },
            { label: 'Rename', fn: () => action(onRename) },
            { label: 'Duplicate', fn: () => action(onDuplicate) },
          ].map(({ label, fn }) => (
            <button
              key={label}
              onClick={e => { e.stopPropagation(); fn(); }}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white cursor-pointer"
            >
              {label}
            </button>
          ))}
          <div className="my-1 border-t border-gray-800" />
          <button
            onClick={e => { e.stopPropagation(); action(onDelete); }}
            className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-800 hover:text-red-300 cursor-pointer"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export function LibraryPage({ onBack, onOpen }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('tiles');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  useEffect(() => {
    api.projects.list()
      .then(ps => setProjects(ps.slice().reverse()))
      .finally(() => setLoading(false));
  }, []);

  async function handleRename(id: string, name: string) {
    const updated = await api.projects.rename(id, name);
    setProjects(ps => ps.map(p => (p.id === id ? updated : p)));
    setRenamingId(null);
  }

  async function handleDuplicate(id: string) {
    const copy = await api.projects.duplicate(id);
    setProjects(ps => [copy, ...ps]);
  }

  async function handleDelete(id: string) {
    await api.projects.delete(id);
    setProjects(ps => ps.filter(p => p.id !== id));
    setDeleteTarget(null);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0f0f11]">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-800 px-4 py-4 sm:px-8 bg-[#0a0a0c]">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600/10 hover:bg-purple-600/20 text-3xl transition shadow-md cursor-pointer shrink-0 border border-purple-500/10 hover:border-purple-500/30"
            title="Go Home"
          >
            🎬
          </button>
          <h1 className="text-lg font-bold text-white ml-2">My Library</h1>
        </div>
        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-700 overflow-hidden">
          <button
            onClick={() => setView('tiles')}
            title="Tile view"
            className={`px-3 py-1.5 text-sm transition ${
              view === 'tiles' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-white'
            }`}
          >
            ⊞
          </button>
          <button
            onClick={() => setView('list')}
            title="List view"
            className={`px-3 py-1.5 text-sm transition ${
              view === 'list' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-white'
            }`}
          >
            ≡
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-6 sm:px-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-800 text-gray-600">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V6h5.17l2 2H20v10z" />
              </svg>
            </div>
            <p className="text-gray-400">No projects yet</p>
            <button
              onClick={onBack}
              className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-purple-500"
            >
              + New Project
            </button>
          </div>
        ) : view === 'tiles' ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map(p => (
              <div
                key={p.id}
                onClick={() => onOpen(p)}
                className="group flex flex-col gap-4 rounded-2xl border border-gray-800 bg-gray-900/40 p-5 transition-all duration-300 hover:border-purple-500/40 hover:bg-gray-800/40 hover:shadow-xl hover:shadow-purple-500/5 cursor-pointer relative"
              >
                {/* Top: thumbnail + name + actions */}
                <div className="flex items-start gap-4">
                  <div className="relative overflow-hidden rounded-lg shrink-0">
                    <Thumbnail url={thumbnailUrl(p)} aspect={p.aspect} size="lg" />
                    {/* Hover indicator overlay */}
                    <div className="absolute inset-0 bg-purple-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <span className="text-white text-lg font-bold transform scale-75 group-hover:scale-100 transition-transform duration-200">➔</span>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-1 min-w-0">
                    {renamingId === p.id ? (
                      <RenameInput
                        initial={p.name}
                        onCommit={name => handleRename(p.id, name)}
                        onCancel={() => setRenamingId(null)}
                      />
                    ) : (
                      <p className="truncate font-semibold text-white group-hover:text-purple-300 transition-colors text-base leading-snug">{p.name}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span className="rounded bg-gray-800/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-300">
                        {p.format}
                      </span>
                      <span className="text-xs text-gray-500">{p.aspect}</span>
                      <span className="text-xs text-gray-500">·</span>
                      <span className="text-xs text-gray-500">{formatDate(p.created_at)}</span>
                    </div>
                  </div>
                  <ActionMenu
                    onOpen={() => onOpen(p)}
                    onRename={() => setRenamingId(p.id)}
                    onDuplicate={() => handleDuplicate(p.id)}
                    onDelete={() => setDeleteTarget(p)}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List view */
          <div className="flex flex-col divide-y divide-gray-800 rounded-2xl border border-gray-800 overflow-hidden bg-gray-900/20">
            {projects.map(p => (
              <div
                key={p.id}
                onClick={() => onOpen(p)}
                className="group flex items-center gap-4 bg-gray-900/40 px-5 py-4 transition-all duration-200 hover:bg-gray-800/40 cursor-pointer"
              >
                <div className="relative overflow-hidden rounded-lg shrink-0">
                  <Thumbnail url={thumbnailUrl(p)} aspect={p.aspect} size="sm" />
                  {/* Hover indicator overlay */}
                  <div className="absolute inset-0 bg-purple-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <span className="text-white text-xs font-bold transform scale-75 group-hover:scale-100 transition-transform duration-200">➔</span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-1 min-w-0">
                  {renamingId === p.id ? (
                    <RenameInput
                      initial={p.name}
                      onCommit={name => handleRename(p.id, name)}
                      onCancel={() => setRenamingId(null)}
                    />
                  ) : (
                    <p className="truncate font-semibold text-white group-hover:text-purple-300 transition-colors text-base leading-snug">
                      {p.name}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="rounded bg-gray-800/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-300">
                      {p.format}
                    </span>
                    <span className="text-xs text-gray-500">{p.aspect} · {formatDate(p.created_at)}</span>
                  </div>
                </div>
                <ActionMenu
                  onOpen={() => onOpen(p)}
                  onRename={() => setRenamingId(p.id)}
                  onDuplicate={() => handleDuplicate(p.id)}
                  onDelete={() => setDeleteTarget(p)}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <DeleteDialog
          project={deleteTarget}
          open={!!deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget.id)}
        />
      )}
    </div>
  );
}
