import uuid
import datetime
from django.db import models
from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.utils import timezone
from django.core.validators import MinValueValidator
from django.db.models import Q, F, FloatField, ExpressionWrapper, Count


EMOTION_CLASSES = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]


class CustomUserManager(BaseUserManager):
    def create_user(self, email, firebase_uid, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        if not firebase_uid:
            raise ValueError("Users must have a Firebase UID")
        email = self.normalize_email(email)
        user = self.model(email=email, firebase_uid=firebase_uid, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, firebase_uid, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("role", "admin")

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, firebase_uid, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ("admin", "Admin"),
        ("company", "Company"),
        ("user", "User"),
    )

    firebase_uid = models.CharField(max_length=128, unique=True, db_index=True)
    email = models.EmailField(unique=True, db_index=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    first_name = models.CharField(max_length=50, blank=True)
    last_name = models.CharField(max_length=50, blank=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="user")
    date_joined = models.DateTimeField(default=timezone.now)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = CustomUserManager()

    USERNAME_FIELD = "firebase_uid"
    REQUIRED_FIELDS = ["email"]

    class Meta:
        db_table = "all_users"
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return self.email

    def get_full_name(self):
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name if full_name else self.email


class CompanyProfile(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, primary_key=True, related_name="company_profile"
    )
    company_name = models.CharField(max_length=100, blank=True)
    company_address = models.TextField(blank=True)
    industry = models.CharField(max_length=50, blank=True)

    class Meta:
        db_table = "company_profiles"
        verbose_name = "Company Profile"
        verbose_name_plural = "Company Profiles"

    def __str__(self):
        return self.company_name or f"Profile for {self.user.email}"


class ViewerProfile(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, primary_key=True, related_name="viewer_profile"
    )
    onboarding_completed = models.BooleanField(default=False)
    birthday = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=50, blank=True)
    country = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    education_level = models.CharField(max_length=100, blank=True)
    occupation = models.CharField(max_length=100, blank=True)
    content_preferences = models.JSONField(default=list, blank=True)
    points = models.PositiveIntegerField(default=0)
    points_earned = models.PositiveIntegerField(default=0)
    points_redeemed = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "viewer_profiles"
        verbose_name = "Viewer Profile"
        verbose_name_plural = "Viewer Profiles"

    def __str__(self):
        return f"Profile for {self.user.email}"

    def calculate_points_value(self):
        return self.points * 10  # 10 BDT per point


class Video(models.Model):
    VISIBILITY_CHOICES = (
        ("private", "Private"),
        ("unlisted", "Unlisted"),
        ("public", "Public"),
    )

    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=100, blank=True, db_index=True)
    visibility = models.CharField(
        max_length=20, choices=VISIBILITY_CHOICES, default="private", db_index=True
    )
    video_url = models.URLField(max_length=1024)
    thumbnail_url = models.URLField(max_length=1024, blank=True)
    upload_date = models.DateTimeField(auto_now_add=True, db_index=True)
    uploader = models.ForeignKey(User, on_delete=models.CASCADE, related_name="videos")
    views = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)], db_index=True)
    likes = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)])
    duration_seconds = models.FloatField(default=0.0, null=True, blank=True)

    # Fields for view limiting and expiry
    view_limit = models.PositiveIntegerField(null=True, blank=True)
    auto_private_after = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "videos"
        ordering = ["-upload_date"]
        verbose_name = "Video"
        verbose_name_plural = "Videos"
        indexes = [
            models.Index(fields=["visibility", "auto_private_after"]),
        ]

    @property
    def duration(self):
        return self.duration_seconds

    @duration.setter
    def duration(self, value):
        self.duration_seconds = float(value) if value else 0.0

    def __str__(self):
        return self.title

    @classmethod
    def _public_available_qs(cls):
        """Base queryset: public videos that haven't expired."""
        return cls.objects.select_related("uploader").filter(
            Q(visibility="public") & (Q(auto_private_after__isnull=True) | Q(auto_private_after__gte=timezone.now()))
        )

    @classmethod
    def get_recommendations_for_user(cls, user, limit=10, offset=0):
        limit = max(1, min(limit, 50))
        offset = max(0, offset)

        if not user.is_authenticated:
            return cls.get_popular_videos(limit, offset)

        try:
            profile = ViewerProfile.objects.get(user=user)
            preferences = profile.content_preferences or []

            if preferences:
                return cls.get_preference_based_videos(user, preferences, limit, offset)

        except ViewerProfile.DoesNotExist:
            pass

        return cls.get_popular_videos(limit, offset)

    @classmethod
    def get_featured_carousel_videos(cls, limit=5):
        """Get featured videos for the carousel based on popularity and engagement."""
        limit = max(1, min(limit, 10))  # Limit between 1 and 10

        return (
            cls._public_available_qs()
            .annotate(
                popularity_score=ExpressionWrapper(
                    (F("views") * 0.3) + (F("likes") * 0.7), output_field=FloatField()
                )
            )
            .order_by("-popularity_score")[:limit]
        )

    @classmethod
    def get_preference_based_videos(cls, user, preferences, limit, offset=0):
        limit = max(1, min(limit, 50))
        offset = max(0, offset)  # Offset must be non-negative

        # Default to popular videos if preferences is empty
        if not preferences:
            return cls.get_popular_videos(limit, offset)

        watched_video_ids = VideoView.objects.filter(viewer=user).values_list(
            "video_id", flat=True
        )

        base_query = cls._public_available_qs()

        if watched_video_ids:
            most_popular_watched = (
                cls.objects.filter(id__in=watched_video_ids)
                .order_by("-views", "-likes")[:5]
                .values_list("id", flat=True)
            )

            exclude_ids = set(watched_video_ids) - set(most_popular_watched)
            if exclude_ids:
                base_query = base_query.exclude(id__in=exclude_ids)
        category_filter = Q()
        for preference in preferences:
            category_filter |= Q(category__icontains=preference)

        # Apply the filter if we have preferences
        if category_filter:
            recommended = base_query.filter(category_filter).order_by("-upload_date")

            total_count = recommended.count()
            recommended_ids = list(recommended.values_list("id", flat=True))

            if total_count > offset:
                end_idx = min(offset + limit, total_count)
                pref_videos = list(recommended[offset:end_idx])
                filled = len(pref_videos)
                if filled >= limit:
                    return pref_videos
                remaining = limit - filled
                popular_query = cls.get_popular_videos_queryset().exclude(
                    id__in=recommended_ids
                )
                popular_videos = list(popular_query[:remaining])
                pref_videos.extend(popular_videos)
                return pref_videos

            # Not enough preference-based videos, get additional popular videos
            additional_needed = limit
            additional_offset = max(0, offset - total_count)

            popular_query = cls.get_popular_videos_queryset().exclude(
                id__in=recommended_ids
            )
            additional_videos = popular_query[
                additional_offset : additional_offset + additional_needed
            ]

            return list(additional_videos)
        return cls.get_popular_videos(limit, offset)

    @classmethod
    def get_popular_videos_queryset(cls):
        """Returns the queryset for popular videos, ordered but not sliced."""
        return (
            cls._public_available_qs()
            .annotate(
                popularity_score=ExpressionWrapper(
                    (F("views") * 0.6) + (F("likes") * 0.4), output_field=FloatField()
                )
            )
            .order_by("-popularity_score")
        )

    @classmethod
    def get_popular_videos(cls, limit, offset=0):
        limit = max(1, min(limit, 50))
        offset = max(0, offset)
        return cls.get_popular_videos_queryset()[offset : offset + limit]

    @classmethod
    def get_trending_videos(cls, limit=10, offset=0):
        limit = max(1, min(limit, 50))
        offset = max(0, offset)

        recent_threshold = timezone.now() - datetime.timedelta(days=7)

        return (
            cls._public_available_qs().filter(upload_date__gte=recent_threshold)
            .annotate(
                recent_views=Count(
                    "video_views",
                    filter=Q(video_views__viewed_at__gte=recent_threshold),
                )
            )
            .order_by("-recent_views", "-upload_date")[offset : offset + limit]
        )

    @classmethod
    def get_category_videos(cls, category, limit=20, offset=0):
        # Get videos by category with pagination
        limit = max(1, min(limit, 50))
        offset = max(0, offset)

        if not category:
            return cls._public_available_qs().order_by("-upload_date")[
                offset : offset + limit
            ]

        return cls._public_available_qs().filter(
            category__iexact=category
        ).order_by("-upload_date")[offset : offset + limit]

    @classmethod
    def get_recently_uploaded_videos(cls, limit=10, offset=0):
        """Get recently uploaded videos."""
        # Validate parameters
        limit = max(1, min(limit, 50))
        offset = max(0, offset)

        return cls._public_available_qs().order_by("-upload_date")[
            offset : offset + limit
        ]


