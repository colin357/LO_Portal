import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import ImageCropper from '../components/ImageCropper'
import { uploadImageAsset, CROP_PRESETS } from '../lib/imageAssets'

// Firestore field names per asset type.
const KEYS = {
  headshot: { url: 'headshotUrl', original: 'headshotOriginalUrl' },
  logo: { url: 'logoUrl', original: 'logoOriginalUrl' },
}

function ImageUpload({ label, currentUrl, hasOriginal, busy, onPick, onAdjust }) {
  return (
    <div className="upload-block">
      <span className="upload-label">{label}</span>
      {currentUrl ? (
        <img className="upload-preview" src={currentUrl} alt={label} />
      ) : (
        <div className="upload-placeholder">No {label.toLowerCase()} yet</div>
      )}
      <label className="btn file-btn">
        {busy ? 'Working…' : currentUrl ? `Replace ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
        <input type="file" accept="image/*" hidden onChange={onPick} disabled={busy} />
      </label>
      {hasOriginal && (
        <button type="button" className="link-btn" onClick={onAdjust} disabled={busy}>
          Adjust crop
        </button>
      )}
    </div>
  )
}

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth()
  const [form, setForm] = useState({
    name: profile?.name || '',
    phone: profile?.phone || '',
    brokerage: profile?.brokerage || '',
    website: profile?.website || '',
    licenseNumber: profile?.licenseNumber || '',
    brandColor: profile?.brandColor || '#2563eb',
    tagline: profile?.tagline || '',
  })
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  // Active crop editor: { field, src, original: File|null }. null = closed.
  const [cropper, setCropper] = useState(null)

  const set = (field) => (e) => {
    setSaved(false)
    setForm({ ...form, [field]: e.target.value })
  }

  // Pick a new file → open the cropper on it, keeping the raw file as the original.
  const pickFile = (field) => (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setCropper({ field, src: URL.createObjectURL(file), original: file })
  }

  // Re-crop an already-uploaded image using its stored original.
  const adjustCrop = (field) => () => {
    const url = profile?.[KEYS[field].original]
    if (!url) return
    setCropper({ field, src: url, original: null })
  }

  const closeCropper = () => {
    if (cropper?.original) URL.revokeObjectURL(cropper.src)
    setCropper(null)
  }

  const saveCrop = async (blob) => {
    const { field, original } = cropper
    setBusy(true)
    try {
      const res = await uploadImageAsset(user.uid, field, { blob, original })
      const update = { [KEYS[field].url]: res.url }
      if (res.originalUrl) update[KEYS[field].original] = res.originalUrl
      await updateDoc(doc(db, 'users', user.uid), update)
      await refreshProfile()
      closeCropper()
    } finally {
      setBusy(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: form.name.trim(),
        phone: form.phone.trim(),
        brokerage: form.brokerage.trim(),
        website: form.website.trim(),
        licenseNumber: form.licenseNumber.trim(),
        brandColor: form.brandColor,
        tagline: form.tagline.trim(),
      })
      await refreshProfile()
      setSaved(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="narrow">
      <p className="muted">
        Your headshot, logo, and contact info are used to generate marketing content on your behalf.
      </p>

      <div className="upload-row">
        <ImageUpload
          label="Headshot"
          currentUrl={profile?.headshotUrl}
          hasOriginal={!!profile?.headshotOriginalUrl}
          busy={busy}
          onPick={pickFile('headshot')}
          onAdjust={adjustCrop('headshot')}
        />
        <ImageUpload
          label="Logo"
          currentUrl={profile?.logoUrl}
          hasOriginal={!!profile?.logoOriginalUrl}
          busy={busy}
          onPick={pickFile('logo')}
          onAdjust={adjustCrop('logo')}
        />
      </div>

      <form onSubmit={handleSave} className="card form-card">
        <label>Full name
          <input required value={form.name} onChange={set('name')} />
        </label>
        <label>Phone
          <input value={form.phone} onChange={set('phone')} />
        </label>
        <label>Brokerage
          <input value={form.brokerage} onChange={set('brokerage')} />
        </label>
        <label>Website
          <input value={form.website} onChange={set('website')} placeholder="https://" />
        </label>
        <label>License #
          <input value={form.licenseNumber} onChange={set('licenseNumber')} />
        </label>
        <label>Brand color
          <input type="color" value={form.brandColor} onChange={set('brandColor')} style={{ maxWidth: 80, height: 40, padding: 4 }} />
        </label>
        <label>Tagline / slogan
          <input value={form.tagline} onChange={set('tagline')} placeholder="e.g. Your trusted partner in real estate" />
        </label>
        <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
        {saved && <span className="saved-msg">Saved ✓</span>}
      </form>

      {cropper && (
        <ImageCropper
          src={cropper.src}
          presets={CROP_PRESETS[cropper.field]}
          title={`Crop ${cropper.field}`}
          onCancel={closeCropper}
          onSave={saveCrop}
        />
      )}
    </div>
  )
}
