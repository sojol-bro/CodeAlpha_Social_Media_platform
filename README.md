# Nexus Network — Full-Stack Social Media Architecture

An executive, high-performance social platform designed for AI systems architects, researchers, and engineering leaders, built with **React (Vite + Tailwind CSS)**, **Django REST Framework**, and **Supabase (PostgreSQL Database & Auth)**.

---

## 1. Database & Authentication (Supabase)

### PostgreSQL Schema
The database acts as the single source of truth. All tables, Row Level Security (RLS) policies, and foreign keys cascading to `auth.users` are defined in [`supabase/schema.sql`](supabase/schema.sql).

- **`public.profiles`**: Mirrors `auth.users(id)` with cascading deletion. Holds username, headline, bio, avatar URL, website, and metrics.
- **`public.user_settings`**: Theme preferences, activity status, notification toggles.
- **`public.posts`**: Title, caption, tags array, post_type (`standard`, `benchmark`, `research`, `article`), and JSONB metadata (benchmarks, paper metrics).
- **`public.post_media`**: Media URLs stored in the Supabase Storage bucket (`nexus-media`), media types (`image`, `video`, `document`, `pdf`), and position indexing.
- **`public.likes`**: Composite primary key `(post_id, user_id)` preventing duplicate likes.
- **`public.comments`**: Recursive self-referencing `parent_comment_id` for threaded discussions.
- **`public.follows`**: Composite primary key `(follower_id, following_id)`.
- **`public.saved_posts`**: Bookmarks linking users to posts.
- **`public.notifications`**: Mentions, endorsements, profile views, opportunities, and connection requests.

### Automatic Trigger
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, full_name, avatar_url, headline)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'username', SPLIT_PART(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'full_name', 'Nexus Member'),
        COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
        COALESCE(new.raw_user_meta_data->>'headline', 'AI Practitioner & Systems Engineer')
    );
    INSERT INTO public.user_settings (user_id) VALUES (new.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 2. Backend (Django REST Framework)

### Architecture
- **Supabase JWT Authentication**: Custom `SupabaseAuthentication` backend in `backend/api/authentication.py` intercepts `Authorization: Bearer <supabase_token>` and decodes claims using PyJWT and `SUPABASE_JWT_SECRET`. Django's default session and basic auth are disabled.
- **PostgreSQL Connection**: Configured in `backend/nexus_backend/settings.py` using `psycopg2-binary` directly against the Supabase database pooler.
- **CORS Configuration**: `django-cors-headers` middleware enabled at the top of the stack with full support for `Authorization` and `apikey` headers.
- **Endpoints**:
  - `GET /api/posts/?page=1&tag=MachineLearning`: Paginated feed with search and tag filters.
  - `POST /api/posts/`: Post creation accepting media URLs uploaded to Supabase Storage.
  - `POST /api/posts/<id>/like/`: Atomic like toggle.
  - `GET, POST /api/posts/<id>/comments/`: Threaded comment discussions.
  - `GET, PATCH /api/profiles/me/`: Active session profile management.
  - `POST /api/profiles/<id>/follow/`: Follow/unfollow toggle.
  - `GET /api/notifications/`: User notifications.

---

## 3. Frontend (React + Tailwind CSS)

- **Supabase Client**: Initialized via `@supabase/supabase-js` in `src/lib/supabase.ts`.
- **Client Session**: Automatically injects active JWT to all Django REST endpoints via `src/lib/api.ts`.
- **Components**:
  - `Sidebar.tsx`: Fixed left navigation with badges and profile quick-access.
  - `Header.tsx`: Global search with `⌘K`, online status indicator, notifications, and `+ Create Post`.
  - `feed/PostCard.tsx`: Interactive post cards featuring Kernel Benchmarks v2.4 interactive latency curves, PDF document readers, Python 3.11 code snippet copy boxes, and cluster efficiency comparison bars.
  - `studio/PostCreationStudio.tsx`: Drag-and-drop media upload direct to Supabase Storage, rich markdown toolbar, character counter, and tag selector.
  - `explore/ExploreView.tsx`: Bento grid of tech insights with retention charts, seed velocity graphs, design token previews, and newsletter subscription.
  - `notifications/NotificationsView.tsx`: Profile views analytics, mentions with quote previews, skill endorsements, and opportunity matches.
  - `messaging/MessagingView.tsx`: Direct communications with telemetry comparison cards and quick response chips.
  - `profile/ProfileView.tsx`: Executive profile for Elena Rostova with research counters, career history, and credentials.
  - `ArchitectureModal.tsx`: In-app developer inspector allowing one-click copy of SQL schemas, DRF backend code, and terminal commands.

---

## 4. Execution & Concurrent Terminal Commands

### Concurrent Start (Recommended)
```bash
# 1. Install concurrently
npm install -g concurrently

# 2. Run both Django backend and React frontend concurrently
concurrently --names "DJANGO,REACT" --prefix-colors "blue,green" \
  "cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt && python manage.py migrate && python manage.py runserver 0.0.0.0:8000" \
  "npm install && npm run dev"
```

### Dual Independent Shells
**Terminal 1 — Django Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate       # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

**Terminal 2 — React Frontend:**
```bash
npm install
npm run dev
```
React will launch on `http://localhost:3000` and connect seamlessly with Django on `http://localhost:8000/api`.
