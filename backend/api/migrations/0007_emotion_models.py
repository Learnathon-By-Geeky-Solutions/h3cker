from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0006_viewerprofile_points_viewerprofile_points_earned_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="webcamrecording",
            name="analysis_attempts",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="webcamrecording",
            name="analysis_started_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="webcamrecording",
            name="analysis_error",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="webcamrecording",
            name="analysis_status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("processing", "Processing"),
                    ("completed", "Completed"),
                    ("failed", "Failed"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name="EmotionFrame",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("t_seconds", models.FloatField()),
                ("angry", models.FloatField(default=0.0)),
                ("disgust", models.FloatField(default=0.0)),
                ("fear", models.FloatField(default=0.0)),
                ("happy", models.FloatField(default=0.0)),
                ("neutral", models.FloatField(default=0.0)),
                ("sad", models.FloatField(default=0.0)),
                ("surprise", models.FloatField(default=0.0)),
                ("dominant", models.CharField(max_length=20)),
                ("confidence", models.FloatField(default=0.0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "recording",
                    models.ForeignKey(
                        on_delete=models.CASCADE,
                        related_name="emotion_frames",
                        to="api.webcamrecording",
                    ),
                ),
                (
                    "video",
                    models.ForeignKey(
                        on_delete=models.CASCADE,
                        related_name="emotion_frames",
                        to="api.video",
                    ),
                ),
                (
                    "viewer",
                    models.ForeignKey(
                        on_delete=models.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Emotion Frame",
                "verbose_name_plural": "Emotion Frames",
                "indexes": [models.Index(fields=["video", "t_seconds"], name="emotion_frame_video_t_sec_idx")],
                "unique_together": (("recording", "t_seconds"),),
            },
        ),
        migrations.CreateModel(
            name="VideoEmotionSummary",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("distribution", models.JSONField(default=dict)),
                ("timeline", models.JSONField(default=list)),
                ("total_frames", models.PositiveIntegerField(default=0)),
                ("analyzed_recordings", models.PositiveIntegerField(default=0)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "video",
                    models.OneToOneField(
                        on_delete=models.CASCADE,
                        related_name="emotion_summary",
                        to="api.video",
                    ),
                ),
            ],
            options={
                "verbose_name": "Video Emotion Summary",
                "verbose_name_plural": "Video Emotion Summaries",
            },
        ),
        migrations.CreateModel(
            name="AnalysisRunLog",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "trigger",
                    models.CharField(
                        choices=[("cron", "Cron"), ("manual", "Manual")],
                        default="cron",
                        max_length=10,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("running", "Running"),
                            ("done", "Done"),
                            ("failed", "Failed"),
                        ],
                        default="running",
                        max_length=10,
                    ),
                ),
                ("processed", models.PositiveIntegerField(default=0)),
                ("total", models.PositiveIntegerField(default=0)),
                ("error", models.TextField(blank=True, null=True)),
                ("started_at", models.DateTimeField(auto_now_add=True)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
            ],
            options={
                "verbose_name": "Analysis Run Log",
                "verbose_name_plural": "Analysis Run Logs",
                "ordering": ["-started_at"],
            },
        ),
    ]
