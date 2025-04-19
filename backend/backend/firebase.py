import firebase_admin
from firebase_admin import credentials
import os
from dotenv import load_dotenv
load_dotenv()

# Construct credentials dictionary from environment variables
try:
    # The private key often contains newlines; replace escaped newlines
    private_key = os.getenv("FIREBASE_PRIVATE_KEY", "").replace('\\n', '\n')

    cred_dict = {
        "type": os.getenv("FIREBASE_TYPE"),
        "project_id": os.getenv("FIREBASE_PROJECT_ID"),
        "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
        "private_key": private_key,
        "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
        "client_id": os.getenv("FIREBASE_CLIENT_ID"),
        "auth_uri": os.getenv("FIREBASE_AUTH_URI"),
        "token_uri": os.getenv("FIREBASE_TOKEN_URI"),
        "auth_provider_x509_cert_url": os.getenv("FIREBASE_AUTH_PROVIDER_X509_CERT_URL"),
        "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_X509_CERT_URL"),
    }

    # Add universe_domain only if the environment variable exists and is not empty
    universe_domain = os.getenv("FIREBASE_UNIVERSE_DOMAIN")
    if universe_domain:
        cred_dict["universe_domain"] = universe_domain

    # Check if essential keys are present
    if not all([cred_dict["type"], cred_dict["project_id"], cred_dict["private_key"], cred_dict["client_email"]]):
        raise ValueError("Missing essential Firebase credential environment variables.")

    cred = credentials.Certificate(cred_dict)
    default_app = firebase_admin.initialize_app(cred)

except ValueError as e:
    print(f"Error initializing Firebase Admin SDK: {e}")
    # Handle the error appropriately, maybe raise it or log it
    # Depending on your app's needs, you might want to prevent startup
    default_app = None # Indicate initialization failed
except Exception as e:
    print(f"An unexpected error occurred during Firebase initialization: {e}")
    default_app = None # Indicate initialization failed
