// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadTextFile } from './download'

let blobs: Blob[]
let clicked: { href: string; download: string }[]

beforeEach(() => {
  vi.useFakeTimers()
  blobs = []
  clicked = []
  URL.createObjectURL = vi.fn((blob: Blob) => {
    blobs.push(blob)
    return 'blob:fake'
  })
  URL.revokeObjectURL = vi.fn()
  // jsdom does not navigate or download; watch the click instead
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    clicked.push({ href: this.href, download: this.download })
  })
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('downloadTextFile', () => {
  it('clicks a link to the text, named as asked', async () => {
    downloadTextFile('Show.dance360.json', '{"a":1}')
    expect(clicked).toEqual([{ href: 'blob:fake', download: 'Show.dance360.json' }])
    expect(blobs[0].type).toBe('application/json')
    expect(await blobs[0].text()).toBe('{"a":1}')
  })

  it('leaves no link behind in the page', () => {
    downloadTextFile('x.json', '{}')
    expect(document.querySelector('a[download]')).toBeNull()
  })

  it('lets go of the data a little later, not before the browser has used it', () => {
    downloadTextFile('x.json', '{}')
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    vi.advanceTimersByTime(10_000)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake')
  })

  it('can be given another type', () => {
    downloadTextFile('x.txt', 'hi', 'text/plain')
    expect(blobs[0].type).toBe('text/plain')
  })
})
