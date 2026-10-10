import React, { useState } from 'react';
import { X, Database, Check, Shield, Server, RefreshCw, Copy, CheckCircle2 } from 'lucide-react';
import { getSupabaseConfig, saveSupabaseConfig } from '../lib/supabase';
import { getDjangoApiUrl, setDjangoApiUrl } from '../lib/api';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
}) => {
  const currentConfig = getSupabaseConfig();
  const currentDjangoUrl = getDjangoApiUrl();

  const [url, setUrl] = useState(currentConfig.url || 'https://lopljazpsnykyfhdjowt.supabase.co');
  const [anonKey, setAnonKey] = useState(currentConfig.key || 'sb_publishable_kNiNl6i-YTun0flfE8YYSw_N7SDEy2P');
  const [djangoUrl, setDjangoUrl] = useState(currentDjangoUrl);
  const [copiedDbUrl, setCopiedDbUrl] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const postgresConnStr = 'postgresql://postgres:sojol&@3997@db.lopljazpsnykyfhdjowt.supabase.co:5432/postgres';

  if (!isOpen) return null;

  const handleCopyDb = () => {
    navigator.clipboard?.writeText?.(postgresConnStr);
    setCopiedDbUrl(true);
    setTimeout(() => setCopiedDbUrl(false), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setDjangoApiUrl(djangoUrl);
    saveSupabaseConfig(url, anonKey);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleResetDemo = () => {
    localStorage.removeItem('mio_supabase_url');
    localStorage.removeItem('mio_supabase_anon_key');
    localStorage.removeItem('mio_django_api_url');
    localStorage.removeItem('nexus_supabase_url');
    localStorage.removeItem('nexus_supabase_anon_key');
    localStorage.removeItem('nexus_django_api_url');
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#7BD1FA] text-[#073247] flex items-center justify-center font-bold text-sm shadow-xs">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Backend & Supabase Configuration
              </h2>
              <p className="text-xs text-slate-600">
                Connected to MIO database & auth services
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {/* Active Connection Banner */}
          <div className="p-3 bg-sky-50/80 border border-sky-200 rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-[#0369a1]">
                <CheckCircle2 className="w-4 h-4 text-[#0284c7]" />
                <span>PostgreSQL Connection String</span>
              </div>
              <button
                type="button"
                onClick={handleCopyDb}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-sky-300 text-[11px] font-semibold text-[#0369a1] hover:bg-sky-100 transition-colors cursor-pointer"
              >
                {copiedDbUrl ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedDbUrl ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-2 bg-slate-950 rounded-lg font-mono text-[11px] text-[#7BD1FA] break-all select-all">
              {postgresConnStr}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supabase Project URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://lopljazpsnykyfhdjowt.supabase.co"
              className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7BD1FA]/30 focus:border-[#7BD1FA] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supabase Public Anon Key
            </label>
            <input
              type="text"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="sb_publishable_kNiNl6i-YTun0flfE8YYSw_N7SDEy2P"
              className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7BD1FA]/30 focus:border-[#7BD1FA] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Django REST Framework API Endpoint</span>
              <span className="text-[11px] text-slate-600 font-normal">Port 8000</span>
            </label>
            <input
              type="text"
              value={djangoUrl}
              onChange={(e) => setDjangoUrl(e.target.value)}
              placeholder="http://localhost:8000/api"
              className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7BD1FA]/30 focus:border-[#7BD1FA] focus:bg-white"
            />
            <span className="text-[11px] text-slate-600 mt-1 block">
              Outgoing requests automatically attach <code>Authorization: Bearer &lt;jwt&gt;</code>.
            </span>
          </div>

          {/* Supabase Storage Buckets Info */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#0284c7]" />
                <span>Supabase Storage Buckets</span>
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                3 Buckets Active
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <div className="font-mono font-bold text-[#0369a1] flex items-center justify-between">
                  <span>DP</span>
                  <span className="text-[10px] font-sans font-medium text-slate-500">Public</span>
                </div>
                <div className="text-slate-600 text-[10px] mt-0.5">
                  All user profile pictures & avatars
                </div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <div className="font-mono font-bold text-[#0369a1] flex items-center justify-between">
                  <span>posts</span>
                  <span className="text-[10px] font-sans font-medium text-slate-500">Public</span>
                </div>
                <div className="text-slate-600 text-[10px] mt-0.5">
                  All post data, images & papers
                </div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <div className="font-mono font-bold text-[#0369a1] flex items-center justify-between">
                  <span>Message</span>
                  <span className="text-[10px] font-sans font-medium text-slate-500">Public</span>
                </div>
                <div className="text-slate-600 text-[10px] mt-0.5">
                  All message media files & documents
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-[#0284c7] shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Live & Preview Resilient:</strong> When backend endpoints or keys are being configured, MIO operates smoothly with responsive fallback persistence so you can interact with all features.
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleResetDemo}
              className="text-xs text-slate-600 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset Defaults</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#7BD1FA] hover:bg-[#62c7f8] text-[#073247] rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Save Configuration</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
