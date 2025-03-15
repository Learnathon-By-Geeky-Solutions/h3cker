import firebase_admin 
from firebase_admin import credentials
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
cred_path = os.path.join(BASE_DIR, "firebase-credentials.json")
print(cred_path)
cred = credentials.Certificate(cred_path)
default_app = firebase_admin.initialize_app(cred)