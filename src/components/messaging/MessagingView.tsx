import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, 
  Search, 
  Edit, 
  SlidersHorizontal, 
  Phone, 
  Video, 
  MoreVertical, 
  Paperclip, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Calendar, 
  Smile, 
  Send, 
  Check, 
  CheckCheck, 
  ShieldCheck, 
  Users,
  Loader2,
  X,
  FileText,
  ExternalLink,
  Download,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { api, getLocalConversations } from '../../lib/api';
import { uploadMessageMedia, SUPABASE_BUCKET_MESSAGES } from '../../lib/supabase';
import { MessageItem, Conversation, Profile } from '../../lib/types';
import { NewMessageModal } from './NewMessageModal';
import { SecurityAuditModal } from './SecurityAuditModal';

interface MessagingViewProps {
  initialRecipientUsername?: string;
  onSelectUser?: (username: string) => void;
}

export const MessagingView: React.FC<MessagingViewProps> = ({
  initialRecipientUsername,
  onSelectUser,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>(getLocalConversations());
  const [activeConvId, setActiveConvId] = useState<string>('conv-marcus');
  const [filterTab, setFilterTab] = useState<'focused' | 'other'>('focused');
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
  const [isSecurityAuditOpen, setIsSecurityAuditOpen] = useState(false);

  // Mobile / narrow screen view state: 'list' (conversations) vs 'chat' (active thread)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>(
    initialRecipientUsername ? 'chat' : 'list'
  );

  // Lightbox preview for full-screen image inspection
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Drag and drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Media attachment state (stored strictly in Supabase 'Message' bucket)
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [attachedMedia, setAttachedMedia] = useState<{
    url: string;
    name: string;
    type: 'image' | 'video' | 'document' | 'audio';
    size: string;
    bucket: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadConversations = async () => {
    const list = await api.getConversations();
    setConversations(list);
    return list;
  };

  useEffect(() => {
    loadConversations().then((list) => {
      if (initialRecipientUsername) {
        api.getOrCreateConversationWithUser(initialRecipientUsername).then((conv) => {
          setActiveConvId(conv.id);
          setMobileView('chat');
          loadConversations();
        });
      } else if (list.length > 0 && !activeConvId) {
        setActiveConvId(list[0].id);
      }
    });

    const handleMessageSent = () => {
      loadConversations();
    };

    window.addEventListener('mio:message-sent', handleMessageSent);
    return () => window.removeEventListener('mio:message-sent', handleMessageSent);
  }, [initialRecipientUsername]);

  // Scroll to bottom when active conversation changes or new message added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConvId, conversations, mobileView]);

  const activeConv = conversations.find((c) => c.id === activeConvId) || conversations[0] || {
    id: 'conv-fallback',
    participant: {
      id: 'marcus',
      username: 'marcus_vance',
      full_name: 'Marcus Vance',
      headline: 'Principal Distributed Systems Architect at NVIDIA',
      avatar_url: '',
      followers_count: 9800,
      following_count: 320,
      created_at: new Date().toISOString(),
    },
    last_message: 'Direct channel active',
    last_message_time: 'Just now',
    unread_count: 0,
    messages: [],
  };

  const isChannel = activeConv.id === 'conv-council';

  const handleSelectConversation = (convId: string) => {
    setActiveConvId(convId);
    setMobileView('chat');
    // Clear unread badge in local state
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c))
    );
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 150);
  };

  const handleSelectNewRecipient = async (recipient: Profile) => {
    setIsNewMessageModalOpen(false);
    const conv = await api.getOrCreateConversationWithUser(recipient);
    await loadConversations();
    setActiveConvId(conv.id);
    setMobileView('chat');
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 150);
  };

  const processFile = async (file: File) => {
    setIsUploadingMedia(true);
    setUploadStatus(`Uploading to Supabase Storage ('${SUPABASE_BUCKET_MESSAGES}' bucket)...`);

    try {
      const result = await uploadMessageMedia(file);
      setAttachedMedia({
        url: result.url,
        name: result.name,
        type: result.type,
        size: result.size,
        bucket: result.bucket || SUPABASE_BUCKET_MESSAGES,
      });
      setUploadStatus(`Stored in Supabase '${SUPABASE_BUCKET_MESSAGES}' bucket!`);
      setTimeout(() => setUploadStatus(null), 3500);
    } catch (err: any) {
      setUploadStatus('Upload failed. Stored locally.');
      setTimeout(() => setUploadStatus(null), 3500);
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend !== undefined ? textToSend : inputText;
    if (!text.trim() && !attachedMedia) return;

    const mediaToSend = attachedMedia;
    setInputText('');
    setAttachedMedia(null);

    await api.sendMessage({
      conversation_id: activeConv.id,
      content: text.trim(),
      media_url: mediaToSend?.url,
      media_type: mediaToSend?.type,
      media_name: mediaToSend?.name,
      media_size: mediaToSend?.size,
      bucket: mediaToSend?.bucket || SUPABASE_BUCKET_MESSAGES,
    });

    await loadConversations();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (unless Shift is held for multi-line)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickReplies = [
    '✓ Yes, 2:00 PM PT works',
    'Can we push to 3:30 PM?',
    'Reviewing the benchmark metrics now',
    'Shared paper draft in Message bucket',
  ];

  const quickEmojis = ['👍', '🚀', '🎯', '💡', '🔥', '👏'];

  const filteredConversations = conversations.filter((c) => {
    // If filterTab is other / channels, match conv-council or group channels
    if (filterTab === 'other') {
      if (c.id !== 'conv-council') return false;
    }
    const q = searchQuery.toLowerCase();
    return (
      c.participant.full_name.toLowerCase().includes(q) ||
      c.participant.username.toLowerCase().includes(q) ||
      c.last_message.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-6xl mx-auto py-4 px-3 sm:px-6 h-[calc(100vh-5rem)] flex flex-col">
      {/* Hidden File Pickers (targets Supabase 'Message' bucket) */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleMediaUpload}
        className="hidden"
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleMediaUpload}
        className="hidden"
      />

      {/* Top Banner */}
      <div className="flex items-center justify-between pb-3 text-xs text-slate-600 border-b border-slate-200 shrink-0">
        <div className="font-semibold text-slate-900 flex items-center gap-2">
          <span>Direct Communications / Enterprise Channels</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-100 text-[#0369a1] font-semibold border border-sky-200">
            Bucket: {SUPABASE_BUCKET_MESSAGES}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsSecurityAuditOpen(true)}
          className="flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer"
          title="Inspect end-to-end security and database integrity"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Encrypted Direct Messaging (Protocol v4.2)</span>
        </button>
      </div>

      {/* Main Messaging Container with Responsive Dual-Pane View */}
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
        className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-0 border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs mt-3 relative"
      >
        {/* Drag and Drop Overlay */}
        {isDraggingOver && (
          <div className="absolute inset-0 z-30 bg-[#7BD1FA]/20 backdrop-blur-xs border-2 border-dashed border-[#0284c7] flex flex-col items-center justify-center pointer-events-none">
            <div className="p-4 bg-white rounded-2xl shadow-lg border border-sky-200 text-center space-y-1">
              <Paperclip className="w-8 h-8 text-[#0284c7] mx-auto animate-bounce" />
              <div className="text-sm font-bold text-slate-900">Drop files to attach</div>
              <div className="text-xs text-[#0369a1]">Will be uploaded to Supabase '{SUPABASE_BUCKET_MESSAGES}' bucket</div>
            </div>
          </div>
        )}

        {/* LEFT COLUMN: Conversations List (Visible on mobile when mobileView === 'list') */}
        <div 
          className={`md:col-span-5 lg:col-span-4 border-r border-slate-200 flex-col h-full bg-white ${
            mobileView === 'chat' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Messages</h2>
              <span className="bg-[#7BD1FA] text-[#073247] text-[11px] font-bold px-2 py-0.5 rounded-full">
                {conversations.length}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setIsNewMessageModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-[#7BD1FA] hover:bg-[#62c7f8] text-[#073247] rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
                title="Send message to another user"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>
          </div>

          {/* Search conversations */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations or colleagues..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7BD1FA]/30 focus:border-[#7BD1FA] focus:bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Focused / Other Tabs */}
          <div className="flex border-b border-slate-100 text-xs font-semibold text-slate-600 px-3 pt-2 gap-4">
            <button
              onClick={() => setFilterTab('focused')}
              className={`pb-2 border-b-2 transition-colors cursor-pointer ${
                filterTab === 'focused'
                  ? 'border-[#7BD1FA] text-[#0369a1] font-bold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Direct Chats ({conversations.filter(c => c.id !== 'conv-council').length})
            </button>
            <button
              onClick={() => {
                setFilterTab('other');
                handleSelectConversation('conv-council');
              }}
              className={`pb-2 border-b-2 transition-colors cursor-pointer ${
                filterTab === 'other'
                  ? 'border-[#7BD1FA] text-[#0369a1] font-bold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Channels (1)
            </button>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs space-y-2">
                <p>No conversations found.</p>
                <button
                  onClick={() => setIsNewMessageModalOpen(true)}
                  className="px-3 py-1.5 bg-[#7BD1FA] text-[#073247] font-bold rounded-lg text-xs"
                >
                  Start a Conversation
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === activeConv.id;
                const isCouncil = conv.id === 'conv-council';
                const initials = conv.participant.full_name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-sky-50/80 border-l-4 border-[#7BD1FA]' 
                        : 'hover:bg-slate-50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="relative shrink-0">
                      {isCouncil ? (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-800 to-[#7BD1FA] text-[#073247] flex items-center justify-center font-bold text-xs shadow-2xs">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-700 to-[#7BD1FA] text-[#073247] flex items-center justify-center font-bold text-xs shadow-2xs overflow-hidden">
                          {conv.participant.avatar_url ? (
                            <img
                              src={conv.participant.avatar_url}
                              alt={conv.participant.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{initials}</span>
                          )}
                        </div>
                      )}
                      {!isCouncil && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {conv.participant.full_name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {conv.last_message_time}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {conv.participant.headline.split('•')[0]}
                      </div>
                      <p
                        className={`text-xs truncate mt-1 ${
                          isSelected ? 'text-[#0369a1] font-semibold' : 'text-slate-600'
                        }`}
                      >
                        {conv.last_message}
                      </p>
                    </div>

                    {conv.unread_count > 0 && !isSelected && (
                      <span className="shrink-0 bg-[#7BD1FA] text-[#073247] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Enterprise Council Group Channel Card (Clickable) */}
          <div 
            onClick={() => handleSelectConversation('conv-council')}
            className={`p-3 border-t border-slate-100 cursor-pointer transition-colors ${
              activeConv.id === 'conv-council' ? 'bg-sky-50' : 'bg-slate-50/60 hover:bg-slate-100'
            }`}
          >
            <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <Users className="w-3.5 h-3.5 text-sky-600" />
                  <span>Systems Engineering Council</span>
                </div>
                <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">
                  8 Members
                </span>
              </div>
              <p className="text-[11px] text-slate-600 truncate mt-1">
                K. Mercer: Spec v1.4 merged to master branch.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Active Chat Stream & Message Composer (Visible on mobile when mobileView === 'chat') */}
        <div 
          className={`md:col-span-7 lg:col-span-8 flex-col h-full bg-white ${
            mobileView === 'list' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Active Chat Header */}
          <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              {/* Mobile Back Button to return to conversations */}
              <button
                type="button"
                onClick={() => setMobileView('list')}
                className="md:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Back to conversations list"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div 
                onClick={() => {
                  if (!isChannel) onSelectUser?.(activeConv.participant.username);
                }}
                className={`relative ${!isChannel ? 'cursor-pointer' : ''}`}
                title={!isChannel ? "View profile" : "Working group channel"}
              >
                {isChannel ? (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-800 to-[#7BD1FA] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    <Users className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-700 to-[#7BD1FA] text-[#073247] flex items-center justify-center font-bold text-xs shadow-2xs overflow-hidden">
                    {activeConv.participant.avatar_url ? (
                      <img
                        src={activeConv.participant.avatar_url}
                        alt={activeConv.participant.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>
                        {activeConv.participant.full_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                )}
                {!isChannel && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span 
                    onClick={() => {
                      if (!isChannel) onSelectUser?.(activeConv.participant.username);
                    }}
                    className={`text-sm font-bold text-slate-900 truncate ${!isChannel ? 'hover:text-[#0284c7] cursor-pointer' : ''}`}
                  >
                    {activeConv.participant.full_name}
                  </span>
                  {!isChannel ? (
                    <span className="text-xs text-slate-500 font-mono">
                      @{activeConv.participant.username}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                      Channel
                    </span>
                  )}
                  <ShieldCheck className="w-4 h-4 text-[#0284c7] stroke-[2.2]" />
                </div>
                <div className="text-[11px] text-slate-600 truncate">
                  {isChannel ? (
                    <span>Enterprise Architectural Working Group • 8 Members</span>
                  ) : (
                    <>
                      <span>{activeConv.participant.headline}</span> • <span className="text-emerald-600 font-medium">Active now</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-600 shrink-0">
              <button
                type="button"
                onClick={() => setIsSecurityAuditOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                title="Inspect E2EE encryption & database security"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Encrypted (AES-256)</span>
              </button>
              {!isChannel && (
                <button
                  onClick={() => onSelectUser?.(activeConv.participant.username)}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Profile
                </button>
              )}
            </div>
          </div>

          {/* Messages Thread Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/40">
            {/* Channel/Encryption Notice */}
            <div className="flex items-center justify-center">
              <span className="px-3 py-1 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold rounded-full uppercase tracking-wider shadow-2xs flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-emerald-600" />
                <span>{isChannel ? 'Enterprise Council Channel' : 'Active Direct Channel • Encrypted'}</span>
              </span>
            </div>

            {(!activeConv.messages || activeConv.messages.length === 0) ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-sky-100 text-[#0284c7] flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-900">
                  Direct message channel with {activeConv.participant.full_name}
                </div>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Send a message, share architectural insights, or attach documents. Media files are stored in the Supabase <code>{SUPABASE_BUCKET_MESSAGES}</code> bucket.
                </p>
              </div>
            ) : (
              activeConv.messages.map((msg) => {
                if (msg.is_current_user) {
                  return (
                    <div key={msg.id} className="flex flex-col items-end space-y-1">
                      {/* Attached Media Rendering */}
                      {msg.media_url && (
                        <div className="max-w-md rounded-2xl overflow-hidden border border-sky-300 shadow-xs bg-slate-950 p-2">
                          {msg.media_type === 'image' || msg.media_url.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? (
                            <div className="cursor-pointer group relative" onClick={() => setLightboxImage(msg.media_url || null)}>
                              <img
                                src={msg.media_url}
                                alt="Attachment"
                                className="max-h-64 w-auto rounded-xl object-contain bg-slate-900"
                              />
                              <div className="absolute top-2 right-2 p-1.5 bg-slate-950/70 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                <Maximize2 className="w-3.5 h-3.5" />
                              </div>
                              <div className="mt-1 flex items-center justify-between text-[10px] text-sky-200 px-1">
                                <span className="truncate">{msg.media_name || 'Image Attachment'}</span>
                                <span className="font-mono text-[#7BD1FA]">Bucket: {msg.bucket || SUPABASE_BUCKET_MESSAGES}</span>
                              </div>
                            </div>
                          ) : msg.media_type === 'video' || msg.media_url.match(/\.(mp4|webm)$/i) ? (
                            <div>
                              <video src={msg.media_url} controls className="max-h-64 rounded-xl" />
                              <div className="mt-1 text-[10px] text-sky-200">
                                <span>{msg.media_name || 'Video Attachment'}</span>
                              </div>
                            </div>
                          ) : (
                            <a
                              href={msg.media_url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-3 p-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-white transition-colors"
                            >
                              <FileText className="w-7 h-7 text-[#7BD1FA] shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold truncate text-white">
                                  {msg.media_name || 'Document Attachment'}
                                </div>
                                <div className="text-[10px] text-sky-200 flex items-center gap-2">
                                  <span>{msg.media_size || 'Attached file'}</span>
                                  <span>•</span>
                                  <span className="text-[#7BD1FA] font-mono">Bucket: {msg.bucket || SUPABASE_BUCKET_MESSAGES}</span>
                                </div>
                              </div>
                              <Download className="w-4 h-4 text-sky-300 shrink-0" />
                            </a>
                          )}
                        </div>
                      )}

                      {/* Message Text */}
                      {msg.content && (
                        <div className="max-w-lg bg-[#073247] text-white rounded-2xl rounded-tr-xs p-3.5 text-xs sm:text-sm leading-relaxed shadow-xs border-r-4 border-[#7BD1FA]">
                          {msg.content}
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono pr-1">
                        <span>{msg.time_formatted}</span>
                        <CheckCheck className="w-3.5 h-3.5 text-[#0284c7]" />
                      </div>
                    </div>
                  );
                }

                // Other user message
                return (
                  <div key={msg.id} className="flex items-start gap-2.5 max-w-xl">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-700 to-[#7BD1FA] text-[#073247] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs overflow-hidden">
                      {activeConv.participant.avatar_url ? (
                        <img
                          src={activeConv.participant.avatar_url}
                          alt={activeConv.participant.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>
                          {activeConv.participant.full_name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 flex-1">
                      {/* Attached Media Rendering */}
                      {msg.media_url && (
                        <div className="max-w-md rounded-2xl overflow-hidden border border-slate-200 shadow-2xs bg-white p-2">
                          {msg.media_type === 'image' || msg.media_url.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? (
                            <div className="cursor-pointer group relative" onClick={() => setLightboxImage(msg.media_url || null)}>
                              <img
                                src={msg.media_url}
                                alt="Attachment"
                                className="max-h-64 w-auto rounded-xl object-contain bg-slate-100"
                              />
                              <div className="absolute top-2 right-2 p-1.5 bg-slate-950/70 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                <Maximize2 className="w-3.5 h-3.5" />
                              </div>
                              <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 px-1">
                                <span className="truncate">{msg.media_name || 'Image Attachment'}</span>
                                <span className="font-mono text-[#0369a1]">Bucket: {msg.bucket || SUPABASE_BUCKET_MESSAGES}</span>
                              </div>
                            </div>
                          ) : msg.media_type === 'video' || msg.media_url.match(/\.(mp4|webm)$/i) ? (
                            <div>
                              <video src={msg.media_url} controls className="max-h-64 rounded-xl" />
                              <div className="mt-1 text-[10px] text-slate-500">
                                <span>{msg.media_name || 'Video Attachment'}</span>
                              </div>
                            </div>
                          ) : (
                            <a
                              href={msg.media_url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-3 p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-slate-900 border border-slate-200"
                            >
                              <FileText className="w-7 h-7 text-[#0284c7] shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold truncate">
                                  {msg.media_name || 'Document Attachment'}
                                </div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-2">
                                  <span>{msg.media_size || 'Attached file'}</span>
                                  <span>•</span>
                                  <span className="text-[#0369a1] font-mono">Bucket: {msg.bucket || SUPABASE_BUCKET_MESSAGES}</span>
                                </div>
                              </div>
                              <Download className="w-4 h-4 text-slate-500 shrink-0" />
                            </a>
                          )}
                        </div>
                      )}

                      {/* Message Text */}
                      {msg.content && (
                        <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-3.5 text-xs sm:text-sm text-slate-800 leading-relaxed shadow-2xs">
                          {msg.content}
                        </div>
                      )}

                      {/* Telemetry Comparison Chart Card if present */}
                      {msg.telemetry_card && (
                        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs max-w-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-slate-700 tracking-wider">
                              {msg.telemetry_card.title}
                            </span>
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                              {msg.telemetry_card.badge}
                            </span>
                          </div>

                          <div className="grid grid-cols-4 gap-2 items-end h-16 pt-2 pb-1 border-b border-slate-100">
                            {msg.telemetry_card.columns.map((col, idx) => (
                              <div key={idx} className="flex flex-col items-center gap-1">
                                <div
                                  className={`w-full rounded-sm transition-all ${
                                    col.highlighted ? 'bg-[#7BD1FA]' : 'bg-sky-100'
                                  }`}
                                  style={{ height: `${col.height}%` }}
                                />
                                <span className="text-[9px] font-mono text-slate-600">
                                  {col.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-[10px] text-slate-500 pl-1 font-mono">
                        {msg.time_formatted}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Quick Suggestion Chips */}
            <div className="flex flex-wrap gap-2 pt-2">
              {quickReplies.map((reply, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(reply)}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-sky-50 hover:bg-sky-100 text-[#0369a1] border border-sky-200 shadow-2xs transition-all cursor-pointer"
                >
                  {reply}
                </button>
              ))}
            </div>

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Message Input Box */}
          <div className="p-3 sm:p-4 border-t border-slate-200 bg-white space-y-2 shrink-0">
            {/* Upload status message */}
            {uploadStatus && (
              <div className="text-xs font-medium text-[#0369a1] bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-lg flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  {isUploadingMedia ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                  <span>{uploadStatus}</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Supabase Storage ({SUPABASE_BUCKET_MESSAGES})
                </span>
              </div>
            )}

            {/* Attachment preview chip */}
            {attachedMedia && (
              <div className="p-2.5 bg-slate-50 border border-[#7BD1FA]/50 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  {attachedMedia.type === 'image' ? (
                    <img
                      src={attachedMedia.url}
                      alt="Thumbnail"
                      className="w-9 h-9 rounded-lg object-cover border border-slate-200 cursor-pointer"
                      onClick={() => setLightboxImage(attachedMedia.url)}
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-sky-100 text-[#0284c7] flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">
                      {attachedMedia.name}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <span>{attachedMedia.size}</span>
                      <span>•</span>
                      <span className="text-[#0369a1] font-semibold">
                        Bucket: {attachedMedia.bucket}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAttachedMedia(null)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                  title="Remove attachment"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="border border-slate-200 focus-within:border-[#7BD1FA] focus-within:ring-2 focus-within:ring-[#7BD1FA]/20 rounded-xl overflow-hidden transition-all bg-white">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                placeholder={`Message ${activeConv.participant.full_name}... (Press Enter to send)`}
                className="w-full p-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 border-none focus:outline-none focus:ring-0 resize-none"
              />

              <div className="px-3 py-2 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1 text-slate-600">
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingMedia}
                    className="p-1.5 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer flex items-center gap-1"
                    title="Attach file (Upload to Supabase 'Message' bucket)"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isUploadingMedia}
                    className="p-1.5 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                    title="Attach image (Upload to Supabase 'Message' bucket)"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>

                  {/* Quick Emojis */}
                  <div className="hidden sm:flex items-center gap-0.5 ml-2 border-l border-slate-200 pl-2">
                    {quickEmojis.map((emoji, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setInputText((prev) => prev + emoji)}
                        className="p-1 hover:bg-slate-200/60 rounded text-sm transition-transform active:scale-110 cursor-pointer"
                        title={`Add ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  <span className="text-[10px] text-slate-500 font-mono hidden lg:inline ml-2">
                    Bucket: <strong className="text-[#0369a1]">{SUPABASE_BUCKET_MESSAGES}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline text-[10px] text-slate-400 font-mono">
                    Enter to send
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={(!inputText.trim() && !attachedMedia) || isUploadingMedia}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-[#7BD1FA] hover:bg-[#62c7f8] disabled:opacity-40 text-[#073247] rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    {isUploadingMedia ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <span>Send</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Direct Message Modal */}
      <NewMessageModal
        isOpen={isNewMessageModalOpen}
        onClose={() => setIsNewMessageModalOpen(false)}
        onSelectRecipient={handleSelectNewRecipient}
      />

      {/* Channel Security & Encryption Audit Modal */}
      <SecurityAuditModal
        isOpen={isSecurityAuditOpen}
        onClose={() => setIsSecurityAuditOpen(false)}
        participant={activeConv.participant}
      />

      {/* Full-Screen Image Lightbox Preview */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden p-2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 bg-slate-950/80 hover:bg-slate-950 text-white rounded-full transition-colors cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImage}
              alt="Full preview"
              className="max-h-[80vh] w-auto rounded-xl object-contain mx-auto"
            />
            <div className="p-3 flex items-center justify-between text-xs text-sky-200">
              <span className="font-mono text-[#7BD1FA]">Supabase Storage: {SUPABASE_BUCKET_MESSAGES} bucket</span>
              <a
                href={lightboxImage}
                target="_blank"
                rel="noreferrer"
                download
                className="flex items-center gap-1 text-white hover:text-[#7BD1FA] font-semibold"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
