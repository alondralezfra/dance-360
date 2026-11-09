import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Drawer } from '../../components/ui/Drawer'
import { Icon } from '../../components/ui/Icon'
import { IconButton } from '../../components/ui/IconButton'
import { cn } from '../../lib/cn'
import { useLayout } from '../../store/layoutStore'
import { DancerPanel } from '../cast/DancerPanel'
import { PartLegend } from '../cast/PartLegend'
import { FormationStrip } from './FormationStrip'
import { StageCanvas } from './StageCanvas'

// Panels slide away (width / row height animate) so the stage can use the room.
// Respecting reduced-motion, they just snap.
const SLIDE = 'transition-all duration-200 ease-out motion-reduce:transition-none'

export function StagePage() {
  // On small screens the dancer panel is a slide-over drawer.
  const [drawerOpen, setDrawerOpen] = useState(false)
  const sidebarOpen = useLayout((s) => s.sidebarOpen)
  const setSidebarOpen = useLayout((s) => s.setSidebarOpen)
  const formationBarOpen = useLayout((s) => s.formationBarOpen)
  const setFormationBarOpen = useLayout((s) => s.setFormationBarOpen)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1">
        {/* Dancer panel: sidebar on desktop/iPad landscape (collapsible), drawer on phone.
            The inner box keeps its width while the outer one slides, so nothing reflows. */}
        <aside
          inert={!sidebarOpen}
          className={cn(
            'hidden shrink-0 overflow-hidden bg-surface md:block',
            SLIDE,
            // `invisible` (after the slide) also hides it from screen readers and tests.
            sidebarOpen ? 'w-64 border-r border-border' : 'invisible w-0',
          )}
        >
          <div className="h-full w-64">
            <DancerPanel />
          </div>
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
          <IconButton
            className="absolute left-2 top-2 z-10 hidden md:inline-flex"
            icon={sidebarOpen ? 'chevronLeft' : 'chevronRight'}
            label={sidebarOpen ? 'Hide dancer panel' : 'Show dancer panel'}
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          />
          <PartLegend />
          <StageCanvas />
          {formationBarOpen ? (
            <IconButton
              className="absolute bottom-2 right-2 z-10"
              icon="chevronDown"
              label="Hide formation bar"
              aria-expanded
              onClick={() => setFormationBarOpen(false)}
            />
          ) : (
            <Button
              className="absolute bottom-2 right-2 z-10"
              aria-expanded={false}
              onClick={() => setFormationBarOpen(true)}
            >
              <Icon name="chevronUp" />
              Show formation bar
            </Button>
          )}
        </main>
      </div>

      {/* Bottom bar. Animating the grid row between 1fr and 0fr slides it to its natural height. */}
      <footer
        inert={!formationBarOpen}
        className={cn(
          'grid bg-surface',
          SLIDE,
          formationBarOpen ? 'grid-rows-[1fr] border-t border-border' : 'invisible grid-rows-[0fr]',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <FormationStrip />
        </div>
      </footer>
    </div>
  )
}
