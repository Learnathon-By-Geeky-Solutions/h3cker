from rest_framework import serializers
from .models import ViewerProfile, User, Video


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


class UserBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name"]

class FirebaseTokenSerializer(serializers.Serializer):
        token = serializers.CharField()

class VideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Video
        fields = ['id', 'title', 'description', 'category', 'visibility', 'video_url', 'thumbnail_url', 'upload_date', 'uploader']
        read_only_fields = ['id', 'upload_date', 'uploader']
