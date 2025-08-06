import firebase_admin
from firebase_admin import credentials, firestore
import os
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def initialize_firebase():
    if not firebase_admin._apps:
        # Check if service account key file exists
        service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY')
        
        if service_account_path and os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)
        else:
            # Try environment variables for configuration
            private_key = os.getenv('FIREBASE_PRIVATE_KEY', '').replace('\\n', '\n').strip()
            project_id = os.getenv('FIREBASE_PROJECT_ID')
            client_email = os.getenv('FIREBASE_CLIENT_EMAIL')
            
            if private_key and project_id and client_email:
                # Validate private key format
                if not private_key.startswith('-----BEGIN PRIVATE KEY-----'):
                    raise ValueError("Invalid private key format. Must start with '-----BEGIN PRIVATE KEY-----'")
                if not private_key.endswith('-----END PRIVATE KEY-----'):
                    raise ValueError("Invalid private key format. Must end with '-----END PRIVATE KEY-----'")
                
                firebase_config = {
                    "type": "service_account",
                    "project_id": project_id,
                    "private_key_id": os.getenv('FIREBASE_PRIVATE_KEY_ID'),
                    "private_key": private_key,
                    "client_email": client_email,
                    "client_id": os.getenv('FIREBASE_CLIENT_ID'),
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                    "client_x509_cert_url": os.getenv('FIREBASE_CLIENT_X509_CERT_URL')
                }
                cred = credentials.Certificate(firebase_config)
                firebase_admin.initialize_app(cred)
            else:
                # Try Application Default Credentials as fallback
                try:
                    cred = credentials.ApplicationDefault()
                    firebase_admin.initialize_app(cred)
                except Exception as e:
                    raise ValueError(f"No valid authentication method found. Please set Firebase credentials in .env file or run 'gcloud auth application-default login'. Error: {e}")
    
    return firestore.client()

def get_firestore_client():
    return initialize_firebase()