import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Drawer } from '../../components/ui/Drawer'
import { DancerPanel } from '../cast/DancerPanel'
import { FormationStrip } from './FormationStrip'
import { StageCanvas } from './StageCanvas'

export function StagePage() {
  // On small screens the dancer panel is a slide-over drawer.
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1">
        {/* Dancer panel: sidebar on desktop/iPad landscape, drawer on phone */}
        <aside className="hidden w-64 shrink-0 border-r border-border bg-surface md:block">
          <DancerPanel />
        </aside>

        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} title="Dancers">
          <DancerPanel />
        </Drawer>

        <main className="relative min-w-0 flex-1">
          <Button
            className="absolute left-2 top-2 z-10 md:hidden"
            onClick={() => setDrawerOpen(true)}
          >
            Dancers
          </Button>
          <StageCanvas />
        </main>
      </div>

      <footer className="border-t border-border bg-surface">
        <FormationStrip />
      </footer>
    </div>
  )
}
