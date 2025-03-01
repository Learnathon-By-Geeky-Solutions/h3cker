# api/views.py
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import (
    Role, CustomUser, Company, Payment, CoinTransaction, SurveyResponse, Video, Emotion, ShareLink, AnalyticsReport
)
from .serializers import (
    RoleSerializer, CustomUserSerializer, CompanySerializer, PaymentSerializer, CoinTransactionSerializer, 
    SurveyResponseSerializer, VideoSerializer, EmotionSerializer, ShareLinkSerializer, AnalyticsReportSerializer,
    VideoDetailSerializer, CompanyDetailSerializer, CustomUserDetailSerializer
)

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    # Removed permission_classes

class CustomUserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = CustomUserSerializer
    
    # Removed permission_classes
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CustomUserDetailSerializer
        return CustomUserSerializer

class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    
    # Removed permission_classes
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CompanyDetailSerializer
        return CompanySerializer

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    
    # Removed permission_classes
    def get_queryset(self):
        return Payment.objects.filter(user=self.request.user)

class CoinTransactionViewSet(viewsets.ModelViewSet):
    queryset = CoinTransaction.objects.all()
    serializer_class = CoinTransactionSerializer
    
    # Removed permission_classes
    def get_queryset(self):
        return CoinTransaction.objects.filter(user=self.request.user)

class SurveyResponseViewSet(viewsets.ModelViewSet):
    queryset = SurveyResponse.objects.all()
    serializer_class = SurveyResponseSerializer
    
    # Removed permission_classes
    def get_queryset(self):
        return SurveyResponse.objects.filter(user=self.request.user)

class VideoViewSet(viewsets.ModelViewSet):
    queryset = Video.objects.all()
    serializer_class = VideoSerializer
    
    # Removed permission_classes
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return VideoDetailSerializer
        return VideoSerializer
    
    @action(detail=True, methods=['post'])
    def generate_share_link(self, request, pk=None):
        # Add your share link generation logic here
        pass

class EmotionViewSet(viewsets.ModelViewSet):
    queryset = Emotion.objects.all()
    serializer_class = EmotionSerializer
    
    # Removed permission_classes
    def get_queryset(self):
        return Emotion.objects.filter(user=self.request.user)

class ShareLinkViewSet(viewsets.ModelViewSet):
    queryset = ShareLink.objects.all()
    serializer_class = ShareLinkSerializer
    
    # Removed permission_classes

class AnalyticsReportViewSet(viewsets.ModelViewSet):
    queryset = AnalyticsReport.objects.all()
    serializer_class = AnalyticsReportSerializer
    
    # Removed permission_classes
