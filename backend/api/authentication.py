from rest_framework import authentication
from rest_framework import exceptions
from firebase_admin import auth
from django.contrib.auth.models import User

class FirebaseAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION")
        if not auth_header:
            return None
            
        # Check if token format is correct
        token_parts = auth_header.split()
        if len(token_parts) != 2 or token_parts[0].lower() != "bearer":
            return None
            
        id_token = token_parts[1]
        
        try:
            # Verify token
            decoded_token = auth.verify_id_token(id_token)
            uid = decoded_token["uid"]
            
            # Get or create user
            try:
                user = User.objects.get(username=uid)
            except User.DoesNotExist:
                # Create Django user from Firebase user info
                firebase_user = auth.get_user(uid)
                email = firebase_user.email or f"{uid}@firebase.com"
                user = User.objects.create_user(
                    username=uid,
                    email=email,
                    first_name=firebase_user.display_name or "",
                )
                
            return (user, None)
        except Exception as e:
            raise exceptions.AuthenticationFailed(f'Invalid token: {str(e)}')