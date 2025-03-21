from rest_framework import serializers
from .models import ViewerProfile

class OnboardingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ViewerProfile
        fields = [
            'birthday', 
            'gender', 
            'country', 
            'city', 
            'education_level', 
            'occupation', 
            'content_preferences',
            'onboarding_completed'
        ]
