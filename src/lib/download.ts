/** Offers some text to the person as a file download (their browser saves it, usually to Downloads). */
export function downloadTextFile(fileName: string, text: string, mime = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  document.body.append(link)
  link.click()
  link.remove()
  // The browser starts the download straight away; let go of the data shortly after.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
