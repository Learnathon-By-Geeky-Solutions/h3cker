from django.db import models
from django.utils import timezone

# Role Model
class Role(models.Model):
    ADMIN = 'Admin'
    COMPANY = 'Company'
    USER = 'User'
    ROLE_CHOICES = [
        (ADMIN, 'Admin'),
        (COMPANY, 'Company'),
        (USER, 'User'),
    ]

    name = models.CharField(max_length=50, unique=True, choices=ROLE_CHOICES)

    def __str__(self):
        return self.name

# Custom User Model
class CustomUser(models.Model):
    username = models.CharField(max_length=255, unique=True)
    email = models.EmailField(unique=True)
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    name = models.CharField(max_length=255, blank=True)
    onboarding_completed = models.BooleanField(default=False)
    profile_picture = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.username

# Company Model
class Company(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)
    company_name = models.CharField(max_length=255)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.company_name

# Payment Model
class Payment(models.Model):
    PENDING = 'pending'
    COMPLETED = 'completed'
    FAILED = 'failed'
    STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (COMPLETED, 'Completed'),
        (FAILED, 'Failed'),
    ]
    
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    amount = models.FloatField()
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default=PENDING)
    payment_method = models.CharField(max_length=50)
    payment_date = models.DateTimeField(default=timezone.now)

# Coin Transaction Model
class CoinTransaction(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    coins_changed = models.IntegerField()
    transaction_type = models.CharField(max_length=50)
    transaction_date = models.DateTimeField(default=timezone.now)

# Survey Response Model
class SurveyResponse(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    age = models.IntegerField(null=True, blank=True)
    gender = models.CharField(max_length=50, blank=True)
    location = models.CharField(max_length=255, blank=True)
    interests = models.TextField(blank=True)
    profession = models.CharField(max_length=255, blank=True)
    preferred_video_category = models.CharField(max_length=255, blank=True)
    viewing_habits = models.TextField(blank=True)
    spending_habits = models.TextField(blank=True)
    social_media_usage = models.TextField(blank=True)
    response_date = models.DateTimeField(default=timezone.now)

# Video Model
class Video(models.Model):
    PUBLISHED = 'published'
    UNPUBLISHED = 'unpublished'
    STATUS_CHOICES = [
        (PUBLISHED, 'Published'),
        (UNPUBLISHED, 'Unpublished'),
    ]
    
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    file_url = models.TextField()
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default=UNPUBLISHED)
    upload_date = models.DateTimeField(default=timezone.now)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)

# Emotion Model
class Emotion(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    video = models.ForeignKey(Video, on_delete=models.CASCADE)
    frame_time = models.FloatField()
    emotion_type = models.CharField(max_length=50)
    confidence = models.FloatField()
    recorded_at = models.DateTimeField(default=timezone.now)

# Share Link Model
class ShareLink(models.Model):
    video = models.ForeignKey(Video, on_delete=models.CASCADE)
    share_token = models.TextField(unique=True)
    created_at = models.DateTimeField(default=timezone.now)
    expiry_date = models.DateTimeField(null=True, blank=True)

# Analytics Report Model
class AnalyticsReport(models.Model):
    video = models.ForeignKey(Video, on_delete=models.CASCADE)
    report_data = models.JSONField()
    generated_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Analytics for Video ID {self.video.id}"