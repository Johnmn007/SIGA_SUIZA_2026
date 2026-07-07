import requests
import json

# 1. Login
res = requests.post("http://localhost:8000/auth/login?email=admin@siga.edu&password=admin123")
if res.status_code != 200:
    print("Login failed:", res.text)
    exit(1)
token = res.json()["access_token"]

# 2. Get students without filter
headers = {"Authorization": f"Bearer {token}"}
res1 = requests.get("http://localhost:8000/api/mod-gestion-academica/estudiantes/", headers=headers)
print("All:", len(res1.json()))

# 3. Get students with filter
res2 = requests.get("http://localhost:8000/api/mod-gestion-academica/estudiantes/?programa_id=1", headers=headers)
print("Filtered 1:", len(res2.json()))

res3 = requests.get("http://localhost:8000/api/mod-gestion-academica/estudiantes/?programa_id=2", headers=headers)
print("Filtered 2:", len(res3.json()))
