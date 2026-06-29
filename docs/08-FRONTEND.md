# Arquitectura del Frontend

> **Versión:** 1.0.0  
> **Última actualización:** 2026-06-26  
> **Responsable:** Arquitectura de Software SIGA

---

## 1. Visión General

El frontend de SIGA es una **Single Page Application (SPA)** construida con **React 19 + Vite 7**. Se comunica **exclusivamente** con el Core Gateway mediante HTTP REST (JSON) y WebSocket para eventos en tiempo real. El frontend **no tiene conocimiento directo** de los módulos individuales; toda la comunicación con módulos ocurre a través del Core, que actúa como proxy.

### Principios de Diseño

| Principio | Descripción |
|-----------|-------------|
| **Single Source of Truth** | El estado de autenticación y permisos se gestiona globalmente via Context API |
| **Lazy Loading** | Cada módulo funcional se carga bajo demanda (code splitting) |
| **Separation of Concerns** | UI pura: el frontend no contiene lógica de negocio, solo la presenta |
| **Responsive Design** | Mobile-first con Bootstrap 5 |
| **Resilience** | Manejo de errores en todos los niveles: ErrorBoundary, try/catch, fallbacks |
| **Security** | El frontend solo oculta UI basado en permisos; las decisiones de autorización son del backend |

---

## 2. Stack Tecnológico

| Tecnología | Versión | Propósito | Justificación |
|-----------|---------|-----------|---------------|
| React | 19.x | UI Framework | Ecosistema maduro, hooks, concurrent features |
| Vite | 7.x | Build tool / Dev server | Extremadamente rápido (esbuild), HMR instantáneo |
|  | 5.3.x | CSS Framework | Componentes accesibles, grid responsive, personalizable |
| React Router | 7.x (futuro) | Routing SPA | Navegación del lado del cliente, lazy routes |
| React Query / TanStack Query | 5.x (futuro) | Data fetching / Caché | Caché automático, stale-while-revalidate, devtools |
| ESLint + Prettier | — | Linting / Formato | Consistencia de código |
| Vitest + Testing Library | — | Testing | Pruebas unitarias y de componentes |
| MSW (Mock Service Worker) | — | Mock de API | Pruebas sin dependencia del backend |

### ¿Por qué NO Redux?

Para el alcance de SIGA, Redux introduce complejidad innecesaria:

- **Estado global mínimo:** Solo autenticación y permisos (Context API es suficiente)
- **Estado local por módulo:** Cada módulo maneja su estado con hooks nativos
- **Futuro:** Si se necesita caché compleja, se integrará TanStack Query (maneja caché, loading, error states automáticamente)

---

## 3. Estructura de Directorios

```
siga-frontend/
├── public/
│   ├── favicon.ico
│   ├── logo.svg
│   └── manifest.json
├── src/
│   ├── core/                         # Código compartido del Core frontend
│   │   ├── api/
│   │   │   ├── client.jsx            # API Client (comunicación con Core Gateway)
│   │   │   └── websocket.jsx         # Cliente WebSocket para eventos en tiempo real
│   │   ├── auth/
│   │   │   ├── AuthContext.jsx        # Contexto de autenticación
│   │   │   ├── AuthProvider.jsx       # Provider que envuelve la app
│   │   │   ├── useAuth.jsx           # Hook para acceder al contexto
│   │   │   ├── LoginForm.jsx         # Componente de login
│   │   │   └── ProtectedRoute.jsx    # HOC para rutas protegidas
│   │   ├── components/               # Componentes reutilizables
│   │   │   ├── DataTable.jsx         # Tabla genérica con ordenamiento y paginación
│   │   │   ├── Modal.jsx             # Modal genérico
│   │   │   ├── Loading.jsx           # Spinner/skeleton de carga
│   │   │   ├── ErrorBoundary.jsx     # Capturador de errores de renderizado
│   │   │   ├── Pagination.jsx        # Componente de paginación
│   │   │   ├── Breadcrumbs.jsx       # Migas de pan
│   │   │   ├── Toast.jsx             # Notificaciones toast
│   │   │   └── ConfirmDialog.jsx     # Diálogo de confirmación
│   │   ├── hooks/
│   │   │   ├── useApi.js             # Hook para llamadas API (loading, error, data)
│   │   │   ├── usePermissions.js     # Hook para verificar permisos del usuario
│   │   │   └── usePagination.js      # Hook para estado de paginación
│   │   └── utils/
│   │       ├── constants.js          # Constantes (URLs, tiempos, etc.)
│   │       ├── formatters.js         # Formateo de fechas, números, etc.
│   │       └── validators.js         # Validadores de formularios
│   │
│   ├── layouts/
│   │   ├── DashboardLayout.jsx       # Layout principal post-login
│   │   ├── Sidebar.jsx               # Barra lateral de navegación
│   │   ├── Header.jsx                # Barra superior (usuario, notificaciones)
│   │   └── Footer.jsx                # Pie de página
│   │
│   ├── modules/                      # Módulos funcionales (carga perezosa)
│   │   ├── dashboard/                # Panel principal (home)
│   │   │   ├── Dashboard.jsx
│   │   │   ├── DashboardWidgets.jsx
│   │   │   └── QuickActions.jsx
│   │   ├── academic/                 # Gestión académica (planes, programas)
│   │   │   ├── AcademicDashboard.jsx
│   │   │   ├── PlanList.jsx
│   │   │   ├── PlanForm.jsx
│   │   │   ├── PlanDetail.jsx
│   │   │   ├── UnidadList.jsx
│   │   │   └── UnidadForm.jsx
│   │   ├── students/                 # Gestión de estudiantes
│   │   │   ├── StudentMaster.jsx
│   │   │   ├── StudentForm.jsx
│   │   │   ├── StudentDetail.jsx
│   │   │   └── StudentSearch.jsx
│   │   ├── enrollment/               # Proceso de matrícula
│   │   │   ├── EnrollmentProcess.jsx
│   │   │   ├── EnrollmentForm.jsx
│   │   │   ├── EnrollmentList.jsx
│   │   │   └── UnidadSelector.jsx
│   │   ├── grades/                   # Notas y evaluación (futuro)
│   │   │   ├── GradeDashboard.jsx
│   │   │   ├── GradeForm.jsx
│   │   │   └── GradeReport.jsx
│   │   └── reports/                  # Reportes (futuro)
│   │       ├── ReportDashboard.jsx
│   │       └── ReportViewer.jsx
│   │
│   ├── styles/
│   │   ├── core/                     # Estilos base del Core frontend
│   │   │   ├── variables.css         # Variables CSS (colores, fuentes, espaciados)
│   │   │   ├── base.css              # Estilos base (reset, tipografía)
│   │   │   └── utilities.css         # Clases utilitarias
│   │   ├── layouts/                  # Estilos de layouts
│   │   │   ├── dashboard.css
│   │   │   ├── sidebar.css
│   │   │   └── header.css
│   │   └── modules/                  # Estilos por módulo
│   │       ├── academic.css
│   │       ├── students.css
│   │       └── enrollment.css
│   │
│   ├── App.jsx                       # Componente raíz
│   ├── App.css                       # Estilos globales de la app
│   ├── index.css                     # Estilos base (entry point)
│   └── main.jsx                      # Entry point de la aplicación
│
├── .env.development                  # Variables de entorno (desarrollo)
├── .env.production                   # Variables de entorno (producción)
├── .eslintrc.cjs                     # Configuración ESLint
├── .prettierrc                       # Configuración Prettier
├── index.html                        # HTML de entrada
├── package.json
├── vite.config.js                    # Configuración de Vite
└── vitest.config.js                  # Configuración de Vitest
```

