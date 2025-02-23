from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RoleViewSet, CustomUserViewSet, CompanyViewSet,
    PaymentViewSet, CoinTransactionViewSet, SurveyResponseViewSet,
    VideoViewSet, EmotionViewSet, ShareLinkViewSet, AnalyticsReportViewSet
)

router = DefaultRouter()
router.register('roles', RoleViewSet, basename='role')
router.register('users', CustomUserViewSet, basename='user')
router.register('companies', CompanyViewSet, basename='company')
router.register('payments', PaymentViewSet, basename='payment')
router.register('coin-transactions', CoinTransactionViewSet, basename='coin-transaction')
router.register('survey-responses', SurveyResponseViewSet, basename='survey-response')
router.register('videos', VideoViewSet, basename='video')
router.register('emotions', EmotionViewSet, basename='emotion')
router.register('share-links', ShareLinkViewSet, basename='share-link')
router.register('analytics', AnalyticsReportViewSet, basename='analytics')

urlpatterns = router.urls