import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebase'
import { useAuth } from '../context/AuthContext'

function ImageUpload({ label, currentUrl, onUpload }) {
  const [busy, setBusy] = useState(false)

  const handleChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      await onUpload(file)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="upload-block">
      <span className="upload-label">{label}</span>
      {currentUrl ? (
        <img className="upload-preview" src={currentUrl} alt={label} />
      ) : (
        <div className="upload-placeholder">No {label.toLowerCase()} yet</div>
      )}
      <label className="btn file-btn">
        {busy ? 'Uploading…' : `Upload ${label.toLowerCase()}`}
        <input type="file" accept="image/*" hidden onChange={handleChange} disabled={busy} />
      </label>
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
  })
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const set = (field) => (e) => {
    setSaved(false)
    setForm({ ...form, [field]: e.target.value })
  }

  const uploadImage = (field) => async (file) => {
    const storageRef = ref(storage, `users/${user.uid}/${field}`)
    await uploadBytes(storageRef, file, { contentType: file.type })
    const url = await getDownloadURL(storageRef)
    await updateDoc(doc(db, 'users', user.uid), { [field === 'headshot' ? 'headshotUrl' : 'logoUrl']: url })
    await refreshProfile()
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
      })
      await refreshProfile()
      setSaved(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="narrow">
      <h1>My Profile</h1>
      <p className="muted">
        Your headshot, logo, and contact info are used to generate marketing content on your behalf.
      </p>

      <div className="upload-row">
        <ImageUpload label="Headshot" currentUrl={profile?.headshotUrl} onUpload={uploadImage('headshot')} />
        <ImageUpload label="Logo" currentUrl={profile?.logoUrl} onUpload={uploadImage('logo')} />
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
        <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
        {saved && <span className="saved-msg">Saved ✓</span>}
      </form>
    </div>
  )
}
