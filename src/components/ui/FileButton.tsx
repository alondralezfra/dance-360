import { useRef } from 'react'
import { Button, type ButtonProps } from './Button'

interface FileButtonProps extends Omit<ButtonProps, 'onClick' | 'type'> {
  /** Which files the picker offers, as for an <input type="file">, e.g. "audio/*". */
  accept?: string
  /** Called with the chosen file. Not called if the picker is cancelled. */
  onFile: (file: File) => void
}

/**
 * A button that opens the device's file picker. The real file input is hidden and
 * driven by the button, so it looks and behaves like every other button.
 */
export function FileButton({ accept, onFile, children, ...buttonProps }: FileButtonProps) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <Button {...buttonProps} onClick={() => input.current?.click()}>
        {children}
      </Button>
      <input
        ref={input}
        type="file"
        accept={accept}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = '' // choosing the same file again must still fire
          if (file) onFile(file)
        }}
      />
    </>
  )
}
