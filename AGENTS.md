# AGENTS.md — EngageAnalytics (h3cker)

Video emotion analytics for ad effectiveness. Viewers watch ads (optionally with
webcam on); webcam recordings are stored on Azure; a daily batch calls a
Hugging Face facial-emotion model and produces per-video + per-viewer analytics.

## Stack
- Backend: Django 5 + DRF, Firebase auth, PostgreSQL, Azure Blob Storage, Firestore.
- Frontend: React 18 + Vite + Tailwind + Flowbite, Firebase, recharts.
- Deploy: Render (free tier), Hugging Face serverless Inference.

## Repo layout
- `backend/` Django project (`backend/` settings, `api/` app: models, views,
  serializers, services/, management/commands/, tests/).
- `frontend/src/` React (`components/`, `contexts/AuthProvider`, `utils/`,
  `Routes/`, `firebase/`).
- Emotion model: the backend consumes a pre-trained Hugging Face FER model via
  the serverless `image_classification` API (default
  `mo-thecreator/vit-Facial-Expression-Recognition`). No training code lives in
  this repo; override `HF_EMOTION_MODEL` only if you deploy your own model.

## Common commands
Backend (venv):
  pip install -r requirements.txt
  python manage.py migrate
  python manage.py runserver
  pytest            # pytest-django; ENVIRONMENT=TEST uses sqlite
Frontend:
  npm install
  npm run dev / build / lint

## Key flows
- Auth: Firebase id-token -> `Authorization: Bearer` ->
  `backend/authentication.py` verifies + get_or_creates `User` (keyed by
  `firebase_uid`). Roles: admin / company / user.
- Uploads: backend mints Azure SAS URLs (`services/azure_storage_service.py`);
  client uploads directly to blob; `WebcamRecording` tracks each recording.
  **Recording completion is signaled by `PATCH .../webcam-upload/<id>/complete/`
  (sets `upload_status=completed`) — nothing auto-sets this.**
- Emotion analytics: `management/commands/run_emotion_analysis.py` (also callable
  from `POST /api/admin/run-emotion-analysis/`) downloads recordings, samples
  frames, crops faces (mediapipe/opencv), calls HF `image_classification`, stores
  `EmotionFrame`, aggregates `VideoEmotionSummary`. Scheduled daily 12pm BD via
  `django-crontab` (kept alive by an external ping); admin "Run now" is the manual path.

## Conventions
- Backend logic lives in `api/services/` (one class per domain); views are thin
  DRF generics; serializers in `api/serializers.py`; permissions in
  `api/permissions.py`.
- Always create + run migrations for model changes.
- No code comments unless explicitly requested.
- Match existing style; keep functions small and typed where the codebase is.

## Dashboard sidebar & layout
- Layout: `DashboardLayout.jsx` renders `NavigationBar` (fixed top) +
  `DashboardSideNavbar` (fixed left) + `<Outlet />`. Content area margin
  adjusts based on sidebar collapsed/expanded state (`md:ml-64` / `md:ml-16`).
- Sidebar is collapsed by default on desktop, expands on hover (temporary) or
  via mobile toggle button (persistent). Uses `isOpen` (mobile toggle) and
  `isHovering` (desktop hover) states.

## Dashboard sidebar nav items
- Defined in `frontend/src/components/Shared/DashboardSideNavbar/DashboardSideNavbar.jsx`
  via `getNavItems(role)`. Three role branches: `admin`, `company`, `user`.
- **Admin**: Dashboard, Upload Video, Manage Videos, User Management, Webcam
  Recordings, Video Analytics.
- **Company**: Dashboard, Upload Video, Manage Videos, Video Analytics.
- **User**: Dashboard, Watch History, Liked Videos, Video Analytics.
- Analytics page at `/dashboard/detailed-analytics` is accessible to all roles
  (viewer sees own emotion data; admin/company see aggregate).
- Add new items by pushing to the relevant array; import the icon from lucide-react.

## Download utilities
- Use `triggerDownload(url, filename)` function (defines a temp `<a>` with
  `download` attribute, clicks it, removes it). Cross-origin blob URLs may
  display inline instead of downloading; the `download` attribute is best-effort.
- Defined inline in `RecordedVideos.jsx` and `DetailedAnalytics.jsx`.
- Backend returns `recording_url` in the emotion recordings API response
  (`GET /api/video/<id>/emotion/recordings/`) so the frontend can offer direct
  download links per recording.

