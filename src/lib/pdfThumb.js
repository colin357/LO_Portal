import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// pdf.js needs a worker; Vite gives us a hashed URL for it at build time.
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

// Renders the first page of a PDF onto a canvas at the given pixel width.
// `source` is passed straight to getDocument: { url } to fetch (needs Storage
// CORS) or { data } for an in-memory ArrayBuffer/Uint8Array (no CORS).
async function renderFirstPage(source, width) {
  const pdf = await pdfjsLib.getDocument(source).promise
  try {
    const page = await pdf.getPage(1)
    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: width / base.width })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: ctx, viewport }).promise
    return canvas
  } finally {
    pdf.destroy()
  }
}

// Fallback for documents without a stored preview: render from the file URL.
// Requires CORS on the Storage bucket; throws otherwise so callers can fall back.
export async function renderPdfThumbnail(url, width = 400) {
  const canvas = await renderFirstPage({ url }, width)
  return canvas.toDataURL('image/png')
}

// Generates a preview PNG Blob from a local File/Blob (e.g. at upload time).
// Reads the bytes in-memory, so it never touches the network — no CORS needed.
// Returns null if the file isn't a renderable PDF.
export async function makePdfPreviewBlob(file, width = 480) {
  try {
    const data = new Uint8Array(await file.arrayBuffer())
    const canvas = await renderFirstPage({ data }, width)
    return await new Promise((res) => canvas.toBlob((b) => res(b), 'image/png'))
  } catch (err) {
    console.warn('Could not generate PDF preview:', err)
    return null
  }
}
