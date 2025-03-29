from rest_framework import status
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from firebase_admin import auth
from django.contrib.auth import login
from .models import ViewerProfile, User
from .serializers import OnboardingSerializer, FirebaseTokenSerializer


class TestAuthView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        return Response({
            "success": True,
            "message": "Authentication successful!",
            
        })

class OnboardingAPIView(generics.UpdateAPIView):

    permission_classes = [IsAuthenticated]
    serializer_class = OnboardingSerializer

    def get_object(self):
        """Gets or creates the user's viewer profile."""
        viewer_profile, _ = ViewerProfile.objects.get_or_create(user=self.request.user)
        return viewer_profile

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.validated_data['onboarding_completed'] = True
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SetFirebaseTokenView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = FirebaseTokenSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        token = serializer.validated_data['token']
        try:
            decoded_token = auth.verify_id_token(token)
            uid = decoded_token["uid"]
            try:
                user = User.objects.get(firebase_uid=uid)
                login(request, user)
                return Response({
                    "success": True,
                    "message": "Authenticated successfully. You can now use the API browser.",
                })
            except User.DoesNotExist:
                return Response({"error": "User not found in Django database"}, status=404)
        except Exception as e:
            return Response({"error": f"Invalid token: {str(e)}"}, status=400)