---

## 4. Componentes y su Jerarquía

### 4.1 Árbol de Componentes

```
<App>                                                      ← App.jsx
  <ErrorBoundary>                                          ← Captura errores globales
    <AuthProvider>                                         ← AuthContext.Provider
      <AppContent>                                         ← Lógica de ruteo según auth
        ├── (no autenticado)
        │   └── <LoginForm />                              ← Pantalla de login
        │
        └── (autenticado)
            └── <DashboardLayout>                          ← Layout principal
                  ├── <Sidebar>                            ← Navegación lateral
                  │   ├── <NavItem to="/dashboard" />      ← Dashboard
                  │   ├── <NavItem to="/academic" />       ← Académico
                  │   ├── <NavItem to="/students" />       ← Estudiantes
                  │   ├── <NavItem to="/enrollment" />     ← Matrícula
                  │   ├── <NavItem to="/grades" />         ← Notas (futuro)
                  │   └── <NavItem to="/reports" />        ← Reportes (futuro)
                  │
                  ├── <Header>                             ← Barra superior
                  │   ├── <Breadcrumbs />                  ← Ubicación actual
                  │   ├── <Notifications />                ← Campanita de notificaciones
                  │   └── <UserMenu />                     ← Menú de usuario (perfil, logout)
                  │
                  ├── <Content>                            ← Área de contenido principal
                  │   └── <ErrorBoundary>                  ← Captura errores por módulo
                  │       └── <Suspense fallback={<Loading />}>  ← Lazy loading
                  │           ├── <Dashboard />            ← /dashboard
                  │           ├── <AcademicDashboard />    ← /academic
                  │           ├── <StudentMaster />        ← /students
                  │           ├── <EnrollmentProcess />    ← /enrollment
                  │           ├── <GradeDashboard />       ← /grades (futuro)
                  │           └── <ReportDashboard />      ← /reports (futuro)
                  │
                  └── <Footer />                           ← Pie de página
    </AppContent>
  </AuthProvider>
  </ErrorBoundary>
</App>
```

### 4.2 Descripción de Componentes Core

| Componente | Propósito | Props principales |
|-----------|-----------|-------------------|
| `App` | Componente raíz. Renderiza ErrorBoundary y AuthProvider | — |
| `AuthProvider` | Provee contexto de autenticación a toda la app | `children` |
| `LoginForm` | Formulario de inicio de sesión | — |
| `DashboardLayout` | Layout principal con sidebar, header y contenido | `children` |
| `Sidebar` | Navegación lateral con enlaces a módulos | — |
| `Header` | Barra superior con breadcrumbs, notificaciones, usuario | — |
| `Content` | Área de contenido dinámico con lazy loading | — |
| `ErrorBoundary` | Captura errores de renderizado y muestra fallback | `children`, `fallbackMessage`, `showDetails` |
| `Loading` | Indicador de carga (spinner o skeleton) | `type`, `message` |
| `DataTable` | Tabla genérica con ordenamiento, paginación, acciones | `data`, `columns`, `onEdit`, `onDelete` |
| `Modal` | Ventana modal genérica | `isOpen`, `onClose`, `title`, `children` |
| `ConfirmDialog` | Diálogo de confirmación de acciones | `isOpen`, `message`, `onConfirm`, `onCancel` |
| `Toast` | Notificación toast (éxito, error, advertencia, info) | `type`, `message`, `duration` |
| `Pagination` | Controles de paginación | `currentPage`, `totalPages`, `onPageChange` |
| `Breadcrumbs` | Migas de pan para navegación | `items` |

