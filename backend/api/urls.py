from django.urls import path
from .views import TestAuthView

urlpatterns = [
    path('auth-test/', TestAuthView.as_view(), name='auth-test'),
    # ...other URLs
]