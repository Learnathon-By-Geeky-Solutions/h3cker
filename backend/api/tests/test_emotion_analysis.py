import pytest
from unittest.mock import patch, MagicMock
from io import StringIO
from django.core.management import call_command
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from api.models import (
    User,
    Video,
    WebcamRecording,
    EmotionFrame,
    VideoEmotionSummary,
    AnalysisRunLog,
    CompanyProfile,
    ViewerProfile,
)
from api.services import EmotionAnalysisService


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        email="admin@example.com",
        firebase_uid="admin_uid",
        password="testpass",
        role="admin",
        is_staff=True,
        is_superuser=True,
    )


@pytest.fixture
def company_user(db):
    user = User.objects.create_user(
        email="company@example.com",
        firebase_uid="company_uid",
        password="testpass",
        role="company",
    )
    CompanyProfile.objects.create(user=user, company_name="Test Co")
    return user


@pytest.fixture
def other_company_user(db):
    user = User.objects.create_user(
        email="other@example.com",
        firebase_uid="other_uid",
        password="testpass",
        role="company",
    )
    CompanyProfile.objects.create(user=user, company_name="Other Co")
    return user


@pytest.fixture
def viewer_user(db):
    user = User.objects.create_user(
        email="viewer@example.com",
        firebase_uid="viewer_uid",
        password="testpass",
        role="user",
    )
    ViewerProfile.objects.create(user=user)
    return user


@pytest.fixture
def company_video(db, company_user):
    return Video.objects.create(
        title="Ad Video",
        video_url="https://example.com/ad",
        uploader=company_user,
        visibility="public",
    )


@pytest.fixture
def completed_recording(db, company_video, viewer_user):
    return WebcamRecording.objects.create(
        video=company_video,
        recorder=viewer_user,
        filename="webcam.webm",
        upload_status="completed",
        analysis_status="pending",
        recording_url="https://acct.blob.core.windows.net/webcam/webcam.webm?sas",
    )


def fake_frames():
    return [(1.0, "img1"), (2.0, "img2")]


def fake_classify(_image):
    return [
        {"label": "happy", "score": 0.8},
        {"label": "neutral", "score": 0.2},
    ]


@pytest.mark.django_db
class TestEmotionAnalysisService:
    def test_run_aggregates_and_completes(self, completed_recording):
        with patch.object(
            EmotionAnalysisService, "_download_recording", return_value=b"data"
        ), patch.object(
            EmotionAnalysisService, "_extract_faces", side_effect=lambda *a, **k: fake_frames()
        ), patch.object(
            EmotionAnalysisService, "_classify_face", side_effect=fake_classify
        ):
            run_log = EmotionAnalysisService.run(trigger="cron")

        completed_recording.refresh_from_db()
        assert completed_recording.analysis_status == "completed"
        assert EmotionFrame.objects.filter(recording=completed_recording).count() == 2

        summary = VideoEmotionSummary.objects.get(video=completed_recording.video)
        assert summary.total_frames == 2
        assert summary.analyzed_recordings == 1
        assert abs(summary.distribution["happy"] - 0.8) < 1e-6
        assert abs(summary.distribution["neutral"] - 0.2) < 1e-6

        assert run_log.status == "done"
        assert run_log.processed == 1
        assert run_log.total == 1

    def test_cron_skips_completed(self, completed_recording):
        completed_recording.analysis_status = "completed"
        completed_recording.save()

        with patch.object(
            EmotionAnalysisService, "_download_recording", return_value=b"data"
        ) as dl:
            run_log = EmotionAnalysisService.run(trigger="cron")

        dl.assert_not_called()
        assert run_log.total == 0

    def test_manual_retries_failed(self, completed_recording):
        completed_recording.analysis_status = "failed"
        completed_recording.save()

        with patch.object(
            EmotionAnalysisService, "_download_recording", return_value=b"data"
        ), patch.object(
            EmotionAnalysisService, "_extract_faces", side_effect=lambda *a, **k: fake_frames()
        ), patch.object(
            EmotionAnalysisService, "_classify_face", side_effect=fake_classify
        ):
            run_log = EmotionAnalysisService.run(trigger="manual")

        completed_recording.refresh_from_db()
        assert completed_recording.analysis_status == "completed"
        assert run_log.total == 1

    def test_empty_blob_marks_failed(self, completed_recording):
        with patch.object(
            EmotionAnalysisService, "_download_recording", return_value=b""
        ):
            run_log = EmotionAnalysisService.run(trigger="cron")

        completed_recording.refresh_from_db()
        assert completed_recording.analysis_status == "failed"
        assert run_log.status == "done"

    def test_normalize_emotions_merges_unknown(self):
        raw = [
            {"label": "HAPPY", "score": 0.6},
            {"label": "sad", "score": 0.3},
            {"label": "unknown", "score": 0.9},
        ]
        result = EmotionAnalysisService._normalize_emotions(raw)
        assert abs(result["happy"] - 0.6667) < 1e-3
        assert abs(result["sad"] - 0.3333) < 1e-3
        assert result["angry"] == 0.0