---

## 5. Flujo de Autenticación

### 5.1 Diagrama de Secuencia

```
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Browser  │     │ Auth     │     │ LoginForm│     │ apiClient│
│ Storage  │     │ Provider │     │          │     │          │
└────┬─────┘     └────┬─────┘     └────┬──────┘     └────┬─────┘
     │                │                │                │
     │  1. App carga  │                │                │
     │◄───────────────│                │                │
     │                │                │                │
     │  2. initAuth() │                │                │
     │◄───────────────│                │                │
     │                │                │                │
     │ 3. ¿Hay token? │                │                │
     │───┬───────────>│                │                │
     │   │            │                │                │
     │   │ 4. No      │  5. Mostrar    │                │
     │   │            │  LoginForm     │                │
     │   │            │──────────────>│                │
     │   │            │                │                │
     │   │            │  6. Credenciales                │
     │   │            │◄───────────────│                │
     │   │            │                │  7. login()    │
     │   │            │────────────────────────────────>│
     │   │            │                │                │
     │   │            │                │  8. POST       │
     │   │            │                │  /auth/login   │
     │   │            │                │                │
     │   │            │  9. {token,    │                │
     │   │            │  user}         │◄───────────────│
     │   │            │◄───────────────│                │
     │   │            │                │                │
     │   │ 10. Guardar│                │                │
     │   │    token   │                │                │
     │<──┼────────────│                │                │
     │   │            │                │                │
     │   │ 11. setUser(user)                              │
     │   │            │                │                │
     │   │            │ 12. Dashboard  │                │
     │   │            │    Layout      │                │
```

### 5.2 Implementación del AuthProvider

```jsx
// src/core/auth/AuthContext.jsx
import { createContext } from 'react';

export const AuthContext = createContext({
    user: null,
    permissions: [],
    isAuthenticated: false,
    loading: true,
    login: async () => {},
    logout: async () => {},
    hasPermission: () => false,
    hasRole: () => false,
});
```

```jsx
// src/core/auth/AuthProvider.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthContext } from './AuthContext';
import { apiClient } from '../api/client';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Inicializar autenticación al cargar la app
    useEffect(() => {
        initAuth();
    }, []);

    async function initAuth() {
        const token = localStorage.getItem('siga_access_token');
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const userData = await apiClient.getCurrentUser();
            setUser(userData.user);
            setPermissions(userData.permissions || []);
        } catch {
            // Token inválido o expirado
            apiClient.clearToken();
        } finally {
            setLoading(false);
        }
    }

    const login = useCallback(async (email, password) => {
        const data = await apiClient.login(email, password);
        setUser(data.user);
        setPermissions(data.user.permissions || []);
        return data;
    }, []);

    const logout = useCallback(async () => {
        try {
            await apiClient.logout();
        } finally {
            setUser(null);
            setPermissions([]);
        }
    }, []);

    const hasPermission = useCallback((permissionName) => {
        return permissions.includes(permissionName) || user?.is_superuser;
    }, [permissions, user]);

    const hasRole = useCallback((roleName, programaId = null) => {
        if (!user?.roles) return false;
        return user.roles.some(r =>
            r.name === roleName &&
            (programaId === null || r.programa_id === programaId || r.programa_id === null)
        );
    }, [user]);

    const value = useMemo(() => ({
        user,
        permissions,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        hasPermission,
        hasRole,
    }), [user, permissions, loading, login, logout, hasPermission, hasRole]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
```

```jsx
// src/core/auth/useAuth.jsx
import { useContext } from 'react';
import { AuthContext } from './AuthContext';

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe usarse dentro de un AuthProvider');
    }
    return context;
}
```

### 5.3 ProtectedRoute

```jsx
// src/core/auth/ProtectedRoute.jsx
import { useAuth } from './useAuth';
import { LoginForm } from './LoginForm';
import { Loading } from '../components/Loading';

export function ProtectedRoute({ children, requiredPermission, requiredRole }) {
    const { isAuthenticated, loading, hasPermission, hasRole } = useAuth();

    if (loading) {
        return <Loading message="Verificando autenticación..." />;
    }

    if (!isAuthenticated) {
        return <LoginForm />;
    }

    if (requiredPermission && !hasPermission(requiredPermission)) {
        return (
            <div className="alert alert-warning">
                No tienes permisos para acceder a esta sección.
            </div>
        );
    }

    if (requiredRole && !hasRole(requiredRole)) {
        return (
            <div className="alert alert-warning">
                No tienes el rol necesario para acceder a esta sección.
            </div>
        );
    }

    return children;
}
```

---

## 6. API Client (Frontend)

### 6.1 Interfaz Completa

```javascript
// src/core/api/client.jsx
// Ver documento 06-COMUNICACION.md para la implementación completa

class SIGAApiClient {
    baseURL: string
    token: string | null
    refreshToken: string | null
    isRefreshing: boolean
    refreshSubscribers: Function[]

    // Constructor
    constructor()

    // Gestión de tokens
    setToken(token: string, refreshToken?: string): void
    clearToken(): void

    // Request base (con manejo automático de refresh)
    async request(endpoint: string, options: RequestOptions): Promise<any>

    // Refresh automático
    async _attemptRefresh(): Promise<boolean>

    // === Auth ===
    async login(email: string, password: string): Promise<LoginResponse>
    async getCurrentUser(): Promise<UserResponse>
    async logout(): Promise<void>

    // === Módulos (via Core proxy) ===
    async callModule(moduleName: string, endpoint: string, method?: string, data?: any): Promise<any>

    // === Core ===
    async getModules(): Promise<Module[]>
    async getSystemStatus(): Promise<SystemStatus>
}

// Singleton exportado
export const apiClient = new SIGAApiClient();
```

