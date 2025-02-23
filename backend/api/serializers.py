from rest_framework import serializers
from .models import (
    Role, CustomUser, Company, Payment, CoinTransaction,
    SurveyResponse, Video, Emotion, ShareLink, AnalyticsReport
)

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'

class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'role', 'name', 
                 'onboarding_completed', 'profile_picture', 
                 'created_at', 'updated_at']

class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = '__all__'

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'

class CoinTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoinTransaction
        fields = '__all__'

class SurveyResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = SurveyResponse
        fields = '__all__'

class VideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Video
        fields = '__all__'

class EmotionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Emotion
        fields = '__all__'

class ShareLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShareLink
        fields = '__all__'

class AnalyticsReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyticsReport
        fields = '__all__'

# Nested serializers for detailed views
class VideoDetailSerializer(serializers.ModelSerializer):
    emotions = EmotionSerializer(many=True, read_only=True, source='emotion_set')
    share_links = ShareLinkSerializer(many=True, read_only=True, source='sharelink_set')
    analytics = AnalyticsReportSerializer(many=True, read_only=True, source='analyticsreport_set')
    
    class Meta:
        model = Video
        fields = '__all__'

class CompanyDetailSerializer(serializers.ModelSerializer):
    videos = VideoSerializer(many=True, read_only=True, source='video_set')
    
    class Meta:
        model = Company
        fields = '__all__'

class CustomUserDetailSerializer(serializers.ModelSerializer):
    company = CompanySerializer(read_only=True)
    payments = PaymentSerializer(many=True, read_only=True, source='payment_set')
    coin_transactions = CoinTransactionSerializer(many=True, read_only=True, source='cointransaction_set')
    survey_responses = SurveyResponseSerializer(many=True, read_only=True, source='surveyresponse_set')
    
    class Meta:
        model = CustomUser
        fields = '__all__'