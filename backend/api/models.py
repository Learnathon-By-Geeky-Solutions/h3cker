from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone
from django.core.validators import MinValueValidator
import uuid

class CustomUserManager(BaseUserManager):
    def create_user(self, email, firebase_uid, password=None, **extra_fields):
        if not email:
            raise ValueError('Users must have an email address')
        if not firebase_uid:
            raise ValueError('Users must have a Firebase UID')
        email = self.normalize_email(email)
        user = self.model(email=email, firebase_uid=firebase_uid, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, firebase_uid, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', 'admin')

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, firebase_uid, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('company', 'Company'),
        ('user', 'User'),
    )

    firebase_uid = models.CharField(max_length=128, unique=True, db_index=True) 
    email = models.EmailField(unique=True, db_index=True) 
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    first_name = models.CharField(max_length=50, blank=True) 
    last_name = models.CharField(max_length=50, blank=True) 
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='user')
    date_joined = models.DateTimeField(default=timezone.now)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = CustomUserManager()

    USERNAME_FIELD = 'firebase_uid'
    REQUIRED_FIELDS = ['email'] 

    class Meta:
        db_table = 'all_users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return self.email

    def get_full_name(self):
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name if full_name else self.email

class CompanyProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True, related_name='company_profile')
    company_name = models.CharField(max_length=100, blank=True)
    company_address = models.TextField(blank=True)
    industry = models.CharField(max_length=50, blank=True)

    class Meta:
        db_table = 'company_profiles'
        verbose_name = 'Company Profile'
        verbose_name_plural = 'Company Profiles'

    def __str__(self):
        return self.company_name or f"Profile for {self.user.email}"

class ViewerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True, related_name='viewer_profile')
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
        db_table = 'viewer_profiles'
        verbose_name = 'Viewer Profile'
        verbose_name_plural = 'Viewer Profiles'

    def __str__(self):
        return f"Profile for {self.user.email}"
        
    def calculate_points_value(self):
        return self.points * 10  # 10 BDT per point

class Video(models.Model):
    VISIBILITY_CHOICES = (
        ('private', 'Private'),
        ('unlisted', 'Unlisted'),
        ('public', 'Public'),
    )

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=100, blank=True)
    visibility = models.CharField(
        max_length=20,
        choices=VISIBILITY_CHOICES,
        default='private'
    )
    video_url = models.URLField(max_length=1024) 
    thumbnail_url = models.URLField(max_length=1024, blank=True)
    upload_date = models.DateTimeField(auto_now_add=True, db_index=True) 
    uploader = models.ForeignKey(User, on_delete=models.CASCADE, related_name='videos')
    views = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)])
    likes = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)])
    duration = models.CharField(max_length=50, blank=True, default="0:00")
    
    # Fields for view limiting and expiry
    view_limit = models.PositiveIntegerField(null=True, blank=True)
    auto_private_after = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'videos'
        ordering = ['-upload_date']
        verbose_name = 'Video'
        verbose_name_plural = 'Videos'

    def __str__(self):
        return self.title

class VideoView(models.Model):
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name='video_views')
    viewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='viewed_videos')
    viewed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'video_views'
        indexes = [
            models.Index(fields=['video', 'viewer']),
            models.Index(fields=['viewed_at']),
        ]
        
    def __str__(self):
        return f"{self.viewer.email} viewed {self.video.title}"

class VideoLike(models.Model):
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name='video_likes')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='liked_videos')
    liked_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'video_likes'
        unique_together = ('video', 'user')
        
    def __str__(self):
        return f"{self.user.email} liked {self.video.title}"

class VideoShare(models.Model):
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name='shares')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shared_videos')
    share_token = models.CharField(max_length=64, unique=True, default=uuid.uuid4)
    created_at = models.DateTimeField(auto_now_add=True)
    access_count = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'video_shares'
        indexes = [models.Index(fields=['share_token'])]
        
    def __str__(self):
        return f"Share for {self.video.title}"

class EvaluationForm(models.Model):
    video = models.OneToOneField(Video, on_delete=models.CASCADE, related_name='evaluation_form')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_forms')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'evaluation_forms'
        
    def __str__(self):
        return f"Form for {self.video.title}"

class EvaluationQuestion(models.Model):
    QUESTION_TYPES = (
        ('rating', 'Rating'),
        ('text', 'Text'),
        ('multiple_choice', 'Multiple Choice'),
    )
    
    form = models.ForeignKey(EvaluationForm, on_delete=models.CASCADE, related_name='questions')
    question_text = models.CharField(max_length=500)
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES, default='rating')
    options = models.JSONField(null=True, blank=True)  # For multiple choice questions
    required = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    
    class Meta:
        db_table = 'evaluation_questions'
        ordering = ['order']
        
    def __str__(self):
        return self.question_text

class EvaluationResponse(models.Model):
    form = models.ForeignKey(EvaluationForm, on_delete=models.CASCADE, related_name='responses')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='form_responses')
    answers = models.JSONField()
    submitted_at = models.DateTimeField(auto_now_add=True)
    points_awarded = models.PositiveIntegerField(default=10)
    
    class Meta:
        db_table = 'evaluation_responses'
        unique_together = ('form', 'user')
        
    def __str__(self):
        return f"Response from {self.user.email} for {self.form.video.title}"