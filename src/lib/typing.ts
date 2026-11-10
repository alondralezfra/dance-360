const TEXT_INPUT_TYPES = new Set(['text', 'search', 'number', 'email', 'url', 'tel', 'password', ''])

/** A place where keys are for typing (a text box, a number field, an editable area), so shortcuts must stay out of the way. */
export function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable || target instanceof HTMLTextAreaElement) return true
  return target instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(target.type)
}

/** Anything the keyboard already operates (a button, link, checkbox, slider, dropdown), where a key like Space has its own meaning. */
export function isInteractive(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest('a, button, input, select, textarea, summary, [role="button"], [contenteditable="true"]') !== null
}
