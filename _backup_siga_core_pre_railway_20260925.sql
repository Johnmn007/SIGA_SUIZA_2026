--
-- PostgreSQL database dump
--

\restrict sGRtMDVmCmTjn7k414yOba32rdqeY9RLjExegPuitRsiFZWKfNTe5TcbJBcfORS

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.solicitudes_tramites DROP CONSTRAINT IF EXISTS solicitudes_tramites_estudiante_id_fkey;
ALTER TABLE IF EXISTS ONLY public.resoluciones_convalidacion DROP CONSTRAINT IF EXISTS resoluciones_convalidacion_estudiante_id_fkey;
ALTER TABLE IF EXISTS ONLY public.registros_practicas DROP CONSTRAINT IF EXISTS registros_practicas_estudiante_id_fkey;
ALTER TABLE IF EXISTS ONLY public.programas_estudio DROP CONSTRAINT IF EXISTS programas_estudio_plan_estudio_id_fkey;
ALTER TABLE IF EXISTS ONLY public.perfiles_personal DROP CONSTRAINT IF EXISTS perfiles_personal_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.matriculas DROP CONSTRAINT IF EXISTS matriculas_programa_estudio_id_fkey;
ALTER TABLE IF EXISTS ONLY public.matriculas DROP CONSTRAINT IF EXISTS matriculas_periodo_academico_id_fkey;
ALTER TABLE IF EXISTS ONLY public.matriculas DROP CONSTRAINT IF EXISTS matriculas_estudiante_id_fkey;
ALTER TABLE IF EXISTS ONLY public.historial_academico DROP CONSTRAINT IF EXISTS historial_academico_matricula_id_fkey;
ALTER TABLE IF EXISTS ONLY public.historial_academico DROP CONSTRAINT IF EXISTS historial_academico_estudiante_id_fkey;
ALTER TABLE IF EXISTS ONLY public.evaluacion_registros DROP CONSTRAINT IF EXISTS evaluacion_registros_periodo_academico_id_fkey;
ALTER TABLE IF EXISTS ONLY public.evaluacion_registros DROP CONSTRAINT IF EXISTS evaluacion_registros_estudiante_id_fkey;
ALTER TABLE IF EXISTS ONLY public.evaluacion_registros DROP CONSTRAINT IF EXISTS evaluacion_registros_docente_id_fkey;
ALTER TABLE IF EXISTS ONLY public.estudiantes DROP CONSTRAINT IF EXISTS estudiantes_programa_estudio_id_fkey;
ALTER TABLE IF EXISTS ONLY public.core_user_roles DROP CONSTRAINT IF EXISTS core_user_roles_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.core_user_roles DROP CONSTRAINT IF EXISTS core_user_roles_role_id_fkey;
ALTER TABLE IF EXISTS ONLY public.core_role_permissions DROP CONSTRAINT IF EXISTS core_role_permissions_role_id_fkey;
ALTER TABLE IF EXISTS ONLY public.core_role_permissions DROP CONSTRAINT IF EXISTS core_role_permissions_permission_id_fkey;
ALTER TABLE IF EXISTS ONLY public.beneficios_estudiante DROP CONSTRAINT IF EXISTS beneficios_estudiante_estudiante_id_fkey;
ALTER TABLE IF EXISTS ONLY public.admision_postulantes DROP CONSTRAINT IF EXISTS admision_postulantes_programa_estudio_id_fkey;
DROP INDEX IF EXISTS public.ix_core_users_id;
DROP INDEX IF EXISTS public.ix_core_users_email;
DROP INDEX IF EXISTS public.ix_core_roles_name;
DROP INDEX IF EXISTS public.ix_core_roles_id;
DROP INDEX IF EXISTS public.ix_core_permissions_name;
DROP INDEX IF EXISTS public.ix_core_permissions_id;
DROP INDEX IF EXISTS public.ix_core_modules_name;
DROP INDEX IF EXISTS public.ix_core_modules_id;
DROP INDEX IF EXISTS public.ix_core_audit_logs_user_id;
DROP INDEX IF EXISTS public.ix_core_audit_logs_source;
DROP INDEX IF EXISTS public.ix_core_audit_logs_request_id;
DROP INDEX IF EXISTS public.ix_core_audit_logs_event_type;
DROP INDEX IF EXISTS public.ix_core_audit_logs_event_id;
ALTER TABLE IF EXISTS ONLY public.solicitudes_tramites DROP CONSTRAINT IF EXISTS solicitudes_tramites_pkey;
ALTER TABLE IF EXISTS ONLY public.resoluciones_convalidacion DROP CONSTRAINT IF EXISTS resoluciones_convalidacion_pkey;
ALTER TABLE IF EXISTS ONLY public.registros_practicas DROP CONSTRAINT IF EXISTS registros_practicas_pkey;
ALTER TABLE IF EXISTS ONLY public.programas_estudio DROP CONSTRAINT IF EXISTS programas_estudio_pkey;
ALTER TABLE IF EXISTS ONLY public.planes_estudio DROP CONSTRAINT IF EXISTS planes_estudio_pkey;
ALTER TABLE IF EXISTS ONLY public.periodos_academicos DROP CONSTRAINT IF EXISTS periodos_academicos_pkey;
ALTER TABLE IF EXISTS ONLY public.perfiles_personal DROP CONSTRAINT IF EXISTS perfiles_personal_pkey;
ALTER TABLE IF EXISTS ONLY public.outbox_events DROP CONSTRAINT IF EXISTS outbox_events_pkey;
ALTER TABLE IF EXISTS ONLY public.matriculas DROP CONSTRAINT IF EXISTS matriculas_pkey;
ALTER TABLE IF EXISTS ONLY public.historial_academico DROP CONSTRAINT IF EXISTS historial_academico_pkey;
ALTER TABLE IF EXISTS ONLY public.evaluacion_registros DROP CONSTRAINT IF EXISTS evaluacion_registros_pkey;
ALTER TABLE IF EXISTS ONLY public.estudiantes DROP CONSTRAINT IF EXISTS estudiantes_pkey;
ALTER TABLE IF EXISTS ONLY public.estudiantes DROP CONSTRAINT IF EXISTS estudiantes_codigo_key;
ALTER TABLE IF EXISTS ONLY public.core_users DROP CONSTRAINT IF EXISTS core_users_pkey;
ALTER TABLE IF EXISTS ONLY public.core_users DROP CONSTRAINT IF EXISTS core_users_email_key;
ALTER TABLE IF EXISTS ONLY public.core_roles DROP CONSTRAINT IF EXISTS core_roles_pkey;
ALTER TABLE IF EXISTS ONLY public.core_roles DROP CONSTRAINT IF EXISTS core_roles_name_key;
ALTER TABLE IF EXISTS ONLY public.core_permissions DROP CONSTRAINT IF EXISTS core_permissions_pkey;
ALTER TABLE IF EXISTS ONLY public.core_permissions DROP CONSTRAINT IF EXISTS core_permissions_name_key;
ALTER TABLE IF EXISTS ONLY public.core_modules DROP CONSTRAINT IF EXISTS core_modules_pkey;
ALTER TABLE IF EXISTS ONLY public.core_modules DROP CONSTRAINT IF EXISTS core_modules_name_key;
ALTER TABLE IF EXISTS ONLY public.core_audit_logs DROP CONSTRAINT IF EXISTS core_audit_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.core_audit_logs DROP CONSTRAINT IF EXISTS core_audit_logs_event_id_key;
ALTER TABLE IF EXISTS ONLY public.beneficios_estudiante DROP CONSTRAINT IF EXISTS beneficios_estudiante_pkey;
ALTER TABLE IF EXISTS ONLY public.admision_postulantes DROP CONSTRAINT IF EXISTS admision_postulantes_pkey;
ALTER TABLE IF EXISTS public.solicitudes_tramites ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.resoluciones_convalidacion ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.registros_practicas ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.programas_estudio ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.planes_estudio ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.periodos_academicos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.perfiles_personal ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.outbox_events ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.matriculas ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.historial_academico ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.evaluacion_registros ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.estudiantes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.core_users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.core_roles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.core_permissions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.core_modules ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.core_audit_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.beneficios_estudiante ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.admision_postulantes ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.solicitudes_tramites_id_seq;
DROP TABLE IF EXISTS public.solicitudes_tramites;
DROP SEQUENCE IF EXISTS public.resoluciones_convalidacion_id_seq;
DROP TABLE IF EXISTS public.resoluciones_convalidacion;
DROP SEQUENCE IF EXISTS public.registros_practicas_id_seq;
DROP TABLE IF EXISTS public.registros_practicas;
DROP SEQUENCE IF EXISTS public.programas_estudio_id_seq;
DROP TABLE IF EXISTS public.programas_estudio;
DROP SEQUENCE IF EXISTS public.planes_estudio_id_seq;
DROP TABLE IF EXISTS public.planes_estudio;
DROP SEQUENCE IF EXISTS public.periodos_academicos_id_seq;
DROP TABLE IF EXISTS public.periodos_academicos;
DROP SEQUENCE IF EXISTS public.perfiles_personal_id_seq;
DROP TABLE IF EXISTS public.perfiles_personal;
DROP SEQUENCE IF EXISTS public.outbox_events_id_seq;
DROP TABLE IF EXISTS public.outbox_events;
DROP SEQUENCE IF EXISTS public.matriculas_id_seq;
DROP TABLE IF EXISTS public.matriculas;
DROP SEQUENCE IF EXISTS public.historial_academico_id_seq;
DROP TABLE IF EXISTS public.historial_academico;
DROP SEQUENCE IF EXISTS public.evaluacion_registros_id_seq;
DROP TABLE IF EXISTS public.evaluacion_registros;
DROP SEQUENCE IF EXISTS public.estudiantes_id_seq;
DROP TABLE IF EXISTS public.estudiantes;
DROP SEQUENCE IF EXISTS public.core_users_id_seq;
DROP TABLE IF EXISTS public.core_users;
DROP TABLE IF EXISTS public.core_user_roles;
DROP SEQUENCE IF EXISTS public.core_roles_id_seq;
DROP TABLE IF EXISTS public.core_roles;
DROP TABLE IF EXISTS public.core_role_permissions;
DROP SEQUENCE IF EXISTS public.core_permissions_id_seq;
DROP TABLE IF EXISTS public.core_permissions;
DROP SEQUENCE IF EXISTS public.core_modules_id_seq;
DROP TABLE IF EXISTS public.core_modules;
DROP SEQUENCE IF EXISTS public.core_audit_logs_id_seq;
DROP TABLE IF EXISTS public.core_audit_logs;
DROP SEQUENCE IF EXISTS public.beneficios_estudiante_id_seq;
DROP TABLE IF EXISTS public.beneficios_estudiante;
DROP SEQUENCE IF EXISTS public.admision_postulantes_id_seq;
DROP TABLE IF EXISTS public.admision_postulantes;
DROP EXTENSION IF EXISTS pgcrypto;
--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admision_postulantes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admision_postulantes (
    id integer NOT NULL,
    nombre_completo character varying NOT NULL,
    email character varying,
    telefono character varying,
    dni character varying,
    programa_estudio_id integer,
    estado character varying DEFAULT 'postulante'::character varying,
    puntaje numeric(5,2),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.admision_postulantes OWNER TO postgres;

--
-- Name: admision_postulantes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admision_postulantes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admision_postulantes_id_seq OWNER TO postgres;

--
-- Name: admision_postulantes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admision_postulantes_id_seq OWNED BY public.admision_postulantes.id;


--
-- Name: beneficios_estudiante; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.beneficios_estudiante (
    id integer NOT NULL,
    estudiante_id integer,
    tipo_beneficio character varying,
    descripcion text,
    fecha_inicio date,
    fecha_fin date,
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.beneficios_estudiante OWNER TO postgres;

--
-- Name: beneficios_estudiante_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.beneficios_estudiante_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.beneficios_estudiante_id_seq OWNER TO postgres;

--
-- Name: beneficios_estudiante_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.beneficios_estudiante_id_seq OWNED BY public.beneficios_estudiante.id;


--
-- Name: core_audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.core_audit_logs (
    id integer NOT NULL,
    event_id character varying(50) NOT NULL,
    event_type character varying(100) NOT NULL,
    source character varying(50) NOT NULL,
    payload json NOT NULL,
    user_id integer,
    request_id character varying(50),
    "timestamp" timestamp without time zone DEFAULT now()
);


ALTER TABLE public.core_audit_logs OWNER TO postgres;

--
-- Name: core_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.core_audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.core_audit_logs_id_seq OWNER TO postgres;

--
-- Name: core_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.core_audit_logs_id_seq OWNED BY public.core_audit_logs.id;


--
-- Name: core_modules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.core_modules (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    version character varying(20) NOT NULL,
    api_version character varying(20),
    description character varying(255),
    endpoints json NOT NULL,
    events json,
    permissions json,
    health_check character varying(100),
    config json,
    status character varying(50),
    is_active boolean DEFAULT true,
    registered_at timestamp without time zone,
    last_health_check timestamp without time zone,
    compliance_data json
);


ALTER TABLE public.core_modules OWNER TO postgres;

--
-- Name: core_modules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.core_modules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.core_modules_id_seq OWNER TO postgres;

--
-- Name: core_modules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.core_modules_id_seq OWNED BY public.core_modules.id;


--
-- Name: core_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.core_permissions (
    id integer NOT NULL,
    name character varying NOT NULL,
    description character varying,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.core_permissions OWNER TO postgres;

--
-- Name: core_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.core_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.core_permissions_id_seq OWNER TO postgres;

--
-- Name: core_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.core_permissions_id_seq OWNED BY public.core_permissions.id;


--
-- Name: core_role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.core_role_permissions (
    role_id integer,
    permission_id integer
);


ALTER TABLE public.core_role_permissions OWNER TO postgres;

--
-- Name: core_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.core_roles (
    id integer NOT NULL,
    name character varying NOT NULL,
    description character varying,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.core_roles OWNER TO postgres;

--
-- Name: core_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.core_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.core_roles_id_seq OWNER TO postgres;

--
-- Name: core_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.core_roles_id_seq OWNED BY public.core_roles.id;


--
-- Name: core_user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.core_user_roles (
    user_id integer,
    role_id integer
);


ALTER TABLE public.core_user_roles OWNER TO postgres;

--
-- Name: core_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.core_users (
    id integer NOT NULL,
    email character varying NOT NULL,
    full_name character varying,
    hashed_password character varying NOT NULL,
    is_active boolean DEFAULT true,
    is_superuser boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone
);


ALTER TABLE public.core_users OWNER TO postgres;

--
-- Name: core_users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.core_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.core_users_id_seq OWNER TO postgres;

--
-- Name: core_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.core_users_id_seq OWNED BY public.core_users.id;


--
-- Name: estudiantes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.estudiantes (
    id integer NOT NULL,
    codigo character varying NOT NULL,
    nombre_completo character varying NOT NULL,
    email character varying,
    telefono character varying,
    programa_estudio_id integer,
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.estudiantes OWNER TO postgres;

--
-- Name: estudiantes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.estudiantes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.estudiantes_id_seq OWNER TO postgres;

--
-- Name: estudiantes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.estudiantes_id_seq OWNED BY public.estudiantes.id;


--
-- Name: evaluacion_registros; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evaluacion_registros (
    id integer NOT NULL,
    estudiante_id integer,
    docente_id integer,
    curso character varying,
    nota numeric(3,1),
    periodo_academico_id integer,
    observaciones text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.evaluacion_registros OWNER TO postgres;

--
-- Name: evaluacion_registros_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.evaluacion_registros_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.evaluacion_registros_id_seq OWNER TO postgres;

--
-- Name: evaluacion_registros_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.evaluacion_registros_id_seq OWNED BY public.evaluacion_registros.id;


--
-- Name: historial_academico; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.historial_academico (
    id integer NOT NULL,
    estudiante_id integer,
    matricula_id integer,
    curso character varying,
    nota numeric(3,1),
    creditos integer,
    estado character varying,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.historial_academico OWNER TO postgres;

--
-- Name: historial_academico_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.historial_academico_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.historial_academico_id_seq OWNER TO postgres;

--
-- Name: historial_academico_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.historial_academico_id_seq OWNED BY public.historial_academico.id;


--
-- Name: matriculas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.matriculas (
    id integer NOT NULL,
    estudiante_id integer,
    periodo_academico_id integer,
    programa_estudio_id integer,
    semestre integer,
    estado character varying DEFAULT 'activo'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.matriculas OWNER TO postgres;

--
-- Name: matriculas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.matriculas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.matriculas_id_seq OWNER TO postgres;

--
-- Name: matriculas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.matriculas_id_seq OWNED BY public.matriculas.id;


--
-- Name: outbox_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.outbox_events (
    id integer NOT NULL,
    event_type character varying NOT NULL,
    payload json NOT NULL,
    processed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.outbox_events OWNER TO postgres;

--
-- Name: outbox_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.outbox_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.outbox_events_id_seq OWNER TO postgres;

--
-- Name: outbox_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.outbox_events_id_seq OWNED BY public.outbox_events.id;


--
-- Name: perfiles_personal; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.perfiles_personal (
    id integer NOT NULL,
    user_id integer,
    nombre_completo character varying,
    cargo character varying,
    departamento character varying,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.perfiles_personal OWNER TO postgres;

--
-- Name: perfiles_personal_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.perfiles_personal_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.perfiles_personal_id_seq OWNER TO postgres;

--
-- Name: perfiles_personal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.perfiles_personal_id_seq OWNED BY public.perfiles_personal.id;


--
-- Name: periodos_academicos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.periodos_academicos (
    id integer NOT NULL,
    nombre character varying NOT NULL,
    anio integer NOT NULL,
    semestre integer,
    fecha_inicio date,
    fecha_fin date,
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.periodos_academicos OWNER TO postgres;

--
-- Name: periodos_academicos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.periodos_academicos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.periodos_academicos_id_seq OWNER TO postgres;

--
-- Name: periodos_academicos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.periodos_academicos_id_seq OWNED BY public.periodos_academicos.id;


--
-- Name: planes_estudio; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.planes_estudio (
    id integer NOT NULL,
    codigo character varying NOT NULL,
    nombre character varying NOT NULL,
    version character varying,
    total_creditos integer,
    total_horas integer,
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.planes_estudio OWNER TO postgres;

--
-- Name: planes_estudio_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.planes_estudio_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.planes_estudio_id_seq OWNER TO postgres;

--
-- Name: planes_estudio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.planes_estudio_id_seq OWNED BY public.planes_estudio.id;


--
-- Name: programas_estudio; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.programas_estudio (
    id integer NOT NULL,
    codigo character varying NOT NULL,
    nombre character varying NOT NULL,
    plan_estudio_id integer,
    duracion_semestres integer,
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.programas_estudio OWNER TO postgres;

--
-- Name: programas_estudio_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.programas_estudio_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.programas_estudio_id_seq OWNER TO postgres;

--
-- Name: programas_estudio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.programas_estudio_id_seq OWNED BY public.programas_estudio.id;


--
-- Name: registros_practicas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.registros_practicas (
    id integer NOT NULL,
    estudiante_id integer,
    institucion character varying,
    fecha_inicio date,
    fecha_fin date,
    horas integer,
    estado character varying,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.registros_practicas OWNER TO postgres;

--
-- Name: registros_practicas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.registros_practicas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.registros_practicas_id_seq OWNER TO postgres;

--
-- Name: registros_practicas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.registros_practicas_id_seq OWNED BY public.registros_practicas.id;


--
-- Name: resoluciones_convalidacion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resoluciones_convalidacion (
    id integer NOT NULL,
    estudiante_id integer,
    resolucion_numero character varying,
    fecha date,
    observaciones text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.resoluciones_convalidacion OWNER TO postgres;

--
-- Name: resoluciones_convalidacion_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.resoluciones_convalidacion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.resoluciones_convalidacion_id_seq OWNER TO postgres;

--
-- Name: resoluciones_convalidacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.resoluciones_convalidacion_id_seq OWNED BY public.resoluciones_convalidacion.id;


--
-- Name: solicitudes_tramites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.solicitudes_tramites (
    id integer NOT NULL,
    estudiante_id integer,
    tipo_tramite character varying,
    estado character varying DEFAULT 'pendiente'::character varying,
    observaciones text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.solicitudes_tramites OWNER TO postgres;

--
-- Name: solicitudes_tramites_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.solicitudes_tramites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.solicitudes_tramites_id_seq OWNER TO postgres;

--
-- Name: solicitudes_tramites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.solicitudes_tramites_id_seq OWNED BY public.solicitudes_tramites.id;


--
-- Name: admision_postulantes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admision_postulantes ALTER COLUMN id SET DEFAULT nextval('public.admision_postulantes_id_seq'::regclass);


--
-- Name: beneficios_estudiante id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.beneficios_estudiante ALTER COLUMN id SET DEFAULT nextval('public.beneficios_estudiante_id_seq'::regclass);


--
-- Name: core_audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.core_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.core_audit_logs_id_seq'::regclass);


--
-- Name: core_modules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.core_modules ALTER COLUMN id SET DEFAULT nextval('public.core_modules_id_seq'::regclass);


--
-- Name: core_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.core_permissions ALTER COLUMN id SET DEFAULT nextval('public.core_permissions_id_seq'::regclass);


--
-- Name: core_roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.core_roles ALTER COLUMN id SET DEFAULT nextval('public.core_roles_id_seq'::regclass);


--
-- Name: core_users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.core_users ALTER COLUMN id SET DEFAULT nextval('public.core_users_id_seq'::regclass);


--
-- Name: estudiantes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estudiantes ALTER COLUMN id SET DEFAULT nextval('public.estudiantes_id_seq'::regclass);


--
-- Name: evaluacion_registros id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluacion_registros ALTER COLUMN id SET DEFAULT nextval('public.evaluacion_registros_id_seq'::regclass);


--
-- Name: historial_academico id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_academico ALTER COLUMN id SET DEFAULT nextval('public.historial_academico_id_seq'::regclass);


--
-- Name: matriculas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matriculas ALTER COLUMN id SET DEFAULT nextval('public.matriculas_id_seq'::regclass);


--
-- Name: outbox_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.outbox_events ALTER COLUMN id SET DEFAULT nextval('public.outbox_events_id_seq'::regclass);


--
-- Name: perfiles_personal id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.perfiles_personal ALTER COLUMN id SET DEFAULT nextval('public.perfiles_personal_id_seq'::regclass);


--
-- Name: periodos_academicos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.periodos_academicos ALTER COLUMN id SET DEFAULT nextval('public.periodos_academicos_id_seq'::regclass);


--
-- Name: planes_estudio id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planes_estudio ALTER COLUMN id SET DEFAULT nextval('public.planes_estudio_id_seq'::regclass);


--
-- Name: programas_estudio id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programas_estudio ALTER COLUMN id SET DEFAULT nextval('public.programas_estudio_id_seq'::regclass);


--
-- Name: registros_practicas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registros_practicas ALTER COLUMN id SET DEFAULT nextval('public.registros_practicas_id_seq'::regclass);


--
-- Name: resoluciones_convalidacion id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resoluciones_convalidacion ALTER COLUMN id SET DEFAULT nextval('public.resoluciones_convalidacion_id_seq'::regclass);


--
-- Name: solicitudes_tramites id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitudes_tramites ALTER COLUMN id SET DEFAULT nextval('public.solicitudes_tramites_id_seq'::regclass);


--
-- Data for Name: admision_postulantes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admision_postulantes (id, nombre_completo, email, telefono, dni, programa_estudio_id, estado, puntaje, created_at) FROM stdin;
\.


--
-- Data for Name: beneficios_estudiante; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.beneficios_estudiante (id, estudiante_id, tipo_beneficio, descripcion, fecha_inicio, fecha_fin, activo, created_at) FROM stdin;
\.


--
-- Data for Name: core_audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.core_audit_logs (id, event_id, event_type, source, payload, user_id, request_id, "timestamp") FROM stdin;
\.


--
-- Data for Name: core_modules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.core_modules (id, name, version, api_version, description, endpoints, events, permissions, health_check, config, status, is_active, registered_at, last_health_check, compliance_data) FROM stdin;
2	mod-evaluacion	1.0.0	v1	Módulo de registro de notas, promedios y evaluación	{"http": "http://localhost:8008", "health_check": "/health"}	{"publishes": ["evaluacion.nota.registrada", "evaluacion.promedio.calculado"], "consumes": ["gestion_academica.matricula.confirmada"]}	["evaluacion:read", "evaluacion:write", "evaluacion:admin"]	/health	{}	offline	t	2026-08-20 23:58:27.098078	\N	{"compliant": true, "standard_version": "1.0", "validation_date": "2026-08-21T16:44:15.494744", "summary": {"passed": 5, "total": 5, "percentage": 100.0}, "steps": [{"step": "schema_validation", "valid": true, "details": "Esquema Pydantic v\\u00e1lido"}, {"step": "name_validation", "valid": true, "details": "Nombre 'mod-evaluacion' v\\u00e1lido"}, {"step": "folder_structure", "valid": true, "details": "main.py encontrado"}, {"step": "health_check", "valid": true, "details": "Health check deshabilitado temporalmente"}, {"step": "availability", "valid": true, "details": "Validaci\\u00f3n de disponibilidad deshabilitada temporalmente"}], "manifest": {"name": "mod-evaluacion", "version": "1.0.0", "api_version": "v1", "description": "M\\u00f3dulo de registro de notas, promedios y evaluaci\\u00f3n", "endpoints": {"http": "http://localhost:8008", "health_check": "/health"}, "health_check": "/health", "events": {"publishes": ["evaluacion.nota.registrada", "evaluacion.promedio.calculado"], "consumes": ["gestion_academica.matricula.confirmada"]}, "permissions": ["evaluacion:read", "evaluacion:write", "evaluacion:admin"], "config": {}, "author": "SIGA Architecture Team", "dependencies": ["mod-gestion-academica", "mod-planes-estudio"]}}
3	mod-gestion-academica	2.0.0	v1	Módulo centralizado de estudiantes y sus matrículas (Boundary Fusion).	{"http": "http://mod-gestion-academica:8006", "health": "/health", "ready": "/ready", "manifest": "/manifest"}	{"publishes": ["gestion_academica.estudiante.creado", "gestion_academica.matricula.confirmada"], "subscribes": ["core.started"]}	["mod-gestion-academica:read", "mod-gestion-academica:write", "mod-gestion-academica:admin"]	/health	{"database": {"db_name": "mod_gestion_academica", "pool_size": 5, "max_overflow": 10}, "port": 8006, "timeout": 30}	offline	t	2026-08-20 23:58:28.333437	\N	{"compliant": true, "standard_version": "1.0", "validation_date": "2026-08-21T16:44:17.555233", "summary": {"passed": 5, "total": 5, "percentage": 100.0}, "steps": [{"step": "schema_validation", "valid": true, "details": "Esquema Pydantic v\\u00e1lido"}, {"step": "name_validation", "valid": true, "details": "Nombre 'mod-gestion-academica' v\\u00e1lido"}, {"step": "folder_structure", "valid": true, "details": "main.py encontrado"}, {"step": "health_check", "valid": true, "details": "Health check deshabilitado temporalmente"}, {"step": "availability", "valid": true, "details": "Validaci\\u00f3n de disponibilidad deshabilitada temporalmente"}], "manifest": {"name": "mod-gestion-academica", "version": "2.0.0", "api_version": "v1", "description": "M\\u00f3dulo centralizado de estudiantes y sus matr\\u00edculas (Boundary Fusion).", "endpoints": {"http": "http://mod-gestion-academica:8006", "health": "/health", "ready": "/ready", "manifest": "/manifest"}, "health_check": "/health", "events": {"publishes": ["gestion_academica.estudiante.creado", "gestion_academica.matricula.confirmada"], "subscribes": ["core.started"]}, "permissions": ["mod-gestion-academica:read", "mod-gestion-academica:write", "mod-gestion-academica:admin"], "config": {"database": {"db_name": "mod_gestion_academica", "pool_size": 5, "max_overflow": 10}, "port": 8006, "timeout": 30}, "author": "Equipo SIGA", "repository": "https://github.com/siga/mod-gestion-academica", "license": "MIT", "dependencies": {"requires": ["mod-programas-estudio"], "optional": []}, "tags": ["core-data", "fase-1", "gestion-academica"]}}
4	mod-planes-estudio	1.0.0	v1	Gestión de planes de estudio según estándar MINEDU	{"http": "http://mod-planes-estudio:8002"}	{"publishes": [], "subscribes": []}	["mod-planes-estudio:read", "mod-planes-estudio:write", "mod-planes-estudio:admin"]	/health	{"database": "mod_planes_estudio"}	offline	t	2026-08-20 23:58:29.747805	\N	{"compliant": true, "standard_version": "1.0", "validation_date": "2026-08-21T16:44:18.599318", "summary": {"passed": 5, "total": 5, "percentage": 100.0}, "steps": [{"step": "schema_validation", "valid": true, "details": "Esquema Pydantic v\\u00e1lido"}, {"step": "name_validation", "valid": true, "details": "Nombre 'mod-planes-estudio' v\\u00e1lido"}, {"step": "folder_structure", "valid": true, "details": "main.py encontrado"}, {"step": "health_check", "valid": true, "details": "Health check deshabilitado temporalmente"}, {"step": "availability", "valid": true, "details": "Validaci\\u00f3n de disponibilidad deshabilitada temporalmente"}], "manifest": {"name": "mod-planes-estudio", "version": "1.0.0", "api_version": "v1", "description": "Gesti\\u00f3n de planes de estudio seg\\u00fan est\\u00e1ndar MINEDU", "endpoints": {"http": "http://mod-planes-estudio:8002"}, "health_check": "/health", "events": {"publishes": [], "subscribes": []}, "permissions": ["mod-planes-estudio:read", "mod-planes-estudio:write", "mod-planes-estudio:admin"], "config": {"database": "mod_planes_estudio"}}}
5	mod-programas-estudio	1.0.0	v1	Gestión de programas de estudio académicos	{"http": "http://mod-programas-estudio:8005"}	{"publishes": [], "subscribes": []}	["mod-programas-estudio:read", "mod-programas-estudio:write", "mod-programas-estudio:admin"]	/health	{"database": "mod_programas_estudio"}	offline	t	2026-08-20 23:58:31.139388	\N	{"compliant": true, "standard_version": "1.0", "validation_date": "2026-08-21T16:44:19.645834", "summary": {"passed": 5, "total": 5, "percentage": 100.0}, "steps": [{"step": "schema_validation", "valid": true, "details": "Esquema Pydantic v\\u00e1lido"}, {"step": "name_validation", "valid": true, "details": "Nombre 'mod-programas-estudio' v\\u00e1lido"}, {"step": "folder_structure", "valid": true, "details": "main.py encontrado"}, {"step": "health_check", "valid": true, "details": "Health check deshabilitado temporalmente"}, {"step": "availability", "valid": true, "details": "Validaci\\u00f3n de disponibilidad deshabilitada temporalmente"}], "manifest": {"name": "mod-programas-estudio", "version": "1.0.0", "api_version": "v1", "description": "Gesti\\u00f3n de programas de estudio acad\\u00e9micos", "endpoints": {"http": "http://mod-programas-estudio:8005"}, "health_check": "/health", "events": {"publishes": [], "subscribes": []}, "permissions": ["mod-programas-estudio:read", "mod-programas-estudio:write", "mod-programas-estudio:admin"], "config": {"database": "mod_programas_estudio"}}}
1	mod-auditoria	1.0.0	v1	Servicio pasivo de auditoría y trazabilidad	{"http": "http://mod-auditoria:8007", "ws": "ws://mod-auditoria:8007/ws"}	{"publishes": [], "subscribes": ["*.*.*"]}	["auditoria:access", "auditoria:read"]	/health	{}	offline	t	2026-08-20 23:58:24.96327	\N	{"compliant": true, "standard_version": "1.0", "validation_date": "2026-08-21T16:44:12.987417", "summary": {"passed": 5, "total": 5, "percentage": 100.0}, "steps": [{"step": "schema_validation", "valid": true, "details": "Esquema Pydantic v\\u00e1lido"}, {"step": "name_validation", "valid": true, "details": "Nombre 'mod-auditoria' v\\u00e1lido"}, {"step": "folder_structure", "valid": true, "details": "main.py encontrado"}, {"step": "health_check", "valid": true, "details": "Health check deshabilitado temporalmente"}, {"step": "availability", "valid": true, "details": "Validaci\\u00f3n de disponibilidad deshabilitada temporalmente"}], "manifest": {"name": "mod-auditoria", "version": "1.0.0", "api_version": "v1", "description": "Servicio pasivo de auditor\\u00eda y trazabilidad", "endpoints": {"http": "http://mod-auditoria:8007", "ws": "ws://mod-auditoria:8007/ws"}, "health_check": "/health", "events": {"publishes": [], "subscribes": ["*.*.*"]}, "permissions": ["auditoria:access", "auditoria:read"], "config": {}, "author": "SIGA Team", "dependencies": []}}
6	mod-usuarios	1.0.0	v1	Módulo de gestión de usuarios, roles y perfiles (RBAC)	{"http": "http://mod-usuarios:8001", "ws": "ws://mod-usuarios:8001/ws"}	{"publishes": ["usuario.creado", "usuario.actualizado", "usuario.eliminado", "rol.asignado"], "subscribes": []}	["usuarios:read", "usuarios:write", "roles:read", "roles:write"]	/health	{}	offline	t	2026-08-20 23:58:33.330142	\N	{"compliant": true, "standard_version": "1.0", "validation_date": "2026-08-21T16:44:20.687809", "summary": {"passed": 5, "total": 5, "percentage": 100.0}, "steps": [{"step": "schema_validation", "valid": true, "details": "Esquema Pydantic v\\u00e1lido"}, {"step": "name_validation", "valid": true, "details": "Nombre 'mod-usuarios' v\\u00e1lido"}, {"step": "folder_structure", "valid": true, "details": "main.py encontrado"}, {"step": "health_check", "valid": true, "details": "Health check deshabilitado temporalmente"}, {"step": "availability", "valid": true, "details": "Validaci\\u00f3n de disponibilidad deshabilitada temporalmente"}], "manifest": {"name": "mod-usuarios", "version": "1.0.0", "api_version": "v1", "description": "M\\u00f3dulo de gesti\\u00f3n de usuarios, roles y perfiles (RBAC)", "endpoints": {"http": "http://mod-usuarios:8001", "ws": "ws://mod-usuarios:8001/ws"}, "health_check": "/health", "events": {"publishes": ["usuario.creado", "usuario.actualizado", "usuario.eliminado", "rol.asignado"], "subscribes": []}, "permissions": ["usuarios:read", "usuarios:write", "roles:read", "roles:write"], "config": {}, "author": "SIGA Core Team", "dependencies": []}}
\.


--
-- Data for Name: core_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.core_permissions (id, name, description, created_at) FROM stdin;
1	mod-programas-estudio:read	Lectura de Programas y Periodos	2026-08-20 18:09:08.500704-05
2	mod-programas-estudio:write	Escritura de Programas y Periodos	2026-08-20 18:09:08.500704-05
3	mod-usuarios:read	Lectura de Usuarios	2026-08-20 18:09:08.500704-05
4	mod-evaluacion:read	Lectura Evaluaciones	2026-08-20 18:09:08.500704-05
5	mod-evaluacion:write	Escritura Evaluaciones	2026-08-20 18:09:08.500704-05
6	mod-gestion-academica:read	Lectura Gestion Academica	2026-08-20 18:09:08.500704-05
7	mod-gestion-academica:write	Escritura Gestion Academica	2026-08-20 18:09:08.500704-05
8	mod-planes-estudio:read	Lectura Planes Estudio	2026-08-20 18:09:08.500704-05
9	mod-planes-estudio:write	Escritura Planes Estudio	2026-08-20 18:09:08.500704-05
\.


--
-- Data for Name: core_role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.core_role_permissions (role_id, permission_id) FROM stdin;
3	1
3	2
3	3
3	6
3	7
3	8
3	9
4	1
4	3
4	4
6	1
6	4
6	5
6	6
7	1
7	4
7	6
5	1
5	6
5	7
8	1
8	6
8	7
\.


--
-- Data for Name: core_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.core_roles (id, name, description, created_at) FROM stdin;
1	superadmin	Super Administrador del Sistema	2026-08-20 18:08:50.446142-05
2	caja_tesoreria	Caja y Tesoreria	2026-08-20 18:08:50.446142-05
3	secretaria_academica	Secretaria Academica	2026-08-20 18:08:50.446142-05
4	coordinador_programa	Coordinador Programa	2026-08-20 18:08:50.446142-05
5	oficina_admision	Oficina Admision	2026-08-20 18:08:50.446142-05
6	docente	Docente	2026-08-20 18:08:50.446142-05
7	estudiante	Estudiante	2026-08-20 18:08:50.446142-05
8	secretaria_programa	Secretaria de Programa	2026-08-20 18:08:50.446142-05
\.


--
-- Data for Name: core_user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.core_user_roles (user_id, role_id) FROM stdin;
1	1
2	2
3	3
4	4
5	5
6	6
7	7
8	8
\.


--
-- Data for Name: core_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.core_users (id, email, full_name, hashed_password, is_active, is_superuser, created_at, updated_at) FROM stdin;
1	admin@siga.edu	Super Admin	$2a$06$StgW8S5gPPXI5T5wy2M98.os3LJBSc7SCvIUD3r7NMII6Zi041bXm	t	t	2026-08-20 18:08:58.292513-05	\N
2	tesoreria@siga.edu	Caja y Tesoreria	$2a$06$2TBxWUXEjcBo0Av/S.VKWerXwdEdYrjWAhrtkPbIP6pOPyz8326vS	t	f	2026-08-20 18:08:58.292513-05	\N
3	secretaria@siga.edu	Secretaria Academica	$2a$06$GuMNsO/rAroq1Nq8CcJKhezL2tnXzWbCBpQiaHk8LO8CaSLQZKQve	t	f	2026-08-20 18:08:58.292513-05	\N
4	coordinador@siga.edu	Coordinador Programa	$2a$06$crEFsTlW2Kp.t3tyas393e8GfU4KymdTyKKNwbB9vBWEOHjaiaL7y	t	f	2026-08-20 18:08:58.292513-05	\N
5	admision@siga.edu	Oficina Admision	$2a$06$c/9amWnJ7QTPYKguyE4PfOaLdPoeW25BltygCYy3b2dEoSTlLdgdq	t	f	2026-08-20 18:08:58.292513-05	\N
6	docente@siga.edu	Docente	$2a$06$ZSRrnUY85vP9VrxlQICiTOkog4DfcIoI/g8JsnXrBxKevl0din.j2	t	f	2026-08-20 18:08:58.292513-05	\N
7	estudiante@siga.edu	Estudiante	$2a$06$UdbNFfHgIQ.y.KKobCkRj.EhwR0mZHIY/6nV2Er/j33bpdJKf6WbK	t	f	2026-08-20 18:08:58.292513-05	\N
8	secretaria_prog@siga.edu	Secretaria de Programa	$2a$06$MOnqnJ.aOd9NPmNDhTgqVud1vJ8u.xBed4//mAif50qzRaAUcaIaK	t	f	2026-08-20 18:08:58.292513-05	\N
\.


--
-- Data for Name: estudiantes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.estudiantes (id, codigo, nombre_completo, email, telefono, programa_estudio_id, activo, created_at) FROM stdin;
\.


--
-- Data for Name: evaluacion_registros; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.evaluacion_registros (id, estudiante_id, docente_id, curso, nota, periodo_academico_id, observaciones, created_at) FROM stdin;
\.


--
-- Data for Name: historial_academico; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.historial_academico (id, estudiante_id, matricula_id, curso, nota, creditos, estado, created_at) FROM stdin;
\.


--
-- Data for Name: matriculas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.matriculas (id, estudiante_id, periodo_academico_id, programa_estudio_id, semestre, estado, created_at) FROM stdin;
\.


--
-- Data for Name: outbox_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.outbox_events (id, event_type, payload, processed, created_at) FROM stdin;
\.


--
-- Data for Name: perfiles_personal; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.perfiles_personal (id, user_id, nombre_completo, cargo, departamento, created_at) FROM stdin;
\.


--
-- Data for Name: periodos_academicos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.periodos_academicos (id, nombre, anio, semestre, fecha_inicio, fecha_fin, activo, created_at) FROM stdin;
\.


--
-- Data for Name: planes_estudio; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.planes_estudio (id, codigo, nombre, version, total_creditos, total_horas, activo, created_at) FROM stdin;
\.


--
-- Data for Name: programas_estudio; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.programas_estudio (id, codigo, nombre, plan_estudio_id, duracion_semestres, activo, created_at) FROM stdin;
\.


--
-- Data for Name: registros_practicas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.registros_practicas (id, estudiante_id, institucion, fecha_inicio, fecha_fin, horas, estado, created_at) FROM stdin;
\.


--
-- Data for Name: resoluciones_convalidacion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.resoluciones_convalidacion (id, estudiante_id, resolucion_numero, fecha, observaciones, created_at) FROM stdin;
\.


--
-- Data for Name: solicitudes_tramites; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.solicitudes_tramites (id, estudiante_id, tipo_tramite, estado, observaciones, created_at) FROM stdin;
\.


--
-- Name: admision_postulantes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admision_postulantes_id_seq', 1, false);


--
-- Name: beneficios_estudiante_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.beneficios_estudiante_id_seq', 1, false);


--
-- Name: core_audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.core_audit_logs_id_seq', 1, false);


--
-- Name: core_modules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.core_modules_id_seq', 6, true);


--
-- Name: core_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.core_permissions_id_seq', 1, false);


--
-- Name: core_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.core_roles_id_seq', 1, false);


--
-- Name: core_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.core_users_id_seq', 1, false);


--
-- Name: estudiantes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.estudiantes_id_seq', 1, false);


--
-- Name: evaluacion_registros_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.evaluacion_registros_id_seq', 1, false);


--
-- Name: historial_academico_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.historial_academico_id_seq', 1, false);


--
-- Name: matriculas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.matriculas_id_seq', 1, false);


--
-- Name: outbox_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.outbox_events_id_seq', 1, false);


--
-- Name: perfiles_personal_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.perfiles_personal_id_seq', 1, false);


--
-- Name: periodos_academicos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.periodos_academicos_id_seq', 1, false);


--
-- Name: planes_estudio_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.planes_estudio_id_seq', 1, false);


--
-- Name: programas_estudio_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.programas_estudio_id_seq', 1, false);


--
-- Name: registros_practicas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.registros_practicas_id_seq', 1, false);


--
-- Name: resoluciones_convalidacion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.resoluciones_convalidacion_id_seq', 1, false);


--
-- Name: solicitudes_tramites_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.solicitudes_tramites_id_seq', 1, false);


--
-- Name: admision_postulantes admision_postulantes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admision_postulantes
    ADD CONSTRAINT admision_postulantes_pkey PRIMARY KEY (id);


--
-- Name: beneficios_estudiante beneficios_estudiante_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.beneficios_estudiante
    ADD CONSTRAINT beneficios_estudiante_pkey PRIMARY KEY (id);


--
-- Name: core_audit_logs core_audit_logs_event_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.core_audit_logs
    ADD CONSTRAINT core_audit_logs_event_id_key UNIQUE (event_id);


--
-- Name: core_audit_logs core_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.core_audit_logs
    ADD CONSTRAINT core_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: core_modules core_modules_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.core_modules
    ADD CONSTRAINT core_modules_name_key UNIQUE (name);


--
-- Name: core_modules core_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.core_modules
    ADD CONSTRAINT core_modules_pkey PRIMARY KEY (id);


--
-- Name: core_permissions core_permissions_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.core_permissions
    ADD CONSTRAINT core_permissions_name_key UNIQUE (name);


--
-- Name: core_permissions core_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.core_permissions
    ADD CONSTRAINT core_permissions_pkey PRIMARY KEY (id);


--
-- Name: core_roles core_roles_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.core_roles
    ADD CONSTRAINT core_roles_name_key UNIQUE (name);


--
-- Name: core_roles core_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.core_roles
    ADD CONSTRAINT core_roles_pkey PRIMARY KEY (id);


--
-- Name: core_users core_users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.core_users
    ADD CONSTRAINT core_users_email_key UNIQUE (email);


--
-- Name: core_users core_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.core_users
    ADD CONSTRAINT core_users_pkey PRIMARY KEY (id);


--
-- Name: estudiantes estudiantes_codigo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estudiantes
    ADD CONSTRAINT estudiantes_codigo_key UNIQUE (codigo);


--
-- Name: estudiantes estudiantes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estudiantes
    ADD CONSTRAINT estudiantes_pkey PRIMARY KEY (id);


--
-- Name: evaluacion_registros evaluacion_registros_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluacion_registros
    ADD CONSTRAINT evaluacion_registros_pkey PRIMARY KEY (id);


--
-- Name: historial_academico historial_academico_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_academico
    ADD CONSTRAINT historial_academico_pkey PRIMARY KEY (id);


--
-- Name: matriculas matriculas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matriculas
    ADD CONSTRAINT matriculas_pkey PRIMARY KEY (id);


--
-- Name: outbox_events outbox_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.outbox_events
    ADD CONSTRAINT outbox_events_pkey PRIMARY KEY (id);


--
-- Name: perfiles_personal perfiles_personal_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.perfiles_personal
    ADD CONSTRAINT perfiles_personal_pkey PRIMARY KEY (id);


--
-- Name: periodos_academicos periodos_academicos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.periodos_academicos
    ADD CONSTRAINT periodos_academicos_pkey PRIMARY KEY (id);


--
-- Name: planes_estudio planes_estudio_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planes_estudio
    ADD CONSTRAINT planes_estudio_pkey PRIMARY KEY (id);


--
-- Name: programas_estudio programas_estudio_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programas_estudio
    ADD CONSTRAINT programas_estudio_pkey PRIMARY KEY (id);


--
-- Name: registros_practicas registros_practicas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registros_practicas
    ADD CONSTRAINT registros_practicas_pkey PRIMARY KEY (id);


--
-- Name: resoluciones_convalidacion resoluciones_convalidacion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resoluciones_convalidacion
    ADD CONSTRAINT resoluciones_convalidacion_pkey PRIMARY KEY (id);


--
-- Name: solicitudes_tramites solicitudes_tramites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitudes_tramites
    ADD CONSTRAINT solicitudes_tramites_pkey PRIMARY KEY (id);


--
-- Name: ix_core_audit_logs_event_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_core_audit_logs_event_id ON public.core_audit_logs USING btree (event_id);


--
-- Name: ix_core_audit_logs_event_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_core_audit_logs_event_type ON public.core_audit_logs USING btree (event_type);


--
-- Name: ix_core_audit_logs_request_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_core_audit_logs_request_id ON public.core_audit_logs USING btree (request_id);


--
-- Name: ix_core_audit_logs_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_core_audit_logs_source ON public.core_audit_logs USING btree (source);


--
-- Name: ix_core_audit_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_core_audit_logs_user_id ON public.core_audit_logs USING btree (user_id);


--
-- Name: ix_core_modules_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_core_modules_id ON public.core_modules USING btree (id);


--
-- Name: ix_core_modules_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_core_modules_name ON public.core_modules USING btree (name);


--
-- Name: ix_core_permissions_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_core_permissions_id ON public.core_permissions USING btree (id);


--
-- Name: ix_core_permissions_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_core_permissions_name ON public.core_permissions USING btree (name);


--
-- Name: ix_core_roles_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_core_roles_id ON public.core_roles USING btree (id);


--
-- Name: ix_core_roles_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_core_roles_name ON public.core_roles USING btree (name);


--
-- Name: ix_core_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_core_users_email ON public.core_users USING btree (email);


--
-- Name: ix_core_users_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_core_users_id ON public.core_users USING btree (id);


--
-- Name: admision_postulantes admision_postulantes_programa_estudio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admision_postulantes
    ADD CONSTRAINT admision_postulantes_programa_estudio_id_fkey FOREIGN KEY (programa_estudio_id) REFERENCES public.programas_estudio(id);


--
-- Name: beneficios_estudiante beneficios_estudiante_estudiante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.beneficios_estudiante
    ADD CONSTRAINT beneficios_estudiante_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES public.estudiantes(id);


--
-- Name: core_role_permissions core_role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.core_role_permissions
    ADD CONSTRAINT core_role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.core_permissions(id) ON DELETE CASCADE;


--
-- Name: core_role_permissions core_role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.core_role_permissions
    ADD CONSTRAINT core_role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.core_roles(id) ON DELETE CASCADE;


--
-- Name: core_user_roles core_user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.core_user_roles
    ADD CONSTRAINT core_user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.core_roles(id) ON DELETE CASCADE;


--
-- Name: core_user_roles core_user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.core_user_roles
    ADD CONSTRAINT core_user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.core_users(id) ON DELETE CASCADE;


--
-- Name: estudiantes estudiantes_programa_estudio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estudiantes
    ADD CONSTRAINT estudiantes_programa_estudio_id_fkey FOREIGN KEY (programa_estudio_id) REFERENCES public.programas_estudio(id);


--
-- Name: evaluacion_registros evaluacion_registros_docente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluacion_registros
    ADD CONSTRAINT evaluacion_registros_docente_id_fkey FOREIGN KEY (docente_id) REFERENCES public.core_users(id);


--
-- Name: evaluacion_registros evaluacion_registros_estudiante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluacion_registros
    ADD CONSTRAINT evaluacion_registros_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES public.estudiantes(id);


--
-- Name: evaluacion_registros evaluacion_registros_periodo_academico_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluacion_registros
    ADD CONSTRAINT evaluacion_registros_periodo_academico_id_fkey FOREIGN KEY (periodo_academico_id) REFERENCES public.periodos_academicos(id);


--
-- Name: historial_academico historial_academico_estudiante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_academico
    ADD CONSTRAINT historial_academico_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES public.estudiantes(id);


--
-- Name: historial_academico historial_academico_matricula_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_academico
    ADD CONSTRAINT historial_academico_matricula_id_fkey FOREIGN KEY (matricula_id) REFERENCES public.matriculas(id);


--
-- Name: matriculas matriculas_estudiante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matriculas
    ADD CONSTRAINT matriculas_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES public.estudiantes(id);


--
-- Name: matriculas matriculas_periodo_academico_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matriculas
    ADD CONSTRAINT matriculas_periodo_academico_id_fkey FOREIGN KEY (periodo_academico_id) REFERENCES public.periodos_academicos(id);


--
-- Name: matriculas matriculas_programa_estudio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matriculas
    ADD CONSTRAINT matriculas_programa_estudio_id_fkey FOREIGN KEY (programa_estudio_id) REFERENCES public.programas_estudio(id);


--
-- Name: perfiles_personal perfiles_personal_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.perfiles_personal
    ADD CONSTRAINT perfiles_personal_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.core_users(id);


--
-- Name: programas_estudio programas_estudio_plan_estudio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programas_estudio
    ADD CONSTRAINT programas_estudio_plan_estudio_id_fkey FOREIGN KEY (plan_estudio_id) REFERENCES public.planes_estudio(id);


--
-- Name: registros_practicas registros_practicas_estudiante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registros_practicas
    ADD CONSTRAINT registros_practicas_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES public.estudiantes(id);


--
-- Name: resoluciones_convalidacion resoluciones_convalidacion_estudiante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resoluciones_convalidacion
    ADD CONSTRAINT resoluciones_convalidacion_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES public.estudiantes(id);


--
-- Name: solicitudes_tramites solicitudes_tramites_estudiante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitudes_tramites
    ADD CONSTRAINT solicitudes_tramites_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES public.estudiantes(id);


--
-- PostgreSQL database dump complete
--

\unrestrict sGRtMDVmCmTjn7k414yOba32rdqeY9RLjExegPuitRsiFZWKfNTe5TcbJBcfORS

