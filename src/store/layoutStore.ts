import { create } from 'zustand'
import { loadDevicePreferences, saveDevicePreferences } from '../persistence/devicePreferences'

// Which panels are open. Per device and remembered, but not part of any project
// (see persistence/devicePreferences.ts), so it lives apart from projectStore.

interface LayoutState {
  sidebarOpen: boolean
  notesOpen: boolean
  formationBarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  setNotesOpen: (open: boolean) => void
  setFormationBarOpen: (open: boolean) => void
}

export const useLayout = create<LayoutState>()((set, get) => {
  const remember = () => {
    const { sidebarOpen, notesOpen, formationBarOpen } = get()
    saveDevicePreferences({ sidebarOpen, notesOpen, formationBarOpen })
  }
  return {
    sidebarOpen: loadDevicePreferences().sidebarOpen,
    notesOpen: loadDevicePreferences().notesOpen,
    formationBarOpen: loadDevicePreferences().formationBarOpen,
    setSidebarOpen: (open) => {
      set({ sidebarOpen: open })
      remember()
    },
    setNotesOpen: (open) => {
      set({ notesOpen: open })
      remember()
    },
    setFormationBarOpen: (open) => {
      set({ formationBarOpen: open })
      remember()
    },
  }
})
