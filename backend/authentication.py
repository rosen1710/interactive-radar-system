import os
import requests

KEYCLOAK_URL = os.getenv("KEYCLOAK_URL")
KEYCLOAK_REALM = os.getenv("KEYCLOAK_REALM")
KEYCLOAK_CLIENT_ID = os.getenv("KEYCLOAK_CLIENT_ID")
KEYCLOAK_CLIENT_SECRET = os.getenv("KEYCLOAK_CLIENT_SECRET")

while KEYCLOAK_URL[-1] == "/":
    KEYCLOAK_URL = KEYCLOAK_URL[0:-1]

def parse_token(token):
    return requests.post(f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/token/introspect", {"client_id": KEYCLOAK_CLIENT_ID, "client_secret": KEYCLOAK_CLIENT_SECRET, "token": token}, verify=False).json()

def is_token_active(parsed_token):
    return parsed_token["active"] == True

def is_admin_user_token(parsed_token):
    if is_token_active(parsed_token):
        try:
            return os.getenv("KEYCLOAK_ADMIN_USER_ROLE") in parsed_token["resource_access"][os.getenv("KEYCLOAK_ADMIN_USER_RESOURCE")]["roles"]
        except:
            pass
    return False

def get_user_id(parsed_token):
    return parsed_token["sub"]

def get_user_fullname(parsed_token):
    return parsed_token["name"]