import re

with open('docker-compose.yml', 'r') as f:
    content = f.read()

services = ['siga-core', 'mod-usuarios', 'mod-planes-estudio', 'mod-programas-estudio', 'mod-gestion-academica', 'mod-auditoria', 'mod-evaluacion']

for svc in services:
    pattern = rf'(\s+{svc}:.*?environment:.*?NATS_URL=nats://nats:4222.*?)(?:(\s+- PORT=\d+))?(\n\s+depends_on:)'
    replacement = r'\1\2\n    volumes:\n      - ./siga_backend:/app\3'
    
    # Check if the regex works, sometimes it's simpler to just do a string replace on depends_on
    pass

# A simpler way to inject volumes is right before "depends_on:" but only for backend services.
# Let's use a simpler regex that looks for the 'environment' block and injects 'volumes' right before 'depends_on:'
lines = content.split('\n')
new_lines = []
for i, line in enumerate(lines):
    if line.strip() == 'depends_on:' and 'postgres:' in lines[i+1]:
        # check if it's a backend service (not sure, let's just check the previous lines)
        if any('context: ./siga_backend' in l for l in lines[max(0, i-25):i]):
            new_lines.append('    volumes:')
            new_lines.append('      - ./siga_backend:/app')
    new_lines.append(line)

with open('docker-compose.yml', 'w') as f:
    f.write('\n'.join(new_lines))

print('Updated docker-compose.yml successfully')
