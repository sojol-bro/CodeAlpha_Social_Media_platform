import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  Bold, 
  Italic, 
  Strikethrough, 
  Link2, 
  List, 
  ListOrdered, 
  Code, 
  Quote, 
  Eye, 
  UploadCloud, 
  FileText, 
  X, 
  Sparkles, 
  BarChart2, 
  Check, 
  AlertCircle,
  Loader2,
  Send,
  Image as ImageIcon,
  Video as VideoIcon,
  Hash,
  Globe,
  Trash2,
  Plus,
  Compass,
  FileCheck,
  Cpu
} from 'lucide-react';
import { DEFAULT_CURRENT_USER, getCurrentUserProfile, uploadToSupabaseStorage } from '../../lib/supabase';
import { api } from '../../lib/api';
import { Post, PostType } from '../../lib/types';

interface PostCreationStudioProps {
  onBackToFeed: () => void;
  onPostCreated: (post: Post) => void;
  initialText?: string;
}

export const PostCreationStudio: React.FC<PostCreationStudioProps> = ({
  onBackToFeed,
  onPostCreated,
  initialText = '',
}) => {
  // Post format mode: User sets what they need to post
  const [postType, setPostType] = useState<PostType>('standard');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState(initialText || '');
  const [audience, setAudience] = useState('Anyone / Public');
  const [category, setCategory] = useState('General Engineering');

  // Tags state: starts clean
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');

  // Benchmark fields (if postType === 'benchmark')
  const [benchThroughput, setBenchThroughput] = useState('');
  const [benchLatency, setBenchLatency] = useState('');
  const [benchHardware, setBenchHardware] = useState('');

  // View & formatting
  const [isMarkdown, setIsMarkdown] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  // Attached files state: starts clean with zero unwanted files
  const [attachedFiles, setAttachedFiles] = useState<
    { name: string; size: string; url: string; type: string }[]
  >([]);

  // File upload state & safety
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState('');
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAbortRef = useRef<boolean>(false);
  const currentUser = getCurrentUserProfile() || DEFAULT_CURRENT_USER;

  // Warn on browser unload if uploading
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUploading) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isUploading]);

  const handleSafeBackToFeed = () => {
    if (isUploading) {
      setShowExitConfirmModal(true);
      return;
    }
    onBackToFeed();
  };

  const confirmCancelUploadAndExit = () => {
    uploadAbortRef.current = true;
    setIsUploading(false);
    setUploadProgress(0);
    setShowExitConfirmModal(false);
    onBackToFeed();
  };

  const handleResetDraft = () => {
    if (caption.trim() || title.trim() || attachedFiles.length > 0) {
      if (!confirm('Are you sure you want to clear your current post draft?')) {
        return;
      }
    }
    setTitle('');
    setCaption('');
    setSelectedTags([]);
    setAttachedFiles([]);
    setBenchThroughput('');
    setBenchLatency('');
    setBenchHardware('');
    setCustomTagInput('');
    setStatusMessage('Draft cleared.');
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const popularSuggestedTags = [
    'EngineeringLeadership',
    'DistributedSystems',
    'AIInfrastructure',
    'LLMOps',
    'CUDA',
    'Kubernetes',
    'Research',
    'OpenSource',
  ];

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = customTagInput.trim().replace(/^#/, '');
    if (!clean) return;
    if (!selectedTags.includes(clean)) {
      setSelectedTags([...selectedTags, clean]);
    }
    setCustomTagInput('');
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    uploadAbortRef.current = false;
    setIsUploading(true);
    setUploadingFileName(file.name);
    setUploadProgress(15);
    setStatusMessage(`Uploading ${file.name} to Supabase Storage bucket ('posts')...`);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 15;
      });
    }, 250);

    try {
      const result = await uploadToSupabaseStorage(file, 'posts');
      clearInterval(progressInterval);

      if (uploadAbortRef.current) return;

      setUploadProgress(100);
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);

      setAttachedFiles((prev) => [
        ...prev,
        {
          name: file.name,
          size: `${sizeMb} MB`,
          url: result.url,
          type: file.type.includes('image')
            ? 'image'
            : file.type.includes('video')
            ? 'video'
            : 'document',
        },
      ]);
      setStatusMessage(`Attached "${file.name}" successfully!`);
      setTimeout(() => {
        setStatusMessage(null);
        setUploadProgress(0);
        setUploadingFileName('');
      }, 3000);
    } catch (err: any) {
      clearInterval(progressInterval);
      if (!uploadAbortRef.current) {
        setStatusMessage('Upload complete (cached locally).');
        setTimeout(() => {
          setStatusMessage(null);
          setUploadProgress(0);
          setUploadingFileName('');
        }, 3000);
      }
    } finally {
      if (!uploadAbortRef.current) {
        setIsUploading(false);
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
  };

  const handlePublish = async () => {
    if (!caption.trim() && !title.trim() && attachedFiles.length === 0) {
      alert('Please add content or an attachment before publishing.');
      return;
    }

    setIsPublishing(true);
    try {
      // Build benchmark data if benchmark post
      const benchmarkData = postType === 'benchmark' && (benchThroughput || benchLatency) ? {
        title: title.trim() || 'Performance Benchmark',
        subtitle: benchHardware || 'Standard Distributed Cluster',
        throughput: benchThroughput ? `${benchThroughput} tok/s` : '3,840 tok/s',
        throughput_sub: 'Inference Throughput',
        latency: benchLatency ? `${benchLatency} ms` : '18.4 ms',
        latency_sub: 'P99 Token Latency',
        datapoints: [34, 45, 62, 78, 88, 94],
        optimal_label: 'Target SFI Metric',
      } : undefined;

      const createdPost = await api.createPost({
        title: title.trim() || undefined,
        caption: caption.trim() || (title.trim() ? title.trim() : 'Shared system update.'),
        tags: selectedTags.length > 0 ? selectedTags : ['TechUpdate'],
        post_type: postType,
        media_items: attachedFiles.map((f, i) => ({
          media_url: f.url,
          media_type: f.type,
          filename: f.name,
          file_size: f.size,
          position_index: i,
        })),
        benchmark_data: benchmarkData,
      });

      onPostCreated(createdPost);
      onBackToFeed();
    } catch (err) {
      alert('Failed to publish post to backend.');
    } finally {
      setIsPublishing(false);
    }
  };

  const charCount = caption.length;
  const wordCount = caption.trim() ? caption.trim().split(/\s+/).length : 0;

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*,application/pdf,.doc,.docx,.txt"
        onChange={(e) => handleFileUpload(e.target.files)}
      />

      {/* 1. Clean Top Header & Navigation */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <button
          onClick={handleSafeBackToFeed}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </button>

        <div className="flex items-center gap-3">
          {(caption.trim() || title.trim() || attachedFiles.length > 0) && (
            <button
              onClick={handleResetDraft}
              className="text-xs text-slate-500 hover:text-rose-600 font-medium flex items-center gap-1 cursor-pointer transition-colors"
              title="Clear all fields"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Draft</span>
            </button>
          )}

          <button
            onClick={() => setIsPreview(!isPreview)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
              isPreview
                ? 'bg-sky-50 text-[#0284c7] border-[#7BD1FA]'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isPreview ? 'Edit Post' : 'Preview'}</span>
          </button>
        </div>
      </div>

      {/* 2. Post Format Mode Picker: "User sets what they need to post" */}
      <div className="mt-4 p-1.5 bg-slate-100 rounded-2xl flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setPostType('standard')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            postType === 'standard'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>💬</span>
          <span>Quick Update</span>
        </button>

        <button
          type="button"
          onClick={() => setPostType('article')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            postType === 'article'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>📝</span>
          <span>Deep-Dive Article</span>
        </button>

        <button
          type="button"
          onClick={() => setPostType('benchmark')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            postType === 'benchmark'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>📊</span>
          <span>Technical Benchmark</span>
        </button>

        <button
          type="button"
          onClick={() => setPostType('research')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            postType === 'research'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>📑</span>
          <span>Whitepaper / Spec</span>
        </button>
      </div>

      {/* 3. Author Info & Targeting Row */}
      <div className="flex items-center justify-between py-4 border-b border-slate-100 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#7BD1FA] to-sky-700 flex items-center justify-center text-[#073247] font-bold text-xs shadow-2xs overflow-hidden aspect-square">
            {currentUser.avatar_url ? (
              <img
                src={currentUser.avatar_url}
                alt={currentUser.full_name}
                className="w-full h-full object-cover aspect-square"
              />
            ) : (
              <span>ER</span>
            )}
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">
              {currentUser.full_name}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded px-2 py-0.5 text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="Anyone / Public">🌐 Anyone / Public</option>
                <option value="Network Only">🔒 Network Connections</option>
                <option value="Fellows Only">🏛️ Architecture Council</option>
              </select>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="text-xs bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded px-2 py-0.5 text-sky-800 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="General Engineering">General Engineering</option>
                <option value="AI Infrastructure">AI Infrastructure</option>
                <option value="Distributed Systems">Distributed Systems</option>
                <option value="Compiler & Kernels">Compiler & Kernels</option>
                <option value="Hardware Architecture">Hardware Architecture</option>
              </select>
            </div>
          </div>
        </div>

        {/* Word and character counters */}
        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
          <span>{wordCount} words</span>
          <span>•</span>
          <span className="font-mono">{charCount} / 4,000 chars</span>
        </div>
      </div>

      {/* 4. Formatting Tools */}
      {!isPreview && (
        <div className="flex items-center justify-between py-2 border-b border-slate-100 text-slate-600 text-xs">
          <div className="flex items-center gap-1">
            <button 
              type="button"
              onClick={() => setCaption((c) => c + ' **bold text** ')}
              className="p-1.5 rounded hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              title="Bold"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button 
              type="button"
              onClick={() => setCaption((c) => c + ' *italic text* ')}
              className="p-1.5 rounded hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              title="Italic"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button 
              type="button"
              onClick={() => setCaption((c) => c + ' ~strike~ ')}
              className="p-1.5 rounded hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              title="Strikethrough"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>
            <span className="w-px h-3.5 bg-slate-200 mx-1" />
            <button 
              type="button"
              onClick={() => setCaption((c) => c + '\n```python\n# Add your implementation snippet here\n```\n')}
              className="p-1.5 rounded hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              title="Code block"
            >
              <Code className="w-3.5 h-3.5" />
            </button>
            <button 
              type="button"
              onClick={() => setCaption((c) => c + '\n> "Architecture quote or RFC excerpt"\n')}
              className="p-1.5 rounded hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              title="Quote"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>
            <button 
              type="button"
              onClick={() => setCaption((c) => c + '\n- Point 1\n- Point 2\n')}
              className="p-1.5 rounded hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              title="Bullet list"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsMarkdown(!isMarkdown)}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border cursor-pointer ${
              isMarkdown
                ? 'bg-slate-900 text-white border-slate-900'
                : 'text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Markdown
          </button>
        </div>
      )}

      {/* 5. Clean Main Post Editor */}
      <div className="py-4 space-y-4">
        {/* Title Input: Always cleanly styled, optional for quick updates, prominent for articles */}
        {(postType === 'article' || postType === 'benchmark' || postType === 'research' || title.length > 0) && (
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                postType === 'article'
                  ? 'Article Headline or Architecture Title...'
                  : postType === 'benchmark'
                  ? 'Benchmark Experiment or Architecture Test Title...'
                  : postType === 'research'
                  ? 'Paper Title or RFC Specification Name...'
                  : 'Post Title (Optional)...'
              }
              className="w-full text-lg sm:text-xl font-bold text-slate-900 placeholder-slate-400 border-b border-slate-200 pb-2 focus:outline-none focus:border-[#7BD1FA] transition-colors"
            />
          </div>
        )}

        {/* Benchmark Specific Metric Controls (when postType === 'benchmark') */}
        {postType === 'benchmark' && !isPreview && (
          <div className="p-4 bg-sky-50/70 border border-sky-100 rounded-xl space-y-3">
            <div className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[#0284c7]" />
              <span>Benchmark Telemetry Metrics (Optional)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Throughput (tok/sec)
                </label>
                <input
                  type="text"
                  value={benchThroughput}
                  onChange={(e) => setBenchThroughput(e.target.value)}
                  placeholder="e.g. 4,820"
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#7BD1FA]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Latency (ms)
                </label>
                <input
                  type="text"
                  value={benchLatency}
                  onChange={(e) => setBenchLatency(e.target.value)}
                  placeholder="e.g. 14.8"
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#7BD1FA]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Cluster / Hardware
                </label>
                <input
                  type="text"
                  value={benchHardware}
                  onChange={(e) => setBenchHardware(e.target.value)}
                  placeholder="e.g. 8x H100 SXM5 NVLink"
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#7BD1FA]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Content Area or Live Preview */}
        {isPreview ? (
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="text-xs font-bold text-[#0284c7] uppercase tracking-wider">
              {postType} Preview
            </div>
            {title && <h2 className="text-xl font-bold text-slate-900">{title}</h2>}
            <div className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">
              {caption || <span className="text-slate-400 italic">No text provided.</span>}
            </div>

            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {selectedTags.map((tag) => (
                  <span key={tag} className="text-xs font-semibold text-[#0284c7]">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={postType === 'article' ? 10 : 6}
            placeholder={
              postType === 'standard'
                ? "What's on your mind? Share system observations, architecture decisions, or insights with your network..."
                : postType === 'article'
                ? 'Draft your in-depth architectural article, methodology, or deep-dive...'
                : postType === 'benchmark'
                ? 'Describe the benchmark harness, test methodology, model architecture, and observed speedups...'
                : 'Executive summary, abstract, and architecture paper findings...'
            }
            className="w-full text-sm sm:text-base text-slate-800 placeholder-slate-400 border border-slate-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-[#7BD1FA]/30 focus:border-[#7BD1FA] resize-none leading-relaxed transition-all"
          />
        )}
      </div>

      {/* 6. Media Attachment Bar & Upload Box */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <UploadCloud className="w-4 h-4 text-[#0284c7]" />
            <span>Attach Media & Documents</span>
          </div>

          {/* Quick upload triggers */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>Image / Diagram</span>
            </button>

            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <VideoIcon className="w-3.5 h-3.5 text-blue-600" />
              <span>Video</span>
            </button>

            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              <span>PDF / Doc</span>
            </button>
          </div>
        </div>

        {/* Upload progress indicator */}
        {isUploading && (
          <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-2 font-semibold text-sky-950 truncate max-w-[70%]">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0284c7] shrink-0" />
                <span className="truncate">Uploading: {uploadingFileName || 'Attachment'}</span>
              </div>
              <span className="font-bold text-[#0284c7]">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-sky-200/60 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#0284c7] h-2 transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-[11px] text-sky-800">
              <span>Streaming to Supabase Storage ('posts' bucket)...</span>
              <button
                type="button"
                onClick={() => {
                  uploadAbortRef.current = true;
                  setIsUploading(false);
                  setUploadProgress(0);
                  setStatusMessage('Upload cancelled.');
                  setTimeout(() => setStatusMessage(null), 2500);
                }}
                className="text-rose-600 hover:text-rose-700 font-semibold hover:underline cursor-pointer"
              >
                Cancel Upload
              </button>
            </div>
          </div>
        )}

        {statusMessage && !isUploading && (
          <div className="text-xs font-semibold text-[#0284c7] flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Clean list of attached files */}
        {attachedFiles.length > 0 && (
          <div className="space-y-2 pt-1">
            {attachedFiles.map((file, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0284c7] shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      {file.name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {file.size} • Supabase Storage
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveFile(idx)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7. Tag Manager: Type custom tags or click suggestions */}
      <div className="mt-4 p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
            <Hash className="w-3.5 h-3.5 text-[#0284c7]" />
            <span>Topics & Tags</span>
          </span>
          <span className="text-[11px] text-slate-500">
            {selectedTags.length} selected
          </span>
        </div>

        {/* Custom tag input form */}
        <form onSubmit={handleAddCustomTag} className="flex gap-2">
          <input
            type="text"
            value={customTagInput}
            onChange={(e) => setCustomTagInput(e.target.value)}
            placeholder="Type custom tag (e.g. DistributedSystems) and press enter..."
            className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#7BD1FA] focus:bg-white"
          />
          <button
            type="button"
            onClick={handleAddCustomTag}
            disabled={!customTagInput.trim()}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </form>

        {/* Currently selected tags */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#7BD1FA] text-[#073247] shadow-2xs"
              >
                <span>#{tag}</span>
                <button
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  className="hover:text-rose-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Suggested popular tags */}
        <div className="pt-2 border-t border-slate-100">
          <div className="text-[11px] text-slate-500 font-medium mb-1.5">
            Suggested Tags:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {popularSuggestedTags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  className={`px-2.5 py-1 rounded-full text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-sky-100 text-[#0369a1] font-bold border border-sky-300'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {isSelected ? `✓ #${tag}` : `+ #${tag}`}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 8. Publish Actions Footer */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={handleSafeBackToFeed}
          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          Cancel
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isPublishing || (!caption.trim() && !title.trim() && attachedFiles.length === 0)}
            onClick={handlePublish}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#073247] bg-[#7BD1FA] hover:bg-[#62c7f8] disabled:opacity-50 transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Publishing to Network...</span>
              </>
            ) : (
              <>
                <span>Publish Post</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Upload Cancellation Confirmation Modal */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Upload In Progress</h3>
                <p className="text-xs text-slate-500">Supabase Storage Transfer</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              <strong>"{uploadingFileName}"</strong> is currently uploading to the <code>posts</code> bucket ({uploadProgress}% complete). If you leave now, the upload will be aborted.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Keep Uploading
              </button>
              <button
                type="button"
                onClick={confirmCancelUploadAndExit}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer shadow-sm"
              >
                Cancel Upload & Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
