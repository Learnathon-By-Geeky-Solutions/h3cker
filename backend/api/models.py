from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone

class CustomUserManager(BaseUserManager):
    def create_user(self, email, firebase_uid, password=None, **extra_fields):
        if not email:
            raise ValueError('Users must have an email address')
        email = self.normalize_email(email)
        user = self.model(email=email, firebase_uid=firebase_uid, **extra_fields)
        if password:
            user.set_password(password)  # Mostly for admin interface
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, firebase_uid, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', 'admin')
        return self.create_user(email, firebase_uid, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('company', 'Company'),
        ('user', 'User'),
    )
    
    firebase_uid = models.CharField(max_length=128, unique=True)
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    first_name = models.CharField(max_length=30, blank=True)
    last_name = models.CharField(max_length=30, blank=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='user')
    date_joined = models.DateTimeField(default=timezone.now)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)  # For Django admin access
    
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
        return f"{self.first_name} {self.last_name}"

class CompanyProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='company_profile')
    company_name = models.CharField(max_length=100)
    company_address = models.TextField(blank=True)
    industry = models.CharField(max_length=50, blank=True)
    
    class Meta:
        db_table = 'company_profiles'
    
    def __str__(self):
        return self.company_name

class ViewerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='viewer_profile')
    onboarding_completed = models.BooleanField(default=False)
    preferences = models.JSONField(default=dict, blank=True)
    birthday = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=50, blank=True)
    country = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    education_level = models.CharField(max_length=100, blank=True)
    occupation = models.CharField(max_length=100, blank=True)
    content_preferences = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'viewer_profiles'
    
    def __str__(self):
        return f"{self.user.email}'s profile"

class Video(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=100, blank=True)
    visibility = models.CharField(max_length=20, default='private')
    video_url = models.URLField()
    thumbnail_url = models.URLField(blank=True)
    upload_date = models.DateTimeField(auto_now_add=True)
    uploader = models.ForeignKey(User, on_delete=models.CASCADE, related_name='videos')
    class Meta:
        db_table = 'videos'
    def __str__(self):
        return self.title