### 6.2 WebSocket Client

```javascript
// src/core/api/websocket.jsx

class SIGAWebSocket {
    constructor() {
        this.ws = null;
        this.subscribers = new Map(); // channel → Set<callback>
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 1000; // 1s, se duplica exponencialmente
    }

    connect() {
        const token = localStorage.getItem('siga_access_token');
        if (!token) return;

        const url = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'}?token=${token}`;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log('WebSocket conectado');
            this.reconnectAttempts = 0;
            // Resuscribirse a canales anteriores
            for (const channel of this.subscribers.keys()) {
                this.send({ type: 'subscribe', channels: [channel] });
            }
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'event') {
                    const callbacks = this.subscribers.get(message.channel);
                    if (callbacks) {
                        callbacks.forEach(cb => cb(message.data));
                    }
                } else if (message.type === 'pong') {
                    // Keepalive response
                }
            } catch (err) {
                console.error('Error parsing WebSocket message:', err);
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket desconectado');
            this._scheduleReconnect();
        };

        this.ws.onerror = (err) => {
            console.error('WebSocket error:', err);
        };
    }

    send(data) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    subscribe(channel, callback) {
        if (!this.subscribers.has(channel)) {
            this.subscribers.set(channel, new Set());
        }
        this.subscribers.get(channel).add(callback);

        // Enviar suscripción al servidor
        this.send({ type: 'subscribe', channels: [channel] });

        // Retornar función para desuscribirse
        return () => {
            const callbacks = this.subscribers.get(channel);
            if (callbacks) {
                callbacks.delete(callback);
                if (callbacks.size === 0) {
                    this.subscribers.delete(channel);
                    this.send({ type: 'unsubscribe', channels: [channel] });
                }
            }
        };
    }

    _scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Máximos intentos de reconexión alcanzados');
            return;
        }

        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
        this.reconnectAttempts++;

        setTimeout(() => {
            console.log(`Reconectando WebSocket (intento ${this.reconnectAttempts})...`);
            this.connect();
        }, delay);
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.subscribers.clear();
    }
}

export const sigaWS = new SIGAWebSocket();
```

---

## 7. Manejo de Estado

### 7.1 Estrategia

| Estado | Ámbito | Mecanismo | Persistencia |
|--------|--------|-----------|-------------|
| Autenticación | Global | AuthContext (React Context) | localStorage (token) |
| Permisos | Global | AuthContext | En memoria (cargado desde JWT) |
| Datos de módulos | Local por módulo | useState, useReducer | En memoria (refetch al montar) |
| UI State (modales, tabs) | Local por componente | useState | En memoria |
| Caché de respuestas API | Global (futuro) | TanStack Query | En memoria + stale time |
| Preferencias de usuario | Global | Context + localStorage | localStorage |

### 7.2 Ejemplo: Estado Local en un Módulo

```jsx
// src/modules/students/StudentMaster.jsx
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../core/auth/useAuth';
import { apiClient } from '../../core/api/client';
import { useApi } from '../../core/hooks/useApi';
import { DataTable } from '../../core/components/DataTable';
import { StudentForm } from './StudentForm';
import { StudentDetail } from './StudentDetail';

export function StudentMaster() {
    const { hasPermission } = useAuth();
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);

    // useApi hook maneja loading, error, data automáticamente
    const { data: students, loading, error, execute: refresh } = useApi(
        'mod-estudiantes',
        'api/v1/estudiantes',
        { params: { limit: 50, offset: 0 } }
    );

    const handleCreate = useCallback(() => {
        setEditingStudent(null);
        setShowForm(true);
    }, []);

    const handleEdit = useCallback((student) => {
        setEditingStudent(student);
        setShowForm(true);
    }, []);

    const handleView = useCallback((student) => {
        setSelectedStudent(student);
    }, []);

    const handleDelete = useCallback(async (student) => {
        if (!confirm(`¿Estás seguro de eliminar a ${student.nombres} ${student.apellidos}?`)) return;
        try {
            await apiClient.callModule(
                'mod-estudiantes',
                `api/v1/estudiantes/${student.id}`,
                'DELETE'
            );
            refresh(); // Recargar datos
        } catch (err) {
            alert('Error al eliminar estudiante: ' + err.message);
        }
    }, [refresh]);

    const handleFormClose = useCallback(() => {
        setShowForm(false);
        setEditingStudent(null);
        refresh();
    }, [refresh]);

    const columns = [
        { key: 'codigo_estudiante', label: 'Código', sortable: true },
        { key: 'dni', label: 'DNI', sortable: true },
        {
            key: 'nombre_completo',
            label: 'Nombres y Apellidos',
            sortable: true,
            render: (row) => `${row.nombres} ${row.apellidos}`,
        },
        { key: 'email_institucional', label: 'Email' },
        {
            key: 'estado_academico',
            label: 'Estado',
            sortable: true,
            render: (row) => (
                <span className={`badge bg-${getEstadoColor(row.estado_academico)}`}>
                    {row.estado_academico}
                </span>
            ),
        },
        {
            key: 'acciones',
            label: '',
            render: (row) => (
                <div className="btn-group">
                    <button className="btn btn-sm btn-info" onClick={() => handleView(row)}>
                        Ver
                    </button>
                    {hasPermission('mod-estudiantes:write') && (
                        <>
                            <button className="btn btn-sm btn-warning" onClick={() => handleEdit(row)}>
                                Editar
                            </button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(row)}>
                                Eliminar
                            </button>
                        </>
                    )}
                </div>
            ),
        },
    ];

    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} />;

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h2>Maestro de Estudiantes</h2>
                {hasPermission('mod-estudiantes:write') && (
                    <button className="btn btn-primary" onClick={handleCreate}>
                        + Nuevo Estudiante
                    </button>
                )}
            </div>

            <StudentSearch onSearch={handleSearch} />

            <DataTable
                data={students}
                columns={columns}
                pagination={{ currentPage, totalPages, onPageChange }}
            />

            {showForm && (
                <Modal isOpen={showForm} onClose={handleFormClose}
                       title={editingStudent ? 'Editar Estudiante' : 'Nuevo Estudiante'}>
                    <StudentForm
                        student={editingStudent}
                        onSave={handleFormClose}
                        onCancel={() => setShowForm(false)}
                    />
                </Modal>
            )}

            {selectedStudent && (
                <Modal isOpen={!!selectedStudent} onClose={() => setSelectedStudent(null)}
                       title="Detalle del Estudiante">
                    <StudentDetail student={selectedStudent} />
                </Modal>
            )}
        </div>
    );
}

