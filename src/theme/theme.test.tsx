// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeToggle } from '../components/ThemeToggle'
import { getTheme, initTheme, setTheme } from './theme'

const mockSystemDark = (dark: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: dark && query.includes('dark'), media: query }))

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})
afterEach(() => vi.unstubAllGlobals())

describe('theme', () => {
  it('follows the system preference when nothing is saved', () => {
    mockSystemDark(true)
    initTheme()
    expect(getTheme()).toBe('dark')
  })

  it('defaults to light when the system prefers light', () => {
    mockSystemDark(false)
    initTheme()
    expect(getTheme()).toBe('light')
  })

  it('prefers a saved choice over the system preference', () => {
    mockSystemDark(true)
    localStorage.setItem('dance360:theme', 'light')
    initTheme()
    expect(getTheme()).toBe('light')
  })

  it('ignores a corrupt saved value', () => {
    mockSystemDark(false)
    localStorage.setItem('dance360:theme', 'purple')
    initTheme()
    expect(getTheme()).toBe('light')
  })

  it('setTheme applies and remembers the choice', () => {
    setTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('dance360:theme')).toBe('dark')
  })

  it('still applies the theme when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => setTheme('dark')).not.toThrow()
    expect(getTheme()).toBe('dark')
    vi.restoreAllMocks()
  })

  it('survives unreadable storage on startup', () => {
    mockSystemDark(true)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => initTheme()).not.toThrow()
    expect(getTheme()).toBe('dark')
    vi.restoreAllMocks()
  })
})

describe('ThemeToggle', () => {
  it('switches between light and dark and updates its label', async () => {
    setTheme('light')
    const user = userEvent.setup()
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
    expect(getTheme()).toBe('dark')
    await user.click(screen.getByRole('button', { name: 'Switch to light theme' }))
    expect(getTheme()).toBe('light')
  })
})
