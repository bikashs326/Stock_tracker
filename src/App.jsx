import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from './supabaseClient'
import AuthPage from './AuthPage'
import { extractProductName, extractLabelInfo } from './geminiService'

// ── Urgency helpers ───────────────────────────────────────────────────────────
const URGENCY_LEVELS = {
  EXPIRED:  { color: 'from-red-900/50 to-red-800/30',       badge: 'bg-red-500/20 text-red-300 border-red-500/40',      dot: 'bg-red-500',    glow: true  },
  CRITICAL: { color: 'from-orange-900/50 to-orange-800/30', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40', dot: 'bg-orange-500', glow: false },
  WARNING:  { color: 'from-yellow-900/40 to-yellow-800/20', badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40', dot: 'bg-yellow-400', glow: false },
  SAFE:     { color: 'from-emerald-900/30 to-emerald-800/10',badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',dot: 'bg-emerald-500',glow: false },
}

function getUrgency(expiryDate) {
  const today = new Date(); today.setHours(0,0,0,0)
  const expiry = new Date(expiryDate + 'T00:00:00'); expiry.setHours(0,0,0,0)
  const d = Math.ceil((expiry - today) / 86400000)
  if (d < 0)  return { ...URGENCY_LEVELS.EXPIRED,  daysLeft: d }
  if (d <= 3) return { ...URGENCY_LEVELS.CRITICAL, daysLeft: d }
  if (d <= 7) return { ...URGENCY_LEVELS.WARNING,  daysLeft: d }
  return               { ...URGENCY_LEVELS.SAFE,    daysLeft: d }
}

function formatDaysLeft(d) {
  if (d < 0)  return `Expired ${Math.abs(d)} day${Math.abs(d) !== 1 ? 's' : ''} ago`
  if (d === 0) return 'Expires today'
  if (d === 1) return '1 day left'
  return `${d} days left`
}

function formatDate(s) {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Camera modal ──────────────────────────────────────────────────────────────
function CameraModal({ title, hint, onCapture, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [facing, setFacing] = useState('environment')

  const start = useCallback(async (mode) => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } })
      streamRef.current = s
      if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play(); setReady(true) }
    } catch { alert('Camera not accessible. Use the upload button instead.'); onClose() }
  }, [onClose])

  useEffect(() => { start(facing); return () => streamRef.current?.getTracks().forEach(t => t.stop()) }, [])

  const flip = () => { const m = facing === 'environment' ? 'user' : 'environment'; setFacing(m); start(m) }

  const capture = () => {
    const c = document.createElement('canvas')
    c.width = videoRef.current.videoWidth; c.height = videoRef.current.videoHeight
    c.getContext('2d').drawImage(videoRef.current, 0, 0)
    streamRef.current?.getTracks().forEach(t => t.stop())
    onCapture(c.toDataURL('image/jpeg', 0.85))
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-sm">
        <div className="mb-3 text-center">
          <p className="text-white font-semibold text-lg">{title}</p>
          <p className="text-slate-400 text-sm mt-0.5">{hint}</p>
        </div>
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="relative bg-black">
            <video ref={videoRef} className="w-full aspect-[4/3] object-cover" playsInline muted />
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {/* Corner guides */}
            <div className="absolute inset-6 pointer-events-none">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/60 rounded-tl-sm" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/60 rounded-tr-sm" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white/60 rounded-bl-sm" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white/60 rounded-br-sm" />
            </div>
          </div>
          <div className="p-4 flex items-center justify-between gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors">Cancel</button>
            <button onClick={capture} disabled={!ready} className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-transform disabled:opacity-40">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button onClick={flip} className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors">Flip</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── AI scanning overlay ───────────────────────────────────────────────────────
function ScanningOverlay({ label }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center gap-4 animate-fade-in">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20" />
        <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        <div className="absolute inset-3 rounded-full bg-indigo-500/10 flex items-center justify-center">
          <span className="text-2xl">🤖</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-white font-semibold">{label}</p>
        <p className="text-slate-400 text-sm mt-1">Gemini is reading the image…</p>
      </div>
    </div>
  )
}

