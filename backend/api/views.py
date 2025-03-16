from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from firebase_admin import auth
from django.contrib.auth import login
from .models import ViewerProfile, User
from .serializers import OnboardingSerializer
from django.http import HttpResponseRedirect

class TestAuthView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        return Response({
            "success": True,
            "message": "Authentication successful!",
            "user": {
                "id": request.user.id,
                "username": request.user.username,
                "email": request.user.email
            }
        })

class OnboardingAPIView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        viewer_profile, created = ViewerProfile.objects.get_or_create(user=request.user)
        
        serializer = OnboardingSerializer(viewer_profile, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.validated_data['onboarding_completed'] = True
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SetFirebaseTokenView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        # Show a simple form to submit a token
        return Response({
            "message": "Please POST your Firebase token to authenticate with the API browser"
        })
    
    def post(self, request):
        token = request.data.get('token')
        
        if not token:
            return Response({"error": "Token is required"}, status=400)
        
        try:
            # Verify the Firebase token
            decoded_token = auth.verify_id_token(token)
            uid = decoded_token["uid"]
            
            # Get the corresponding Django user
            try:
                user = User.objects.get(firebase_uid=uid)
                
                # Log the user in for the DRF session
                login(request, user)
                
                return Response({
                    "success": True,
                    "message": "Authenticated successfully. You can now use the API browser.",
                })
            except User.DoesNotExist:
                return Response({"error": "User not found in Django database"}, status=404)
                
        except Exception as e:
            return Response({"error": f"Invalid token: {str(e)}"}, status=400)