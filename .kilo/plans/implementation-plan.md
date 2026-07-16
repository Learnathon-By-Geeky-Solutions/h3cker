# Implementation Plan: Search, Recommendations, Auth, UUID, and Production Pipeline

**Audit Date:** 2026-07-15
**Priority Order:** P0 (critical security) → P1 (core functionality) → P2 (performance) → P3 (UX/edge cases)

---

## Phase 0 — Immediate Security Fixes (P0)

### 0.1 Rotate All Leaked Secrets
**Severity:** CRITICAL — `.env` committed with live production keys
**Files:** `backend/.env`, `frontend/.env`
**Action:**
1. Add `backend/.env` and `frontend/.env` to `.gitignore`
2. Purge from git history: `git filter-branch --index-filter 'git rm --cached --ignore-unmatch .env' HEAD`
3. Rotate on all platforms: Azure storage key, Neon.tech DB password, Firebase Admin private key, HF API token, Django `SECRET_KEY`
4. Set secrets via Render dashboard env vars (never in repo)

### 0.2 Remove SessionAuthentication Fallback
**Severity:** CRITICAL — `FirebaseAuthentication` returning `None` falls through to `SessionAuthentication`
**File:** `backend/backend/settings.py:162-170`
**Fix:** Remove `rest_framework.authentication.SessionAuthentication` from `DEFAULT_AUTHENTICATION_CLASSES`
**Rationale:** The `None`-return behavior in FirebaseAuthentication allows Django session cookie auth to succeed without any Firebase token.

### 0.3 Fix admin_password Bypass in PromoteToAdminView
**Severity:** CRITICAL — `admin_password` field in serializer is never validated
**File:** `backend/api/admin_views.py:68-106`
**Fix:** Either:
- (Preferred) Implement actual password verification: re-authenticate admin via Firebase `verifyIdToken(password)` or prompt for their Firebase ID token
- (Fallback) Remove the dead `admin_password` field so it's not misleading

### 0.4 Add check_revoked=True to verify_id_token
**Severity:** HIGH — revoked users remain active until token expiry
**File:** `backend/backend/authentication.py:36`
**Fix:** `firebase_admin.auth.verify_id_token(token, check_revoked=True)`
**Note:** Adds latency per request (Firebase API call). Consider caching revocation checks.

---

## Phase 1 — Authentication & UUID Overhaul (P1)

### 1.1 Proper JWT + OAuth Architecture
**Problem:** Current Firebase + localStorage token pattern is XSS-vulnerable and lacks proper refresh semantics.

**New Architecture:**
```
┌─────────┐    firebase SDK     ┌──────────┐
│  React  │◄───── auth ───────►│ Firebase │
│   App   │     state change     │   Auth   │
└────┬────┘                     └──────────┘
     │                                    
     │ Get Firebase ID token              
     ▼                                    
┌────────────┐     POST /api/auth/     ┌────────────┐
│   Python   │◄───── login/ ──────────►│   Django   │
│  Backend   │     refresh/             │  Backend   │
│ (Firebase  │                          │            │
│  verify)   │                          │            │
└────────────┘                          └────────────┘
```

**Changes:**
1. **Backend:** Add `/api/auth/login/` — receives Firebase ID token, returns short-lived access JWT (15min) + httpOnly refresh cookie (7 days)
2. **Backend:** Add `/api/auth/refresh/` — validates httpOnly refresh cookie, returns new access JWT
3. **Backend:** Add `/api/auth/logout/` — clears refresh cookie, revokes Firebase tokens
4. **Frontend:** Remove `localStorage` token storage. Store access JWT in memory, refresh cookie is httpOnly.
5. **Frontend:** Interceptor pattern in `ApiService.js` — on 401, call `/api/auth/refresh/`, retry original request
6. **FirebaseAuthentication** becomes optional (used for first-party auth), add `JWTAuthentication` for access JWT validation

**The access JWT** is signed by Django with `SECRET_KEY`, contains `{ user_id, firebase_uid, role, exp, iat }`.
**The refresh token** is a Django-created random token stored in DB + httpOnly cookie.

### 1.2 UUID Migration for Video + WebcamRecording
**Problem:** Sequential integer IDs enable resource enumeration.

**Strategy:** Add public UUID field alongside existing PK (no breaking migration).

**Migration path:**
1. Add `uuid = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True, editable=False)` to `Video` and `WebcamRecording`
2. Backfill UUIDs for existing rows
3. Add URL patterns: `video/<uuid:video_uuid>/` (new), keep `video/<int:video_id>/` as deprecated alias
4. Update all frontend API calls to use UUID instead of int
5. Switch `VideoDetailView` to use `video_uuid` as primary lookup
6. After all clients migrated, deprecate int-based URLs
7. Update serializers to expose `uuid` instead of `id`

