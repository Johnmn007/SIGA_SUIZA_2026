# Guía de contribución

## Flujo de ramas
- `main`: estable, solo recibe cambios por Pull Request revisado.
- Ramas de trabajo: `<equipo>/<tipo>-<descripcion>`, p. ej. `coordinador-academico/feat-asignacion-carga`.
- Tipos: `feat`, `fix`, `docs`, `refactor`, `chore`.
- Antes de abrir un PR: `git fetch origin && git rebase origin/main` (o merge) y resolver conflictos localmente.

## Commits
Formato `tipo(alcance): resumen en imperativo`, p. ej. `feat(coordinador): filtra docentes por programa`.
Commits pequeños y con un solo propósito.

## Pull Requests
- Un PR por funcionalidad; describir qué cambia y cómo probarlo.
- Tocar solo los archivos de tu módulo. Cambios en el Core o en módulos de otros equipos se coordinan con su responsable.
- Al menos 1 aprobación de otro integrante antes de mezclar.

## Qué NO se sube
- `.env`, tokens, contraseñas, llaves (usar `.env.example` como plantilla).
- `venv/`, `node_modules/`, `dist/`, `__pycache__/`, logs y archivos temporales.
- Datos personales de estudiantes (Excel de admisión/matrícula reales): usar datos ficticios como `docs/mock_admision.json`.

## Entorno local
```bash
cp siga_backend/.env.example siga_backend/.env     # completar valores
python -m venv siga_backend/venv && siga_backend/venv/Scripts/pip install -r siga_backend/requirements.txt
cd siga_frontend && npm ci && npm run dev
docker-compose up                                  # stack completo
```

## Módulo Coordinador Académico (nuestro equipo)
- Frontend: `siga_frontend/src/modules/academic/` y `siga_frontend/src/modules/evaluation/CoordinatorSupervision.jsx`.
- Backend: `siga_backend/modules/mod-gestion-academica/`.
