import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { normalizeUrl } from '../../model/resources'
import { useProject } from '../../store/projectStore'

/** Paste a web address (and, if you like, a title) to add a link. */
export function AddLinkForm() {
  const addResource = useProject((s) => s.addResource)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [problem, setProblem] = useState<string | null>(null)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (normalizeUrl(url) === null) {
      setProblem(
        url.trim() === ''
          ? 'Paste a web address first.'
          : 'That is not a web link. Paste an address that starts with http:// or https:// (or a site name like youtube.com/watch...).',
      )
      return
    }
    addResource({ title, url })
    setUrl('')
    setTitle('')
    setProblem(null)
  }

  return (
    <form onSubmit={submit} className="mb-3 grid gap-2" noValidate>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            setProblem(null)
          }}
          aria-label="Web address of the new link"
          aria-invalid={problem ? true : undefined}
          placeholder="Paste a link (YouTube, Drive...)"
          inputMode="url"
          className="min-w-0 flex-[2_1_14rem]"
        />
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Title of the new link"
          placeholder="Title (optional)"
          className="min-w-0 flex-[1_1_10rem]"
        />
        <Button type="submit" variant="primary">
          + Add link
        </Button>
      </div>
      {problem && (
        <p role="alert" className="text-sm text-danger">
          {problem}
        </p>
      )}
    </form>
  )
}
