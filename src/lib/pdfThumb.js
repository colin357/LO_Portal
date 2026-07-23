import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// pdf.js needs a worker; Vite gives us a hashed URL for it at build time.
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

// Renders the first page of a PDF to a PNG data URL at the given pixel width.
// Fetching the PDF from Firebase Storage requires CORS on the bucket (the same
// `gsutil cors set cors.json` step smart templates already rely on). Throws on
// failure so callers can fall back to an icon.
export async function renderPdfThumbnail(url, width = 400) {
  const loadingTask = pdfjsLib.getDocument({ url })
  const pdf = await loadingTask.promise
  try {
    const page = await pdf.getPage(1)
    const base = page.getViewport({ scale: 1 })
    const scale = width / base.width
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')
    await page.render({ canvasContext: ctx, viewport }).promise
    return canvas.toDataURL('image/png')
  } finally {
    pdf.destroy()
  }
}
