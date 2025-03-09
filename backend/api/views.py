# api/views.py
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
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
    permission_classes = [IsAdminUser]  # Only admins can manage roles

class CustomUserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = CustomUserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CustomUserDetailSerializer
        return CustomUserSerializer
    
    def get_queryset(self):
        # Regular users can only see their own profile
        user = self.request.user
        if user.is_staff:
            return CustomUser.objects.all()
        return CustomUser.objects.filter(user=user)

class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CompanyDetailSerializer
        return CompanySerializer

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Users can only see their own payments
        return Payment.objects.filter(user=self.request.user)

class CoinTransactionViewSet(viewsets.ModelViewSet):
    queryset = CoinTransaction.objects.all()
    serializer_class = CoinTransactionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Users can only see their own transactions
        return CoinTransaction.objects.filter(user=self.request.user)

class SurveyResponseViewSet(viewsets.ModelViewSet):
    queryset = SurveyResponse.objects.all()
    serializer_class = SurveyResponseSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Users can only see their own survey responses
        return SurveyResponse.objects.filter(user=self.request.user)

class VideoViewSet(viewsets.ModelViewSet):
    queryset = Video.objects.all()
    serializer_class = VideoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return VideoDetailSerializer
        return VideoSerializer
    
    @action(detail=True, methods=['post'])
    def generate_share_link(self, request, pk=None):
        # Add your share link generation logic here
        # Create a ShareLink object
        # Return the link
        return Response({'message': 'Link generation endpoint'})

class EmotionViewSet(viewsets.ModelViewSet):
    queryset = Emotion.objects.all()
    serializer_class = EmotionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Users can only see their own emotions
        return Emotion.objects.filter(user=self.request.user)

class ShareLinkViewSet(viewsets.ModelViewSet):
    queryset = ShareLink.objects.all()
    serializer_class = ShareLinkSerializer
    permission_classes = [IsAuthenticated]
    
    # Public access for viewing share links
    def get_permissions(self):
        if self.action == 'retrieve':
            return [AllowAny()]
        return super().get_permissions()

class AnalyticsReportViewSet(viewsets.ModelViewSet):
    queryset = AnalyticsReport.objects.all()
    serializer_class = AnalyticsReportSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Regular users can only see their own reports
        user = self.request.user
        if user.is_staff:
            return AnalyticsReport.objects.all()
        return AnalyticsReport.objects.filter(user=user)