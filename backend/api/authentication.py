from rest_framework import authentication
from rest_framework import exceptions
from firebase_admin import auth, firestore
from .models import User  # Import custom User model

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
                user = User.objects.get(firebase_uid=uid)
            except User.DoesNotExist:
                # Fetch additional user data from Firestore
                user_ref = db.collection('users').document(uid)
                user_doc = user_ref.get()
                
                if user_doc.exists:
                    user_data = user_doc.to_dict()
                    first_name = user_data.get('firstName', '')
                    last_name = user_data.get('lastName', '')
                    email = user_data.get('email', '')
                    role = user_data.get('role', 'user')  # Default to regular user
                else:
                    # Fallback to Firebase Auth data
                    firebase_user = auth.get_user(uid)
                    first_name = ''
                    last_name = ''
                    email = firebase_user.email or f"{uid}@example.com"
                    role = 'user'  # Default role
                
                # Create user in our database
                user = User.objects.create_user(
                    firebase_uid=uid,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    role=role
                )
                
                # Create relevant profile based on role
                if role == 'company':
                    from .models import CompanyProfile
                    CompanyProfile.objects.create(user=user)
                elif role == 'user':
                    from .models import ViewerProfile
                    ViewerProfile.objects.create(user=user)
                
            return (user, None)
        except Exception as e:
            raise exceptions.AuthenticationFailed(f'Invalid token: {str(e)}')