**Frontend hazard fixes required (2 locations):**
- `DetailedAnalytics.jsx:137` — remove `parseInt()`, use `e.target.value` directly
- `WebcamRecorder.jsx:89` — change `Number() === Number()` to `String() === String()`

### 1.3 Fix Missing related_name on FKs
- `WebcamRecording.recorder`: Add `related_name="webcam_recordings"`
- `EmotionFrame.viewer`: Add `related_name="emotion_frame_viewer"`

### 1.4 Add Server-Side Device Limit Enforcement
**File:** `backend/api/services/` — new `DeviceService`
- Check device count in `AuthProvider`-equivalent backend endpoint
- Enforce max 5 devices server-side

---

## Phase 2 — Search System (P1)

### 2.1 Database Schema for Search

#### New Model: `VideoDocument`
```python
class VideoDocument(models.Model):
    video = models.OneToOneField(Video, on_delete=models.CASCADE, related_name="search_doc")
    title_tsv = SearchVectorField(null=True)       # PostgreSQL full-text vector
    embedding = models.JSONField(null=True)          # vector<float> for semantic search
    embedding_model = models.CharField(max_length=64, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
```

#### New PostgreSQL Extension Dependencies
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- trigram fuzzy matching
CREATE EXTENSION IF NOT EXISTS vector;       -- pgvector for embeddings
```

#### Indexes to Add
```sql
-- Full-text search GIN index
CREATE INDEX idx_video_search_tsv ON api_videodocument USING GIN(title_tsv);

-- Trigram GIN for fuzzy title matching
CREATE INDEX idx_video_title_trgm ON api_video USING GIN (title gin_trgm_ops);

-- Trigram GIN for fuzzy description matching
CREATE INDEX idx_video_desc_trgm ON api_video USING GIN (description gin_trgm_ops);
```

### 2.2 Search Ranking Formula
```
final_score = 
    exact_title_match         × 100.0  +
    exact_phrase_title_match  × 80.0   +
    prefix_title_match        × 60.0   +
    trigram_title_similarity  × 40.0   +
    exact_category_match      × 50.0   +
    uploader_name_match       × 30.0   +
    description_match         × 20.0   +
    embedding_cosine_sim      × 35.0   +
    popularity_norm           × 10.0   +
    recency_boost             × 5.0
```

### 2.3 Implementation: Three-Tier Search

**Tier 1 — Exact Match (fast path):**
```python
# PostgreSQL full-text search with exact phrase support
from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector

vector = SearchVector("title", weight="A") + SearchVector("description", weight="B")
query = SearchQuery(user_query, search_type="websearch")  # supports "exact phrase"
rank = SearchRank(vector, query)
```

**Tier 2 — Fuzzy Match (trigram fallback):**
```python
from django.contrib.postgres.lookups import TrigramSimilarity

fuzzy_title = TrigramSimilarity("title", user_query)
fuzzy_desc = TrigramSimilarity("description", user_query)
# Used when exact match returns < threshold results
```

**Tier 3 — Semantic Match (embedding fallback):**
```python
# Use sentence-transformers to encode query
embedding = embed_query(user_query)  # all-MiniLM-L6-v2

