import firebase_admin
from firebase_admin import credentials, auth
from rest_framework import authentication
from rest_framework import exceptions
from django.contrib.auth.models import User
from django.conf import settings
import os

# Initialize Firebase Admin using credentials file with the correct name
cred_path = os.path.join(settings.BASE_DIR, 'firebase-credentials.json')
cred = credentials.Certificate(cred_path)

# Initialize the app with a service account
try:
    firebase_app = firebase_admin.initialize_app(cred)
except ValueError:
    # App already initialized
    firebase_app = firebase_admin.get_app()

class FirebaseAuthentication(authentication.BaseAuthentication):
    """
    Firebase Authentication for Django REST Framework
    Clients should authenticate by passing the Firebase ID token in the
    Authorization header, prepended with the string "Bearer ".
    """
    def authenticate(self, request):
        # Get the auth header
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header:
            return None

        # Extract the token
        try:
            id_token = auth_header.split(' ').pop()
        except IndexError:
            raise exceptions.AuthenticationFailed('Invalid token format')

        try:
            # Verify the ID token with Firebase Admin SDK
            decoded_token = auth.verify_id_token(id_token)
            uid = decoded_token['uid']
            email = decoded_token.get('email', '')
            
            # Get or create the user
            try:
                user = User.objects.get(username=uid)
            except User.DoesNotExist:
                # Create a user with the uid as username
                user = User(
                    username=uid,
                    email=email,
                    is_active=True
                )
                user.save()
            
            # Return the user and token
            return (user, decoded_token)
        except auth.InvalidIdTokenError:
            raise exceptions.AuthenticationFailed('Invalid token')
        except Exception as e:
            raise exceptions.AuthenticationFailed(f'Authentication failed: {str(e)}')

    def authenticate_header(self, request):
        return 'Bearer'