function getEstadoColor(estado) {
    const colors = {
        regular: 'success',
        irregular: 'warning',
        admitido: 'info',
        egresado: 'primary',
        titulado: 'secondary',
        retirado: 'danger',
    };
    return colors[estado] || 'secondary';
}
```

---

## 8. Carga Perezosa (Lazy Loading) y Code Splitting

### 8.1 Configuración

```jsx
// src/App.jsx
import { lazy, Suspense } from 'react';
import { Loading } from './core/components/Loading';

// Carga perezosa de módulos
const Dashboard = lazy(() => import('./modules/dashboard/Dashboard'));
const AcademicDashboard = lazy(() => import('./modules/academic/AcademicDashboard'));
const StudentMaster = lazy(() => import('./modules/students/StudentMaster'));
const EnrollmentProcess = lazy(() => import('./modules/enrollment/EnrollmentProcess'));

// Mapa de rutas a componentes (para futuro React Router)
const moduleRoutes = {
    '/dashboard': Dashboard,
    '/academic': AcademicDashboard,
    '/students': StudentMaster,
    '/enrollment': EnrollmentProcess,
};

export function AppContent() {
    const { isAuthenticated, loading } = useAuth();

    if (loading) return <Loading fullScreen />;
    if (!isAuthenticated) return <LoginForm />;

    return (
        <DashboardLayout>
            <Suspense fallback={<Loading message="Cargando módulo..." />}>
                <Dashboard />
            </Suspense>
        </DashboardLayout>
    );
}
```

### 8.2 Beneficios

| Beneficio | Impacto |
|-----------|---------|
| Bundle inicial más pequeño | Solo se carga el Core (~50KB gzip) |
| Carga bajo demanda | El módulo académico (~30KB) se carga solo cuando el usuario navega allí |
| Aislamiento de errores | Un error en un módulo no impide la carga de otros |
| Parallel loading | Múltiples módulos pueden cargarse en paralelo |

---

## 9. Manejo de Errores (Frontend)

### 9.1 Estrategia en Tres Capas

```
Capa 1: ErrorBoundary (React)
  ├── Componente que envuelve cada módulo
  ├── Captura errores de renderizado (componentDidCatch)
  ├── Muestra UI de fallback
  └── NO captura errores asíncronos (event handlers, API calls)
  
Capa 2: Hook useApi
  ├── try/catch en llamadas API
  ├── Estados: loading, error, data
  └── Mapeo de errores HTTP a mensajes UX
  
Capa 3: try/catch en componentes
  ├── Event handlers (onClick, onSubmit)
  ├── Manejo específico por tipo de error
  └── Notificaciones toast
```

### 9.2 Mapa de Errores HTTP a UX

| Código | Mensaje para el Usuario | Acción Automática |
|--------|------------------------|-------------------|
| 401 | "Tu sesión ha expirado. Inicia sesión nuevamente." | Limpiar token, redirigir a login |
| 403 | "No tienes permisos para realizar esta acción." | Ocultar botones/acciones |
| 404 | "El recurso solicitado no fue encontrado." | Mostrar mensaje en la UI |
| 409 | "Ya existe un registro con esos datos." | Mostrar detalle del conflicto |
| 422 | "Verifica los datos ingresados." | Mostrar errores campo por campo |
| 429 | "Has realizado demasiadas solicitudes. Espera unos segundos." | Deshabilitar botón temporalmente |
| 502-504 | "El servicio está temporalmente no disponible. Intenta más tarde." | Mostrar banner de servicio no disponible |
| 0 (red) | "Error de conexión. Verifica tu red." | Mostrar banner de conexión perdida |

### 9.3 Implementación de Toast Notifications

```jsx
// src/core/components/Toast.jsx
import { useState, useEffect, createContext, useContext } from 'react';

const ToastContext = createContext();

