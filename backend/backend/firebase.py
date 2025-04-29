import firebase_admin
from firebase_admin import credentials
from django.conf import settings


try:

    cred_dict = {
        "type": settings.FIREBASE_TYPE,
        "project_id": settings.FIREBASE_PROJECT_ID,
        "private_key_id": settings.FIREBASE_PRIVATE_KEY_ID,
        "private_key": settings.FIREBASE_PRIVATE_KEY,
        "client_email": settings.FIREBASE_CLIENT_EMAIL,
        "client_id": settings.FIREBASE_CLIENT_ID,
        "auth_uri": settings.FIREBASE_AUTH_URI,
        "token_uri": settings.FIREBASE_TOKEN_URI,
        "auth_provider_x509_cert_url": settings.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
        "client_x509_cert_url": settings.FIREBASE_CLIENT_X509_CERT_URL,
        "universe_domain": settings.FIREBASE_UNIVERSE_DOMAIN,
    }

    if not all(
        [
            settings.FIREBASE_TYPE,
            settings.FIREBASE_PROJECT_ID,
            settings.FIREBASE_PRIVATE_KEY,
            settings.FIREBASE_CLIENT_EMAIL,
        ]
    ):
        raise ValueError("Missing essential Firebase credential settings.")

    cred = credentials.Certificate(cred_dict)
    default_app = firebase_admin.initialize_app(cred)

except ValueError as e:
    print(f"Error initializing Firebase Admin SDK: {e}")

    default_app = None  # Indicate initialization failed
except Exception as e:
    print(f"An unexpected error occurred during Firebase initialization: {e}")
    default_app = None