# Cosine similarity via pgvector
results = VideoDocument.objects.alias(
    similarity=CosineDistance("embedding", embedding)
).filter(similarity__gte=0.7).order_by("similarity")
```

**Flow:**
1. Run exact + fuzzy search (Tier 1 + 2) in one DB query with trigram
2. If top-20 results have avg confidence > 80% → return those
3. If not, run semantic search (Tier 3) and merge/re-rank results
4. Apply popularity boost and recency boost
5. Return top-N with per-result confidence score

### 2.4 Search API Endpoints

**New:** `GET /api/search/?q=<query>&page=1&category=<filter>`
```json
{
  "results": [
    {
      "video_uuid": "...",
      "title": "...",
      "description": "...",
      "thumbnail_url": "...",
      "category": "...",
      "duration": "...",
      "views": 123,
      "likes": 45,
      "uploader": "Name",
      "score": 85.3,
      "match_type": "exact" | "fuzzy" | "semantic"
    }
  ],
  "total": 50,
  "page": 1,
  "query": "...",
  "did_you_mean": "..." // spell correction suggestion if results < threshold
}
```

**Deprecate:** Old `GET /api/search/videos/?filename=...` endpoint

### 2.5 Frontend Search Overhaul
- `SearchBar.jsx`: Replace client-side fetch-all with debounced server-side API calls
- Add search type indicator badge ("Exact", "Fuzzy", "Semantic")
- Add "Did you mean?" spell correction UI
- Add category/facet filters
- Add search analytics logging (track query, clicked results, CTR)

---

## Phase 3 — Recommendation System (P2)

### 3.1 Data Model Additions

#### New Model: `UserInteraction`
```python
class UserInteraction(models.Model):
    """Rich interaction tracking for recommendation signals."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="interactions")
    video = models.ForeignKey(Video, on_delete=models.CASCADE)
    interaction_type = models.CharField(max_length=20, choices=[
        ("view", "View"),
        ("like", "Like"),
        ("share", "Share"),
        ("watch_start", "Watch Start"),
        ("watch_25", "25% Watched"),
        ("watch_50", "50% Watched"),
        ("watch_75", "75% Watched"),
        ("watch_complete", "Completed"),
        ("skip", "Skipped"),
    ])
    watch_duration_seconds = models.FloatField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    weight = models.FloatField(default=1.0)  # interaction weight for rec scoring

    class Meta:
        indexes = [
            models.Index(fields=["user", "-timestamp"]),
            models.Index(fields=["video", "interaction_type"]),
        ]
```

#### New Model: `UserInterestVector`
```python
class UserInterestVector(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="interest_vector")
    category_weights = models.JSONField(default=dict)  # {"comedy": 0.85, "education": 0.3}
    embedding = models.JSONField(null=True)             # user embedding vector
    last_updated = models.DateTimeField(auto_now=True)
    interaction_count = models.PositiveIntegerField(default=0)
```

#### New Model: `VideoCoView`
```python
class VideoCoView(models.Model):
    """Precomputed collaborative filtering: users who watched A also watched B."""
    source_video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name="co_view_source")
    target_video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name="co_view_target")
    score = models.FloatField()  # normalized co-occurrence score
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["source_video", "-score"])]
        unique_together = ("source_video", "target_video")
```

#### Update Video Model
```python
# Add to existing Video model:
tags = ArrayField(models.CharField(max_length=50), blank=True, default=list)  # PostgreSQL ArrayField
language = models.CharField(max_length=10, default="en")
processed_for_search = models.BooleanField(default=False)  # flag for async embedding gen
```

### 3.2 Recommendation Pipeline Architecture

```
┌─────────────┐    triggers    ┌──────────────────┐
│  New Video   │ ────────────► │  Async Workers    │
│  Uploaded    │               │  (Celery/thread)  │
│  Interaction │               │                    │
│  Recorded    │               │                    │
└─────────────┘               └────────────────────┘
                                      │
                    ┌─────────────────┼──────────────────┐
                    ▼                 ▼                  ▼
            ┌─────────────┐   ┌──────────────┐   ┌──────────────┐
            │ Generate    │   │ Update Co-   │   │ Update       │
            │ Embeddings  │   │ View Matrix  │   │ Interest     │
            │ (Video)     │   │ (CF)         │   │ Vector       │
            └─────────────┘   └──────────────┘   └──────────────┘
```

**Real-time retrieval path:**
```
GET /api/recommendations/
         │
         ▼
┌────────────────┐    weighted merge    ┌────────────┐
│  Content-Based  │ ──────────────────► │   Final    │
│  (category +    │     + MMR rerank    │   List     │
│   tags)         │                     │            │
└────────────────┘                     └────────────┘
         │                                      ▲
         ▼                                      │
┌────────────────┐                              │
│  Collaborative  │ ─────────────────────────────┘
│  Filtering      │  (co-view matrix lookup)
│  (CoView)       │
└────────────────┘
         │
         ▼
┌────────────────┐
│  Semantic       │
│  (embedding     │
│   similarity)   │
└────────────────┘
         │
         ▼
┌────────────────┐
│  Trending/     │
│  Popular       │ (fallback for new users)
│  Freshness     │
└────────────────┘
```

### 3.3 Recommendation Scoring Formula

```
rec_score = 
    (content_based_score × 0.30) +
    (co_view_score       × 0.35) +
    (semantic_score      × 0.20) +
    (trending_boost      × 0.10) +
    (freshness_boost     × 0.05)
```

Where each sub-score is [0, 1] normalized.

**Content-Based Score Components:**
- Category overlap with user's watched categories
- Tag overlap
- Uploader affinity (user watched this uploader before)
- Watch-time-weighted category affinity

**Co-View Score:**
- Precomputed `VideoCoView.score` based on: `P(video_B | watched video_A)` for all A in user's history
- Higher weight for recent interactions (time-decay)

**Semantic Score:**
- Cosine similarity between `video.embedding` and `user_interest_vector.embedding`
- Updated asynchronously after each watch session

**Diversity (MMR Rerank):**
```python
def mmr_rerank(candidates, lambda_param=0.5):
    selected = []
    while len(selected) < N:
        remaining = [c for c in candidates if c not in selected]
        scores = []
        for c in remaining:
            relevance = c.rec_score
            similarity_to_selected = max(
                cosine_sim(c.embedding, s.embedding) for s in selected
            ) if selected else 0
            mmr = lambda_param * relevance - (1 - lambda_param) * similarity_to_selected
            scores.append(mmr)
        selected.append(remaining[argmax(scores)])
    return selected
```

### 3.4 New API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/recommendations/` | Personalized recommendations (existing, enhance) |
| GET | `/api/videos/{uuid}/related/` | "Up next" / related videos for a given video |
| GET | `/api/videos/{uuid}/interactions/` | Record + return updated interaction state |
| POST | `/api/videos/{uuid}/watch-progress/` | Report watch progress (25%, 50%, etc.) |

### 3.5 Frontend Changes
- `LoggedInView.jsx`: Use personalized recommendations from enhanced `/api/recommendations/`
- `VideoDetail.jsx`: Add "Up Next" sidebar with related videos from `/api/videos/{uuid}/related/`
- Add watch-progress reporting hooks
- Replace static `AdRow` with personalized recommendation rows

---

## Phase 4 — Database Indexing & Performance (P2)

### 4.1 Critical Indexes to Add (See Database Audit §2.2)

**Migration file:**
```python
# WebcamRecording indexes
models.Index(fields=["upload_status", "analysis_status"]),
models.Index(fields=["recorder", "-recording_date"]),

# Video indexes
db_index=True on visibility, category, views, likes, auto_private_after

# EmotionFrame indexes
models.Index(fields=["video", "viewer"]),

# AnalysisRunLog index
db_index=True on started_at

# WebcamRecording field indexes
upload_status = models.CharField(..., db_index=True)
analysis_status = models.CharField(..., db_index=True)
recording_date = models.DateTimeField(auto_now_add=True, db_index=True)
```

**PostgreSQL partial index (via RunSQL):**
```sql
CREATE INDEX CONCURRENTLY idx_video_public_available 
ON api_video (upload_date DESC) 
WHERE visibility = 'public' 
  AND (auto_private_after IS NULL OR auto_private_after >= NOW());
```

### 4.2 Add Video.visibility Index + Normalize Category to FK

**Pre-Flight Check:** Verify `_public_available_qs()` query plan with `EXPLAIN ANALYZE`.

**Category Normalization:**
```python
class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)

class Video(models.Model):
    # Change from:
    category = models.CharField(max_length=100, blank=True)
    # To:
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    tags = ArrayField(models.CharField(max_length=50), blank=True, default=list)
```

### 4.3 Fix Video.duration Data Type
Change from `CharField` to `FloatField` (seconds):
```python
duration_seconds = models.FloatField(default=0.0, null=True, blank=True)
```
Keep a read-only `duration_display` property for backward-compat in serializers.

---

## Phase 5 — Frontend Edge Cases & UX Fixes (P3)

### 5.1 Error Boundary
```jsx
// frontend/src/components/common/ErrorBoundary/ErrorBoundary.jsx
class ErrorBoundary extends React.Component {
  componentDidCatch(error, info) { logError(error, info); }
  render() {
    if (this.state.hasError) return <FallbackUI />;
    return this.props.children;
  }
}
```
Wrap `App.jsx` and `DashboardLayout.jsx`.

### 5.2 Handle auth_error Event
**File:** `ApiService.js:294` + `AuthProvider.jsx`
Add listener in AuthProvider that shows session-expired toast and redirects to login.

### 5.3 Fix VideoService InProgress Cache
**File:** `VideoService.js:22-31`
Add `try/finally` cleanup:
```js
try {
  this._cache.inProgress[key] = request;
  return await request;
} finally {
  delete this._cache.inProgress[key];
}
```

### 5.4 Fix VideoService Static Cache TTL
Add 5-minute TTL to all static cache entries.

### 5.5 Handle Profile Unmounted setState
**File:** `Profile.jsx:421-426` — add `mountedRef` guard.

### 5.6 Fix VideoPlayer Progress Bar
Make it interactive (draggable/tappable) for mobile.

### 5.7 Add Upload Retry Button
**File:** `WebcamRecorder.jsx:840-845` — add retry button on upload failure.

### 5.8 Replace Profile alert() with Toast
**File:** `VideoDetail.jsx:527` — use Flowbite toast.

### 5.9 Fix Dashboard Flash-of-Empty
Add skeleton loading states to `DashboardHome.jsx` and `Dashboard.jsx`.

### 5.10 Remove Production Console.log
Gate all `console.log` behind `if (process.env.NODE_ENV !== 'production')`.

---

## Phase 6 — Production Deployment Pipeline

### 6.1 Git Workflow
```
main ──── auto-deploy to Render
  │
  ├── develop ── integration testing
  │     │
  │     └── feature/* ── individual features
  │
  └── hotfix/* ── emergency patches (bypass develop)
```

### 6.2 CI/CD Pipeline (GitHub Actions)
```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env: { POSTGRES_DB: test, POSTGRES_PASSWORD: test }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
      - run: pip install -r requirements.txt
      - run: pytest  # uses test DB (no .env secrets)

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci && npm run build

  deploy:
    needs: [test-backend, test-frontend]
    runs-on: ubuntu-latest
    steps:
      - run: curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK_URL }}
```

### 6.3 Render Configuration Updates
- **Health Check Path:** `/api/health/` (new — returns 200 if DB + Firebase are reachable)
- **Pre-deploy Command:** `python manage.py migrate --noinput`
- **Release Command:** `python manage.py crontab add`
- **Environment Variables:** All secrets set via Render dashboard, never in `.env`
- **Instance Type:** Keep free tier, add `WEB_CONCURRENCY=2` for gunicorn

### 6.4 New Health Check Endpoint
```python
# backend/api/views.py
class HealthCheckView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        try:
            db_status = self._check_db()
            firebase_status = self._check_firebase()
            return Response({
                "status": "healthy" if db_status and firebase_status else "degraded",
                "db": "ok" if db_status else "error",
                "firebase": "ok" if firebase_status else "error",
            })
        except Exception as e:
            return Response({"status": "unhealthy", "error": str(e)}, status=500)
```

### 6.5 Zero-Downtime Migration Strategy
All data migrations must be backward-compatible:
1. **Add column** without `NOT NULL` (or with a default)
2. **Deploy code** that reads both old and new columns
3. **Backfill** data for existing rows
4. **Add NOT NULL** constraint (if needed) after backfill
5. **Remove old column** in a subsequent deploy

### 6.6 Monitoring & Alerting
- Render built-in health check pings every 5 min
- Sentry integration for error tracking (add `sentry-sdk` to requirements)
- Django `ADMIN_LOGS` table for audit trail
- Alert on: emotion analysis failure, auth failure spikes, 5xx rate > 1%

---

## Execution Order Summary

| Phase | Tasks | Timeline | Dependencies |
|-------|-------|----------|-------------|
| **P0** | Rotate secrets, remove SessionAuth, fix PromoteToAdmin, add check_revoked | Day 1 | — |
| **P1** | JWT architecture, UUID migration, missing related_name, device limits | Week 1 | P0 |
| **P2a** | Search schema + Tier 1 (exact) + Tier 2 (fuzzy) | Week 2 | P1 (UUID) |
| **P2b** | Tier 3 (semantic) — embedding generation + pgvector | Week 3-4 | P2a |
| **P3** | Rec system models + pipeline + co-view + related videos | Week 4-5 | P1 (UUID) |
| **P4** | Indexes + category normalization + duration fix | Week 2 (parallel with P2) | — |
| **P5** | Frontend edge case fixes | Week 5-6 | P1-P3 |
| **P6** | CI/CD pipeline, health check, monitoring, zero-downtime migrations | Week 6-7 | All |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Leaked secrets exploited before rotation | High | Critical | Rotate on detection, monitor for unauthorized access |
| pgvector extension not available on Render | Medium | High | Use NumPy brute-force cosine similarity as fallback |
| Embedding model too slow for free tier | Medium | Medium | Use BGE-small-en-v1.5 (33MB), cache embeddings, batch processing |
| Firebase token revocation check slows requests | Medium | Low | Cache revocation status with 5-min TTL |
| UUID migration breaks existing share links | Low | High | Keep `uuid` + `id` dual lookups during migration window |
| Celery not available on Render free tier | High | Medium | Use Django management command + cron (existing pattern) or threading |
| Co-view matrix too large to compute daily | Medium | Low | Compute incrementally on interaction, not full rebuild |
