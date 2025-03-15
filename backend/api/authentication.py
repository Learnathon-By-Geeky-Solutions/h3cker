from rest_framework import authentication
from rest_framework import exceptions
from firebase_admin import auth, firestore
from django.contrib.auth.models import User

db = firestore.client()

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
                # Fetch additional user data from Firestore
                user_ref = db.collection('users').document(uid)
                user_doc = user_ref.get()
                
                if user_doc.exists:
                    user_data = user_doc.to_dict()
                    first_name = user_data.get('firstName', '')
                    last_name = user_data.get('lastName', '')
                else:
                    first_name = ''
                    last_name = ''
                
                # Create Django user from Firebase and Firestore data
                firebase_user = auth.get_user(uid)
                email = firebase_user.email or f"{uid}@firebase.com"
                user = User.objects.create_user(
                    username=uid,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                )
                
            return (user, None)
        except Exception as e:
            raise exceptions.AuthenticationFailed(f'Invalid token: {str(e)}')