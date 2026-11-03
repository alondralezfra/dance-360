import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Dancer, Formation, Id, Point, Project } from './types'

const newId = () => crypto.randomUUID()

/** Keep a point inside the stage boundaries. */
export function clampToStage(p: Point, width: number, depth: number): Point {
  return {
    x: Math.min(Math.max(p.x, 0), width),
    y: Math.min(Math.max(p.y, 0), depth),
  }
}

/** Pick a starting spot for a newly added dancer: a loose row across the front. */
function defaultSpot(index: number, width: number, depth: number): Point {
  const perRow = 8
  const row = Math.floor(index / perRow)
  const col = index % perRow
  const spacing = width / (perRow + 1)
  return clampToStage(
    { x: spacing * (col + 1), y: depth - 3 - row * 3 },
    width,
    depth,
  )
}

interface ProjectState extends Project {
  currentFormationId: Id
  selectedDancerId: Id | null

  addDancer: (name: string) => void
  renameDancer: (id: Id, name: string) => void
  removeDancer: (id: Id) => void
  selectDancer: (id: Id | null) => void

  addFormation: () => void
  removeFormation: (id: Id) => void
  renameFormation: (id: Id, name: string) => void
  selectFormation: (id: Id) => void

  moveDancer: (formationId: Id, dancerId: Id, p: Point) => void
  resetProject: () => void
}

function initialProject(): Project & { currentFormationId: Id } {
  const formation: Formation = { id: newId(), name: 'Formation 1', positions: {} }
  return {
    name: 'My Dance',
    stage: { width: 40, depth: 24 },
    dancers: [],
    formations: [formation],
    currentFormationId: formation.id,
  }
}

export const useProject = create<ProjectState>()(
  persist(
    (set, get) => ({
      ...initialProject(),
      selectedDancerId: null,

      addDancer: (name) =>
        set((s) => {
          const dancer: Dancer = { id: newId(), name: name.trim() || 'New dancer' }
          const spot = defaultSpot(s.dancers.length, s.stage.width, s.stage.depth)
          return {
            dancers: [...s.dancers, dancer],
            // A new dancer gets a spot in every existing formation.
            formations: s.formations.map((f) => ({
              ...f,
              positions: { ...f.positions, [dancer.id]: spot },
            })),
          }
        }),

      renameDancer: (id, name) =>
        set((s) => ({
          dancers: s.dancers.map((d) => (d.id === id ? { ...d, name } : d)),
        })),

      removeDancer: (id) =>
        set((s) => ({
          dancers: s.dancers.filter((d) => d.id !== id),
          formations: s.formations.map((f) => {
            const { [id]: _removed, ...rest } = f.positions
            return { ...f, positions: rest }
          }),
          selectedDancerId: s.selectedDancerId === id ? null : s.selectedDancerId,
        })),

      selectDancer: (id) => set({ selectedDancerId: id }),

      addFormation: () => {
        // New formations start as a copy of the current one, since the next
        // formation is usually a small change from the last.
        const s = get()
        const current = s.formations.find((f) => f.id === s.currentFormationId)
        const formation: Formation = {
          id: newId(),
          name: `Formation ${s.formations.length + 1}`,
          positions: { ...(current?.positions ?? {}) },
        }
        const index = s.formations.findIndex((f) => f.id === s.currentFormationId)
        const formations = [...s.formations]
        formations.splice(index + 1, 0, formation)
        set({ formations, currentFormationId: formation.id })
      },

      removeFormation: (id) => {
        const s = get()
        if (s.formations.length <= 1) return // always keep at least one
        const index = s.formations.findIndex((f) => f.id === id)
        const formations = s.formations.filter((f) => f.id !== id)
        const next = formations[Math.max(0, index - 1)]
        set({
          formations,
          currentFormationId:
            s.currentFormationId === id ? next.id : s.currentFormationId,
        })
      },

      renameFormation: (id, name) =>
        set((s) => ({
          formations: s.formations.map((f) => (f.id === id ? { ...f, name } : f)),
        })),

      selectFormation: (id) => set({ currentFormationId: id }),

      moveDancer: (formationId, dancerId, p) =>
        set((s) => ({
          formations: s.formations.map((f) =>
            f.id === formationId
              ? {
                  ...f,
                  positions: {
                    ...f.positions,
                    [dancerId]: clampToStage(p, s.stage.width, s.stage.depth),
                  },
                }
              : f,
          ),
        })),

      resetProject: () => set({ ...initialProject(), selectedDancerId: null }),
    }),
    {
      // Saves to the browser's local storage so work survives a page refresh.
      // This will be replaced by cloud saving (Supabase) in a later step.
      name: 'dance360-project',
      partialize: (s) => ({
        name: s.name,
        stage: s.stage,
        dancers: s.dancers,
        formations: s.formations,
        currentFormationId: s.currentFormationId,
      }),
    },
  ),
)

/** Convenience hook: the formation currently being edited. */
export function useCurrentFormation(): Formation {
  return useProject(
    (s) => s.formations.find((f) => f.id === s.currentFormationId) ?? s.formations[0],
  )
}
