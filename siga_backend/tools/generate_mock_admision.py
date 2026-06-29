import json
import random

# Datos para generacion aleatoria
nombres_masculinos = ["Carlos", "Luis", "Juan", "Pedro", "Miguel", "Jorge", "Victor", "Manuel", "Raul", "Diego", "Fernando", "Ricardo", "Eduardo", "Jose", "Alberto"]
nombres_femeninos = ["Ana", "Maria", "Sofia", "Lucia", "Elena", "Carmen", "Rosa", "Marta", "Laura", "Isabel", "Patricia", "Andrea", "Diana", "Sandra", "Silvia"]
apellidos = ["Gomez", "Perez", "Rojas", "Silva", "Vargas", "Mamani", "Quispe", "Ticona", "Flores", "Sanchez", "Garcia", "Rodriguez", "Fernandez", "Lopez", "Martinez", "Gonzalez", "Cruz", "Ramirez", "Torres", "Ruiz"]

programas = range(1, 12) # 11 programas
estudiantes_por_programa = 10

proceso = "ADM-2026-I"
admitidos = []
dni_base = 70000000

for programa_id in programas:
    for i in range(estudiantes_por_programa):
        es_masculino = random.choice([True, False])
        nombre_1 = random.choice(nombres_masculinos if es_masculino else nombres_femeninos)
        nombre_2 = random.choice(nombres_masculinos if es_masculino else nombres_femeninos)
        apellido_1 = random.choice(apellidos)
        apellido_2 = random.choice(apellidos)
        
        dni = str(dni_base)
        dni_base += 1
        
        puntaje = round(random.uniform(13.0, 20.0), 1)
        
        admitido = {
            "dni": dni,
            "codigo_postulante": f"POST-{programa_id:02d}-{i+1:03d}",
            "nombres": f"{nombre_1} {nombre_2}",
            "apellidos": f"{apellido_1} {apellido_2}",
            "puntaje": puntaje,
            "puesto": i + 1,
            "programa_id": programa_id,
            "periodo_id": 1,
            "celular": f"9{random.randint(10000000, 99999999)}",
            "email_personal": f"{nombre_1.lower()}.{apellido_1.lower()}{dni[-3:]}@email.com"
        }
        admitidos.append(admitido)

payload = {
    "proceso_admision_id": proceso,
    "admitidos": admitidos
}

with open("D:/SIGA/docs/mock_admision.json", "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False, indent=2)

print(f"Generados {len(admitidos)} admitidos en D:/SIGA/docs/mock_admision.json")
