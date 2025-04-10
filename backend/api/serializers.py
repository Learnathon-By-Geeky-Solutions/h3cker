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
        read_only_fields = ['onboarding_completed']

class UserBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "role"]
        read_only_fields = fields 

class FirebaseTokenSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)


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
            "video_url",        # ReadOnly - Set by backend after SAS generation
            "thumbnail_url",    # ReadOnly - Set by backend after SAS generation
            "upload_date",      # ReadOnly - Set automatically
            "uploader",         # ReadOnly - Set from request.user
            "views",            # ReadOnly - Updated separately
            "likes",            # ReadOnly - Updated separately
            "duration",         # ReadOnly - Should be set after processing
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
            "uploader", # Include nested uploader object (contains id)
            "views",
            "likes",
            "duration",
        ]
        read_only_fields = fields


class VideoDetailSerializer(serializers.ModelSerializer):
    uploader = UserBasicSerializer(read_only=True)

    class Meta:
        model = Video
        fields = [
            "id",
            "title",
            "description",
            "category",
            "visibility",
            "video_url",        # This should be the viewable URL (long-lived SAS)
            "thumbnail_url",
            "upload_date",
            "uploader",         # Include uploader details
            "views",
            "likes",
            "duration",
        ]
        read_only_fields = fields