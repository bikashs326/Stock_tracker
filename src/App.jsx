import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from './supabaseClient'
import AuthPage from './AuthPage'

// ── Urgency helpers ───────────────────────────────────────────────────────────
const URGENCY_LEVELS = {
  EXPIRED:  { label: 'Expired',       color: 'from-red-900/50 to-red-800/30',      badge: 'bg-red-500/20 text-red-300 border-red-500/40',     dot: 'bg-red-500',     glow: true  },
  CRITICAL: { label: 'Critical',      color: 'from-orange-900/50 to-orange-800/30', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40', dot: 'bg-orange-500', glow: false },
  WARNING:  { label: 'Expiring Soon', color: 'from-yellow-900/40 to-yellow-800/20', badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40', dot: 'bg-yellow-400', glow: false },
  SAFE:     { label: 'Good',          color: 'from-emerald-900/30 to-emerald-800/10',badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',dot: 'bg-emerald-500',glow: false },
}

function getUrgency(expiryDate) {
  const today = new Date(); today.setHours(0,0,0,0)
  const expiry = new Date(expiryDate); expiry.setHours(0,0,0,0)
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
  if (diffDays < 0)  return { ...URGENCY_LEVELS.EXPIRED,  daysLeft: diffDays }
  if (diffDays <= 3) return { ...URGENCY_LEVELS.CRITICAL, daysLeft: diffDays }
  if (diffDays <= 7) return { ...URGENCY_LEVELS.WARNING,  daysLeft: diffDays }
  return               { ...URGENCY_LEVELS.SAFE,     daysLeft: diffDays }
}

function formatDaysLeft(daysLeft) {
  if (daysLeft < 0)  return `Expired ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''} ago`
  if (daysLeft === 0) return 'Expires today'
  if (daysLeft === 1) return '1 day left'
  return `${daysLeft} days left`
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
          {/* Photo */}
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

// ── CameraCapture ─────────────────────────────────────────────────────────────
function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [facingMode, setFacingMode] = useState('environment')

  const startCamera = useCallback(async (mode) => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); setReady(true) }
    } catch {
      alert('Could not access camera. Please use the file upload instead.')
      onClose()
    }
  }, [onClose])

  useState(() => {
    startCamera(facingMode)
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()) }
  })

  const flipCamera = () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(newMode)
    startCamera(newMode)
  }

  const capture = () => {
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    onCapture(dataUrl)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center animate-fade-in p-4">
      <div className="w-full max-w-sm glass-card rounded-2xl overflow-hidden">
        <div className="relative bg-black">
          <video ref={videoRef} className="w-full aspect-[4/3] object-cover camera-preview" playsInline muted />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <div className="p-4 flex items-center justify-between gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors">Cancel</button>
          <button id="camera-capture-btn" onClick={capture} disabled={!ready} className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-transform disabled:opacity-50">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button onClick={flipCamera} className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors">Flip</button>
        </div>
      </div>
    </div>
  )
}

