from django.urls import path, include
from .views import VideoEmotionSet
from rest_framework.routers import DefaultRouter
router = DefaultRouter()
router.register(r'videoemotion', VideoEmotionSet, basename='videoemotion')
urlpatterns = [
    path('inference/', include(router.urls)),
]