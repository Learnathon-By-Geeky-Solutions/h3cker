import logging
import io
import threading
from typing import Optional, Tuple
from django.utils import timezone
from api.models import User, Video, WebcamRecording
from api.services.azure_storage_service import AzureStorageService

logger = logging.getLogger(__name__)

class WebcamUploadService:
    """Service layer for handling webcam recording upload operations."""

    @staticmethod
    def prepare_webcam_upload(filename: str) -> tuple[str, str]:
        """
        Generates SAS URLs for webcam recording uploads and views.
        Returns: (upload_url, view_url)
        """
        try:
            upload_url, view_url = AzureStorageService.get_emotion_urls(filename)
            return upload_url, view_url
        except Exception as e:
            logger.error(
                f"Failed to generate SAS tokens for webcam recording: {str(e)}",
                exc_info=True,
            )
            return None, None

    @staticmethod
    def create_webcam_recording(
        video: Video, user: User, filename: str, view_url: str
    ) -> Optional[WebcamRecording]:
        """Creates the WebcamRecording database entry."""
        try:
            recording = WebcamRecording.objects.create(
                video=video,
                recorder=user,
                filename=filename,
                recording_url=view_url,
            )
            return recording
        except Exception as e:
            logger.error(
                f"Failed to create webcam recording entry: {str(e)}", exc_info=True
            )
            return None

    @staticmethod
    def generate_thumbnail(recording_id: int, video_bytes: Optional[bytes] = None) -> bool:
        """
        Generate a thumbnail for a webcam recording from the first frame.

        If video_bytes is provided, use it directly; otherwise download from Azure.
        Returns True if thumbnail was generated successfully.
        """
        try:
            recording = WebcamRecording.objects.get(id=recording_id)
        except WebcamRecording.DoesNotExist:
            return False

        if recording.thumbnail_url:
            return True

        if video_bytes is None:
            try:
                video_bytes = AzureStorageService.download_blob_from_url(recording.recording_url)
            except Exception as exc:
                logger.warning(f"Failed to download blob for thumbnail (recording {recording_id}): {exc}")
                return False

        if not video_bytes or len(video_bytes) == 0:
            logger.warning(f"Recording {recording_id} blob is empty, cannot generate thumbnail")
            return False

        import cv2
        import tempfile
        import os
        from PIL import Image

        tmp = tempfile.NamedTemporaryFile(suffix=".webm", delete=False)
        try:
            tmp.write(video_bytes)
            tmp.flush()
            tmp.close()

            cap = cv2.VideoCapture(tmp.name)
            if not cap.isOpened():
                logger.warning(f"OpenCV could not open recording {recording_id} for thumbnail")
                return False

            ret, frame = cap.read()
            cap.release()
            if not ret or frame is None:
                logger.warning(f"No frame could be read from recording {recording_id} for thumbnail")
                return False

            h, w = frame.shape[:2]
            if h == 0 or w == 0:
                return False

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            img = Image.fromarray(rgb)
            img.thumbnail((320, 180), Image.LANCZOS)

            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=80)
            thumbnail_bytes = buf.getvalue()

            upload_url, view_url = AzureStorageService.get_thumbnail_urls(
                f"thumb_{recording.id}_{recording.filename or 'recording'}.jpg"
            )
            if not upload_url:
                logger.warning(f"Failed to get thumbnail SAS URLs for recording {recording_id}")
                return False

            ok = AzureStorageService.upload_bytes_to_sas_url(
                upload_url, thumbnail_bytes, "image/jpeg"
            )
            if not ok:
                logger.warning(f"Failed to upload thumbnail bytes to Azure for recording {recording_id}")
                return False

            recording.thumbnail_url = view_url
            recording.save(update_fields=["thumbnail_url"])
            logger.info(f"Thumbnail generated successfully for recording {recording_id}")
            return True

        except Exception as exc:
            logger.error(f"Thumbnail generation failed for recording {recording_id}: {exc}", exc_info=True)
            return False
        finally:
            try:
                os.unlink(tmp.name)
            except OSError:
                pass

    @staticmethod
    def mark_upload_complete(recording_id: int, user: User) -> Optional[WebcamRecording]:
        """Marks a webcam recording's blob upload as completed (sets upload_status)."""
        try:
            recording = WebcamRecording.objects.get(id=recording_id, recorder=user)
        except WebcamRecording.DoesNotExist:
            return None

        recording.upload_status = "completed"
        recording.upload_completed_at = timezone.now()
        recording.save(update_fields=["upload_status", "upload_completed_at"])

        WebcamUploadService._trigger_thumbnail_async(recording_id)

        return recording

    @staticmethod
    def _trigger_thumbnail_async(recording_id: int) -> None:
        """Generate thumbnail in background thread so the API response isn't blocked."""
        def _run():
            import time
            from django.db import close_old_connections
            try:
                time.sleep(3)
                WebcamUploadService.generate_thumbnail(recording_id)
            except Exception:
                logger.exception(f"Background thumbnail generation failed for recording {recording_id}")
            finally:
                close_old_connections()

        t = threading.Thread(target=_run, daemon=True)
        t.start()