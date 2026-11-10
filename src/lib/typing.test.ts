// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { isInteractive, isTextEntry } from './typing'

const make = (html: string) => {
  const host = document.createElement('div')
  host.innerHTML = html
  document.body.append(host)
  return host.firstElementChild as HTMLElement
}

describe('isTextEntry', () => {
  it('is true where you type', () => {
    expect(isTextEntry(make('<input />'))).toBe(true)
    expect(isTextEntry(make('<input type="text" />'))).toBe(true)
    expect(isTextEntry(make('<input type="number" />'))).toBe(true)
    expect(isTextEntry(make('<input type="search" />'))).toBe(true)
    expect(isTextEntry(make('<textarea></textarea>'))).toBe(true)
  })

  it('is false for controls you do not type into', () => {
    expect(isTextEntry(make('<input type="checkbox" />'))).toBe(false)
    expect(isTextEntry(make('<input type="range" />'))).toBe(false)
    expect(isTextEntry(make('<button>Go</button>'))).toBe(false)
    expect(isTextEntry(make('<div>text</div>'))).toBe(false)
  })

  it('is false for things that are not elements', () => {
    expect(isTextEntry(null)).toBe(false)
    expect(isTextEntry(window)).toBe(false)
    expect(isTextEntry(document)).toBe(false)
  })
})

describe('isInteractive', () => {
  it('is true for controls the keyboard already operates, and for what is inside them', () => {
    expect(isInteractive(make('<button>Go</button>'))).toBe(true)
    expect(isInteractive(make('<a href="#x">x</a>'))).toBe(true)
    expect(isInteractive(make('<input type="range" />'))).toBe(true)
    expect(isInteractive(make('<input type="checkbox" />'))).toBe(true)
    expect(isInteractive(make('<select><option>a</option></select>'))).toBe(true)
    expect(isInteractive(make('<button><span id="inner">x</span></button>').querySelector('#inner'))).toBe(true)
    expect(isInteractive(make('<div role="button">x</div>'))).toBe(true)
  })

  it('is false for plain content and the page itself', () => {
    expect(isInteractive(make('<div>text</div>'))).toBe(false)
    expect(isInteractive(document.body)).toBe(false)
    expect(isInteractive(null)).toBe(false)
    expect(isInteractive(window)).toBe(false)
  })
})