class VideoView(models.Model):
    video = models.ForeignKey(
        Video, on_delete=models.CASCADE, related_name="video_views"
    )
    viewer = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="viewed_videos"
    )
    viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "video_views"
        indexes = [
            models.Index(fields=["video", "viewer"]),
            models.Index(fields=["viewed_at"]),
        ]

    def __str__(self):
        return f"{self.viewer.email} viewed {self.video.title}"


class VideoLike(models.Model):
    video = models.ForeignKey(
        Video, on_delete=models.CASCADE, related_name="video_likes"
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="liked_videos"
    )
    liked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "video_likes"
        unique_together = ("video", "user")

    def __str__(self):
        return f"{self.user.email} liked {self.video.title}"


class VideoShare(models.Model):
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name="shares")
    created_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="shared_videos"
    )
    share_token = models.CharField(max_length=64, unique=True, default=uuid.uuid4)
    created_at = models.DateTimeField(auto_now_add=True)
    access_count = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)

    class Meta:
        db_table = "video_shares"

    def __str__(self):
        return f"Share for {self.video.title}"


class WebcamRecording(models.Model):
    """Model to track webcam recordings synchronized with video playback."""

    UPLOAD_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    ANALYSIS_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    video = models.ForeignKey(
        Video, on_delete=models.CASCADE, related_name="webcam_recordings"
    )
    recorder = models.ForeignKey(User, on_delete=models.CASCADE, related_name="webcam_recordings")
    filename = models.CharField(max_length=255)
    recording_date = models.DateTimeField(auto_now_add=True, db_index=True)
    upload_status = models.CharField(
        max_length=20, choices=UPLOAD_STATUS_CHOICES, default="pending", db_index=True
    )
    upload_completed_at = models.DateTimeField(null=True, blank=True)
    recording_url = models.URLField(max_length=500, blank=True, null=True)
    thumbnail_url = models.URLField(max_length=500, blank=True, null=True)
    analysis_status = models.CharField(
        max_length=20, choices=ANALYSIS_STATUS_CHOICES, default="pending", db_index=True
    )
    analysis_error = models.TextField(blank=True, null=True)
    analysis_attempts = models.PositiveIntegerField(default=0)
    analysis_started_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-recording_date"]
        verbose_name = "Webcam Recording"
        verbose_name_plural = "Webcam Recordings"
        indexes = [
            models.Index(fields=["upload_status", "analysis_status"]),
            models.Index(fields=["recorder", "-recording_date"]),
        ]

    def __str__(self):
        return f"Webcam Recording for Video {self.video.id} by {self.recorder.email}"


