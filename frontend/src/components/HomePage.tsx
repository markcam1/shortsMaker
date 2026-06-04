import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Project } from '../api/types';

interface Props {
  onNewProject: () => void;
  onLibrary: () => void;
  onOpen: (project: Project) => void;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function HomePage({ onNewProject, onLibrary, onOpen }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.projects.list()
      .then(ps => {
        setProjects(ps.slice().reverse());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-start overflow-x-hidden overflow-y-auto bg-[#0a0a0c] text-white pt-16 md:pt-24 lg:pt-28 pb-16 px-6">
      {/* Decorative background glow blobs */}
      <div className="absolute top-[-25%] left-[-15%] h-[600px] w-[600px] rounded-full bg-purple-900/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-25%] right-[-15%] h-[600px] w-[600px] rounded-full bg-indigo-900/10 blur-[130px] pointer-events-none" />

      {/* Spaced container optimized for desktop (max-w-4xl / max-w-5xl) and mobile */}
      <div className="relative z-10 w-full max-w-xl md:max-w-4xl lg:max-w-5xl flex flex-col items-center text-center">
        
        {/* Brand Logo Icon */}
        <div className="mb-6 flex items-center justify-center h-16 w-16 md:h-20 md:w-20 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-500 shadow-2xl shadow-purple-950/50 transform hover:rotate-6 transition duration-300">
          <span className="text-3xl md:text-4xl">🎬</span>
        </div>

        {/* Title & Subtitle */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
          shortsMaker
        </h1>
        <p className="mt-3 text-sm sm:text-base md:text-lg text-gray-400 font-medium max-w-lg leading-relaxed">
          Convert text transcripts and glossary files into stunning, ready-to-share social media cards and storyboards.
        </p>

        {/* Main interactive grid cards: Made significantly larger for desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full mt-12 md:mt-16">
          {/* New Project Button Card */}
          <button
            onClick={onNewProject}
            className="group relative flex flex-col items-start text-left p-6 md:p-10 rounded-3xl bg-gradient-to-br from-purple-950/30 to-indigo-950/20 border border-purple-500/20 hover:border-purple-500/40 shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-purple-900/30 cursor-pointer active:scale-[0.98] w-full"
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-600 to-indigo-600 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300" />
            <div className="mb-6 flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-2xl bg-purple-500/10 text-3xl group-hover:scale-110 transition-transform duration-300">
              ✨
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white group-hover:text-purple-300 transition-colors">
              New Project
            </h2>
            <p className="mt-3 text-xs md:text-sm text-gray-400 leading-relaxed max-w-sm">
              Upload a content file to parse terms, generate AI image prompts, and design custom aspect-ratio storyboards or text quote cards.
            </p>
            <div className="mt-8 md:mt-12 flex items-center text-xs md:text-sm font-bold text-purple-400 group-hover:translate-x-1.5 transition-transform duration-300">
              Start creating <span className="ml-1.5">→</span>
            </div>
          </button>

          {/* My Library Button Card */}
          <button
            onClick={onLibrary}
            className="group relative flex flex-col items-start text-left p-6 md:p-10 rounded-3xl bg-gray-900/30 border border-gray-800 hover:border-gray-700 shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl cursor-pointer active:scale-[0.98] w-full"
          >
            <div className="absolute inset-0 rounded-3xl bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="mb-6 flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-2xl bg-gray-800 text-3xl group-hover:scale-110 transition-transform duration-300">
              📂
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white group-hover:text-purple-300 transition-colors flex items-center justify-between w-full">
              <span>My Library</span>
              {!loading && projects.length > 0 && (
                <span className="rounded-full bg-purple-900/30 border border-purple-500/20 px-2.5 py-0.5 text-xs md:text-sm font-semibold text-purple-300">
                  {projects.length}
                </span>
              )}
            </h2>
            <p className="mt-3 text-xs md:text-sm text-gray-400 leading-relaxed max-w-sm">
              Access and manage your projects. Edit existing templates, adjust text overlays, duplicate workflows, and run zip exports.
            </p>
            <div className="mt-8 md:mt-12 flex items-center text-xs md:text-sm font-bold text-gray-400 group-hover:translate-x-1.5 group-hover:text-white transition-all duration-300">
              Open library <span className="ml-1.5">→</span>
            </div>
          </button>
        </div>

        {/* Recent Projects dashboard list */}
        {!loading && projects.length > 0 && (
          <div className="w-full mt-16 md:mt-20 flex flex-col items-start text-left animate-fade-in">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 px-1">
              Recent Projects
            </h3>
            <div className="flex flex-col gap-3 w-full">
              {projects.slice(0, 3).map(p => (
                <button
                  key={p.id}
                  onClick={() => onOpen(p)}
                  className="flex items-center justify-between p-4 rounded-2xl border border-gray-900/50 bg-gray-900/20 hover:border-gray-800 hover:bg-gray-900/40 transition-all text-left text-sm md:text-base cursor-pointer group w-full"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{p.format === 'quote' ? '💬' : '🖼️'}</span>
                    <div>
                      <p className="font-bold text-gray-300 group-hover:text-white transition-colors truncate max-w-[200px] sm:max-w-[400px] md:max-w-[600px]">
                        {p.name}
                      </p>
                      <p className="text-[11px] md:text-xs text-gray-500 mt-1">
                        {p.format === 'quote' ? 'Quote Post' : 'Image Post'} · {p.aspect} · {formatDate(p.created_at)}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs md:text-sm text-gray-500 group-hover:text-purple-400 transition-colors group-hover:translate-x-0.5 transform duration-200">
                    Resume →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
