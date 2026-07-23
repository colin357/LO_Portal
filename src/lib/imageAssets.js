import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase'

// Uploads a cropped image asset (headshot/logo) for a user. The cropped PNG is
// what the app displays everywhere; the untouched original is kept alongside it
// (as {field}-original) so the crop can be re-adjusted later without asking the
// user to re-pick the file.
//   field: 'headshot' | 'logo'
//   blob: the cropped PNG Blob to display
//   original: the raw picked File (only on a fresh upload; omit when re-cropping)
export async function uploadImageAsset(uid, field, { blob, original }) {
  const result = {}
  if (original) {
    const oRef = ref(storage, `users/${uid}/${field}-original`)
    await uploadBytes(oRef, original, { contentType: original.type || 'application/octet-stream' })
    result.originalUrl = await getDownloadURL(oRef)
  }
  const cRef = ref(storage, `users/${uid}/${field}`)
  await uploadBytes(cRef, blob, { contentType: 'image/png' })
  result.url = await getDownloadURL(cRef)
  return result
}

// Aspect-ratio presets offered in the cropper per asset type.
export const CROP_PRESETS = {
  // Headshots are shown as square avatars — lock to a square crop.
  headshot: [{ label: 'Square', value: 1 }],
  // Logos vary; default to keeping the original shape, with square/wide options.
  logo: [
    { label: 'Original', value: 'original' },
    { label: 'Square', value: 1 },
    { label: 'Wide', value: 16 / 9 },
  ],
}
