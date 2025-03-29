from rest_framework import serializers
from .models import ViewerProfile, User


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
    """Minimal serializer for Firebase token input."""
    token = serializers.CharField()