// ── AddProductForm ────────────────────────────────────────────────────────────
function AddProductForm({ onAdd }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [photo, setPhoto] = useState(null)
  const [showCamera, setShowCamera] = useState(false)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef(null)

  const validate = () => {
    const e = {}
    if (!name.trim()) e.name = 'Product name is required'
    if (!expiryDate)  e.expiryDate = 'Expiry date is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setPhoto(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    await onAdd({ name: name.trim(), category: category.trim(), expiry_date: expiryDate, photo })
    setName(''); setCategory(''); setExpiryDate(''); setPhoto(null); setErrors({})
    setSaving(false)
  }

  return (
    <>
      {showCamera && (
        <CameraCapture
          onCapture={(dataUrl) => { setPhoto(dataUrl); setShowCamera(false) }}
          onClose={() => setShowCamera(false)}
        />
      )}
      <form id="add-product-form" onSubmit={handleSubmit} className="glass-card rounded-2xl p-5 space-y-4 animate-scale-in" noValidate>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </span>
          Add Product
        </h2>

        {/* Photo */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Photo</label>
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-slate-800/60 ring-1 ring-white/10 flex items-center justify-center">
              {photo ? (
                <img src={photo} alt="Product" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <button type="button" id="open-camera-btn" onClick={() => setShowCamera(true)}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-sm font-medium border border-indigo-500/30 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Take Photo
              </button>
              <button type="button" id="upload-photo-btn" onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 text-sm font-medium border border-slate-700/50 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" id="photo-file-input" />
            </div>
            {photo && (
              <button type="button" onClick={() => setPhoto(null)} className="self-start p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <label htmlFor="product-name" className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Product Name <span className="text-red-400">*</span></label>
          <input id="product-name" type="text" value={name} onChange={(e) => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })) }}
            placeholder="e.g. Organic Milk"
            className={`w-full rounded-xl bg-slate-800/60 border px-4 py-3 text-sm text-white placeholder-slate-500 transition-all focus:ring-2 focus:ring-indigo-500/50 ${errors.name ? 'border-red-500/60' : 'border-slate-700/50 focus:border-indigo-500/50'}`}
          />
          {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label htmlFor="product-category" className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Category</label>
          <input id="product-category" type="text" value={category} onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Dairy, Snacks, Medicine…"
            className="w-full rounded-xl bg-slate-800/60 border border-slate-700/50 px-4 py-3 text-sm text-white placeholder-slate-500 transition-all focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        {/* Expiry Date */}
        <div className="space-y-1.5">
          <label htmlFor="expiry-date" className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Expiry Date <span className="text-red-400">*</span></label>
          <input id="expiry-date" type="date" value={expiryDate} onChange={(e) => { setExpiryDate(e.target.value); setErrors(p => ({ ...p, expiryDate: '' })) }}
            className={`w-full rounded-xl bg-slate-800/60 border px-4 py-3 text-sm text-white transition-all focus:ring-2 focus:ring-indigo-500/50 ${errors.expiryDate ? 'border-red-500/60' : 'border-slate-700/50 focus:border-indigo-500/50'}`}
          />
          {errors.expiryDate && <p className="text-xs text-red-400">{errors.expiryDate}</p>}
        </div>

        <button id="add-product-submit" type="submit" disabled={saving}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2">
          {saving ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
          ) : 'Add to Tracker'}
        </button>
      </form>
    </>
  )
}

// ── StatsBar ──────────────────────────────────────────────────────────────────
function StatsBar({ products }) {
  const stats = products.reduce(
    (acc, p) => {
      const u = getUrgency(p.expiry_date)
      if (u.daysLeft < 0) acc.expired++
      else if (u.daysLeft <= 3) acc.critical++
      else if (u.daysLeft <= 7) acc.warning++
      else acc.safe++
      return acc
    },
    { expired: 0, critical: 0, warning: 0, safe: 0 }
  )
  return (
    <div className="grid grid-cols-4 gap-2 animate-fade-in">
      {[
        { label: 'Expired',  value: stats.expired,  color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
        { label: 'Critical', value: stats.critical, color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20' },
        { label: 'Soon',     value: stats.warning,  color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/20' },
        { label: 'Good',     value: stats.safe,     color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
      ].map((s) => (
        <div key={s.label} className={`rounded-xl border p-2.5 text-center ${s.bg}`}>
          <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          <p className="text-[10px] text-slate-500 font-medium">{s.label}</p>
        </div>
      ))}
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-slate-800/60 flex items-center justify-center mb-4 ring-1 ring-white/5">
        <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
      <p className="text-slate-400 font-medium">No products yet</p>
      <p className="text-slate-600 text-sm mt-1">Add your first product using the form above</p>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [activeTab, setActiveTab] = useState('list')
  const [sortFilter, setSortFilter] = useState('all')

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Fetch products whenever user logs in
  useEffect(() => {
    if (!session) { setProducts([]); return }
    fetchProducts()
  }, [session])

  const fetchProducts = async () => {
    setLoadingProducts(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('expiry_date', { ascending: true })
    if (!error) setProducts(data)
    setLoadingProducts(false)
  }

  const handleAdd = async (product) => {
    const { data, error } = await supabase
      .from('products')
      .insert([{ ...product, user_id: session.user.id }])
      .select()
      .single()
    if (!error && data) {
      setProducts((prev) => [...prev, data].sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date)))
      setActiveTab('list')
    }
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (!error) setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  // Loading auth state
  if (session === undefined) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Not logged in → show auth page
  if (!session) return <AuthPage />

  // Filter products
  const filtered = [...products]
    .filter((p) => {
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
      {/* Background gradient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-purple-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-800/8 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-2xl">🥫</span> Expiry Tracker
            </h1>
            <p className="text-xs text-slate-500 truncate mt-0.5">{session.user.email}</p>
          </div>
          <button
            id="sign-out-btn"
            onClick={handleSignOut}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/60 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-slate-700/40 hover:border-red-500/30 text-xs font-medium transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-5 space-y-5">
        {/* Add form */}
        {activeTab === 'form' && <AddProductForm onAdd={handleAdd} />}

        {/* Product list */}
        {activeTab === 'list' && (
          <>
            {products.length > 0 && <StatsBar products={products} />}

            {/* Filter tabs */}
            {products.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {[
                  { key: 'all',      label: 'All' },
                  { key: 'expired',  label: '🔴 Expired' },
                  { key: 'critical', label: '🟠 Critical' },
                  { key: 'warning',  label: '🟡 Soon' },
                  { key: 'safe',     label: '🟢 Good' },
                ].map((f) => (
                  <button key={f.key} id={`filter-${f.key}`} onClick={() => setSortFilter(f.key)}
                    className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      sortFilter === f.key
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                        : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/40'
                    }`}>
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            {/* Cards */}
            {loadingProducts ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.length === 0 ? (
                  <EmptyState />
                ) : (
                  filtered.map((product, i) => (
                    <ProductCard key={product.id} product={product} onDelete={handleDelete} index={i} />
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Bottom nav */}
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