@pytest.mark.django_db
class TestRunEmotionAnalysisCommand:
    def test_command_runs(self, completed_recording):
        with patch.object(
            EmotionAnalysisService, "_download_recording", return_value=b"data"
        ), patch.object(
            EmotionAnalysisService, "_extract_faces", side_effect=lambda *a, **k: fake_frames()
        ), patch.object(
            EmotionAnalysisService, "_classify_face", side_effect=fake_classify
        ):
            out = StringIO()
            call_command("run_emotion_analysis", stdout=out)

        completed_recording.refresh_from_db()
        assert completed_recording.analysis_status == "completed"
        assert "processed=1/1" in out.getvalue()


@pytest.mark.django_db
class TestEmotionEndpoints:
    def test_mark_upload_complete(self, api_client, viewer_user, company_video):
        recording = WebcamRecording.objects.create(
            video=company_video,
            recorder=viewer_user,
            filename="w.webm",
            upload_status="pending",
        )
        api_client.force_authenticate(user=viewer_user)
        url = reverse(
            "webcam-upload-complete",
            kwargs={"video_id": company_video.id, "recording_id": recording.id},
        )
        resp = api_client.patch(url, {}, format="json")
        assert resp.status_code == status.HTTP_200_OK
        recording.refresh_from_db()
        assert recording.upload_status == "completed"

    def test_mark_upload_complete_other_user_denied(self, api_client, viewer_user, other_company_user, company_video):
        recording = WebcamRecording.objects.create(
            video=company_video,
            recorder=viewer_user,
            filename="w.webm",
            upload_status="pending",
        )
        api_client.force_authenticate(user=other_company_user)
        url = reverse(
            "webcam-upload-complete",
            kwargs={"video_id": company_video.id, "recording_id": recording.id},
        )
        resp = api_client.patch(url, {}, format="json")
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_status_idle_no_log(self, api_client, admin_user):
        api_client.force_authenticate(user=admin_user)
        resp = api_client.get(reverse("admin-emotion-analysis-status"))
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "idle"

    def test_run_analysis_requires_admin(self, api_client, company_user):
        api_client.force_authenticate(user=company_user)
        resp = api_client.post(reverse("admin-run-emotion-analysis"))
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_summary_owner_allowed_other_company_denied(
        self, api_client, company_user, other_company_user, company_video, completed_recording
    ):
        VideoEmotionSummary.objects.create(
            video=company_video,
            distribution={"happy": 1.0},
            timeline=[{"t": 0, "happy": 1.0}],
            total_frames=1,
            analyzed_recordings=1,
        )
        api_client.force_authenticate(user=company_user)
        resp = api_client.get(reverse("video-emotion-summary", kwargs={"video_id": company_video.id}))
        assert resp.status_code == status.HTTP_200_OK

        api_client.force_authenticate(user=other_company_user)
        resp2 = api_client.get(reverse("video-emotion-summary", kwargs={"video_id": company_video.id}))
        assert resp2.status_code == status.HTTP_403_FORBIDDEN

    def test_summary_viewer_denied(self, api_client, viewer_user, company_video, completed_recording):
        api_client.force_authenticate(user=viewer_user)
        resp = api_client.get(reverse("video-emotion-summary", kwargs={"video_id": company_video.id}))
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_recordings_superuser_sees_viewer_id(
        self, api_client, admin_user, company_video, completed_recording, viewer_user
    ):
        EmotionFrame.objects.create(
            recording=completed_recording,
            video=company_video,
            viewer=viewer_user,
            t_seconds=1.0,
            happy=1.0,
            dominant="happy",
            confidence=1.0,
        )
        completed_recording.analysis_status = "completed"
        completed_recording.save()

        api_client.force_authenticate(user=admin_user)
        resp = api_client.get(reverse("video-emotion-recordings", kwargs={"video_id": company_video.id}))
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 1
        assert resp.data[0]["viewer_id"] == viewer_user.id

    def test_recordings_company_hides_viewer_id(
        self, api_client, company_user, company_video, completed_recording, viewer_user
    ):
        EmotionFrame.objects.create(
            recording=completed_recording,
            video=company_video,
            viewer=viewer_user,
            t_seconds=1.0,
            happy=1.0,
            dominant="happy",
            confidence=1.0,
        )
        completed_recording.analysis_status = "completed"
        completed_recording.save()

        api_client.force_authenticate(user=company_user)
        resp = api_client.get(reverse("video-emotion-recordings", kwargs={"video_id": company_video.id}))
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 1
        assert "viewer_id" not in resp.data[0]

    def test_my_emotion_returns_own_frames(
        self, api_client, viewer_user, company_video, completed_recording
    ):
        EmotionFrame.objects.create(
            recording=completed_recording,
            video=company_video,
            viewer=viewer_user,
            t_seconds=2.0,
            happy=0.9,
            dominant="happy",
            confidence=0.9,
        )
        api_client.force_authenticate(user=viewer_user)
        resp = api_client.get(reverse("video-my-emotion", kwargs={"video_id": company_video.id}))
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["timeline"]) == 1
        assert resp.data["timeline"][0]["t"] == 2.0
