import { useState } from 'react'
import { DancerPanel } from './components/DancerPanel'
import { FormationStrip } from './components/FormationStrip'
import { StageCanvas } from './components/StageCanvas'
import { useProject } from './model/store'

export default function App() {
  const projectName = useProject((s) => s.name)
  // On small screens the dancer panel is a slide-over drawer.
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="flex h-dvh flex-col bg-slate-100 text-slate-900">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <button
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm md:hidden"
          onClick={() => setDrawerOpen(true)}
        >
          Dancers
        </button>
        <h1 className="text-lg font-semibold">Dance 360</h1>
        <span className="text-slate-400">›</span>
        <span className="text-slate-600">{projectName}</span>
        <span className="text-slate-400">›</span>
        <span className="text-slate-600">Stage</span>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* Dancer panel: sidebar on desktop/iPad landscape, drawer on phone */}
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:block">
          <DancerPanel />
        </aside>

        {drawerOpen && (
          <div className="absolute inset-0 z-10 flex md:hidden">
            <aside className="w-72 max-w-[85%] bg-white shadow-xl">
              <DancerPanel />
            </aside>
            <button
              className="flex-1 bg-black/30"
              aria-label="Close dancer panel"
              onClick={() => setDrawerOpen(false)}
            />
          </div>
        )}

        <main className="min-w-0 flex-1">
          <StageCanvas />
        </main>
      </div>

      <footer className="border-t border-slate-200 bg-white">
        <FormationStrip />
      </footer>
    </div>
  )
}
