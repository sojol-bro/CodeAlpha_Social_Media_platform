import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  Sparkles, 
  Database, 
  CheckCircle2, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { getSupabaseConfig } from '../../lib/supabase';

export const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, signUp, signInDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const config = getSupabaseConfig();

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'signin') {
        const res = await signIn(email, password);
        if (res.error) {
          setError(res.error);
        } else {
          // Redirect to the authenticated user's own profile page
          const targetUsername = res.username;
          navigate(targetUsername ? `/profile/${targetUsername}` : from, { replace: true });
        }
      } else {
        if (!fullName.trim()) {
          setError('Please provide your full name.');
          setIsLoading(false);
          return;
        }
        const res = await signUp(email, password, fullName.trim());
        if (res.error) {
          setError(res.error);
        } else {
          // Redirect newly registered user to their own profile page
          const targetUsername = res.username;
          navigate(targetUsername ? `/profile/${targetUsername}` : from, { replace: true });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setIsLoading(true);
    await signInDemo();
    setIsLoading(false);
    // Demo user is always Elena Rostova
    navigate('/profile/elena_rostova', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Logo & Title */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#7BD1FA] via-sky-500 to-sky-700 text-white shadow-xl shadow-sky-500/10 mb-4 ring-4 ring-white">
          <ShieldCheck className="w-8 h-8 text-white stroke-[2.2]" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          MIO Systems Network
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Executive Platform for Enterprise AI & Systems Architecture
        </p>

        {/* Supabase PostgreSQL Backend Status Pill */}
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-200/80 text-[11px] font-semibold text-sky-900">
          <Database className="w-3.5 h-3.5 text-[#0284c7]" />
          <span>Connected: Supabase PostgreSQL (RLS & JWT Protected)</span>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-200">
          {/* Mode Switcher */}
          <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Quick Demo Access Button */}
          <button
            type="button"
            onClick={handleDemoSignIn}
            className="w-full mb-6 p-3 rounded-xl bg-gradient-to-r from-sky-50 to-blue-50 hover:from-sky-100 hover:to-blue-100 border border-sky-200 text-left flex items-center justify-between group transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#7BD1FA] to-sky-700 text-[#073247] font-bold text-xs flex items-center justify-center shrink-0">
                ER
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Sign In as Elena Rostova</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#7BD1FA] text-[#073247] font-bold">
                    Demo Executive
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Instant 1-Click Access • VP AI Systems
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#0284c7] group-hover:translate-x-0.5 transition-transform" />
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-semibold text-[10px] tracking-wider">
                Or authenticate with credentials
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dr. Elena Rostova"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#7BD1FA] focus:border-transparent"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="elena@enterprise.ai"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#7BD1FA] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#7BD1FA] focus:border-transparent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#7BD1FA]" />
                  <span>Verifying Session...</span>
                </>
              ) : mode === 'signin' ? (
                <span>Sign In to Network</span>
              ) : (
                <span>Create MIO Account</span>
              )}
            </button>
          </form>

          {/* Security footnote */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>TLS 1.3 & JWT Encrypted</span>
            </span>
            <span>RLS Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