export function useToast() {
    return useContext(ToastContext);
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    function addToast(type, message, duration = 5000) {
        const id = Date.now();
        setToasts(prev => [...prev, { id, type, message }]);

        if (duration > 0) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }
    }

    function removeToast(id) {
        setToasts(prev => prev.filter(t => t.id !== id));
    }

    const success = (msg) => addToast('success', msg);
    const error = (msg) => addToast('error', msg);
    const warning = (msg) => addToast('warning', msg);
    const info = (msg) => addToast('info', msg);

    return (
        <ToastContext.Provider value={{ success, error, warning, info }}>
            {children}
            <div className="toast-container position-fixed bottom-0 end-0 p-3">
                {toasts.map(toast => (
                    <div key={toast.id}
                         className={`toast show bg-${toast.type === 'error' ? 'danger' : toast.type}`}
                         role="alert">
                        <div className="toast-header">
                            <strong className="me-auto">
                                {toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}
                            </strong>
                            <button className="btn-close" onClick={() => removeToast(toast.id)} />
                        </div>
                        <div className="toast-body text-white">
                            {toast.message}
                        </div>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
```

---

## 10. DataTable (Componente Genérico)

```jsx
// src/core/components/DataTable.jsx
import { useState, useMemo } from 'react';

export function DataTable({ data, columns, pagination, onRowClick, emptyMessage = 'No hay datos disponibles' }) {
    const [sortKey, setSortKey] = useState(null);
    const [sortDir, setSortDir] = useState('asc');

    const sortedData = useMemo(() => {
        if (!sortKey) return data;
        return [...data].sort((a, b) => {
            const aVal = a[sortKey] ?? '';
            const bVal = b[sortKey] ?? '';
            const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [data, sortKey, sortDir]);

    function handleSort(key) {
        if (sortKey === key) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    }

    if (!data || data.length === 0) {
        return (
            <div className="text-center py-5 text-muted">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className="table-responsive">
            <table className="table table-striped table-hover">
                <thead className="table-dark">
                    <tr>
                        {columns.map(col => (
                            <th key={col.key}
                                style={col.sortable ? { cursor: 'pointer' } : {}}
                                onClick={() => col.sortable && handleSort(col.key)}>
                                {col.label}
                                {col.sortable && sortKey === col.key && (
                                    <span className="ms-1">{sortDir === 'asc' ? '▲' : '▼'}</span>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((row, i) => (
                        <tr key={row.id || i}
                            style={onRowClick ? { cursor: 'pointer' } : {}}
                            onClick={() => onRowClick?.(row)}>
                            {columns.map(col => (
                                <td key={col.key}>
                                    {col.render ? col.render(row) : row[col.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {pagination && (
                <Pagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    onPageChange={pagination.onPageChange}
                />
            )}
        </div>
    );
}
```

---

## 11. Rutas de Navegación (Futuro con React Router)

```jsx
// src/core/routes.jsx (futuro)
import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

const Dashboard = lazy(() => import('../modules/dashboard/Dashboard'));
const AcademicDashboard = lazy(() => import('../modules/academic/AcademicDashboard'));
const PlanDetail = lazy(() => import('../modules/academic/PlanDetail'));
const PlanForm = lazy(() => import('../modules/academic/PlanForm'));
const StudentMaster = lazy(() => import('../modules/students/StudentMaster'));
const StudentDetail = lazy(() => import('../modules/students/StudentDetail'));
const EnrollmentProcess = lazy(() => import('../modules/enrollment/EnrollmentProcess'));
const GradeDashboard = lazy(() => import('../modules/grades/GradeDashboard'));
const ReportDashboard = lazy(() => import('../modules/reports/ReportDashboard'));

export const router = createBrowserRouter([
    {
        path: '/',
        element: <DashboardLayout />,
        errorElement: <ErrorPage />,
        children: [
            { index: true, element: <Navigate to="/dashboard" replace /> },
            { path: 'dashboard', element: <Dashboard /> },
            {
                path: 'academic',
                children: [
                    { index: true, element: <AcademicDashboard /> },
                    { path: 'planes/:id', element: <PlanDetail /> },
                    { path: 'planes/new', element: <PlanForm /> },
                    { path: 'planes/:id/edit', element: <PlanForm /> },
                ],
            },
            {
                path: 'students',
                children: [
                    { index: true, element: <StudentMaster /> },
                    { path: ':id', element: <StudentDetail /> },
                ],
            },
            { path: 'enrollment', element: <EnrollmentProcess /> },
            { path: 'grades', element: <GradeDashboard /> },
            { path: 'reports', element: <ReportDashboard /> },
        ],
    },
]);
```

---

## 12. Estilos y Theming

### 12.1 Variables CSS

```css
/* src/styles/core/variables.css */
:root {
    /* Colores institucionales */
    --color-primary: #0d6efd;
    --color-secondary: #6c757d;
    --color-success: #198754;
    --color-danger: #dc3545;
    --color-warning: #ffc107;
    --color-info: #0dcaf0;

    /* Colores del instituto (personalizables) */
    --institute-primary: #003366;
    --institute-secondary: #CC9900;
    --institute-accent: #006699;

    /* Tipografía */
    --font-family-base: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    --font-size-base: 0.875rem;
    --font-size-lg: 1rem;
    --font-size-sm: 0.75rem;

    /* Espaciados */
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;
    --spacing-xl: 3rem;

    /* Sidebar */
    --sidebar-width: 250px;
    --sidebar-collapsed-width: 60px;
    --sidebar-bg: #1e1e2d;
    --sidebar-text: #a2a3b7;
    --sidebar-active-bg: #2a2a3c;

    /* Header */
    --header-height: 60px;
    --header-bg: #ffffff;

    /* Bordes */
    --border-radius: 0.375rem;
    --border-color: #dee2e6;

    /* Sombras */
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
    --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
    --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);

    /* Transiciones */
    --transition-base: all 0.2s ease-in-out;
}
```

### 12.2 Responsive Breakpoints

```scss
// Puntos de quiebra (coinciden con Bootstrap)
$breakpoint-sm: 576px;   // Móvil landscape
$breakpoint-md: 768px;   // Tablet
$breakpoint-lg: 992px;   // Desktop
$breakpoint-xl: 1200px;  // Desktop grande

// Sidebar responsive
@media (max-width: $breakpoint-md) {
    .sidebar {
        position: fixed;
        left: -100%;
        width: 100%;
        z-index: 1050;
        transition: left 0.3s;

        &.open {
            left: 0;
        }
    }

    .main-content {
        margin-left: 0 !important;
    }
}
```

---

## 13. Seguridad en Frontend

### 13.1 Principios

| Principio | Implementación |
|-----------|---------------|
| **No confiar en el frontend** | Todas las decisiones de autorización se toman en el backend |
| **Ocultar UI por permisos** | Botones, secciones, y acciones se ocultan según permisos del usuario |
| **Validación dual** | Validación en frontend (UX inmediata) + validación en backend (seguridad) |
| **Sanitización de inputs** | Los inputs se sanitizan antes de mostrar (XSS prevention) |
| **Token seguro** | JWT almacenado en localStorage (no sessionStorage para persistencia) |
| **CSP** | Content-Security-Policy headers configurados en producción |

### 13.2 Medidas Específicas

```javascript
// 1. Sanitización de outputs (React lo hace por defecto)
// React escapa automáticamente strings en JSX. Peligro: dangerouslySetInnerHTML

// 2. Validación de formularios (cliente)
function validateStudentForm(data) {
    const errors = {};
    if (!data.dni?.match(/^\d{8}$/)) {
        errors.dni = 'DNI debe tener 8 dígitos';
    }
    if (!data.email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        errors.email = 'Email inválido';
    }
    // ... más validaciones
    return errors;
}

// 3. No almacenar datos sensibles
// No almacenar password, tokens de terceros, datos biométricos en localStorage

// 4. Logout automático en inactividad (futuro)
let inactivityTimer;
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        apiClient.clearToken();
    }, 30 * 60 * 1000); // 30 minutos
}
document.addEventListener('mousemove', resetInactivityTimer);
document.addEventListener('keydown', resetInactivityTimer);
```

---

## 14. Rendimiento

### 14.1 Estrategias

| Estrategia | Implementación | Impacto |
|-----------|---------------|---------|
| Lazy Loading | `React.lazy()` + `Suspense` | Bundle inicial ~80% más pequeño |
| Code Splitting | Vite por defecto separa chunks por entrada | Carga paralela de módulos |
| Memoización | `React.memo`, `useMemo`, `useCallback` | Evita re-renderizados innecesarios |
| Virtual Scroll (futuro) | `react-window` para tablas grandes (500+ filas) | Renderizado solo de filas visibles |
| Optimización de imágenes | `vite-plugin-image-optimizer` | Imágenes ~40% más ligeras |
| Compresión | Brotli en servidor web (NGINX) | Transferencia ~70% menor |
| Caché de API (futuro) | TanStack Query con stale-while-revalidate | Sin llamadas redundantes |
| Tree Shaking | Vite elimina código no usado automáticamente | Bundle más pequeño |

### 14.2 Configuración de Vite

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

export default defineConfig({
    plugins: [
        react(),
        ViteImageOptimizer({
            png: { quality: 80 },
            jpeg: { quality: 80 },
            webp: { quality: 80 },
        }),
    ],
    build: {
        target: 'es2020',
        minify: 'esbuild',
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                    bootstrap: ['bootstrap'],
                },
            },
        },
        chunkSizeWarningLimit: 100, // KB
    },
    server: {
        port: 5173,
        proxy: {
            '/api': 'http://localhost:8000',
            '/ws': {
                target: 'ws://localhost:8000',
                ws: true,
            },
        },
    },
});
```

### 14.3 Métricas Objetivo

| Métrica | Objetivo | Herramienta |
|---------|----------|-------------|
| First Contentful Paint (FCP) | < 1.5s | Lighthouse |
| Largest Contentful Paint (LCP) | < 2.5s | Lighthouse |
| Time to Interactive (TTI) | < 3.5s | Lighthouse |
| Bundle size (gzip) | < 100KB inicial | Vite report |
| Lighthouse Performance | > 90 | Lighthouse |
| Lighthouse Accessibility | > 95 | Lighthouse |
| Lighthouse Best Practices | > 95 | Lighthouse |

---

## 15. Configuración de Entorno

### 15.1 Variables de Entorno

```bash
# .env.development
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
VITE_ENVIRONMENT=development
VITE_APP_NAME=SIGA - Desarrollo
VITE_DEBUG=true

# .env.production
VITE_API_URL=https://siga.iestp.edu.pe
VITE_WS_URL=wss://siga.iestp.edu.pe/ws
VITE_ENVIRONMENT=production
VITE_APP_NAME=SIGA - IESTP
VITE_DEBUG=false
```

### 15.2 package.json

```json
{
    "name": "siga-frontend",
    "version": "1.0.0",
    "type": "module",
    "scripts": {
        "dev": "vite",
        "build": "vite build",
        "preview": "vite preview",
        "lint": "eslint src/",
        "lint:fix": "eslint src/ --fix",
        "format": "prettier --write src/",
        "test": "vitest",
        "test:run": "vitest run",
        "test:coverage": "vitest run --coverage"
    },
    "dependencies": {
        "react": "^19.0.0",
        "react-dom": "^19.0.0",
        "bootstrap": "^5.3.3",
        "@popperjs/core": "^2.11.8"
    },
    "devDependencies": {
        "@vitejs/plugin-react": "^4.3.0",
        "vite": "^7.0.0",
        "eslint": "^9.0.0",
        "eslint-plugin-react": "^7.37.0",
        "eslint-plugin-react-hooks": "^5.0.0",
        "prettier": "^3.4.0",
        "vitest": "^3.0.0",
        "@testing-library/react": "^16.0.0",
        "@testing-library/jest-dom": "^6.6.0",
        "jsdom": "^25.0.0",
        "vite-plugin-image-optimizer": "^1.1.0"
    }
}
```

---

## 16. Testing

### 16.1 Estrategia

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: './src/test/setup.js',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.{jsx,js}'],
            exclude: [
                'src/main.jsx',
                'src/**/*.test.{jsx,js}',
                'src/test/**',
            ],
            thresholds: {
                statements: 80,
                branches: 75,
                functions: 80,
                lines: 80,
            },
        },
    },
});
```

### 16.2 Tipos de Tests

| Tipo | Herramienta | Cobertura Objetivo | Ejemplos |
|------|-----------|-------------------|----------|
| Unitarios | Vitest + Testing Library | 80%+ | Hooks, utilidades, validadores |
| Componentes | Vitest + Testing Library | 80%+ | DataTable, Modal, LoginForm |
| Integración | Vitest + MSW | 70%+ | Flujo de login, CRUD estudiantes |
| E2E (futuro) | Playwright | Flujos críticos | Login → matrícula → notas |

### 16.3 Ejemplo de Test

```jsx
// src/core/components/__tests__/DataTable.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DataTable } from '../DataTable';

describe('DataTable', () => {
    const columns = [
        { key: 'nombre', label: 'Nombre', sortable: true },
        { key: 'edad', label: 'Edad', sortable: true },
        { key: 'email', label: 'Email' },
    ];

    const data = [
        { id: 1, nombre: 'Ana', edad: 25, email: 'ana@test.com' },
        { id: 2, nombre: 'Luis', edad: 30, email: 'luis@test.com' },
    ];

    it('renderiza los datos correctamente', () => {
        render(<DataTable data={data} columns={columns} />);
        expect(screen.getByText('Ana')).toBeDefined();
        expect(screen.getByText('Luis')).toBeDefined();
    });

    it('ordena al hacer clic en columna sortable', () => {
        render(<DataTable data={data} columns={columns} />);
        const nombreHeader = screen.getByText('Nombre');
        fireEvent.click(nombreHeader);
        const rows = screen.getAllByRole('row');
        // Primera fila de datos debe ser 'Ana' (asc)
        expect(rows[1]).toHaveTextContent('Ana');
        expect(rows[2]).toHaveTextContent('Luis');
    });

    it('muestra mensaje vacío cuando no hay datos', () => {
        render(<DataTable data={[]} columns={columns} emptyMessage="Sin registros" />);
        expect(screen.getByText('Sin registros')).toBeDefined();
    });
});
```

---

## 17. Despliegue

### 17.1 Build de Producción

```bash
# Instalar dependencias
npm ci

# Lint
npm run lint

# Tests
npm run test:run

# Build
npm run build

# Output en dist/
#   dist/
#   ├── index.html
#   ├── assets/
#   │   ├── index-abc123.js       (entry point)
#   │   ├── vendor-xyz789.js      (React, ReactDOM)
#   │   ├── bootstrap-def456.js    (Bootstrap)
#   │   ├── module-academic-xxx.js (lazy loaded)
#   │   ├── module-student-yyy.js  (lazy loaded)
#   │   └── styles-ghi789.css
```

### 17.2 NGINX Configuration

```nginx
# /etc/nginx/sites-available/siga.iestp.edu.pe
server {
    listen 443 ssl;
    server_name siga.iestp.edu.pe;

    ssl_certificate /etc/letsencrypt/live/siga.iestp.edu.pe/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/siga.iestp.edu.pe/privkey.pem;

    root /var/www/siga-frontend/dist;
    index index.html;

    # SPA: servir index.html para todas las rutas
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Caché agresiva para assets con hash
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy inverso al Core
    location /api/ {
        proxy_pass http://siga-core:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # WebSocket proxy
    location /ws {
        proxy_pass http://siga-core:8000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
    }

    # Seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data:; font-src 'self' https://cdn.jsdelivr.net; connect-src 'self' wss://siga.iestp.edu.pe" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1000;
    gzip_comp_level 6;
}
```

---

## 18. Monitoreo del Frontend (Futuro)

| Métrica | Cómo se recolecta | Propósito |
|---------|------------------|-----------|
| Core Web Vitals | `web-vitals` library | Experiencia de usuario |
| Errores no capturados | `window.onerror`, `unhandledrejection` | Detección temprana de bugs |
| Rendimiento de API | Timing de fetch en apiClient | Identificar APIs lentas |
| Tiempo de carga de módulos | Navigation Timing API | Optimizar lazy loading |
| Uso de funcionalidades | Google Analytics / Plausible | Qué módulos se usan más |

---

## 19. Historial de Cambios

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0.0 | 2026-06-26 | Arquitectura SIGA | Versión inicial del frontend |

---

> **Documento generado como parte de la arquitectura del Sistema Integrado de Gestión Académica (SIGA)**
> **IESTP — Instituto de Educación Superior Tecnológico Público**