class EmotionFrame(models.Model):
    """Per-analyzed-frame emotion probabilities (per-person source of truth)."""

    recording = models.ForeignKey(
        WebcamRecording, on_delete=models.CASCADE, related_name="emotion_frames"
    )
    video = models.ForeignKey(
        Video, on_delete=models.CASCADE, related_name="emotion_frames"
    )
    viewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="emotion_frame_viewer")
    t_seconds = models.FloatField()
    angry = models.FloatField(default=0.0)
    disgust = models.FloatField(default=0.0)
    fear = models.FloatField(default=0.0)
    happy = models.FloatField(default=0.0)
    neutral = models.FloatField(default=0.0)
    sad = models.FloatField(default=0.0)
    surprise = models.FloatField(default=0.0)
    dominant = models.CharField(max_length=20)
    confidence = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["video", "t_seconds"]),
            models.Index(fields=["video", "viewer"]),
        ]
        unique_together = ("recording", "t_seconds")
        verbose_name = "Emotion Frame"
        verbose_name_plural = "Emotion Frames"

    def __str__(self):
        return f"EmotionFrame {self.dominant}@{self.t_seconds:.1f}s (rec {self.recording_id})"


class VideoEmotionSummary(models.Model):
    """Precomputed per-video emotion aggregates."""

    video = models.OneToOneField(
        Video, on_delete=models.CASCADE, related_name="emotion_summary"
    )
    distribution = models.JSONField(default=dict)
    timeline = models.JSONField(default=list)
    total_frames = models.PositiveIntegerField(default=0)
    analyzed_recordings = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Video Emotion Summary"
        verbose_name_plural = "Video Emotion Summaries"

    def __str__(self):
        return f"Emotion summary for Video {self.video_id}"


class AnalysisRunLog(models.Model):
    """Tracks emotion-analysis runs for progress polling + idempotent resume."""

    TRIGGER_CHOICES = [
        ("cron", "Cron"),
        ("manual", "Manual"),
    ]
    STATUS_CHOICES = [
        ("running", "Running"),
        ("done", "Done"),
        ("failed", "Failed"),
    ]

    trigger = models.CharField(max_length=10, choices=TRIGGER_CHOICES, default="cron")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="running")
    processed = models.PositiveIntegerField(default=0)
    total = models.PositiveIntegerField(default=0)
    error = models.TextField(blank=True, null=True)
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-started_at"]
        verbose_name = "Analysis Run Log"
        verbose_name_plural = "Analysis Run Logs"
        indexes = [
            models.Index(fields=["-started_at"]),
        ]

    def __str__(self):
        return f"AnalysisRun {self.trigger} ({self.status}) {self.processed}/{self.total}"
