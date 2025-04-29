from rest_framework import serializers
from .models import (
    ViewerProfile, User, Video, VideoView, VideoLike, VideoShare, WebcamRecording
)
from django.conf import settings
import os

class OnboardingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ViewerProfile
        fields = [
            "birthday",
            "gender",
            "country",
            "city",
            "education_level",
            "occupation",
            "content_preferences",
            "onboarding_completed", 
        ]
        read_only_fields = ['onboarding_completed']

class UserBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "role"]
        read_only_fields = fields 

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "role", "firebase_uid", "is_active", "date_joined"]
        read_only_fields = ["firebase_uid", "is_active", "date_joined"]

class AdminActionSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(required=True)
    admin_password = serializers.CharField(required=True, write_only=True)

class VideoSerializer(serializers.ModelSerializer):
    uploader = UserBasicSerializer(read_only=True)

    class Meta:
        model = Video
        fields = [
            "id",
            "title",
            "description",
            "category",
            "visibility",
            "video_url",
            "thumbnail_url",
            "upload_date",
            "uploader",
            "views",
            "likes",
            "duration",
            "view_limit",
            "auto_private_after",
        ]
        read_only_fields = [
            "id",
            "upload_date",
            "uploader",
            "video_url",
            "thumbnail_url",
            "views",
            "likes",
            "duration",
        ]

class VideoFeedSerializer(serializers.ModelSerializer):
    uploader = UserBasicSerializer(read_only=True)
    class Meta:
        model = Video
        fields = [
            "id",
            "title",
            "thumbnail_url",
            "upload_date",
            "uploader",
            "views",
            "likes",
            "duration",
        ]
        read_only_fields = fields

class VideoDetailSerializer(serializers.ModelSerializer):
    uploader = UserBasicSerializer(read_only=True)
    is_liked = serializers.SerializerMethodField()
    frontend_url = serializers.SerializerMethodField()

    class Meta:
        model = Video
        fields = [
            "id",
            "title",
            "description",
            "category",
            "visibility",
            "video_url",
            "thumbnail_url",
            "upload_date",
            "uploader",
            "views",
            "likes",
            "duration",
            "view_limit",
            "auto_private_after",
            "is_liked",
            "frontend_url",
        ]
        read_only_fields = fields
        
    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return VideoLike.objects.filter(video=obj, user=request.user).exists()
        return False
        
    def get_frontend_url(self, obj):
        frontend_url = self.context.get('frontend_url') or settings.FRONTEND_URL
        return f"{frontend_url}/video/{obj.id}"

class VideoViewSerializer(serializers.ModelSerializer):
    class Meta:
        model = VideoView
        fields = ['id', 'video', 'viewer', 'viewed_at']
        read_only_fields = ['viewed_at']

class VideoLikeSerializer(serializers.ModelSerializer):
    class Meta:
        model = VideoLike
        fields = ['id', 'video', 'user', 'liked_at']
        read_only_fields = ['liked_at']

class VideoShareSerializer(serializers.ModelSerializer):
    share_url = serializers.SerializerMethodField()
    
    class Meta:
        model = VideoShare
        fields = ['id', 'video', 'created_by', 'share_token', 'created_at', 'access_count', 'active', 'share_url']
        read_only_fields = ['created_at', 'access_count', 'share_token']
    
    def get_share_url(self, obj):
        frontend_url = self.context.get('frontend_url') or settings.FRONTEND_URL
        return f"{frontend_url}/video/{obj.share_token}"

class UserPointsSerializer(serializers.ModelSerializer):
    points_value = serializers.SerializerMethodField()
    conversion_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = ViewerProfile
        fields = ['points', 'points_earned', 'points_redeemed', 'points_value', 'conversion_rate']
        read_only_fields = fields
    
    def get_points_value(self, obj):
        return obj.calculate_points_value()
        
    def get_conversion_rate(self, obj):
        return 10

class WebcamRecordingSerializer(serializers.ModelSerializer):
    recorder = UserBasicSerializer(read_only=True)
    video = VideoFeedSerializer(read_only=True)
    
    class Meta:
        model = WebcamRecording
        fields = [
            'id',
            'video',
            'recorder',
            'filename',
            'recording_date',
            'upload_status',
            'upload_completed_at',
            'recording_url'
        ]
        read_only_fields = fields