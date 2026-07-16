# Emotion Analytics Pipeline — Implementation Plan

## Context
EngageAnalytics records viewer webcam videos during ad playback and stores them on Azure
(`WebcamRecording.recording_url`). Today **nothing analyzes them** — there is no
emotion data, no heatmap, no per-segment insight, and the `@tensorflow/tfjs` dep is unused.

Goal: turn the stored recordings into emotion analytics a **company** can visualize, using
a Hugging Face facial-emotion model called via API on a **daily batch (12pm BD) + manual
admin trigger**.

### Hard constraints (from user)
- **No paid tiers.** Everything runs free: no Render Starter/Cron/Worker, no HF paid plan.
- **Render free is slow (0.1 CPU).** The batch must be gentle on our CPU.
- **User trains + deploys the model to Hugging Face, then we call the HF API.**
  This is the chosen approach: heavy ML is offloaded to HF, so our free CPU only does
  video-decode + face-crop + HTTP calls (light, batch-only) — solving the server-load concern.

### Verified source-code findings (audited this round)
- **`WebcamRecording.upload_status` is NEVER set to `completed` in production code.**
  Grep confirms it is only assigned in *tests*. `WebcamUploadView` + `webcam_upload_service`
  create the row (defaults `pending`) and `WebcamRecorder.uploadRecording` uploads the
  blob but **never calls back to mark completion**. → A pipeline that gates on
  `upload_status == "completed"` would NEVER fire.
  **Required fix (add to plan):** after `uploadFileToBlob` resolves in
  `WebcamRecorder.uploadRecording`, call a new
  `PATCH /api/videos/<id>/webcam-upload/<recording_id>/complete/` that sets
  `upload_status = "completed"`. The analysis cron then gates on
  `upload_status == "completed" AND analysis_status == "pending"`.
  **Defensive net:** the pipeline still checks the Azure blob exists & `size > 0`
  (via account key) before downloading; missing/empty blob → mark `failed` (not infinite pending).

### Confirmed decisions (from interview)
1. **Display:** per-video aggregated reaction % as headline + per-person timeline as
   admin/owner drill-down. Companies never see identifiable individuals cross-video.
2. **Trigger:** `django-crontab` fires the daily 12pm job (web service is kept awake via
   uptime pinging, so the in-process cron is reliable). Admin **"Run now"** button is the
   manual fallback. Render Cron Job is NOT used (free tier has no cron service type — min $1/mo).
3. **Analysis location:** server-side, on the existing recordings (no frontend capture changes).

### Hugging Face facts (researched) + chosen approach
- **Inference via HF serverless API** (`huggingface_hub.InferenceClient.image_classification`).
  Free tier ~30k calls/month → exponential backoff required. Frames sampled at 1 fps keep
  volume well within free quota for learnathon scale.
- **Why this fits the constraints:** the heavy ML runs on HF's servers, NOT ours. Our free
  0.1-CPU Render instance only decodes the video, crops the face, and makes an HTTP call
  per frame — light, batch-only work. This resolves the server-load worry with $0 spend.
- **FER models expect a cropped/aligned face** → pipeline must detect+crop the face
  BEFORE calling HF. Face-crop runs locally (mediapipe/opencv) — cheap, batch-only.
- **Target model = the user's own trained HF model**, set via `HF_EMOTION_MODEL`
  (e.g. `your-username/your-fer-model`). A sensible default
  (`mo-thecreator/vit-Facial-Expression-Recognition`, 7-class FER) is used until ready.
  Classes: angry, disgust, fear, happy, neutral, sad, surprise.

### Training the model (free — done by the user, not the app)
- **Dataset:** **FER2013** (free, no request — Kaggle `msambare/fer2013` or HF `imagefolder`).
  7 classes, ~35k images. This is the standard FER benchmark. Optionally blend
  **AffectNet** (larger, pushes accuracy ~70%→84% when combined, but gated request)
  and MMI for a better model; FER2013 alone is the pragmatic free base.
