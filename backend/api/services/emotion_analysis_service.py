import logging
import tempfile
import time
from datetime import timedelta
from typing import List, Dict, Optional, Tuple

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from api.models import (
    WebcamRecording,
    EmotionFrame,
    VideoEmotionSummary,
    AnalysisRunLog,
    EMOTION_CLASSES,
)
from api.services.webcam_upload_service import WebcamUploadService

logger = logging.getLogger(__name__)

DEFAULT_EMOTION_MODEL = "mo-thecreator/vit-Facial-Expression-Recognition"
MAX_FRAMES = 600
MAX_BACKOFF = 60
CANONICAL = {e.lower(): e for e in EMOTION_CLASSES}


class EmotionAnalysisService:
    @classmethod
    def run(cls, trigger: str = "cron") -> AnalysisRunLog:
        statuses = ["pending", "failed"] if trigger == "manual" else ["pending"]

        run_log = AnalysisRunLog.objects.create(trigger=trigger, status="running", total=0)
        affected_videos = set()

        try:
            candidates = cls._claim_recordings(statuses)

            run_log.total = len(candidates)
            run_log.save(update_fields=["total"])

            processed = 0
            for recording in candidates:
                try:
                    cls._process_recording(recording)
                    recording.analysis_status = "completed"
                    recording.analysis_error = None
                    recording.save(update_fields=["analysis_status", "analysis_error"])
                    affected_videos.add(recording.video_id)
                except Exception as exc:
                    logger.error(
                        f"Emotion analysis failed for recording {recording.id}: {exc}",
                        exc_info=True,
                    )
                    recording.analysis_status = "failed"
                    recording.analysis_error = str(exc)[:2000]
                    recording.save(update_fields=["analysis_status", "analysis_error"])
                processed += 1
                run_log.processed = processed
                run_log.save(update_fields=["processed"])

            for video_id in affected_videos:
                cls._aggregate_video(video_id)

            run_log.status = "done"
        except Exception as exc:
            logger.error(f"Emotion analysis run failed: {exc}", exc_info=True)
            run_log.status = "failed"
            run_log.error = str(exc)[:2000]
        finally:
            run_log.finished_at = timezone.now()
            run_log.save(update_fields=["status", "error", "finished_at"])

        return run_log

    @classmethod
    def _claim_recordings(cls, statuses: List[str]) -> List[WebcamRecording]:
        with transaction.atomic():
            stale = timezone.now() - timedelta(minutes=60)
            orphaned = WebcamRecording.objects.select_for_update(skip_locked=True).filter(
                upload_status="completed",
                analysis_status="processing",
                analysis_started_at__lt=stale,
            )
            if orphaned.exists():
                orphaned.update(analysis_status="pending", analysis_started_at=None)

            candidates = list(
                WebcamRecording.objects.select_for_update(skip_locked=True).filter(
                    upload_status="completed", analysis_status__in=statuses
                )
            )
            now = timezone.now()
            for recording in candidates:
                recording.analysis_attempts += 1
                recording.analysis_status = "processing"
                recording.analysis_started_at = now
            WebcamRecording.objects.bulk_update(
                candidates,
                ["analysis_attempts", "analysis_status", "analysis_started_at"],
            )
        return candidates

    @classmethod
    def _process_recording(cls, recording: WebcamRecording) -> None:
        video_bytes = cls._download_recording(recording)
        if not video_bytes or len(video_bytes) == 0:
            raise ValueError("Recording blob is empty or missing")

        frame_rate = int(getattr(settings, "ANALYSIS_FRAME_RATE", 1) or 1)
        frames = cls._extract_faces(video_bytes, frame_rate)

        EmotionFrame.objects.filter(recording=recording).delete()

        if not frames:
            return

        to_create = []
        for t_seconds, face_image in frames:
            raw = cls._classify_face(face_image)
            emotions = cls._normalize_emotions(raw)
            dominant = max(emotions, key=emotions.get)
            to_create.append(
                EmotionFrame(
                    recording=recording,
                    video=recording.video,
                    viewer=recording.recorder,
                    t_seconds=t_seconds,
                    angry=emotions["angry"],
                    disgust=emotions["disgust"],
                    fear=emotions["fear"],
                    happy=emotions["happy"],
                    neutral=emotions["neutral"],
                    sad=emotions["sad"],
                    surprise=emotions["surprise"],
                    dominant=dominant,
                    confidence=emotions[dominant],
                )
            )
        EmotionFrame.objects.bulk_create(to_create)

        WebcamUploadService.generate_thumbnail(recording.id, video_bytes)

    @classmethod
    def _download_recording(cls, recording: WebcamRecording) -> Optional[bytes]:
        from api.services.azure_storage_service import AzureStorageService

        return AzureStorageService.download_blob_from_url(recording.recording_url)

    @classmethod
    def _extract_faces(
        cls, video_bytes: bytes, frame_rate: int
    ) -> List[Tuple[float, "PIL.Image.Image"]]:
        import cv2
        from PIL import Image

        results = []
        tmp = tempfile.NamedTemporaryFile(suffix=".webm", delete=False)
        try:
            tmp.write(video_bytes)
            tmp.flush()
            tmp.close()

            cap = cv2.VideoCapture(tmp.name)
            if not cap.isOpened():
                raise ValueError("Unable to open recording for decoding")

            fps = cap.get(cv2.CAP_PROP_FPS) or 0
            total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
            src_fps = fps if fps > 0 else frame_rate
            step = max(1, int(round(src_fps / max(1, frame_rate))))
            max_frames = int(getattr(settings, "ANALYSIS_MAX_FRAMES", MAX_FRAMES) or MAX_FRAMES)

            frame_idx = 0
            kept = 0
            detector = cls._face_detector()
            while True:
                if kept >= max_frames:
                    break
                ret, frame = cap.read()
                if not ret:
                    break
                if frame_idx % step == 0:
                    face = cls._crop_largest_face(frame, detector)
                    if face is not None:
                        rgb = cv2.cvtColor(face, cv2.COLOR_BGR2RGB)
                        img = Image.fromarray(rgb).resize((224, 224))
                        t_seconds = round(frame_idx / src_fps, 2)
                        results.append((t_seconds, img))
                        kept += 1
                frame_idx += 1
                if total and frame_idx >= total:
                    break
            cap.release()
        finally:
            try:
                import os

                os.unlink(tmp.name)
            except OSError:
                pass

        return results

    @classmethod
    def _face_detector(cls):
        try:
            import mediapipe as mp

            return mp.solutions.face_detection.FaceDetection(
                model_selection=1, min_detection_confidence=0.5
            )
        except Exception:
            return None

    @classmethod
    def _crop_largest_face(cls, frame, detector) -> Optional[object]:
        import cv2

        h, w = frame.shape[:2]
        best = None
        best_area = 0

        if detector is not None:
            try:
                import mediapipe as mp

                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                detections = detector.process(rgb)
                if detections and detections.detections:
                    for det in detections.detections:
                        b = det.location_data.relative_bounding_box
                        x, y, bw, bh = (
                            int(b.xmin * w),
                            int(b.ymin * h),
                            int(b.width * w),
                            int(b.height * h),
                        )
                        area = bw * bh
                        if area > best_area:
                            best_area = area
                            best = (x, y, bw, bh)
            except Exception:
                best = None

        if best is None:
            cascade = cls._haar_cascade()
            if cascade is not None:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                found = cascade.detectMultiScale(gray, 1.1, 3)
                if len(found) > 0:
                    (x, y, bw, bh) = max(found, key=lambda r: r[2] * r[3])
                    best = (int(x), int(y), int(bw), int(bh))

        if best is None:
            return None

        x, y, bw, bh = best
        x = max(0, x)
        y = max(0, y)
        bw = min(bw, w - x)
        bh = min(bh, h - y)
        if bw <= 0 or bh <= 0:
            return None
        return frame[y : y + bh, x : x + bw]

    _haar = None

    @classmethod
    def _haar_cascade(cls):
        if cls._haar is not None:
            return cls._haar
        import cv2

        path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        try:
            cls._haar = cv2.CascadeClassifier(path)
        except Exception:
            cls._haar = None
        return cls._haar

    @classmethod
    @classmethod
    def _classify_face(cls, face_image) -> List[Dict]:
        import io
        import requests

        model = getattr(settings, "HF_EMOTION_MODEL", None) or DEFAULT_EMOTION_MODEL
        token = getattr(settings, "HF_API_TOKEN", None)

        buf = io.BytesIO()
        face_image.save(buf, format="PNG")
        image_bytes = buf.getvalue()

        delay = 1
        attempt = 0
        while True:
            attempt += 1
            try:
                resp = requests.post(
                    f"https://router.huggingface.co/hf-inference/models/{model}",
                    data=image_bytes,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/octet-stream",
                    },
                    timeout=60,
                )
                resp.raise_for_status()
                return resp.json()
            except Exception as exc:
                msg = str(exc).lower()
                is_retryable = (
                    "429" in msg or "rate" in msg or "timeout" in msg or "503" in msg
                )
                if is_retryable and attempt <= 6:
                    time.sleep(min(delay, MAX_BACKOFF))
                    delay *= 2
                    continue
                raise

    @classmethod
    def _normalize_emotions(cls, raw) -> Dict[str, float]:
        scores = {e: 0.0 for e in EMOTION_CLASSES}
        total = 0.0
        for item in raw or []:
            label = str(item.label if hasattr(item, "label") else item.get("label", "")).lower()
            canonical = CANONICAL.get(label)
            if canonical is None:
                continue
            score = float(item.score if hasattr(item, "score") else item.get("score", 0.0))
            scores[canonical] += score
            total += score
        if total > 0:
            scores = {k: v / total for k, v in scores.items()}
        return scores

    @classmethod
    def _aggregate_video(cls, video_id: int) -> None:
        all_data = list(
            EmotionFrame.objects.filter(video_id=video_id).values(
                "t_seconds", "recording",
                "angry", "disgust", "fear", "happy", "neutral", "sad", "surprise",
            )
        )
        if not all_data:
            VideoEmotionSummary.objects.filter(video_id=video_id).delete()
            return

        total_frames = len(all_data)
        distribution = {e: 0.0 for e in EMOTION_CLASSES}
        buckets: Dict[int, Dict[str, float]] = {}
        counts: Dict[int, int] = {}
        seen_recordings: set = set()

        for row in all_data:
            for e in EMOTION_CLASSES:
                distribution[e] += row[e]
            sec = int(round(row["t_seconds"]))
            if sec not in buckets:
                buckets[sec] = {e: 0.0 for e in EMOTION_CLASSES}
                counts[sec] = 0
            for e in EMOTION_CLASSES:
                buckets[sec][e] += row[e]
            counts[sec] += 1
            seen_recordings.add(row["recording"])

        distribution = {e: round(distribution[e] / total_frames, 4) for e in EMOTION_CLASSES}

        timeline = []
        for sec in sorted(buckets):
            entry = {e: round(buckets[sec][e] / counts[sec], 4) for e in EMOTION_CLASSES}
            entry["t"] = sec
            timeline.append(entry)

        VideoEmotionSummary.objects.update_or_create(
            video_id=video_id,
            defaults={
                "distribution": distribution,
                "timeline": timeline,
                "total_frames": total_frames,
                "analyzed_recordings": len(seen_recordings),
            },
        )
