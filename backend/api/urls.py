from django.urls import path
from .views import TestAuthView, OnboardingAPIView, SetFirebaseTokenView

urlpatterns = [
    path('auth-test/', TestAuthView.as_view(), name='auth-test'),
    path('onboarding/', OnboardingAPIView.as_view(), name='onboarding'),
    path('set-token/', SetFirebaseTokenView.as_view(), name='set-token'),
    # ...other URLs
]