- **Architecture MUST be a Hugging Face `transformers` image-classification model**
  (`AutoModelForImageClassification`, e.g. `google/vit-base-patch16-224` or
  `facebook/convnext-tiny`). **Serverless `image_classification()` only supports
  ViT / CLIP-family models** — a raw timm/EfficientNet PyTorch CNN will 400 / not
  load. Fine-tune with `Trainer(push_to_hub=True)` (see HF "Fine-Tune ViT for
  Image Classification" guide). Free GPU training ~20 min (Colab/Kaggle/laptop).
- **Deploy:** push to HF Hub (private) via `huggingface_hub`; use `HF_API_TOKEN`
  (Inference read scope). The model card must expose the `image-classification` task so
  `InferenceClient(...).image_classification(...)` works.
- **Default until yours is ready:** `mo-thecreator/vit-Facial-Expression-Recognition`
  (ViT, ~84% on FER2013+MMI+AffectNet) — already set as `HF_EMOTION_MODEL` default.
- **Rate limit (researched):** HF serverless free ≈ **100 req/min globally** → keep
  exponential backoff. At 1 fps a 60s video = 60 calls; fine for learnathon volume.
  Optional `ANALYSIS_MAX_FRAMES` cap (e.g. 600 = 10 min) to bound very long videos.
- The app only consumes the deployed model id; no training code lives in this repo.

### Privacy / security trade-off (accepted, with mitigations)
- **Cropped faces are sent to Hugging Face's servers** — the cost of free + offloaded compute.
  Mitigate: send ONLY tight face crops (never raw frames or the source video); the raw
  `WebcamRecording.recording_url` stays on our Azure and is never sent to HF; in-app
  webcam **consent** is already captured (permission modal); document HF data handling.
- **Secure fallback (only if strict in-house privacy is later required):** run the same local
  ONNX FER model on a **free GitHub Actions runner** (2–7 GB RAM, real CPU, ephemeral)
  triggered by the schedule, writing results back to our Postgres — faces never leave our
  controlled workflow, still $0, but drops the HF API and adds CI setup. Not primary.

---

## Affected boundaries
- `backend/` Django: new models, management command, service layer, admin endpoint,
  the new completion endpoint, serializers, URLs, deps, env.
- `frontend/` React: new analytics UI + charting lib + "Run now" button + progress
  polling, **and one small addition to the webcam flow** (see below).
- Webcam capture (`WebcamRecorder.jsx`) is otherwise unchanged; **the only addition is**
  calling the new completion endpoint after `uploadFileToBlob` resolves.

---

## Data model (backend)

### Modify `WebcamRecording` (`api/models.py`)
Add (keep existing `upload_status` for blob upload — do NOT conflate):
- `analysis_status` = `CharField(choices=pending/processing/completed/failed, default="pending")`
- `analysis_error` = `TextField(blank=True, null=True)`

### New model `EmotionFrame`
Per analyzed frame (the per-person source of truth).
- `recording` FK → WebcamRecording (cascade)
- `video` FK → Video (denormalized for fast per-video queries)
- `viewer` FK → User
- `t_seconds` FloatField
- `angry, disgust, fear, happy, neutral, sad, surprise` FloatField (0–1)
- `dominant` CharField, `confidence` FloatField
- `created_at` auto_now_add
- `indexes=[models.Index(fields=["video","t_seconds"])]`
- `unique_together = ("recording","t_seconds")`

### New model `VideoEmotionSummary` (OneToOne Video)
Precomputed aggregates (avoids heavy recompute on read).
- `distribution` JSONField  `{happy:0.62, neutral:0.21, ...}`
- `timeline` JSONField  `[{t, happy, neutral, sad, ...}, ...]` (1 entry per sampled second)
- `total_frames` Int, `analyzed_recordings` Int, `updated_at`

### New model `AnalysisRunLog`
Survives request/process restarts; enables progress polling + idempotent resume.
- `trigger` CharField(cron/manual), `status`(running/done/failed)
- `processed`, `total` Int, `error` TextField, `started_at`, `finished_at`

---

## Pipeline (`backend/api/services/emotion_analysis_service.py` + `management/commands/run_emotion_analysis.py`)

Single code path used by BOTH the cron and the manual button.

1. Select `WebcamRecording`s where `analysis_status == "pending"` for the **cron** run — OR
   `pending` + `failed` for a **manual admin** run. Increment `analysis_attempts`.
   **The auto-cron never retries `failed`** (prevents an infinite fail-loop on permanently
   broken/corrupt recordings; admins force-retry explicitly). Mark selected rows
   `processing` atomically via `select_for_update(skip_locked=True)` so a concurrent manual
   run skips rows already locked by the cron (no double-processing). Create/refresh
   `AnalysisRunLog(total=count)`.
2. For each recording:
   - Download video bytes from `recording_url` via Azure **account key** (SAS may be expired).
   - Extract frames at **1 fps** using `imageio-ffmpeg` (bundles static ffmpeg — no system dep).
   - For each frame: detect+crop the **largest face** with `mediapipe` Face Detection
     (accurate, offline after first model download; **fallback** to `opencv-python-headless`
     Haar cascade if MediaPipe is unavailable). Skip frames with no face (do NOT store).
   - For each cropped face: `huggingface_hub.InferenceClient.image_classification(model=HF_EMOTION_MODEL)`,
     normalize labels (lowercase, map to 7 canonical classes), store `EmotionFrame`.
     **Exponential backoff** on 429/timeout (wait 2^n s, cap 60s), mark recording `failed`
     and continue on hard error.
   - On success mark recording `completed`, clear `analysis_error`.
3. After processing, **recompute `VideoEmotionSummary`** for every affected video:
   - `distribution` = mean of all `EmotionFrame` probabilities for that video.
   - `timeline` = mean probabilities grouped by `t_seconds` (per-second curve).
   - `analyzed_recordings`, `total_frames` counts.
4. Close `AnalysisRunLog` (status=done/failed, finished_at).
Idempotent: completed recordings are skipped, so a killed run resumes cleanly on re-trigger.

### Cron wiring (`backend/settings.py`)
Add to existing `CRONJOBS` (Django `TIME_ZONE='UTC'`; BD=UTC+6 → 06:00 UTC = 12:00 BD),
using the **same `call_command` format** as the existing entry:
`('0 6 * * *', 'django.core.management.call_command', ['run_emotion_analysis'])`
(keep existing `check_video_privacy` hourly entry).

---

## API endpoints (`api/urls.py`, `api/views.py`, `api/serializers.py`)

- `PATCH /api/videos/<id>/webcam-upload/<recording_id>/complete/` — authenticated
  **recorder**. Sets `upload_status="completed"` after the Azure blob PUT
  finishes. **Required** (see audit): nothing else sets this, and the cron
  gates on it. Frontend `WebcamRecorder.uploadRecording` calls it on
  `uploadFileToBlob` success.
- `POST /api/admin/run-emotion-analysis/`  — `IsAdmin`. Starts `run_analysis` in a
  **background thread** (HTTP returns immediately: `{status:"started"}`), processing
  `pending` **and** `failed` recordings (admin-initiated retry). Avoids Render free-tier
  request timeouts.
- `GET  /api/admin/emotion-analysis-status/` — `IsAdmin`. Returns latest `AnalysisRunLog`
  (processed/total/status/error) for progress polling.
- `GET  /api/videos/<id>/emotion-summary/` — video **owner (company) or admin**.
  Returns `VideoEmotionSummary` (distribution + timeline).
- `GET  /api/videos/<id>/emotion/recordings/` — owner/admin. **Per-person drill-down**:
  list of `{recording_id (opaque), distribution, timeline, duration}` per viewer.
  **Identity rule:** the owning **company sees only the opaque `recording_id`** (no
  name/email) — this reconciles with "companies never see identifiable individuals".
  A **superuser admin** may additionally receive the linked `viewer_id`.
- `GET  /api/videos/<id>/my-emotion/` — authenticated **viewer**; returns only their own
  `EmotionFrame` timeline for that video (per-person for themselves).

Add `IsCompanyOrAdminOrOwner` check (reuse `IsCompanyOrAdmin`, plus uploader==request.user).

---

## Frontend (`frontend/src/`)

- Add charting dep **`recharts`** to `package.json`.
- `DetailedAnalytics.jsx` (company/admin): new "Emotion Analysis" panel:
  - **Distribution** (pie/bar) from `emotion-summary`.
  - **Emotion-over-time** multi-line chart (happy/neutral/sad/... vs t) = engagement curve.
  - **Best/Worst 10s segment** highlight derived from the timeline.
  - **"Run analysis now"** button → `POST run-emotion-analysis`, then poll
    `emotion-analysis-status` every 3s, show "12 / 40 processed" → "done".
  - Per-person drill-down table (expand a recording → that viewer's timeline).
- Viewer `VideoDetail` / history: show the viewer's OWN reaction curve via `my-emotion`.
- Demographic slice (group by gender/country from `ViewerProfile`) = **optional phase 2**.

---

## Dependencies & env
`backend/requirements.txt` (add): `huggingface_hub`, `mediapipe`, `opencv-python-headless`,
`imageio-ffmpeg`, `numpy`. (Pin versions at implementation time.)

`backend/.env.example` (add):
- `HF_API_TOKEN=`
- `HF_EMOTION_MODEL=<your-username>/<your-fer-model>`  (default `mo-thecreator/vit-Facial-Expression-Recognition` until your trained model is deployed)
- `ANALYSIS_FRAME_RATE=1`  (frames/sec sampled)

`frontend/package.json` (add): `recharts`.

---

## Deploy / operations
- Render **release command**: `python manage.py crontab add` (registers the in-process cron
  once). Because the web service is kept awake via uptime pinging, the cron thread stays alive.
- Keep a **single instance** (free tier is single-instance) so two cron threads never spawn.

## Edge cases & failure modes (audited)
**Data / recording lifecycle**
- `upload_status` never auto-set to `completed` (see audit) → MUST add the completion
  endpoint + frontend call; pipeline gates on it. Missing blob (user denied camera /
  left early) → Azure check fails → recording `failed` (not infinite pending).
- Recording shorter than the video (granted late / left early) → partial frames;
  summary computed from whatever exists; timeline may be offset vs video start
  (documented MVP assumption: t=0 ≈ video start).
- Corrupt / undecodable webm (codec imageio-ffmpeg can't read) → download/extract
  fails → recording `failed`.
- `recording_url` SAS may be expired (60-day SAS) → fetch via Azure **account key**.
- Multiple people in frame → only the **largest detected face** is analyzed; group
  viewing not separately supported (documented).

**Model / HF API**
- HF 429 / timeout / cold start → **exponential backoff** (wait 2^n s, cap 60s);
  persistent failure across a video → recording `failed`, resumable only via manual rerun.
- `HF_API_TOKEN` missing/invalid → all calls fail → recordings `failed`; error in
  `AnalysisRunLog.error` + `WebcamRecording.analysis_error`.
- Model returns unexpected labels → normalize to 7 canonical classes; unknown dropped.
- Free ≈100 req/min → `ANALYSIS_MAX_FRAMES` cap bounds very long videos.

**Runtime / infra**
- Background thread killed by free-tier restart → `AnalysisRunLog` + idempotent skip of
  `completed` recordings means re-trigger resumes safely.
- Concurrency (cron + manual + a still-running previous thread) →
  `select_for_update(skip_locked=True)` makes the second runner skip locked rows
  (no double-processing).
- media/opencv/ffmpeg first-run model+binary downloads need network + writable
  HOME (Render free ephemeral fs re-downloads each run — slower first time, acceptable).
- Django cron uses process local time (`TIME_ZONE='UTC'`, Render container UTC) →
  `'0 6 * * *'` = 06:00 UTC = 12:00 BD; verify TZ if changed.

**Storage growth**
- `EmotionFrame` rows = viewers × frames; bounded by 1 fps + indexes. Optionally
  prune raw frames after aggregation, keeping only `VideoEmotionSummary`.

---

## Validation
1. Unit tests (`api/tests/`): service with **mocked** HF client + mocked frame extraction
   (assert EmotionFrame rows + summary math); management command with a tiny fixture video;
   aggregation correctness; API permission tests (owner/admin vs other company vs viewer).
2. Manual: seed 2–3 `WebcamRecording`s (small sample webm), hit
   `POST /admin/run-emotion-analysis/`, confirm `EmotionFrame` rows + `VideoEmotionSummary`
   populated, confirm `emotion-summary` endpoint JSON, confirm `DetailedAnalytics` charts render
   and "Run now" progress works. Verify `0 6 * * *` cron entry present in settings.

---

## Open / out-of-scope (flagged, not blocking)
- User's own trained HF model: wired via `HF_EMOTION_MODEL`, dropped in later.
- Demographic slicing UI (data already available via `ViewerProfile`).
- Raw-video retention policy (currently kept as model input).
- Face-based age/gender inference (avoided: privacy + accuracy).
- Real-time analysis (deferred; batch daily is sufficient for pre-launch ad feedback).

---

## AGENTS.md (draft — materialize during implementation)
> Plan-mode restriction: the planning agent cannot write non-plan files. Below is the
> full `AGENTS.md` to drop at the repo root when implementing. Keep it in sync
> with this plan and the verified source-code findings above.

```markdown
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

## Testing
- Backend unit tests in `api/tests/` (mock the HF client + frame extraction).
- Cover: aggregation math, idempotent rerun, API permission rules.

## Deployment (Render free)
- Single instance; keep the web service awake via an external uptime ping
  (django-crontab needs the process alive).
- Release command: `python manage.py crontab add`.
- Env: copy `.env.example` -> `.env`; add `HF_API_TOKEN` + `HF_EMOTION_MODEL`.

## Gotchas
- `upload_status` is NOT auto-set; the completion endpoint is required or the
  analysis cron never fires.
- Faces are sent to Hugging Face for inference (privacy trade-off, accepted);
  only tight crops leave our server, raw video stays on Azure.
- HF free ~100 req/min; use exponential backoff.
- Free tier = 0.1 CPU; the batch is CPU-light (ML is offloaded to HF).

## Implementing the emotion pipeline
See `.kilo/plans/1783710159599-emotion-analysis-pipeline.md` for the full,
implementation-ready plan (models, endpoints, frontend, validation).
```

