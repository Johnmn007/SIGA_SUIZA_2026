import urllib.request
import urllib.error
import json
import uuid

def print_step(msg):
    print(f"\n[{'*'*10}] {msg}")

def test_api():
    base_url = "http://localhost:8000"
    
    print_step("1. Checking Core Modules Status")
    try:
        req = urllib.request.urlopen(f"{base_url}/core/modules")
        data = json.loads(req.read())
        print(f"Total modules: {data.get('total')}")
        print(f"Healthy modules: {data.get('healthy')}")
        for m in data.get('modules', []):
            print(f" - {m['name']}: {m['status']}")
    except Exception as e:
        print(f"FAILED: {e}")

    print_step("2. Logging in as admin@siga.edu")
    token = None
    try:
        req = urllib.request.Request(
            f"{base_url}/auth/login?email=admin@siga.edu&password=admin123",
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        resp = urllib.request.urlopen(req)
        auth_data = json.loads(resp.read())
        token = auth_data.get("access_token")
        print(f"Successfully obtained token: {token[:10]}...")
    except urllib.error.HTTPError as e:
        print(f"FAILED LOGIN: HTTP {e.code} - {e.read().decode('utf-8')}")
        return

    test_email = f"test_{uuid.uuid4().hex[:6]}@siga.edu"
    print_step(f"3. Creating a test user ({test_email}) via mod-usuarios proxy")
    
    user_payload = {
        "email": test_email,
        "full_name": "Usuario de Prueba",
        "password": "testpassword123",
        "is_active": True,
        "is_superuser": False,
        "role_ids": []
    }
    
    try:
        req = urllib.request.Request(
            f"{base_url}/api/mod-usuarios/api/v1/usuarios",
            data=json.dumps(user_payload).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {token}'
            },
            method='POST'
        )
        resp = urllib.request.urlopen(req)
        user_response = json.loads(resp.read())
        print(f"User created successfully! ID: {user_response.get('id')}")
    except urllib.error.HTTPError as e:
        print(f"FAILED: HTTP {e.code} - {e.read().decode('utf-8')}")
        return
    except Exception as e:
        print(f"FAILED: {e}")
        return

test_api()