## Recording overlay (WebcamRecorder)
- Located in `frontend/src/components/Shared/VideoPlayer/WebcamRecorder.jsx`.
- Recording indicator can be toggled on/off via Eye/EyeOff button. Preference
  persisted in `localStorage` under key `wc_recording_indicator_visible`.
- Indicator auto-hides when video controls hide (`showControls` prop, controlled
  by VideoPlayer's 3s idle timer). Reappears on mouse move or when recording is
  active.
- In fullscreen mode, indicator repositions to `bottom-4 left-4` (avoids browser
  chrome overlap). Detected via `fullscreenchange` event.
- All recording state indicators (Recording red dot, Paused yellow dot, Switch
  camera button) are rendered by WebcamRecorder. VideoPlayer no longer has a
  duplicate "Recording paused" indicator.

## Emotion analysis (backend)
- `GET /api/video/<id>/emotion/recordings/` returns per-recording entry with
  `recording_id`, `filename`, `recording_url`, `thumbnail_url`, `distribution`,
  `timeline`, `duration`, and `viewer_id` (admin only).
- Viewer identity (`viewer_id`) is revealed to admins (fixed: was incorrectly
  checking Django's `is_superuser` field which is always False with Firebase auth).
- Use DRF serializers for new response fields; avoid manual dict construction.
- `WebcamRecording` model has `thumbnail_url` field (nullable) for preview.

## Deleting recordings
- **Backend**: `DELETE /api/admin/webcam-recordings/<id>/` (admin only, destroys
  the `WebcamRecording` + cascade deletes `EmotionFrame` rows).
- **Frontend**: Delete button with confirmation modal in both `RecordedVideos.jsx`
  (admin management table) and `DetailedAnalytics.jsx` (per-person breakdown).
  Calls `VideoService.adminDeleteWebcamRecording(recordingId)`.

## Testing
- Backend unit tests in `api/tests/` (mock the HF client + frame extraction).
- Cover: aggregation math, idempotent rerun, API permission rules.

## Deployment (Render free)
- Single instance; keep the web service awake via an external uptime ping
  (django-crontab needs the process alive).
- Release command: `python manage.py crontab add`.
- Env: copy `.env.example` -> `.env`; set all 22 vars in Render dashboard.
- Build command: `pip install -r requirements.txt && python manage.py migrate`
- Start command: `gunicorn backend.wsgi`

## Health check
- `GET /api/health/` reports DB connectivity + Firebase Auth readiness.
- Used by Render and external ping services to verify the instance is alive.

## CI/CD
- `.github/workflows/deploy.yml`: triggered on push to `main`.
- Three sequential jobs: `test-backend` (pytest on ephemeral PG) → `test-frontend`
  (npm ci + build) → `deploy` (curl Render deploy hook).
- All 22 Firebase/Azure env vars must be mirrored as GitHub secrets.

## Migrations
- Migration `0010_uuid_indexes_and_duration.py` adds:
  - `Video.uuid` / `WebcamRecording.uuid` (UUIDField, unique, db_index)
  - `Video.duration_seconds` (FloatField; old `duration` property proxies to it)
  - `db_index` on `category`, `visibility`, `views` (Video) and `recording_date`,
    `upload_status`, `analysis_status` (WebcamRecording)
  - Composite indexes: `visibility+auto_private_after`, `upload_status+analysis_status`,
    `recorder+-recording_date`, `video+viewer` (EmotionFrame), `-started_at`
- Run `python manage.py migrate` after pulling new code (auto-run in CI/CD).

## Phase 0 — `admin_password` removed
- `AdminActionSerializer` no longer has `admin_password` field (was dead code,
  never validated). `VideoService.adminPromoteToAdmin(userId)` takes one param.
- `AdminRoleManagement.jsx` uses a confirmation modal instead of password prompt.

## Caching
- **Frontend `VideoService._cache`**: static in-memory cache with TTL.
  - `videoFeed` — TTL 60s; cleared on view/like/detail-navigate to force fresh data.
  - `videoDetails` — TTL 120s; LRU eviction (max 50 entries); stale entries serve as
    fallback on fetch errors.
  - `adminVideos` — TTL 30s.
  - On fetch error, returns stale cache if available instead of empty array.
- **Backend `api/services/cache_service.py`**: Django `LocMemCache` (swap to Redis
  in production by changing `CACHES['default']['BACKEND']` + setting `REDIS_URL`).
  - `CacheService.cached_feed()` — 60s TTL for public feed.
  - `CacheService.cached_featured()` — 120s TTL for carousel.
  - `CacheService.cached_recommendations()` — 120s TTL per user.
  - `CacheService.cached_trending()` — 60s TTL.
  - `CacheService.invalidate_feed()` / `invalidate_recommendations()` — clear
    cache on mutation.

## DB optimizations applied
- `select_related('uploader')` on all video list views (fixed 13+ N+1 hotspots).
- `select_related('video__uploader')` on webcam recording views (fixed second-level
  N+1).
- `prefetch_related('emotion_frames')` on `VideoEmotionRecordingsView`.
- `_aggregate_video` runs 1 query instead of 4.
- `VideoFeedView.queryset` changed from class attribute to `get_queryset()` method
  (fixes stale `timezone.now()` bug — expired videos now actually expire).
- `UserHistoryAPI` now uses `annotate(Max('viewed_at'))` instead of broken
  `DISTINCT + ORDER BY` (crashed on PostgreSQL).
- Duplicate index on `VideoShare.share_token` removed.
- Home page (`LoggedInView`) deduplicates videos across all four sections
  (featured → recent → trending → recommended) to avoid showing the same video in
  multiple rows.

## Gotchas
- `upload_status` is NOT auto-set; the completion endpoint is required or the
  analysis cron never fires.
- Faces are sent to Hugging Face for inference (privacy trade-off, accepted);
  only tight crops leave our server, raw video stays on Azure.
- HF free ~100 req/min; use exponential backoff.
- Free tier = 0.1 CPU; the batch is CPU-light (ML is offloaded to HF).
- `VideoService._cache` is static and shared across components. On mutation
  (delete, edit, toggle like), manually clear affected cache entries. The
  `inProgress` dedup caches rejected Promises — callers get the cached rejection
  on retry.
- `window.addEventListener('error', ...)` must be registered inside a component
  `useEffect` with cleanup (never at module scope). The old module-level handler
  in WebcamRecorder leaked on every import.
- VideoPlayer's main effect must NOT depend on `currentTime` — it causes
  event listener churn on every frame. Use refs for values needed in event
  handlers (`isPlayingRef`, `webcamPermissionRef`) and isolate `beforeunload`
  into its own effect.
- Emotion analysis pipeline blocks synchronously on HF inference. For 600 frames
  at ~2s each that's ~20 min per recording. No circuit breaker — if HF is down
  the 6-retry backoff adds 63s per frame.
- `DashboardHome.jsx` route links must match actual routes in `Routes.jsx`.
  The old `/dashboard/admin/users`, `/dashboard/admin/videos`,
  `/dashboard/admin/settings` routes do not exist and cause blank pages.
- Recording overlay visibility toggle state is persisted in localStorage under
  `wc_recording_indicator_visible`. Clear it if the toggle behavior breaks.
- When adding new recording-related API response fields, update both the view
  dict construction and the frontend consumption site. Prefer DRF serializers
  over manual dict construction for new endpoints.

## Pagination conventions
- **Backend**: Use `safe_int_param(limit, default, 1, max)` + `safe_int_param(offset, 0, 0)` for list views that need pagination. Slice with `qs[offset:offset+limit]`. All unbounded list views now accept `limit`/`offset` params: `VideoFeedView`, `VideoManagementView`, `WebcamRecordingsView`, `VideoSearchView`.
- **Frontend**: `VideoService.js` methods do NOT support server-side pagination yet. The Video.jsx page uses client-side `slice()` pagination (`12 VIDEOS_PER_PAGE`). Admin list pages fetch all data at once.
- Always clamp `limit` between 1 and a reasonable max (50–200). `offset` is always `max(0, offset)`.

## Frontend request lifecycle
- `ApiService` supports `AbortController` — each `get/post/etc` creates a controller keyed by endpoint. `cancelRequest(endpoint)` or `cancelAll()` aborts in-flight fetches. `_activeControllers` is a `Map<endpoint, AbortController>`.
- **IntersectionObserver**: Always clean up in a `useEffect` return (disconnect + null). The Video.jsx infinite scroll pattern uses a `useRef` observer + `useCallback` ref callback + cleanup effect.

## Lazy loading
- All `<img>` tags in scrollable lists (grids, admin tables, watch history, liked videos) use `loading="lazy"`.
- Hero billboard image loads eagerly (above the fold, LCP-critical).
- `React.lazy` + `Suspense` used in: `Home.jsx` (LoggedInView / NotLoggedInView), `Video.jsx` (AdCard), `Dashboard.jsx` (AdminDashboard).

## Implementing the emotion pipeline
See `.kilo/plans/1783710159599-emotion-analysis-pipeline.md` for the full,
implementation-ready plan (models, endpoints, frontend, validation).
