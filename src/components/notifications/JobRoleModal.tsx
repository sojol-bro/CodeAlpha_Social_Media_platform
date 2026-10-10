import React, { useState } from 'react';
import { 
  X, 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Building2, 
  CheckCircle2, 
  Send, 
  MessageSquare, 
  Sparkles, 
  Check, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

interface JobRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobData?: {
    title: string;
    company: string;
    location: string;
    compensation: string;
    description?: string;
  };
  onMessageHiringLead?: (username: string) => void;
}

export const JobRoleModal: React.FC<JobRoleModalProps> = ({
  isOpen,
  onClose,
  jobData,
  onMessageHiringLead,
}) => {
  const [hasApplied, setHasApplied] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  if (!isOpen) return null;

  const title = jobData?.title || 'Principal Architect — Distributed Training';
  const company = jobData?.company || 'Anthropic Core Labs';
  const location = jobData?.location || 'San Francisco, CA (Hybrid)';
  const compensation = jobData?.compensation || '$380k - $460k + Equity';

  const handleApply = () => {
    setIsApplying(true);
    setTimeout(() => {
      setIsApplying(false);
      setHasApplied(true);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs font-semibold text-[#7BD1FA] mb-2 uppercase tracking-wider font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Executive Opportunity Match</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {title}
          </h2>

          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-sky-200">
            <span className="flex items-center gap-1.5 font-medium text-white">
              <Building2 className="w-4 h-4 text-[#7BD1FA]" />
              {company}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#7BD1FA]" />
              {location}
            </span>
            <span className="flex items-center gap-1.5 font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-500/30">
              <DollarSign className="w-3.5 h-3.5" />
              {compensation}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto text-slate-700 text-xs sm:text-sm leading-relaxed">
          {/* Match Score */}
          <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#7BD1FA] text-[#073247] flex items-center justify-center font-bold text-base shadow-xs">
                98%
              </div>
              <div>
                <div className="font-bold text-slate-900">High Executive Profile Match</div>
                <div className="text-xs text-slate-600">
                  Your distributed memory fabrics and GPU clustering experience align directly with the core team charter.
                </div>
              </div>
            </div>
            <span className="hidden sm:inline-block px-2.5 py-1 bg-white text-[#0369a1] text-xs font-bold rounded-lg border border-sky-200 shadow-2xs">
              Verified Match
            </span>
          </div>

          {/* Role Overview */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">Role Overview & Architecture Charter</h3>
            <p>
              As the Principal Architect for Distributed Training, you will lead the core compute infrastructure powering foundational frontier models. You will architect multi-cluster interconnect topologies, ultra-low-latency inter-GPU fabrics, and asynchronous checkpointing across 20,000+ accelerator nodes.
            </p>
          </div>

          {/* Key Architectural Responsibilities */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">Key Architectural Focus Areas</h3>
            <ul className="space-y-2 list-none">
              {[
                'Design fault-tolerant distributed memory fabrics for trillion-parameter MoE foundation models.',
                'Pioneer low-precision tensor quantization pipelines eliminating PCIe bottleneck overheads.',
                'Collaborate directly with hardware engineering on custom NVLink / InfiniBand topology configurations.',
                'Lead post-mortem analysis on Byzantine node failures and automated failover recovery engines.',
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0284c7] shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Required Experience */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">Qualifications</h3>
            <div className="flex flex-wrap gap-2">
              {[
                '10+ Years Distributed Systems',
                'GPU / TPU Topologies',
                'eBPF Runtime Probes',
                'InfiniBand / RoCE',
                'PyTorch & Triton Kernels',
                'Zero-Trust Mesh Architecture',
              ].map((pill, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-800 text-xs rounded-lg font-medium"
                >
                  {pill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onMessageHiringLead?.('marcus_vance');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-sky-600" />
              <span>Message Hiring Lead (@marcus_vance)</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Close
            </button>

            {hasApplied ? (
              <div className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs">
                <Check className="w-4 h-4" />
                <span>Application Submitted via MIO Profile</span>
              </div>
            ) : (
              <button
                onClick={handleApply}
                disabled={isApplying}
                className="flex items-center gap-1.5 px-5 py-2 bg-[#7BD1FA] hover:bg-[#62c7f8] disabled:opacity-50 text-[#073247] rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                {isApplying ? (
                  <span>Submitting MIO Profile...</span>
                ) : (
                  <>
                    <span>Apply with MIO Executive Profile</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
