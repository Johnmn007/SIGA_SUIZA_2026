import requests
import json

base_url = "http://localhost:8000"

def test_login(email, password):
    print(f"\n--- Probando login para {email} ---")
    response = requests.post(f"{base_url}/auth/login", params={"email": email, "password": password})
    if response.status_code != 200:
        print(f"Login failed! {response.status_code}")
        print(response.text)
        return None
    
    user_data = response.json()["user"]
    print(f"Role: {user_data['role']}, Permissions: {user_data.get('permissions', [])}")
    token = response.json()["access_token"]
    print("Login OK. Token obetenido.")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Probar endpoint de programas
    prog_res = requests.get(f"{base_url}/api/mod-programas-estudio/programas", headers=headers)
    print(f"GET /programas -> {prog_res.status_code}")
    if prog_res.status_code != 200:
        print(prog_res.text)

test_login("coordinador@siga.edu", "coordinador123")
test_login("docente@siga.edu", "docente123")
test_login("admin@siga.edu", "admin123")
