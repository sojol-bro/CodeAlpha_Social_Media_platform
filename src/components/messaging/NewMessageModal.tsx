import React, { useState } from 'react';
import { X, Search, MessageSquare, CheckCircle, ShieldCheck } from 'lucide-react';
import { Profile } from '../../lib/types';
import { api } from '../../lib/api';

interface NewMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecipient: (recipient: Profile) => void;
}

export const NewMessageModal: React.FC<NewMessageModalProps> = ({
  isOpen,
  onClose,
  onSelectRecipient,
}) => {
  const [search, setSearch] = useState('');
  const allUsers = api.getAllNetworkUsers();

  if (!isOpen) return null;

  const filteredUsers = allUsers.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.full_name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.headline && u.headline.toLowerCase().includes(q))
    );
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#7BD1FA] text-[#073247] flex items-center justify-center font-bold text-sm shadow-xs">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                New Direct Message
              </h2>
              <p className="text-xs text-slate-600">
                Start an end-to-end encrypted channel with any network member
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, headline, or @username..."
              autoFocus
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7BD1FA]/40 focus:border-[#7BD1FA] focus:bg-white transition-all font-medium"
            />
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No matching network members found for "{search}".
            </div>
          ) : (
            filteredUsers.map((user) => {
              const initials = user.full_name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

              return (
                <div
                  key={user.id}
                  onClick={() => onSelectRecipient(user)}
                  className="p-3 rounded-xl hover:bg-sky-50/60 flex items-center justify-between gap-3 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-sky-700 to-[#7BD1FA] text-[#073247] flex items-center justify-center font-bold text-sm shadow-2xs overflow-hidden">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{initials}</span>
                        )}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-[#0369a1] transition-colors">
                          {user.full_name}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          @{user.username}
                        </span>
                        <CheckCircle className="w-3.5 h-3.5 text-[#0284c7] fill-sky-100" />
                      </div>
                      <p className="text-[11px] text-slate-600 truncate mt-0.5 max-w-sm">
                        {user.headline}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRecipient(user);
                    }}
                    className="shrink-0 px-3 py-1.5 bg-sky-50 hover:bg-[#7BD1FA] text-[#0369a1] hover:text-[#073247] text-xs font-bold rounded-lg border border-sky-200 shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>Message</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 px-4">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Media uploaded to Supabase <code>Message</code> bucket</span>
          </div>
          <span>{filteredUsers.length} members available</span>
        </div>
      </div>
    </div>
  );
};