// ── Step indicator ────────────────────────────────────────────────────────────
function StepIndicator({ current, steps }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-5">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${
            i < current ? 'bg-emerald-500 text-white' :
            i === current ? 'bg-indigo-600 text-white ring-2 ring-indigo-400/40' :
            'bg-slate-800 text-slate-500'
          }`}>
            {i < current ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : i + 1}
          </div>
          {i < steps.length - 1 && (
            <div className={`w-8 h-0.5 rounded transition-all ${i < current ? 'bg-emerald-500' : 'bg-slate-700'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── AddProductForm with two-photo AI flow ─────────────────────────────────────
function AddProductForm({ onAdd }) {
  const STEPS = ['Product Photo', 'Label Photo', 'Review & Save']
  const [step, setStep] = useState(0)

  // Data
  const [productPhoto, setProductPhoto] = useState(null)
  const [labelPhoto, setLabelPhoto] = useState(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [lotNumber, setLotNumber] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // UI states
  const [showCamera, setShowCamera] = useState(false)
  const [cameraFor, setCameraFor] = useState(null) // 'product' | 'label'
  const [scanning, setScanning] = useState(false)
  const [scanLabel, setScanLabel] = useState('')
  const [scanError, setScanError] = useState('')

  const productFileRef = useRef(null)
  const labelFileRef = useRef(null)

  const openCamera = (which) => { setCameraFor(which); setShowCamera(true) }

  const handleCapture = async (dataUrl) => {
    setShowCamera(false)
    setScanError('')

    if (cameraFor === 'product') {
      setProductPhoto(dataUrl)
      setScanLabel('Reading product name…')
      setScanning(true)
      try {
        const n = await extractProductName(dataUrl)
        setName(n)
        setStep(1)
      } catch (e) {
        setScanError(`AI scan failed: ${e.message}. Please type the name manually.`)
        setStep(1)
      } finally { setScanning(false) }
    } else {
      setLabelPhoto(dataUrl)
      setScanLabel('Reading expiry date & lot number…')
      setScanning(true)
      try {
        const info = await extractLabelInfo(dataUrl)
        if (info.expiry_date) setExpiryDate(info.expiry_date)
        if (info.lot_number)  setLotNumber(info.lot_number)
        setStep(2)
      } catch (e) {
        setScanError(`AI scan failed: ${e.message}. Please fill in manually.`)
        setStep(2)
      } finally { setScanning(false) }
    }
  }

  const handleFile = async (e, which) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => handleCapture(ev.target.result)
    reader.readAsDataURL(file)
    setCameraFor(which)
    e.target.value = ''
  }

  const validate = () => {
    const e = {}
    if (!name.trim()) e.name = 'Product name is required'
    if (!expiryDate)  e.expiryDate = 'Expiry date is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    setSaving(true)
    await onAdd({ name: name.trim(), category: category.trim(), expiry_date: expiryDate, lot_number: lotNumber.trim(), photo: productPhoto })
    // Reset
    setStep(0); setProductPhoto(null); setLabelPhoto(null)
    setName(''); setCategory(''); setExpiryDate(''); setLotNumber(''); setErrors({})
    setSaving(false)
  }

  return (
    <>
      {showCamera && (
        <CameraModal
          title={cameraFor === 'product' ? '📦 Product Photo' : '🏷️ Label Photo'}
          hint={cameraFor === 'product' ? 'Point at the front of the product' : 'Point at the expiry date & lot number'}
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
      {scanning && <ScanningOverlay label={scanLabel} />}

      <div className="glass-card rounded-2xl p-5 space-y-4 animate-scale-in">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </span>
          Add Product
        </h2>

        <StepIndicator current={step} steps={STEPS} />

        {/* Scan error */}
        {scanError && (
          <div className="flex items-start gap-2 rounded-xl bg-orange-500/10 border border-orange-500/20 px-3.5 py-3 animate-fade-in">
            <svg className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-orange-300">{scanError}</p>
          </div>
        )}

        {/* ── STEP 0: Product Photo ── */}
        {step === 0 && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="rounded-2xl border-2 border-dashed border-slate-700/60 p-6 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto">
                <span className="text-3xl">📦</span>
              </div>
              <div>
                <p className="text-white font-semibold">Product Photo</p>
                <p className="text-slate-500 text-xs mt-1">AI will read the product name automatically</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => openCamera('product')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-sm font-medium border border-indigo-500/30 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Camera
                </button>
                <button type="button" onClick={() => productFileRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 text-sm font-medium border border-slate-700/50 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload
                </button>
              </div>
              <input ref={productFileRef} type="file" accept="image/*" onChange={(e) => handleFile(e, 'product')} className="hidden" />
            </div>
            <button type="button" onClick={() => setStep(1)}
              className="w-full py-2.5 rounded-xl text-slate-500 hover:text-slate-300 text-sm transition-colors text-center">
              Skip photo →
            </button>
          </div>
        )}

        {/* ── STEP 1: Label Photo ── */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in-up">
            {/* Show product photo thumbnail + extracted name */}
            {productPhoto && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <img src={productPhoto} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" alt="product" />
                <div className="min-w-0">
                  <p className="text-xs text-emerald-400 font-medium">✓ Product identified</p>
                  <p className="text-sm text-white font-semibold truncate">{name || 'Unknown Product'}</p>
                </div>
                <button onClick={() => setStep(0)} className="ml-auto p-1 text-slate-500 hover:text-white transition-colors flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            )}

            <div className="rounded-2xl border-2 border-dashed border-slate-700/60 p-6 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto">
                <span className="text-3xl">🏷️</span>
              </div>
              <div>
                <p className="text-white font-semibold">Label Photo</p>
                <p className="text-slate-500 text-xs mt-1">AI will read expiry date & lot number</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => openCamera('label')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-sm font-medium border border-purple-500/30 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Camera
                </button>
                <button type="button" onClick={() => labelFileRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 text-sm font-medium border border-slate-700/50 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload
                </button>
              </div>
              <input ref={labelFileRef} type="file" accept="image/*" onChange={(e) => handleFile(e, 'label')} className="hidden" />
            </div>
            <button type="button" onClick={() => setStep(2)}
              className="w-full py-2.5 rounded-xl text-slate-500 hover:text-slate-300 text-sm transition-colors text-center">
              Skip label scan →
            </button>
          </div>
        )}

        {/* ── STEP 2: Review & Save ── */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in-up" noValidate>
            {/* Photos row */}
            <div className="flex gap-3">
              <div className="flex-1 text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Product</p>
                <div className="w-full aspect-square rounded-xl overflow-hidden bg-slate-800/60 ring-1 ring-white/10 flex items-center justify-center">
                  {productPhoto ? <img src={productPhoto} className="w-full h-full object-cover" alt="product" /> : <span className="text-2xl opacity-30">📦</span>}
                </div>
                <button type="button" onClick={() => setStep(0)} className="text-[10px] text-indigo-400 mt-1 hover:text-indigo-300 transition-colors">Retake</button>
              </div>
              <div className="flex-1 text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Label</p>
                <div className="w-full aspect-square rounded-xl overflow-hidden bg-slate-800/60 ring-1 ring-white/10 flex items-center justify-center">
                  {labelPhoto ? <img src={labelPhoto} className="w-full h-full object-cover" alt="label" /> : <span className="text-2xl opacity-30">🏷️</span>}
                </div>
                <button type="button" onClick={() => setStep(1)} className="text-[10px] text-purple-400 mt-1 hover:text-purple-300 transition-colors">Retake</button>
              </div>
            </div>

            {/* Product Name */}
            <div className="space-y-1.5">
              <label htmlFor="product-name" className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                Product Name <span className="text-red-400">*</span>
                {name && <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-full normal-case font-normal tracking-normal">AI filled</span>}
              </label>
              <input id="product-name" type="text" value={name} onChange={e => { setName(e.target.value); setErrors(p => ({...p, name:''})) }}
                placeholder="e.g. Maggi Noodles"
                className={`w-full rounded-xl bg-slate-800/60 border px-4 py-3 text-sm text-white placeholder-slate-500 transition-all focus:ring-2 focus:ring-indigo-500/50 ${errors.name ? 'border-red-500/60' : 'border-slate-700/50 focus:border-indigo-500/50'}`}
              />
              {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label htmlFor="product-category" className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Category</label>
              <input id="product-category" type="text" value={category} onChange={e => setCategory(e.target.value)}
                placeholder="e.g. Dairy, Snacks, Medicine…"
                className="w-full rounded-xl bg-slate-800/60 border border-slate-700/50 px-4 py-3 text-sm text-white placeholder-slate-500 transition-all focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            {/* Expiry Date */}
            <div className="space-y-1.5">
              <label htmlFor="expiry-date" className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                Expiry Date <span className="text-red-400">*</span>
                {expiryDate && <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-full normal-case font-normal tracking-normal">AI filled</span>}
              </label>
              <input id="expiry-date" type="date" value={expiryDate} onChange={e => { setExpiryDate(e.target.value); setErrors(p => ({...p, expiryDate:''})) }}
                className={`w-full rounded-xl bg-slate-800/60 border px-4 py-3 text-sm text-white transition-all focus:ring-2 focus:ring-indigo-500/50 ${errors.expiryDate ? 'border-red-500/60' : 'border-slate-700/50 focus:border-indigo-500/50'}`}
              />
              {errors.expiryDate && <p className="text-xs text-red-400">{errors.expiryDate}</p>}
            </div>

            {/* Lot Number */}
            <div className="space-y-1.5">
              <label htmlFor="lot-number" className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                Lot / Batch Number
                {lotNumber && <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-full normal-case font-normal tracking-normal">AI filled</span>}
              </label>
              <input id="lot-number" type="text" value={lotNumber} onChange={e => setLotNumber(e.target.value)}
                placeholder="e.g. L2024091701"
                className="w-full rounded-xl bg-slate-800/60 border border-slate-700/50 px-4 py-3 text-sm text-white placeholder-slate-500 transition-all focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <button id="add-product-submit" type="submit" disabled={saving}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>) : '✓ Add to Tracker'}
            </button>
          </form>
        )}
      </div>
    </>
  )
}

// ── ProductCard ───────────────────────────────────────────────────────────────
function ProductCard({ product, onDelete, index }) {
  const urgency = getUrgency(product.expiry_date)
  return (
    <div
      className={`animate-fade-in-up relative rounded-2xl p-4 bg-gradient-to-br ${urgency.color} glass-card overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl`}
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
    >
      {urgency.glow && <div className="absolute inset-0 rounded-2xl pulse-glow pointer-events-none" />}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            {product.photo ? (
              <img src={product.photo} alt={product.name} className="w-16 h-16 rounded-xl object-cover ring-2 ring-white/10" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-slate-800/60 flex items-center justify-center ring-2 ring-white/10">
                <svg className="w-7 h-7 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            )}
            <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${urgency.dot} ring-2 ring-slate-950`} />
          </div>

          <div className="min-w-0">
            <p className="font-semibold text-white truncate text-base leading-tight">{product.name}</p>
            {product.category && <p className="text-xs text-slate-400 truncate mt-0.5">{product.category}</p>}
            <p className="text-xs text-slate-400 mt-1">Exp: {formatDate(product.expiry_date)}</p>
            {product.lot_number && (
              <p className="text-xs text-slate-500 mt-0.5 font-mono">LOT: {product.lot_number}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${urgency.badge}`}>
            {formatDaysLeft(urgency.daysLeft)}
          </span>
          <button
            id={`delete-product-${product.id}`}
            onClick={() => onDelete(product.id)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            aria-label="Delete product"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── StatsBar ──────────────────────────────────────────────────────────────────
function StatsBar({ products }) {
  const stats = products.reduce((acc, p) => {
    const u = getUrgency(p.expiry_date)
    if (u.daysLeft < 0) acc.expired++
    else if (u.daysLeft <= 3) acc.critical++
    else if (u.daysLeft <= 7) acc.warning++
    else acc.safe++
    return acc
  }, { expired: 0, critical: 0, warning: 0, safe: 0 })

  return (
    <div className="grid grid-cols-4 gap-2 animate-fade-in">
      {[
        { label: 'Expired',  value: stats.expired,  color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
        { label: 'Critical', value: stats.critical, color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20' },
        { label: 'Soon',     value: stats.warning,  color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/20' },
        { label: 'Good',     value: stats.safe,     color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
      ].map(s => (
        <div key={s.label} className={`rounded-xl border p-2.5 text-center ${s.bg}`}>
          <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          <p className="text-[10px] text-slate-500 font-medium">{s.label}</p>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-slate-800/60 flex items-center justify-center mb-4 ring-1 ring-white/5">
        <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
      <p className="text-slate-400 font-medium">No products yet</p>
      <p className="text-slate-600 text-sm mt-1">Tap Add to scan your first product</p>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(undefined)
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [activeTab, setActiveTab] = useState('list')
  const [sortFilter, setSortFilter] = useState('all')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setProducts([]); return }
    fetchProducts()
  }, [session])

  const fetchProducts = async () => {
    setLoadingProducts(true)
    const { data, error } = await supabase.from('products').select('*').order('expiry_date', { ascending: true })
    if (!error) setProducts(data)
    setLoadingProducts(false)
  }

  const handleAdd = async (product) => {
    const { data, error } = await supabase
      .from('products')
      .insert([{ ...product, user_id: session.user.id }])
      .select().single()
    if (!error && data) {
      setProducts(prev => [...prev, data].sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date)))
      setActiveTab('list')
    }
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (!error) setProducts(prev => prev.filter(p => p.id !== id))
  }

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return <AuthPage />

  const filtered = products.filter(p => {
    const u = getUrgency(p.expiry_date)
    if (sortFilter === 'all') return true
    if (sortFilter === 'expired')  return u.daysLeft < 0
    if (sortFilter === 'critical') return u.daysLeft >= 0 && u.daysLeft <= 3
    if (sortFilter === 'warning')  return u.daysLeft > 3 && u.daysLeft <= 7
    if (sortFilter === 'safe')     return u.daysLeft > 7
    return true
  })

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-purple-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-800/8 rounded-full blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 glass border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-2xl">🥫</span> Expiry Tracker
            </h1>
            <p className="text-xs text-slate-500 truncate mt-0.5">{session.user.email}</p>
          </div>
          <button id="sign-out-btn" onClick={() => supabase.auth.signOut()}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/60 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-slate-700/40 hover:border-red-500/30 text-xs font-medium transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-5 space-y-5">
        {activeTab === 'form' && <AddProductForm onAdd={handleAdd} />}

        {activeTab === 'list' && (
          <>
            {products.length > 0 && <StatsBar products={products} />}
            {products.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'expired', label: '🔴 Expired' },
                  { key: 'critical', label: '🟠 Critical' },
                  { key: 'warning', label: '🟡 Soon' },
                  { key: 'safe', label: '🟢 Good' },
                ].map(f => (
                  <button key={f.key} id={`filter-${f.key}`} onClick={() => setSortFilter(f.key)}
                    className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${sortFilter === f.key ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/40'}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            )}
            {loadingProducts ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.length === 0 ? <EmptyState /> : filtered.map((p, i) => (
                  <ProductCard key={p.id} product={p} onDelete={handleDelete} index={i} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-40">
        <button id="tab-list-btn" onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-all shadow-xl ${activeTab === 'list' ? 'bg-indigo-600 text-white shadow-indigo-500/30' : 'glass text-slate-400 hover:text-white'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Products
        </button>
        <button id="tab-add-btn" onClick={() => setActiveTab('form')}
          className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-all shadow-xl ${activeTab === 'form' ? 'bg-indigo-600 text-white shadow-indigo-500/30' : 'glass text-slate-400 hover:text-white'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add
        </button>
      </div>
    </div>
  )
}
