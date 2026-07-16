from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import (
    User, CompanyProfile, ViewerProfile, Video, VideoView,
    VideoLike, VideoShare, WebcamRecording, EmotionFrame,
    VideoEmotionSummary, AnalysisRunLog
)


class Command(BaseCommand):
    help = "Seed the database with sample data for local development"

    def handle(self, *args, **options):
        self.stdout.write("Seeding database...")

        admin, _ = User.objects.get_or_create(
            firebase_uid="seed-admin-001",
            defaults={
                "email": "admin@engage.local",
                "first_name": "Admin",
                "last_name": "User",
                "role": "admin",
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
            },
        )
        admin.set_password("admin123")
        admin.save()

        company, _ = User.objects.get_or_create(
            firebase_uid="seed-company-001",
            defaults={
                "email": "company@engage.local",
                "first_name": "Brand",
                "last_name": "Manager",
                "role": "company",
                "is_active": True,
            },
        )
        company.set_password("company123")
        company.save()
        CompanyProfile.objects.get_or_create(
            user=company,
            defaults={
                "company_name": "Sample Brand Co.",
                "company_address": "123 Business Ave, NYC",
                "industry": "Technology",
            },
        )

        users_data = [
            {"uid": "seed-user-001", "email": "alice@test.local", "first_name": "Alice", "last_name": "Johnson"},
            {"uid": "seed-user-002", "email": "bob@test.local", "first_name": "Bob", "last_name": "Smith"},
            {"uid": "seed-user-003", "email": "charlie@test.local", "first_name": "Charlie", "last_name": "Brown"},
        ]
        created_users = []
        for u in users_data:
            user, _ = User.objects.get_or_create(
                firebase_uid=u["uid"],
                defaults={
                    "email": u["email"],
                    "first_name": u["first_name"],
                    "last_name": u["last_name"],
                    "role": "user",
                    "is_active": True,
                },
            )
            user.set_password("user123")
            user.save()
            ViewerProfile.objects.get_or_create(user=user)
            created_users.append(user)

        sample_videos = [
            {
                "title": "Summer Campaign 2026",
                "description": "Our latest summer product launch with fresh branding.",
                "category": "Advertising",
                "visibility": "public",
                "video_url": "https://example.com/videos/summer-campaign.mp4",
                "thumbnail_url": "https://example.com/thumbnails/summer-campaign.jpg",
                "duration_seconds": 150,
                "views": 1200,
                "likes": 85,
            },
            {
                "title": "Product Demo - New Features",
                "description": "Walkthrough of all new features in our platform.",
                "category": "Technology",
                "visibility": "public",
                "video_url": "https://example.com/videos/product-demo.mp4",
                "thumbnail_url": "https://example.com/thumbnails/product-demo.jpg",
                "duration_seconds": 255,
                "views": 3400,
                "likes": 210,
            },
            {
                "title": "Customer Testimonial Compilation",
                "description": "Hear what our customers are saying about us.",
                "category": "Testimonials",
                "visibility": "public",
                "video_url": "https://example.com/videos/testimonials.mp4",
                "thumbnail_url": "https://example.com/thumbnails/testimonials.jpg",
                "duration_seconds": 180,
                "views": 890,
                "likes": 45,
            },
            {
                "title": "Behind the Scenes",
                "description": "A look behind the scenes at our studio.",
                "category": "Entertainment",
                "visibility": "public",
                "video_url": "https://example.com/videos/bts.mp4",
                "thumbnail_url": "https://example.com/thumbnails/bts.jpg",
                "duration_seconds": 345,
                "views": 2100,
                "likes": 156,
            },
            {
                "title": "Holiday Special Ad",
                "description": "Our holiday season advertisement campaign.",
                "category": "Advertising",
                "visibility": "private",
                "video_url": "https://example.com/videos/holiday-ad.mp4",
                "thumbnail_url": "https://example.com/thumbnails/holiday-ad.jpg",
                "duration_seconds": 105,
                "views": 450,
                "likes": 32,
            },
        ]

        created_videos = []
        for v in sample_videos:
            video, _ = Video.objects.get_or_create(
                title=v["title"],
                defaults={
                    "description": v["description"],
                    "category": v["category"],
                    "visibility": v["visibility"],
                    "video_url": v["video_url"],
                    "thumbnail_url": v["thumbnail_url"],
                    "duration_seconds": v["duration_seconds"],
                    "views": v["views"],
                    "likes": v["likes"],
                    "uploader": company,
                },
            )
            created_videos.append(video)

        for video in created_videos[:3]:
            for user in created_users[:2]:
                VideoView.objects.get_or_create(video=video, viewer=user)

        for i, video in enumerate(created_videos[:3]):
            user = created_users[i % len(created_users)]
            VideoLike.objects.get_or_create(video=video, user=user)

        share_video = created_videos[0]
        VideoShare.objects.get_or_create(
            video=share_video,
            created_by=company,
            defaults={"share_token": "demo-share-token-001"},
        )

        completed_recordings = []
        for i, video in enumerate(created_videos[:2]):
            user = created_users[i]
            rec, _ = WebcamRecording.objects.get_or_create(
                video=video,
                recorder=user,
                filename=f"webcam_{video.id}_{user.id}.webm",
                defaults={
                    "upload_status": "completed",
                    "recording_url": f"https://example.com/webcam/{video.id}_{user.id}.webm",
                    "analysis_status": "completed",
                },
            )
            completed_recordings.append(rec)

        if completed_recordings:
            import random
            emotion_labels = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]
            for rec in completed_recordings:
                for t in range(0, 10):
                    scores = {e: random.random() for e in emotion_labels}
                    total = sum(scores.values())
                    scores = {e: v / total for e, v in scores.items()}
                    dominant = max(scores, key=scores.get)
                    EmotionFrame.objects.get_or_create(
                        recording=rec,
                        t_seconds=float(t),
                        defaults={
                            "video": rec.video,
                            "viewer": rec.recorder,
                            **scores,
                            "dominant": dominant,
                            "confidence": scores[dominant],
                        },
                    )

            for video in created_videos[:2]:
                frames = EmotionFrame.objects.filter(video=video)
                if frames.exists():
                    all_scores = {e: [] for e in emotion_labels}
                    timeline_map = {}
                    for f in frames:
                        t_bucket = int(f.t_seconds)
                        if t_bucket not in timeline_map:
                            timeline_map[t_bucket] = {e: [] for e in emotion_labels}
                        for e in emotion_labels:
                            all_scores[e].append(getattr(f, e))
                            timeline_map[t_bucket][e].append(getattr(f, e))
                    distribution = {
                        e: round(sum(all_scores[e]) / len(all_scores[e]), 4) if all_scores[e] else 0
                        for e in emotion_labels
                    }
                    timeline = [
                        {"t": t, **{e: round(sum(v[e]) / len(v[e]), 4) for e in emotion_labels}}
                        for t, v in sorted(timeline_map.items())
                    ]
                    VideoEmotionSummary.objects.update_or_create(
                        video=video,
                        defaults={
                            "distribution": distribution,
                            "timeline": timeline,
                            "total_frames": frames.count(),
                            "analyzed_recordings": WebcamRecording.objects.filter(
                                video=video, analysis_status="completed"
                            ).count(),
                        },
                    )

        self.stdout.write(self.style.SUCCESS(
            "Seed complete!\n"
            f"  Admin: admin@engage.local / admin123\n"
            f"  Company: company@engage.local / company123\n"
            f"  Users: alice@test.local / user123, bob@test.local / user123, charlie@test.local / user123\n"
            f"  Videos: {len(created_videos)} created\n"
            f"  Webcam recordings: {len(completed_recordings)} with emotion data"
        ))
