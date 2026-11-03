import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Unmount anything a component test rendered, so tests can't leak into each other.
afterEach(() => cleanup())
