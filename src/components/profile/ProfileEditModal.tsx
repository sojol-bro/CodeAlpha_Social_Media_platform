import React, { useState, useRef } from 'react';
import { 
  X, 
  Camera, 
  Loader2, 
  Check, 
  Trash2, 
  User, 
  Briefcase, 
  MapPin, 
  Globe, 
  FileText, 
  Database,
  AtSign
} from 'lucide-react';
import { Profile } from '../../lib/types';
import { uploadProfilePicture, SUPABASE_BUCKET_DP } from '../../lib/supabase';
import { api } from '../../lib/api';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
  onProfileUpdated: (updated: Profile) => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
}) => {
  const [fullName, setFullName] = useState(profile.full_name);
  const [username, setUsername] = useState(profile.username);
  const [headline, setHeadline] = useState(profile.headline);
  const [bio, setBio] = useState(profile.bio || '');
  const [location, setLocation] = useState(profile.location || '');
  const [website, setWebsite] = useState(profile.website || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setStatusMessage("Uploading photo to Supabase 'DP' bucket...");
    setErrorMessage(null);

    try {
      const res = await uploadProfilePicture(file);
      setAvatarUrl(res.url);
      setStatusMessage("Photo stored in 'DP' bucket!");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage('Photo upload failed. You can still save other profile fields.');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = () => {
    setAvatarUrl('');
    setStatusMessage('Profile picture cleared.');
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMessage('Full name cannot be blank.');
      return;
    }
    if (!username.trim()) {
      setErrorMessage('Username cannot be blank.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setStatusMessage('Updating profile in database...');

    try {
      const cleanUsername = username.trim().replace(/^@/, '');
      const updated = await api.updateProfile({
        full_name: fullName.trim(),
        username: cleanUsername,
        headline: headline.trim(),
        bio: bio.trim(),
        location: location.trim(),
        website: website.trim(),
        avatar_url: avatarUrl,
      });

      onProfileUpdated(updated);
      setStatusMessage('Profile updated successfully!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage('Failed to save profile changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#7BD1FA] text-[#073247] flex items-center justify-center font-bold text-sm shadow-xs">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Edit Profile
              </h2>
              <p className="text-xs text-slate-600">
                Update your professional information and display photo
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* Avatar Upload Banner */}
          <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            <div className="relative group shrink-0">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#0284c7] via-[#38bdf8] to-[#7BD1FA] text-[#073247] flex items-center justify-center font-bold text-2xl ring-4 ring-white shadow-md overflow-hidden relative cursor-pointer"
                title="Upload to DP bucket"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                ) : (
                  <span>{fullName.split(' ').map(n => n[0]).join('').slice(0, 2) || 'ER'}</span>
                )}

                {isUploadingPhoto && (
                  <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center text-[#7BD1FA]">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="absolute -bottom-1 -right-1 p-1.5 bg-[#7BD1FA] hover:bg-[#62c7f8] text-[#073247] rounded-full ring-2 ring-white shadow-xs cursor-pointer transition-transform active:scale-95"
                title="Upload photo to DP bucket"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-xs font-bold text-slate-900">Profile Picture (DP)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-100 text-[#0369a1] font-semibold border border-sky-200">
                  {SUPABASE_BUCKET_DP} bucket
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                Supports JPG, PNG, or GIF up to 10MB. Stored in Supabase <code>DP</code> storage bucket.
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  {isUploadingPhoto ? 'Uploading...' : 'Upload New Photo'}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-2.5 py-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Elena Rostova"
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7BD1FA]/40 focus:border-[#7BD1FA] focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Username <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs">
                  @
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="elena_rostova"
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7BD1FA]/40 focus:border-[#7BD1FA] focus:bg-white transition-all font-mono"
                />
              </div>
            </div>
          </div>

          {/* Headline */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
              <span>Headline & Current Role</span>
              <span className="text-[11px] text-slate-500 font-normal">Shown across network</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. VP of AI Systems & Architecture at MIO Labs | Ex-Google Brain"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7BD1FA]/40 focus:border-[#7BD1FA] focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Location & Website */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Location
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. San Francisco Bay Area"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7BD1FA]/40 focus:border-[#7BD1FA] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Website or Research Link
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <Globe className="w-3.5 h-3.5" />
                </span>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://mio.ai/research/elena"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7BD1FA]/40 focus:border-[#7BD1FA] focus:bg-white transition-all font-mono"
                />
              </div>
            </div>
          </div>

          {/* About / Bio */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
              <span>About / Executive Bio</span>
              <span className="text-[11px] text-slate-500 font-normal">Markdown / plain text</span>
            </label>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Describe your background, core research areas, architectural philosophies, or team leadership..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7BD1FA]/40 focus:border-[#7BD1FA] focus:bg-white transition-all resize-y leading-relaxed"
            />
          </div>

          {/* Storage & DB sync info */}
          <div className="p-3 bg-sky-50/70 border border-sky-100 rounded-xl flex items-start gap-2.5 text-xs text-[#073247]">
            <Database className="w-4 h-4 text-[#0284c7] shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Database Synchronized:</strong> Changes update your row in Supabase PostgreSQL (<code>public.profiles</code>) and Django REST Framework (<code>PATCH /api/profiles/me/</code>).
            </div>
          </div>

          {/* Status / Error feedback */}
          {statusMessage && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800 flex items-center gap-2">
              <X className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploadingPhoto}
              className="px-5 py-2 bg-[#7BD1FA] hover:bg-[#62c7f8] text-[#073247] rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
