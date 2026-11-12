import psycopg2
import bcrypt

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    user='postgres',
    password='admin123',
    database='siga_local'
)
conn.autocommit = True
cur = conn.cursor()

# Nombres reales inventados por programa
programas_data = [
    (1, 'ENF', 'Enfermería Técnica', {
        'jefe': 'Dra. Carmen Ríos Paredes',
        'secretaria': 'Lic. María Fernanda Salazar',
        'docente': 'Enf. Carlos Eduardo Mendoza'
    }),
    (2, 'CON', 'Contabilidad', {
        'jefe': 'C.P. Roberto Sánchez Vásquez',
        'secretaria': 'Lic. Patricia Lorena Gutiérrez',
        'docente': 'C.P. Andrés Felipe Rojas'
    }),
    (3, 'MET', 'Mecatrónica Automotriz', {
        'jefe': 'Ing. José Alejandro Torres',
        'secretaria': 'Téc. Daniela Alejandra Vargas',
        'docente': 'Ing. Miguel Ángel Herrera'
    }),
    (4, 'GAS-ADM', 'Gestión Administrativa', {
        'jefe': 'Mg. Sandra Milena Espinoza',
        'secretaria': 'Lic. Claudia Patricia Morales',
        'docente': 'Mg. Ricardo Javier Paredes'
    }),
    (5, 'PRO-AG', 'Producción Agropecuaria', {
        'jefe': 'Ing. Agr. Fernando David Castillo',
        'secretaria': 'Téc. Andrea Nicole Jiménez',
        'docente': 'Ing. Agr. Luis Alberto Medina'
    }),
    (6, 'CON-CIV', 'Construcción Civil', {
        'jefe': 'Ing. Civil Víctor Manuel Ortega',
        'secretaria': 'Lic. Gabriela Soledad Ruiz',
        'docente': 'Ing. Civil Óscar Eduardo León'
    }),
    (7, 'DSI', 'Desarrollo de Sistemas de Información', {
        'jefe': 'Dr. Ing. Diego Armando Navarro',
        'secretaria': 'Lic. Sofía Alejandra Herrera',
        'docente': 'Ing. Juan Carlos Delgado'
    }),
    (8, 'ELT', 'Electricidad Industrial', {
        'jefe': 'Ing. Eléc. Ricardo Antonio Flores',
        'secretaria': 'Téc. Valeria Estefanía Cortés',
        'docente': 'Ing. Eléc. Pablo Sebastián Aquino'
    }),
    (9, 'AOT', 'Administración de Operaciones Turísticas', {
        'jefe': 'Mg. Carolina Isabel Domínguez',
        'secretaria': 'Lic. Natalia Andrea Mendoza',
        'docente': 'Mg. Fernando José Vega'
    }),
    (10, 'MAN-FOR', 'Manejo Forestal', {
        'jefe': 'Ing. Forestal Adolfo Martín Quiroga',
        'secretaria': 'Téc. Camila Beatriz Suárez',
        'docente': 'Ing. Forestal Hernán Darío Ibarra'
    }),
    (11, 'ASI-ADM', 'Asistencia Administrativa', {
        'jefe': 'Mg. Patricia Elena Guzmán',
        'secretaria': 'Lic. Alejandra Noemí Bravo',
        'docente': 'Mg. Sergio Alejandro Cabrera'
    })
]

# Roles
cur.execute("SELECT id, name FROM core_roles WHERE name IN ('coordinador_programa', 'docente', 'secretaria_programa');")
roles = {name: id for id, name in cur.fetchall()}

# Verificar usuarios existentes
cur.execute("SELECT email FROM core_users WHERE email LIKE '%@siga.edu'")
existing = {r[0] for r in cur.fetchall()}

for prog_id, codigo, nombre, nombres in programas_data:
    base = f"{codigo.lower()}"
    
    # 1. JEFE DE AREA
    email_jefe = f"jefe.{base}@siga.edu"
    if email_jefe in existing:
        print(f"Saltando {email_jefe} (ya existe)")
        continue
    
    pass_jefe = f"jefe.{base}123"
    hashed = bcrypt.hashpw(pass_jefe.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    cur.execute("""
        INSERT INTO core_users (email, full_name, hashed_password, is_active, is_superuser)
        VALUES (%s, %s, %s, true, false)
        RETURNING id
    """, (email_jefe, nombres['jefe'], hashed))
    jefe_id = cur.fetchone()[0]
    
    cur.execute("INSERT INTO core_user_roles (user_id, role_id) VALUES (%s, %s)", (jefe_id, roles['coordinador_programa']))
    cur.execute("INSERT INTO core_user_roles (user_id, role_id) VALUES (%s, %s)", (jefe_id, roles['docente']))
    
    cur.execute("""
        INSERT INTO perfiles_personal (user_id, condicion_laboral, cargo_funcional, profesion_titulo, programa_estudio_id)
        VALUES (%s, 'NOMBRADO_ESTADO', 'JEFE_AREA', %s, %s)
    """, (jefe_id, f'Magister en {nombre}', prog_id))
    
    # 2. SECRETARIA DE PROGRAMA
    email_sec = f"secretaria.{base}@siga.edu"
    if email_sec in existing:
        print(f"Saltando {email_sec} (ya existe)")
        continue
    
    pass_sec = f"secretaria.{base}123"
    hashed = bcrypt.hashpw(pass_sec.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    cur.execute("""
        INSERT INTO core_users (email, full_name, hashed_password, is_active, is_superuser)
        VALUES (%s, %s, %s, true, false)
        RETURNING id
    """, (email_sec, nombres['secretaria'], hashed))
    sec_id = cur.fetchone()[0]
    
    cur.execute("INSERT INTO core_user_roles (user_id, role_id) VALUES (%s, %s)", (sec_id, roles['secretaria_programa']))
    
    cur.execute("""
        INSERT INTO perfiles_personal (user_id, condicion_laboral, cargo_funcional, profesion_titulo, programa_estudio_id)
        VALUES (%s, 'NOMBRADO_ESTADO', 'SECRETARIA_PROGRAMA', 'Tecnico en Administracion', %s)
    """, (sec_id, prog_id))
    
    # 3. DOCENTE
    email_doc = f"docente.{base}@siga.edu"
    if email_doc in existing:
        print(f"Saltando {email_doc} (ya existe)")
        continue
    
    pass_doc = f"docente.{base}123"
    hashed = bcrypt.hashpw(pass_doc.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    cur.execute("""
        INSERT INTO core_users (email, full_name, hashed_password, is_active, is_superuser)
        VALUES (%s, %s, %s, true, false)
        RETURNING id
    """, (email_doc, nombres['docente'], hashed))
    doc_id = cur.fetchone()[0]
    
    cur.execute("INSERT INTO core_user_roles (user_id, role_id) VALUES (%s, %s)", (doc_id, roles['docente']))
    
    cur.execute("""
        INSERT INTO perfiles_personal (user_id, condicion_laboral, cargo_funcional, profesion_titulo, programa_estudio_id)
        VALUES (%s, 'CONTRATADO_INSTITUCIONAL', 'DOCENTE_AULA', %s, %s)
    """, (doc_id, f'Licenciado en {nombre}', prog_id))

print("Usuarios creados exitosamente con nombres reales")

cur.close()
conn.close()