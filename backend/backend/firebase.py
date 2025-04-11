import firebase_admin 
from firebase_admin import credentials
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if os.getenv("ENVIRONMENT") == 'PROD':
    cred_path = os.path.join("/etc/secrets/firebase-credentials-prod.json")
else:
    cred_path = os.path.join(BASE_DIR, "firebase-credentials.json")
cred = credentials.Certificate(cred_path)
default_app = firebase_admin.initialize_app(cred)