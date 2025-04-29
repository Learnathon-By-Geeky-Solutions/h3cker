import logging
from rest_framework import authentication
from rest_framework import exceptions
from firebase_admin import auth, firestore
from api.models import User

logger = logging.getLogger(__name__)
db = firestore.client()

class FirebaseAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        token = self._extract_token(request)
        if not token:
            return None
        
        try:
            firebase_uid = self._verify_token(token)
            user = self._get_or_create_user(firebase_uid)
            return (user, None)
        except Exception as e:
            logger.error(f"Authentication failed due to an exception:{str(e)}", exc_info=True)
            raise exceptions.AuthenticationFailed("Invalid token.")
    
    def _extract_token(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION")
        if not auth_header:
            return None
            
        token_parts = auth_header.split()
        if len(token_parts) != 2 or token_parts[0].lower() != "bearer":
            return None
            
        return token_parts[1]
    
    def _verify_token(self, token):
        decoded_token = auth.verify_id_token(token)
        return decoded_token["uid"]
    
    def _get_user_data(self, uid):

        user_ref = db.collection('users').document(uid)
        user_doc = user_ref.get()
        
        if user_doc.exists:
            user_data = user_doc.to_dict()
            return {
                'first_name': user_data.get('firstName', ''),
                'last_name': user_data.get('lastName', ''),
                'email': user_data.get('email', ''),
                'role': user_data.get('role', 'user')
            }
        firebase_user = auth.get_user(uid)
        return {
            'first_name': '',
            'last_name': '',
            'email': firebase_user.email,
            'role': 'user'
        }
    
    def _create_user_profile(self, user, role):
        if role == 'company':
            from api.models import CompanyProfile
            CompanyProfile.objects.create(user=user)
        elif role == 'user':
            from api.models import ViewerProfile
            ViewerProfile.objects.create(user=user)
    
    def _get_or_create_user(self, firebase_uid):
        try:
            return User.objects.get(firebase_uid=firebase_uid)
        except User.DoesNotExist:
            user_data = self._get_user_data(firebase_uid)

            existing_user = User.objects.filter(email=user_data['email']).first()
            if existing_user:
                existing_user.firebase_uid = firebase_uid
                existing_user.save(update_fields=['firebase_uid'])
                return existing_user
            user = User.objects.create_user(
                firebase_uid=firebase_uid,
                email=user_data['email'],
                first_name=user_data['first_name'],
                last_name=user_data['last_name'],
                role=user_data['role']
            )
            self._create_user_profile(user, user_data['role'])
            return user
