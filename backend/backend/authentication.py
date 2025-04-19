import logging
from rest_framework import authentication, exceptions
from firebase_admin import auth, firestore
from api.models import User

# It's generally better to get the logger instance
logger = logging.getLogger(__name__)

db = firestore.client()

class FirebaseAuthentication(authentication.BaseAuthentication):
    """
    Authenticates requests using Firebase Authentication ID tokens.
    If the user doesn't exist locally, it attempts to create one
    based on data from Firestore or Firebase Auth.
    """

    def authenticate(self, request):
        """
        Main authentication method called by DRF.
        """
        id_token = self._extract_token(request)
        if not id_token:
            return None # No token provided, authentication not attempted

        try:
            decoded_token = self._verify_firebase_token(id_token)
            uid = decoded_token["uid"]
            user = self._get_or_create_user(uid, decoded_token)
            return (user, None) # Successful authentication
        except exceptions.AuthenticationFailed:
            # Let AuthenticationFailed exceptions propagate
            raise
        except Exception as e:
            # Catch other potential errors during user get/create
            logger.error(f"Unexpected error during authentication for token: {e}", exc_info=True)
            raise exceptions.AuthenticationFailed(f'Authentication error: {str(e)}')

    def _extract_token(self, request):

        auth_header = request.META.get("HTTP_AUTHORIZATION")
        if not auth_header:
            return None

        token_parts = auth_header.split()
        if len(token_parts) != 2 or token_parts[0].lower() != "bearer":
            logger.warning("Invalid Authorization header format.")
            return None # Invalid format

        return token_parts[1]

    def _verify_firebase_token(self, id_token):

        try:
            # Verify token using Firebase Admin SDK
            return auth.verify_id_token(id_token)
        except Exception as e:
            logger.warning(f"Firebase token verification failed: {e}")
            raise exceptions.AuthenticationFailed(f'Invalid Firebase token: {str(e)}')

    def _get_or_create_user(self, uid, decoded_token):

        try:
            # Try to get the user from the local database
            user = User.objects.get(firebase_uid=uid)
            return user
        except User.DoesNotExist:
            # User not found locally, proceed to create
            logger.info(f"User with firebase_uid {uid} not found locally. Attempting creation.")
            user_details = self._fetch_user_details(uid, decoded_token)
            return self._create_user_with_profile(uid, user_details)

    def _fetch_user_details(self, uid, decoded_token):

        # Try Firestore first
        firestore_data = self._fetch_from_firestore(uid)
        if firestore_data:
            return firestore_data

        # Fallback to Firebase Auth
        logger.info(f"No Firestore data for uid {uid}. Falling back to Firebase Auth.")
        return self._fetch_from_firebase_auth(uid, decoded_token)

    def _fetch_from_firestore(self, uid):

        try:
            user_ref = db.collection('users').document(uid)
            user_doc = user_ref.get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                return {
                    'first_name': user_data.get('firstName', ''),
                    'last_name': user_data.get('lastName', ''),
                    'email': user_data.get('email', ''), # Ensure email is present
                    'role': user_data.get('role', 'user') # Default role
                }
        except Exception as e:
            logger.error(f"Error fetching user data from Firestore for uid {uid}: {e}", exc_info=True)
        return None

    def _fetch_from_firebase_auth(self, uid, decoded_token):

        try:
            # Use email from token if possible, otherwise query Firebase Auth user record
            email = decoded_token.get('email')
            if not email:
                firebase_user = auth.get_user(uid)
                email = firebase_user.email

            # Ensure a valid email exists, generate placeholder if needed
            if not email:
                 logger.warning(f"No email found for uid {uid} in token or Firebase Auth. Using placeholder.")
                 email = f"{uid}@example.com" # Placeholder email

            return {
                'first_name': '', # Firebase Auth doesn't reliably store names here
                'last_name': '',
                'email': email,
                'role': 'user' # Default role for fallback
            }
        except auth.UserNotFoundError:
             logger.error(f"User with uid {uid} not found in Firebase Auth.")
             raise exceptions.AuthenticationFailed("User associated with token not found.")
        except Exception as e:
            logger.error(f"Error fetching user data from Firebase Auth for uid {uid}: {e}", exc_info=True)
            raise exceptions.AuthenticationFailed("Could not retrieve user authentication details.")


    def _create_user_with_profile(self, uid, user_details):

        if not user_details.get('email'):
             logger.error(f"Cannot create user with uid {uid}: email is missing.")
             raise exceptions.AuthenticationFailed("Cannot create user without an email address.")

        try:
            user = User.objects.create_user(
                firebase_uid=uid,
                email=user_details['email'],
                first_name=user_details['first_name'],
                last_name=user_details['last_name'],
                role=user_details['role']
            )
            logger.info(f"Successfully created local user for uid {uid} with role {user_details['role']}.")
            self._create_profile(user, user_details['role'])
            return user
        except Exception as e:
            # Catch potential database errors during user creation
            logger.error(f"Database error creating user for uid {uid}: {e}", exc_info=True)
            # Check if user was created despite error (e.g., race condition)
            try:
                return User.objects.get(firebase_uid=uid)
            except User.DoesNotExist:
                 raise exceptions.AuthenticationFailed("Failed to create local user record.")


    def _create_profile(self, user, role):

        try:
            if role == 'company':
                from api.models import CompanyProfile
                CompanyProfile.objects.get_or_create(user=user)
                logger.info(f"Ensured CompanyProfile exists for user {user.email}.")
            elif role == 'user':
                from api.models import ViewerProfile
                ViewerProfile.objects.get_or_create(user=user)
                logger.info(f"Ensured ViewerProfile exists for user {user.email}.")
            else:
                 logger.warning(f"Unknown role '{role}' for user {user.email}. No specific profile created.")
        except Exception as e:
             logger.error(f"Error creating profile for user {user.email} with role {role}: {e}", exc_info=True)
             # Decide if this should fail authentication or just log
             # raise exceptions.AuthenticationFailed("Failed to create user profile.")
