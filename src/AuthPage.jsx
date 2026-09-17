import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function AuthPage() {
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const resetForm = () => {
    setError('')
    setSuccessMsg('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
  }

  const switchMode = (newMode) => {
    resetForm()
    setMode(newMode)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (!email.trim()) return setError('Email is required.')
    if (mode !== 'forgot' && !password) return setError('Password is required.')
    if (mode === 'signup' && password !== confirmPassword)
      return setError('Passwords do not match.')
    if (mode === 'signup' && password.length < 6)
      return setError('Password must be at least 6 characters.')

    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccessMsg('Account created! Check your email to confirm, then log in.')
        switchMode('login')
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        })
        if (error) throw error
        setSuccessMsg('Password reset email sent! Check your inbox.')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-800/8 rounded-full blur-3xl" />
      </div>

      {/* Logo */}
      <div className="mb-8 text-center animate-fade-in-up">
        <div className="text-5xl mb-3">🥫</div>
        <h1 className="text-2xl font-bold text-white">Expiry Tracker</h1>
        <p className="text-slate-500 text-sm mt-1">Never let food expire again</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm glass-card rounded-2xl p-6 animate-scale-in">
        {/* Tab switcher */}
        {mode !== 'forgot' && (
          <div className="flex rounded-xl bg-slate-800/60 p-1 mb-6 gap-1">
            {['login', 'signup'].map((m) => (
              <button
                key={m}
                id={`auth-tab-${m}`}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
                  mode === m
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {m === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>
        )}

        {mode === 'forgot' && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Reset Password</h2>
            <p className="text-slate-500 text-sm mt-1">
              Enter your email and we'll send a reset link.
            </p>
          </div>
        )}

        <form id="auth-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="auth-email" className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
              Email
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </span>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-sm text-white placeholder-slate-500 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          {mode !== 'forgot' && (
            <div className="space-y-1.5">
              <label htmlFor="auth-password" className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-sm text-white placeholder-slate-500 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Confirm Password (signup only) */}
          {mode === 'signup' && (
            <div className="space-y-1.5">
              <label htmlFor="auth-confirm-password" className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </span>
                <input
                  id="auth-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-sm text-white placeholder-slate-500 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30 transition-all"
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3.5 py-3 animate-fade-in">
              <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Success */}
          {successMsg && (
            <div className="flex items-start gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-3 animate-fade-in">
              <svg className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-emerald-400">{successMsg}</p>
            </div>
          )}

          {/* Forgot password link */}
          {mode === 'login' && (
            <div className="text-right -mt-1">
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Submit button */}
          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/40 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {mode === 'login' ? 'Logging in…' : mode === 'signup' ? 'Creating account…' : 'Sending…'}
              </>
            ) : (
              mode === 'login' ? 'Log In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'
            )}
          </button>

          {/* Back to login (forgot mode) */}
          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="w-full py-2.5 rounded-xl text-slate-400 hover:text-white text-sm font-medium transition-colors"
            >
              ← Back to Log In
            </button>
          )}
        </form>
      </div>

      <p className="mt-6 text-xs text-slate-600 text-center animate-fade-in">
        Your data is private and secured with Row Level Security.
      </p>
    </div>
  )
}
