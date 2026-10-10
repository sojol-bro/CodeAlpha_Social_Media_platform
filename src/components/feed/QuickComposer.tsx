import React, { useState, useEffect } from 'react';
import { Image, Video, FileText, PenTool, Send } from 'lucide-react';
import { DEFAULT_CURRENT_USER, getCurrentUserAvatar } from '../../lib/supabase';

interface QuickComposerProps {
  onOpenFullStudio: (initialText?: string) => void;
  onSubmitQuickPost: (text: string) => void;
}

export const QuickComposer: React.FC<QuickComposerProps> = ({
  onOpenFullStudio,
  onSubmitQuickPost,
}) => {
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [avatar, setAvatar] = useState<string>(getCurrentUserAvatar());

  useEffect(() => {
    const handleAvatarUpdate = (e: any) => {
      if (e.detail?.avatar_url !== undefined) {
        setAvatar(e.detail.avatar_url);
      }
    };
    window.addEventListener('mio:avatar-updated', handleAvatarUpdate);
    return () => window.removeEventListener('mio:avatar-updated', handleAvatarUpdate);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSubmitQuickPost(text.trim());
    setText('');
    setIsFocused(false);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs transition-all">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#7BD1FA] to-sky-700 flex items-center justify-center text-[#073247] font-bold text-xs shrink-0 shadow-2xs overflow-hidden aspect-square">
          {avatar ? (
            <img src={avatar} alt="Profile" className="w-full h-full object-cover aspect-square" />
          ) : (
            <span>ER</span>
          )}
        </div>
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder="Share your thoughts, industry insights, or research..."
            rows={isFocused ? 3 : 1}
            className="w-full text-sm text-slate-800 placeholder-slate-600 bg-slate-50 focus:bg-white border border-transparent focus:border-[#7BD1FA] rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#7BD1FA]/20 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 text-xs font-medium text-slate-600">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => onOpenFullStudio()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <Image className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Image</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenFullStudio()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <Video className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">Video</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenFullStudio()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <FileText className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">Document</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenFullStudio()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <PenTool className="w-4 h-4 text-[#0284c7]" />
            <span className="hidden sm:inline">Write Article</span>
          </button>
        </div>

        <button
          onClick={text.trim() ? handleSubmit : () => onOpenFullStudio(text)}
          disabled={!text.trim() && isFocused}
          className={`px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
            text.trim()
              ? 'bg-[#7BD1FA] text-[#073247] hover:bg-[#62c7f8] shadow-2xs cursor-pointer'
              : 'bg-[#7BD1FA] text-[#073247] hover:bg-[#62c7f8] cursor-pointer'
          }`}
        >
          <span>Post</span>
          {text.trim() && <Send className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
};
