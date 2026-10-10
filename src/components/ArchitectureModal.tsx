import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Terminal, 
  Database, 
  Server, 
  Code2, 
  Layers, 
  FileCode,
  ShieldCheck,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'schema' | 'django' | 'terminal' | 'flow'>('schema');
  const [activeDjangoFile, setActiveDjangoFile] = useState<string>('settings.py');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard?.writeText?.(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const schemaSql = `-- ==============================================================================
-- MIO - SUPABASE POSTGRESQL PRODUCTION SCHEMA
-- Connected to: postgresql://postgres:sojol&@3997@db.lopljazpsnykyfhdjowt.supabase.co:5432/postgres
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES TABLE (Linked directly to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    headline TEXT,
    bio TEXT,
    avatar_url TEXT,
    website TEXT,
    location TEXT DEFAULT 'San Francisco Bay Area',
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. POSTS TABLE
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT,
    caption TEXT NOT NULL,
    location TEXT,
    tags TEXT[] DEFAULT '{}',
    post_type TEXT DEFAULT 'standard',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. POST MEDIA (Supabase Storage URL references)
CREATE TABLE IF NOT EXISTS public.post_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL,
    position_index INT4 DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. LIKES TABLE (Composite PK prevents double likes)
CREATE TABLE IF NOT EXISTS public.likes (
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (post_id, user_id)
);

-- 5. COMMENTS TABLE (Threaded)
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. FOLLOWS TABLE
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (follower_id, following_id)
);

-- 7. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    content TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. CONVERSATIONS & DIRECT MESSAGES TABLES
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_one UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    participant_two UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_message TEXT,
    last_message_time TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT,
    media_url TEXT,
    media_type TEXT,
    media_name TEXT,
    media_size TEXT,
    bucket TEXT DEFAULT 'Message',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Storage buckets for DP (profile pictures), posts (post media), and Message (chat attachments)
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('DP', 'DP', true),
  ('posts', 'posts', true),
  ('Message', 'Message', true)
ON CONFLICT (id) DO NOTHING;`;

  const djangoFiles: Record<string, string> = {
    'authentication.py': `import jwt
from rest_framework import authentication, exceptions
from django.conf import settings
from .models import Profile

class SupabaseAuthentication(authentication.BaseAuthentication):
    """
    DRF Authentication verifying Supabase JWT in Authorization header.
    Bypasses Django's default session/model auth to rely on Supabase Auth.
    """
    def authenticate(self, request):
        auth_header = authentication.get_authorization_header(request).split()
        if not auth_header or auth_header[0].lower() != b"bearer":
            return None

        token = auth_header[1].decode("utf-8")
        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated"
            )
            user_id = payload.get("sub")
            profile, _ = Profile.objects.get_or_create(id=user_id)
            request.profile = profile
            return (profile, token)
        except Exception as e:
            raise exceptions.AuthenticationFailed(f"Invalid Supabase JWT: {str(e)}")`,

    'settings.py': `REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "api.authentication.SupabaseAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ),
    "DEFAULT_PAGINATION_CLASS": "api.views.StandardResultsSetPagination",
    "PAGE_SIZE": 10,
}

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("SUPABASE_DB_NAME", "postgres"),
        "USER": os.getenv("SUPABASE_DB_USER", "postgres"),
        "PASSWORD": os.getenv("SUPABASE_DB_PASSWORD"),
        "HOST": os.getenv("SUPABASE_DB_HOST"),
        "PORT": os.getenv("SUPABASE_DB_PORT", "5432"),
        "OPTIONS": {"sslmode": "require"},
    }
}

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_HEADERS = list(default_headers) + ["apikey", "authorization"]`,

    'models.py': `class Profile(models.Model):
    id = models.UUIDField(primary_key=True)
    username = models.CharField(max_length=150, unique=True)
    full_name = models.CharField(max_length=255)
    headline = models.CharField(max_length=300, blank=True)
    avatar_url = models.URLField(blank=True)
    class Meta:
        db_table = "profiles"

class Post(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="posts")
    caption = models.TextField()
    tags = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = "posts"`,

    'views.py': `class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.select_related("user").prefetch_related("media", "likes")
    serializer_class = PostSerializer
    pagination_class = StandardResultsSetPagination

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, pk=None):
        post = self.get_object()
        like = Like.objects.filter(post=post, user=request.profile).first()
        if like:
            like.delete()
            return Response({"has_liked": False, "likes_count": post.likes.count()})
        Like.objects.create(post=post, user=request.profile)
        return Response({"has_liked": True, "likes_count": post.likes.count()})`,

    'requirements.txt': `Django>=5.0.0,<6.0.0
djangorestframework>=3.15.0
django-cors-headers>=4.3.1
psycopg2-binary>=2.9.9
PyJWT[crypto]>=2.8.0
cryptography>=42.0.5
python-dotenv>=1.0.1
requests>=2.31.0
gunicorn>=21.2.0`,
  };

  const concurrentCommands = `# ==============================================================================
# NEXUS NETWORK - CONCURRENT INITIALIZATION (REACT + DJANGO REST + SUPABASE)
# ==============================================================================

# Option A: Quick Concurrent Start via Node.js concurrently
npm install -g concurrently

concurrently --names "DJANGO,REACT" --prefix-colors "blue,green" \\
  "cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt && python manage.py migrate && python manage.py runserver 0.0.0.0:8000" \\
  "npm install && npm run dev"

# ------------------------------------------------------------------------------
# Option B: Independent Terminal Shells
# ------------------------------------------------------------------------------
# Terminal 1: Django REST Framework Backend
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000

# Terminal 2: React Frontend (Vite)
npm install
npm run dev`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#7BD1FA] text-[#073247] flex items-center justify-center font-black text-sm shadow-xs">
              M
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                MIO — Full-Stack Architecture & Code
              </h2>
              <p className="text-xs text-slate-600">
                React (Frontend) • Django REST Framework (Backend) • Supabase (Database & Auth)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-6 text-xs font-semibold text-slate-600 gap-6">
          <button
            onClick={() => setActiveTab('schema')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'schema'
                ? 'border-[#7BD1FA] text-[#0369a1] font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>1. Supabase PostgreSQL Schema</span>
          </button>

          <button
            onClick={() => setActiveTab('django')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'django'
                ? 'border-[#7BD1FA] text-[#0369a1] font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>2. Django REST Framework</span>
          </button>

          <button
            onClick={() => setActiveTab('terminal')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'terminal'
                ? 'border-[#7BD1FA] text-[#0369a1] font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>3. Concurrent Launch Commands</span>
          </button>

          <button
            onClick={() => setActiveTab('flow')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'flow'
                ? 'border-[#7BD1FA] text-[#0369a1] font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>4. Architecture & JWT Flow</span>
          </button>
        </div>

        {/* Modal Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {/* Tab 1: Supabase SQL Schema */}
          {activeTab === 'schema' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    PostgreSQL Raw Schema (supabase/schema.sql)
                  </h3>
                  <p className="text-xs text-slate-600">
                    Executes directly in Supabase SQL Editor. Includes RLS, cascades to auth.users, and storage bucket.
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(schemaSql, 'schema')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7BD1FA] hover:bg-[#62c7f8] text-[#073247] rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {copiedKey === 'schema' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'schema' ? 'Copied SQL' : 'Copy Schema SQL'}</span>
                </button>
              </div>

              <div className="rounded-xl border border-slate-300 overflow-hidden bg-slate-950 font-mono text-xs text-sky-200">
                <pre className="p-4 overflow-x-auto max-h-[460px] leading-relaxed">
                  <code>{schemaSql}</code>
                </pre>
              </div>
            </div>
          )}

          {/* Tab 2: Django REST Backend Files */}
          {activeTab === 'django' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {Object.keys(djangoFiles).map((filename) => (
                    <button
                      key={filename}
                      onClick={() => setActiveDjangoFile(filename)}
                      className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                        activeDjangoFile === filename
                          ? 'bg-[#7BD1FA] text-[#073247] font-bold shadow-2xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {filename}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handleCopy(djangoFiles[activeDjangoFile], activeDjangoFile)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7BD1FA] hover:bg-[#62c7f8] text-[#073247] rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer self-start sm:self-auto shrink-0"
                >
                  {copiedKey === activeDjangoFile ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === activeDjangoFile ? 'Copied' : `Copy ${activeDjangoFile}`}</span>
                </button>
              </div>

              <div className="rounded-xl border border-slate-300 overflow-hidden bg-slate-950 font-mono text-xs text-sky-200">
                <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 text-[11px] text-slate-400">
                  File: backend/{activeDjangoFile === 'requirements.txt' ? '' : 'api/'}{activeDjangoFile}
                </div>
                <pre className="p-4 overflow-x-auto max-h-[440px] leading-relaxed">
                  <code>{djangoFiles[activeDjangoFile]}</code>
                </pre>
              </div>
            </div>
          )}

          {/* Tab 3: Concurrent Terminal Commands */}
          {activeTab === 'terminal' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Dual-Process Environment Setup
                  </h3>
                  <p className="text-xs text-slate-600">
                    Runs both Django (Port 8000) and React (Port 3000) simultaneously with live reloading.
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(concurrentCommands, 'commands')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7BD1FA] hover:bg-[#62c7f8] text-[#073247] rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {copiedKey === 'commands' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'commands' ? 'Copied Commands' : 'Copy Commands'}</span>
                </button>
              </div>

              <div className="rounded-xl border border-slate-300 overflow-hidden bg-slate-950 font-mono text-xs text-emerald-300">
                <pre className="p-4 overflow-x-auto max-h-[460px] leading-relaxed">
                  <code>{concurrentCommands}</code>
                </pre>
              </div>
            </div>
          )}

          {/* Tab 4: Architecture & JWT Handshake */}
          {activeTab === 'flow' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#0284c7]" />
                  <span>End-to-End JWT Auth & Storage Topology</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="font-bold text-[#0284c7] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#7BD1FA]" />
                      <span>1. Client (React SPA)</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Initializes <code>@supabase/supabase-js</code>. Handles OAuth, login, session refresh, and direct asset upload to Supabase Storage buckets (<code>DP</code> for profile pictures, <code>posts</code> for post data, and <code>Message</code> for chat attachments).
                    </p>
                    <div className="p-2 bg-white rounded border border-slate-200 font-mono text-[10px] text-slate-700">
                      Authorization: Bearer &lt;jwt&gt;
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="font-bold text-[#0284c7] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#7BD1FA]" />
                      <span>2. Backend (Django DRF)</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      <code>SupabaseAuthentication</code> intercepts the Bearer JWT, decodes claims against <code>SUPABASE_JWT_SECRET</code>, extracts user UUID (<code>sub</code>), and associates profile without session cookies.
                    </p>
                    <div className="p-2 bg-white rounded border border-slate-200 font-mono text-[10px] text-slate-700">
                      request.profile = Profile.objects.get(id=sub)
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="font-bold text-[#0284c7] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#7BD1FA]" />
                      <span>3. Database (Supabase Postgres)</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Primary source of truth. Connected via <code>psycopg2-binary</code> with SSL require. Row Level Security policies enforce multi-tenant isolation.
                    </p>
                    <div className="p-2 bg-white rounded border border-slate-200 font-mono text-[10px] text-slate-700">
                      PostgreSQL 15+ with pg_trgm & RLS
                    </div>
                  </div>
                </div>
              </div>

              {/* Endpoint Specification Table */}
              <div className="bg-white p-5 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                  REST API Endpoint Contract
                </h4>
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono font-bold text-[10px]">
                        GET
                      </span>
                      <span className="font-mono text-slate-800">/api/posts/?page=1&tag=MachineLearning</span>
                    </div>
                    <span className="text-slate-600 text-[11px]">Paginated feed with tag and search filters</span>
                  </div>

                  <div className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono font-bold text-[10px]">
                        POST
                      </span>
                      <span className="font-mono text-slate-800">/api/posts/</span>
                    </div>
                    <span className="text-slate-600 text-[11px]">Create post + persist Supabase Storage media URLs</span>
                  </div>

                  <div className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono font-bold text-[10px]">
                        POST
                      </span>
                      <span className="font-mono text-slate-800">/api/posts/&lt;id&gt;/like/</span>
                    </div>
                    <span className="text-slate-600 text-[11px]">Atomic like toggle and notification trigger</span>
                  </div>

                  <div className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono font-bold text-[10px]">
                        POST
                      </span>
                      <span className="font-mono text-slate-800">/api/posts/&lt;id&gt;/comments/</span>
                    </div>
                    <span className="text-slate-600 text-[11px]">Create threaded comment</span>
                  </div>

                  <div className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono font-bold text-[10px]">
                        GET
                      </span>
                      <span className="font-mono text-slate-800">/api/profiles/me/</span>
                    </div>
                    <span className="text-slate-600 text-[11px]">Get active profile via Supabase token sub</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-600">
          <div>Files located in <code>/supabase/schema.sql</code> and <code>/backend/</code></div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
