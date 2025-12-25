#!/usr/bin/env python3
"""
DIAGNÓSTICO DE PROBLEMAS ESPECÍFICOS
"""
import requests
import json

def diagnose_gateway():
    print("🔍 DIAGNOSTICANDO GATEWAY HTTP...")
    
    # Probar diferentes endpoints del gateway
    test_urls = [
        "http://localhost:8000/api/modulo-inexistente/test",
        "http://localhost:8000/api/test/modulo",
        "http://localhost:8000/api/demo/health"
    ]
    
    for url in test_urls:
        try:
            response = requests.get(url, timeout=10)
            print(f"   {url} -> Status: {response.status_code}")
            if response.status_code != 404:
                print(f"      Headers: {dict(response.headers)}")
                try:
                    print(f"      Body: {response.json()}")
                except:
                    print(f"      Body: {response.text[:100]}...")
        except Exception as e:
            print(f"   {url} -> ERROR: {e}")

def diagnose_auth():
    print("\n🔍 DIAGNOSTICANDO AUTENTICACIÓN...")
    
    # Probar login con diferentes formatos
    test_data = [
        {"email": "usuario@test.com", "password": "pass"},
        {"username": "test", "password": "pass"},  # Formato alternativo
    ]
    
    for data in test_data:
        try:
            response = requests.post("http://localhost:8000/auth/login", json=data, timeout=10)
            print(f"   Data: {data}")
            print(f"   Status: {response.status_code}")
            if response.status_code != 401:
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text[:200]}...")
            print("   ---")
        except Exception as e:
            print(f"   ERROR: {e}")

def diagnose_docs():
    print("\n🔍 DIAGNOSTICANDO DOCUMENTACIÓN...")
    
    docs_urls = [
        "http://localhost:8000/docs",
        "http://localhost:8000/redoc", 
        "http://localhost:8000/openapi.json"
    ]
    
    for url in docs_urls:
        try:
            response = requests.get(url, timeout=10)
            print(f"   {url} -> Status: {response.status_code}")
        except Exception as e:
            print(f"   {url} -> ERROR: {e}")

if __name__ == "__main__":
    print("🩺 INICIANDO DIAGNÓSTICO DETALLADO...")
    print("=" * 50)
    
    diagnose_gateway()
    diagnose_auth() 
    diagnose_docs()
    
    print("\n💡 RECOMENDACIONES:")
    print("1. Gateway: Debería dar 404 para rutas inexistentes")
    print("2. Auth: 422 indica validación de datos, no es error grave")
    print("3. Docs: Puede estar deshabilitado en producción")