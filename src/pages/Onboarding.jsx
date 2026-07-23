import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { IconUpload, IconCheck } from '../components/Icons'
import ImageCropper from '../components/ImageCropper'
import { uploadImageAsset, CROP_PRESETS } from '../lib/imageAssets'

const STEPS = ['Welcome', 'Your info', 'Headshot', 'Company logo', 'Branding']

function AssetUpload({ label, hint, currentUrl, busy, onPick, onAdjust, hasOriginal }) {
  return (
    <div className="onb-asset">
      {currentUrl
        ? <img className="onb-asset-preview" src={currentUrl} alt={label} />
        : <div className="onb-asset-placeholder"><IconUpload size={26} /><span>{hint}</span></div>}
      <label className="btn ghost">
        {busy ? 'Working…' : (currentUrl ? `Replace ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`)}
        <input type="file" accept="image/*" hidden onChange={onPick} disabled={busy} />
      </label>
      {hasOriginal && (
        <button type="button" className="link-btn" onClick={onAdjust} disabled={busy}>Adjust crop</button>
      )}
    </div>
  )
}

// Firestore field names per asset type.
const KEYS = {
  headshot: { url: 'headshotUrl', original: 'headshotOriginalUrl' },
  logo: { url: 'logoUrl', original: 'logoOriginalUrl' },
}

// Post-signup wizard: collect the branding assets and details our design team
// needs to generate marketing content on the realtor's behalf.
export default function Onboarding() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  // Active crop editor: { field, src, original: File|null }. null = closed.
  const [cropper, setCropper] = useState(null)
  const [form, setForm] = useState({
    name: profile?.name || '',
    phone: profile?.phone || '',
    brokerage: profile?.brokerage || '',
    website: profile?.website || '',
    licenseNumber: profile?.licenseNumber || '',
    brandColor: profile?.brandColor || '#2563eb',
    tagline: profile?.tagline || '',
  })

  if (loading) return <div className="page-loading">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (!profile) return <Navigate to="/complete-profile" replace />
  // Already finished onboarding (or not an agent) — nothing to do here.
  if (profile.role !== 'agent' || profile.onboarded) return <Navigate to="/" replace />

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const pickFile = (field) => (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setCropper({ field, src: URL.createObjectURL(file), original: file })
  }

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

  const saveDetails = async () => {
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
  }

  const finish = async (skip = false) => {
    setBusy(true)
    try {
      if (!skip) await saveDetails()
      await updateDoc(doc(db, 'users', user.uid), { onboarded: true })
      await refreshProfile()
      navigate('/')
    } finally {
      setBusy(false)
    }
  }

  const next = async () => {
    if (step === 1) { setBusy(true); try { await saveDetails() } finally { setBusy(false) } }
    if (step === STEPS.length - 1) { await finish(); return }
    setStep((s) => Math.min(STEPS.length - 1, s + 1))
  }
  const back = () => setStep((s) => Math.max(0, s - 1))

  return (
    <div className="onb-page">
      <div className="onb-card">
        <div className="onb-steps">
          {STEPS.map((label, i) => (
            <div key={label} className={`onb-step${i === step ? ' active' : ''}${i < step ? ' done' : ''}`}>
              <span className="onb-step-dot">{i < step ? <IconCheck size={14} /> : i + 1}</span>
              <span className="onb-step-label">{label}</span>
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="onb-body">
            <h1>Welcome to Own It Social! 🎉</h1>
            <p className="muted">
              Let's set up your profile so we can create marketing content branded to <em>you</em>.
              It takes about a minute — we'll collect your headshot, company logo, and a few details
              our graphics need. You can update any of this later from your profile.
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="onb-body">
            <h1>Tell us about you</h1>
            <p className="muted">This info appears on your personalized marketing graphics.</p>
            <label>Full name
              <input required value={form.name} onChange={set('name')} />
            </label>
            <label>Phone
              <input value={form.phone} onChange={set('phone')} placeholder="(555) 123-4567" />
            </label>
            <label>Brokerage / company name
              <input value={form.brokerage} onChange={set('brokerage')} />
            </label>
            <label>Website
              <input value={form.website} onChange={set('website')} placeholder="https://" />
            </label>
            <label>License #
              <input value={form.licenseNumber} onChange={set('licenseNumber')} />
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="onb-body">
            <h1>Upload your headshot</h1>
            <p className="muted">
              A clear, professional headshot (square works best). This is placed on your
              personalized graphics.
            </p>
            <AssetUpload
              label="Headshot" hint="Drop a headshot"
              currentUrl={profile?.headshotUrl}
              hasOriginal={!!profile?.headshotOriginalUrl}
              busy={busy}
              onPick={pickFile('headshot')}
              onAdjust={adjustCrop('headshot')}
            />
          </div>
        )}

        {step === 3 && (
          <div className="onb-body">
            <h1>Upload your company logo</h1>
            <p className="muted">
              Your brokerage or personal logo. A transparent PNG looks best on templates.
            </p>
            <AssetUpload
              label="Logo" hint="Drop a logo"
              currentUrl={profile?.logoUrl}
              hasOriginal={!!profile?.logoOriginalUrl}
              busy={busy}
              onPick={pickFile('logo')}
              onAdjust={adjustCrop('logo')}
            />
          </div>
        )}

        {step === 4 && (
          <div className="onb-body">
            <h1>Brand details</h1>
            <p className="muted">Anything else our graphics team should know to match your brand.</p>
            <label>Brand color
              <input type="color" value={form.brandColor} onChange={set('brandColor')} className="onb-color" />
            </label>
            <label>Tagline / slogan (optional)
              <input value={form.tagline} onChange={set('tagline')} placeholder="e.g. Your trusted partner in real estate" />
            </label>
          </div>
        )}

        <div className="onb-footer">
          {step > 0
            ? <button className="btn ghost" onClick={back} disabled={busy}>Back</button>
            : <span />}
          <div className="onb-footer-right">
            <button className="link-btn" onClick={() => finish(true)} disabled={busy}>Skip for now</button>
            <button className="btn" onClick={next} disabled={busy}>
              {busy ? 'Saving…' : step === STEPS.length - 1 ? 'Finish' : step === 0 ? "Let's go" : 'Continue'}
            </button>
          </div>
        </div>
      </div>

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
