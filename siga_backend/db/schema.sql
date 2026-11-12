--
-- PostgreSQL database dump
--


-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admision_postulantes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admision_postulantes (
    id integer NOT NULL,
    dni character varying(20),
    nombres character varying(100),
    apellidos character varying(100),
    programa_nombre character varying(150),
    modalidad_admision character varying(100),
    email character varying(150),
    celular character varying(20),
    fecha_nacimiento character varying(20),
    metadata_admision json,
    sincronizado boolean
);


--
-- Name: admision_postulantes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admision_postulantes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admision_postulantes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admision_postulantes_id_seq OWNED BY public.admision_postulantes.id;


--
-- Name: bak_estudiantes_programa_20261021; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bak_estudiantes_programa_20261021 (
    id integer,
    codigo_estudiante character varying(20),
    dni character varying(15),
    nombres character varying(100),
    apellidos character varying(100),
    programa_id integer
);


--
-- Name: bak_programas_plan_20261021; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bak_programas_plan_20261021 (
    id integer,
    nombre character varying(255),
    plan_estudio_id integer
);


--
-- Name: beneficios_estudiante; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.beneficios_estudiante (
    estudiante_id integer NOT NULL,
    tipo_beneficio character varying(100) NOT NULL,
    porcentaje_descuento double precision NOT NULL,
    condicion_mantenimiento character varying(255),
    periodo_validez_inicio_id integer NOT NULL,
    periodo_validez_fin_id integer,
    activo boolean,
    id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: beneficios_estudiante_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.beneficios_estudiante_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: beneficios_estudiante_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.beneficios_estudiante_id_seq OWNED BY public.beneficios_estudiante.id;


--
-- Name: carga_lectiva; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.carga_lectiva (
    periodo_id integer NOT NULL,
    programa_id integer NOT NULL,
    docente_id integer NOT NULL,
    unidad_didactica_id integer NOT NULL,
    turno character varying(50),
    seccion character varying(10),
    estado character varying(30),
    id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: carga_lectiva_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.carga_lectiva_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: carga_lectiva_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.carga_lectiva_id_seq OWNED BY public.carga_lectiva.id;


--
-- Name: convalidaciones_detalle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.convalidaciones_detalle (
    resolucion_id integer NOT NULL,
    unidad_destino_id integer NOT NULL,
    curso_origen character varying(255) NOT NULL,
    nota_reconocida double precision,
    creditos_reconocidos integer,
    id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: convalidaciones_detalle_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.convalidaciones_detalle_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: convalidaciones_detalle_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.convalidaciones_detalle_id_seq OWNED BY public.convalidaciones_detalle.id;


--
-- Name: core_audit_logs; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: core_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.core_audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: core_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.core_audit_logs_id_seq OWNED BY public.core_audit_logs.id;


--
-- Name: core_modules; Type: TABLE; Schema: public; Owner: -
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
    is_active boolean,
    registered_at timestamp without time zone,
    last_health_check timestamp without time zone,
    compliance_data json
);


--
-- Name: core_modules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.core_modules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: core_modules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.core_modules_id_seq OWNED BY public.core_modules.id;


--
-- Name: core_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.core_permissions (
    id integer NOT NULL,
    name character varying NOT NULL,
    description character varying,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: core_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.core_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: core_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.core_permissions_id_seq OWNED BY public.core_permissions.id;


--
-- Name: core_role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.core_role_permissions (
    role_id integer,
    permission_id integer
);


--
-- Name: core_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.core_roles (
    id integer NOT NULL,
    name character varying NOT NULL,
    description character varying,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: core_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.core_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: core_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.core_roles_id_seq OWNED BY public.core_roles.id;


--
-- Name: core_user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.core_user_roles (
    user_id integer,
    role_id integer
);


--
-- Name: core_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.core_users (
    id integer NOT NULL,
    email character varying NOT NULL,
    full_name character varying,
    hashed_password character varying NOT NULL,
    is_active boolean,
    is_superuser boolean,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone
);


--
-- Name: core_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.core_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: core_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.core_users_id_seq OWNED BY public.core_users.id;


--
-- Name: estudiantes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estudiantes (
    codigo_estudiante character varying(20) NOT NULL,
    dni character varying(15) NOT NULL,
    nombres character varying(100) NOT NULL,
    apellidos character varying(100) NOT NULL,
    fecha_nacimiento date,
    email_institucional character varying(150),
    email_personal character varying(150),
    celular character varying(20),
    direccion_domicilio character varying(255),
    estado_academico character varying(30),
    foto_url text,
    observaciones text,
    id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    documentos_completos boolean DEFAULT true,
    fecha_limite_documentos timestamp without time zone,
    pago_matricula boolean DEFAULT false,
    programa_id integer,
    modalidad_admision character varying(100) DEFAULT 'ORDINARIO'::character varying,
    metadata_admision jsonb DEFAULT '{}'::jsonb,
    plan_estudios_id integer,
    ciclo_actual integer DEFAULT 1
);


--
-- Name: estudiantes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estudiantes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: estudiantes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estudiantes_id_seq OWNED BY public.estudiantes.id;


--
-- Name: evaluacion_registros; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evaluacion_registros (
    matricula_detalle_id integer NOT NULL,
    estudiante_id integer NOT NULL,
    unidad_didactica_id integer NOT NULL,
    periodo_id integer NOT NULL,
    nota_c1 integer,
    nota_c2 integer,
    nota_c3 integer,
    nota_final integer,
    estado character varying(20),
    id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: evaluacion_registros_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.evaluacion_registros_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: evaluacion_registros_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.evaluacion_registros_id_seq OWNED BY public.evaluacion_registros.id;


--
-- Name: historial_academico; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.historial_academico (
    estudiante_id integer NOT NULL,
    periodo_id integer,
    estado character varying(50) NOT NULL,
    fecha_registro date,
    resolucion character varying(100),
    observaciones text,
    id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: historial_academico_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.historial_academico_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: historial_academico_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.historial_academico_id_seq OWNED BY public.historial_academico.id;


--
-- Name: horarios_periodo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.horarios_periodo (
    periodo_id integer NOT NULL,
    programa_id integer NOT NULL,
    estado character varying(30),
    archivo_excel_url character varying(255) NOT NULL,
    observaciones text,
    id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: horarios_periodo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.horarios_periodo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: horarios_periodo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.horarios_periodo_id_seq OWNED BY public.horarios_periodo.id;


--
-- Name: matricula_detalles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matricula_detalles (
    matricula_id integer NOT NULL,
    unidad_didactica_id integer NOT NULL,
    creditos integer NOT NULL,
    estado_curso character varying(30),
    id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: matricula_detalles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.matricula_detalles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: matricula_detalles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.matricula_detalles_id_seq OWNED BY public.matricula_detalles.id;


--
-- Name: matriculas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matriculas (
    estudiante_id integer NOT NULL,
    programa_id integer NOT NULL,
    periodo_id integer NOT NULL,
    tipo_ingreso character varying(50),
    estado_matricula character varying(30),
    observaciones character varying(255),
    id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    ciclo integer,
    casuistica character varying(50),
    boleta_codigo character varying(64),
    boleta_emitida_en timestamp without time zone,
    consolidada boolean DEFAULT false,
    registro_academico character varying(50)
);


--
-- Name: matriculas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.matriculas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: matriculas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.matriculas_id_seq OWNED BY public.matriculas.id;


--
-- Name: modulos_plan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modulos_plan (
    plan_id integer NOT NULL,
    codigo character varying(50),
    nombre character varying(255) NOT NULL,
    horas integer,
    creditos integer,
    orden integer,
    id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: modulos_plan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.modulos_plan_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: modulos_plan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.modulos_plan_id_seq OWNED BY public.modulos_plan.id;


--
-- Name: outbox_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outbox_events (
    event_type character varying(100) NOT NULL,
    payload json NOT NULL,
    published boolean,
    id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: outbox_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.outbox_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: outbox_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.outbox_events_id_seq OWNED BY public.outbox_events.id;


--
-- Name: perfiles_personal; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.perfiles_personal (
    id integer NOT NULL,
    user_id integer NOT NULL,
    condicion_laboral character varying(50) NOT NULL,
    numero_resolucion character varying(100),
    fecha_fin_contrato timestamp without time zone,
    cargo_funcional character varying(50) NOT NULL,
    profesion_titulo character varying(200),
    programa_estudio_id integer
);


--
-- Name: perfiles_personal_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.perfiles_personal_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: perfiles_personal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.perfiles_personal_id_seq OWNED BY public.perfiles_personal.id;


--
-- Name: periodos_academicos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.periodos_academicos (
    codigo character varying(20) NOT NULL,
    fecha_inicio timestamp without time zone NOT NULL,
    fecha_fin timestamp without time zone NOT NULL,
    estado character varying(20),
    id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    fecha_fin_matricula_regular timestamp without time zone,
    fecha_fin_matricula_extemporanea timestamp without time zone
);


--
-- Name: periodos_academicos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.periodos_academicos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: periodos_academicos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.periodos_academicos_id_seq OWNED BY public.periodos_academicos.id;


--
-- Name: planes_estudio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.planes_estudio (
    codigo character varying(50) NOT NULL,
    nombre character varying(255) NOT NULL,
    descripcion text,
    nivel_formativo character varying(100),
    creditos_totales integer,
    horas_totales integer,
    fecha_aprobacion date,
    resolucion_aprobacion character varying(100),
    estado character varying(20),
    id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: planes_estudio_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.planes_estudio_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: planes_estudio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.planes_estudio_id_seq OWNED BY public.planes_estudio.id;


--
-- Name: planes_trabajo_docente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.planes_trabajo_docente (
    periodo_id integer NOT NULL,
    programa_id integer NOT NULL,
    docente_id integer NOT NULL,
    estado character varying(30),
    archivo_url character varying(255),
    observaciones text,
    id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: planes_trabajo_docente_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.planes_trabajo_docente_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: planes_trabajo_docente_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.planes_trabajo_docente_id_seq OWNED BY public.planes_trabajo_docente.id;


--
-- Name: programa_configuraciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.programa_configuraciones (
    programa_id integer NOT NULL,
    periodo_academico integer NOT NULL,
    turnos json,
    coordinador_id integer,
    max_estudiantes integer,
    id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: programa_configuraciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.programa_configuraciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: programa_configuraciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.programa_configuraciones_id_seq OWNED BY public.programa_configuraciones.id;


--
-- Name: programa_modulos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.programa_modulos (
    programa_id integer NOT NULL,
    modulo_plan_id integer,
    nombre character varying(255) NOT NULL,
    periodo integer NOT NULL,
    horas_totales integer,
    creditos integer,
    orden integer,
    id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: programa_modulos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.programa_modulos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: programa_modulos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.programa_modulos_id_seq OWNED BY public.programa_modulos.id;


--
-- Name: programa_requisitos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.programa_requisitos (
    programa_id integer NOT NULL,
    tipo_requisito character varying(100) NOT NULL,
    descripcion text NOT NULL,
    obligatorio boolean,
    id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: programa_requisitos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.programa_requisitos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: programa_requisitos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.programa_requisitos_id_seq OWNED BY public.programa_requisitos.id;


--
-- Name: programa_unidades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.programa_unidades (
    programa_modulo_id integer NOT NULL,
    unidad_plan_id integer,
    nombre character varying(255) NOT NULL,
    horas_teoria integer,
    horas_practica integer,
    creditos integer,
    orden integer,
    id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: programa_unidades_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.programa_unidades_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: programa_unidades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.programa_unidades_id_seq OWNED BY public.programa_unidades.id;


--
-- Name: programas_estudio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.programas_estudio (
    nombre character varying(255) NOT NULL,
    codigo character varying(50) NOT NULL,
    descripcion text,
    duracion_periodos integer,
    creditos_totales integer NOT NULL,
    plan_estudio_id integer,
    modalidad character varying(50),
    estado character varying(20),
    id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: programas_estudio_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.programas_estudio_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: programas_estudio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.programas_estudio_id_seq OWNED BY public.programas_estudio.id;


--
-- Name: registros_practicas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registros_practicas (
    estudiante_id integer NOT NULL,
    modulo_formativo_id integer NOT NULL,
    centro_labores character varying(255) NOT NULL,
    representante_centro character varying(150),
    horas_acumuladas integer,
    estado_aprobacion character varying(50),
    fecha_inicio date,
    fecha_fin date,
    id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: registros_practicas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.registros_practicas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: registros_practicas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.registros_practicas_id_seq OWNED BY public.registros_practicas.id;


--
-- Name: resoluciones_convalidacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resoluciones_convalidacion (
    estudiante_id integer NOT NULL,
    numero_resolucion character varying(100) NOT NULL,
    fecha_emision date NOT NULL,
    tipo_convalidacion character varying(100) NOT NULL,
    institucion_origen character varying(255),
    estado character varying(50),
    id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: resoluciones_convalidacion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.resoluciones_convalidacion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: resoluciones_convalidacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.resoluciones_convalidacion_id_seq OWNED BY public.resoluciones_convalidacion.id;


--
-- Name: silabos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.silabos (
    carga_lectiva_id integer NOT NULL,
    estado character varying(30),
    archivo_url character varying(255),
    observaciones text,
    id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: silabos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.silabos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: silabos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.silabos_id_seq OWNED BY public.silabos.id;


--
-- Name: solicitudes_tramites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.solicitudes_tramites (
    estudiante_id integer NOT NULL,
    tipo_tramite character varying(100) NOT NULL,
    estado character varying(50),
    fecha_solicitud date,
    fecha_resolucion date,
    documento_url character varying(255),
    observaciones text,
    id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: solicitudes_tramites_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.solicitudes_tramites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: solicitudes_tramites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.solicitudes_tramites_id_seq OWNED BY public.solicitudes_tramites.id;


--
-- Name: tesoreria_conceptos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tesoreria_conceptos (
    codigo character varying(30) NOT NULL,
    nombre character varying(255) NOT NULL,
    categoria character varying(100),
    descripcion text,
    tipo_precio character varying(20),
    tarifas json,
    monto_minimo numeric(10,2),
    libera_matricula boolean,
    permite_repetir boolean,
    activo boolean,
    id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: tesoreria_conceptos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tesoreria_conceptos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tesoreria_conceptos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tesoreria_conceptos_id_seq OWNED BY public.tesoreria_conceptos.id;


--
-- Name: tesoreria_configuracion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tesoreria_configuracion (
    clave character varying(50) NOT NULL,
    valor json,
    id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: tesoreria_configuracion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tesoreria_configuracion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tesoreria_configuracion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tesoreria_configuracion_id_seq OWNED BY public.tesoreria_configuracion.id;


--
-- Name: tesoreria_pagos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tesoreria_pagos (
    codigo_recibo character varying(30) NOT NULL,
    estudiante_id integer NOT NULL,
    dni character varying(15) NOT NULL,
    estudiante_nombre character varying(255) NOT NULL,
    codigo_estudiante character varying(20),
    carrera_nombre character varying(255),
    concepto_id integer,
    concepto_codigo character varying(30) NOT NULL,
    concepto_nombre character varying(255) NOT NULL,
    concepto_categoria character varying(100),
    tipo_precio character varying(20),
    tarifa_nombre character varying(100),
    monto numeric(10,2) NOT NULL,
    metodo_pago_id character varying(30) NOT NULL,
    metodo_pago_nombre character varying(100) NOT NULL,
    numero_operacion character varying(100),
    cajero character varying(150),
    registrado_por character varying(150),
    observaciones text,
    libera_matricula boolean,
    estado character varying(20),
    fecha_pago timestamp without time zone NOT NULL,
    qr_contenido text,
    id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: tesoreria_pagos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tesoreria_pagos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tesoreria_pagos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tesoreria_pagos_id_seq OWNED BY public.tesoreria_pagos.id;


--
-- Name: tutorias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tutorias (
    periodo_id integer NOT NULL,
    programa_id integer NOT NULL,
    docente_id integer NOT NULL,
    ciclo integer NOT NULL,
    observaciones text,
    id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: tutorias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tutorias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tutorias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tutorias_id_seq OWNED BY public.tutorias.id;


--
-- Name: unidades_plan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unidades_plan (
    modulo_id integer NOT NULL,
    codigo character varying(50),
    nombre character varying(255) NOT NULL,
    horas integer,
    creditos integer,
    tipo character varying(50),
    orden integer,
    id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: unidades_plan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unidades_plan_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unidades_plan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unidades_plan_id_seq OWNED BY public.unidades_plan.id;


--
-- Name: admision_postulantes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admision_postulantes ALTER COLUMN id SET DEFAULT nextval('public.admision_postulantes_id_seq'::regclass);


--
-- Name: beneficios_estudiante id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beneficios_estudiante ALTER COLUMN id SET DEFAULT nextval('public.beneficios_estudiante_id_seq'::regclass);


--
-- Name: carga_lectiva id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carga_lectiva ALTER COLUMN id SET DEFAULT nextval('public.carga_lectiva_id_seq'::regclass);


--
-- Name: convalidaciones_detalle id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.convalidaciones_detalle ALTER COLUMN id SET DEFAULT nextval('public.convalidaciones_detalle_id_seq'::regclass);


--
-- Name: core_audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.core_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.core_audit_logs_id_seq'::regclass);


--
-- Name: core_modules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.core_modules ALTER COLUMN id SET DEFAULT nextval('public.core_modules_id_seq'::regclass);


--
-- Name: core_permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.core_permissions ALTER COLUMN id SET DEFAULT nextval('public.core_permissions_id_seq'::regclass);


--
-- Name: core_roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.core_roles ALTER COLUMN id SET DEFAULT nextval('public.core_roles_id_seq'::regclass);


--
-- Name: core_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.core_users ALTER COLUMN id SET DEFAULT nextval('public.core_users_id_seq'::regclass);


--
-- Name: estudiantes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudiantes ALTER COLUMN id SET DEFAULT nextval('public.estudiantes_id_seq'::regclass);


--
-- Name: evaluacion_registros id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluacion_registros ALTER COLUMN id SET DEFAULT nextval('public.evaluacion_registros_id_seq'::regclass);


--
-- Name: historial_academico id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_academico ALTER COLUMN id SET DEFAULT nextval('public.historial_academico_id_seq'::regclass);


--
-- Name: horarios_periodo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horarios_periodo ALTER COLUMN id SET DEFAULT nextval('public.horarios_periodo_id_seq'::regclass);


--
-- Name: matricula_detalles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matricula_detalles ALTER COLUMN id SET DEFAULT nextval('public.matricula_detalles_id_seq'::regclass);


--
-- Name: matriculas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matriculas ALTER COLUMN id SET DEFAULT nextval('public.matriculas_id_seq'::regclass);


--
-- Name: modulos_plan id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modulos_plan ALTER COLUMN id SET DEFAULT nextval('public.modulos_plan_id_seq'::regclass);


--
-- Name: outbox_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outbox_events ALTER COLUMN id SET DEFAULT nextval('public.outbox_events_id_seq'::regclass);


--
-- Name: perfiles_personal id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perfiles_personal ALTER COLUMN id SET DEFAULT nextval('public.perfiles_personal_id_seq'::regclass);


--
-- Name: periodos_academicos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodos_academicos ALTER COLUMN id SET DEFAULT nextval('public.periodos_academicos_id_seq'::regclass);


--
-- Name: planes_estudio id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planes_estudio ALTER COLUMN id SET DEFAULT nextval('public.planes_estudio_id_seq'::regclass);


--
-- Name: planes_trabajo_docente id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planes_trabajo_docente ALTER COLUMN id SET DEFAULT nextval('public.planes_trabajo_docente_id_seq'::regclass);


--
-- Name: programa_configuraciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programa_configuraciones ALTER COLUMN id SET DEFAULT nextval('public.programa_configuraciones_id_seq'::regclass);


--
-- Name: programa_modulos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programa_modulos ALTER COLUMN id SET DEFAULT nextval('public.programa_modulos_id_seq'::regclass);


--
-- Name: programa_requisitos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programa_requisitos ALTER COLUMN id SET DEFAULT nextval('public.programa_requisitos_id_seq'::regclass);


--
-- Name: programa_unidades id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programa_unidades ALTER COLUMN id SET DEFAULT nextval('public.programa_unidades_id_seq'::regclass);


--
-- Name: programas_estudio id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programas_estudio ALTER COLUMN id SET DEFAULT nextval('public.programas_estudio_id_seq'::regclass);


--
-- Name: registros_practicas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registros_practicas ALTER COLUMN id SET DEFAULT nextval('public.registros_practicas_id_seq'::regclass);


--
-- Name: resoluciones_convalidacion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resoluciones_convalidacion ALTER COLUMN id SET DEFAULT nextval('public.resoluciones_convalidacion_id_seq'::regclass);


--
-- Name: silabos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.silabos ALTER COLUMN id SET DEFAULT nextval('public.silabos_id_seq'::regclass);


--
-- Name: solicitudes_tramites id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_tramites ALTER COLUMN id SET DEFAULT nextval('public.solicitudes_tramites_id_seq'::regclass);


--
-- Name: tesoreria_conceptos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tesoreria_conceptos ALTER COLUMN id SET DEFAULT nextval('public.tesoreria_conceptos_id_seq'::regclass);


--
-- Name: tesoreria_configuracion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tesoreria_configuracion ALTER COLUMN id SET DEFAULT nextval('public.tesoreria_configuracion_id_seq'::regclass);


--
-- Name: tesoreria_pagos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tesoreria_pagos ALTER COLUMN id SET DEFAULT nextval('public.tesoreria_pagos_id_seq'::regclass);


--
-- Name: tutorias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutorias ALTER COLUMN id SET DEFAULT nextval('public.tutorias_id_seq'::regclass);


--
-- Name: unidades_plan id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades_plan ALTER COLUMN id SET DEFAULT nextval('public.unidades_plan_id_seq'::regclass);


--
-- Name: admision_postulantes admision_postulantes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admision_postulantes
    ADD CONSTRAINT admision_postulantes_pkey PRIMARY KEY (id);


--
-- Name: beneficios_estudiante beneficios_estudiante_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beneficios_estudiante
    ADD CONSTRAINT beneficios_estudiante_pkey PRIMARY KEY (id);


--
-- Name: carga_lectiva carga_lectiva_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carga_lectiva
    ADD CONSTRAINT carga_lectiva_pkey PRIMARY KEY (id);


--
-- Name: convalidaciones_detalle convalidaciones_detalle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.convalidaciones_detalle
    ADD CONSTRAINT convalidaciones_detalle_pkey PRIMARY KEY (id);


--
-- Name: core_audit_logs core_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.core_audit_logs
    ADD CONSTRAINT core_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: core_modules core_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.core_modules
    ADD CONSTRAINT core_modules_pkey PRIMARY KEY (id);


--
-- Name: core_permissions core_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.core_permissions
    ADD CONSTRAINT core_permissions_pkey PRIMARY KEY (id);


--
-- Name: core_roles core_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.core_roles
    ADD CONSTRAINT core_roles_pkey PRIMARY KEY (id);


--
-- Name: core_users core_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.core_users
    ADD CONSTRAINT core_users_pkey PRIMARY KEY (id);


--
-- Name: estudiantes estudiantes_email_institucional_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudiantes
    ADD CONSTRAINT estudiantes_email_institucional_key UNIQUE (email_institucional);


--
-- Name: estudiantes estudiantes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudiantes
    ADD CONSTRAINT estudiantes_pkey PRIMARY KEY (id);


--
-- Name: evaluacion_registros evaluacion_registros_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluacion_registros
    ADD CONSTRAINT evaluacion_registros_pkey PRIMARY KEY (id);


--
-- Name: historial_academico historial_academico_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_academico
    ADD CONSTRAINT historial_academico_pkey PRIMARY KEY (id);


--
-- Name: horarios_periodo horarios_periodo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horarios_periodo
    ADD CONSTRAINT horarios_periodo_pkey PRIMARY KEY (id);


--
-- Name: matricula_detalles matricula_detalles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matricula_detalles
    ADD CONSTRAINT matricula_detalles_pkey PRIMARY KEY (id);


--
-- Name: matriculas matriculas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matriculas
    ADD CONSTRAINT matriculas_pkey PRIMARY KEY (id);


--
-- Name: modulos_plan modulos_plan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modulos_plan
    ADD CONSTRAINT modulos_plan_pkey PRIMARY KEY (id);


--
-- Name: outbox_events outbox_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outbox_events
    ADD CONSTRAINT outbox_events_pkey PRIMARY KEY (id);


--
-- Name: perfiles_personal perfiles_personal_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perfiles_personal
    ADD CONSTRAINT perfiles_personal_pkey PRIMARY KEY (id);


--
-- Name: perfiles_personal perfiles_personal_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perfiles_personal
    ADD CONSTRAINT perfiles_personal_user_id_key UNIQUE (user_id);


--
-- Name: periodos_academicos periodos_academicos_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodos_academicos
    ADD CONSTRAINT periodos_academicos_codigo_key UNIQUE (codigo);


--
-- Name: periodos_academicos periodos_academicos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodos_academicos
    ADD CONSTRAINT periodos_academicos_pkey PRIMARY KEY (id);


--
-- Name: planes_estudio planes_estudio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planes_estudio
    ADD CONSTRAINT planes_estudio_pkey PRIMARY KEY (id);


--
-- Name: planes_trabajo_docente planes_trabajo_docente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planes_trabajo_docente
    ADD CONSTRAINT planes_trabajo_docente_pkey PRIMARY KEY (id);


--
-- Name: programa_configuraciones programa_configuraciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programa_configuraciones
    ADD CONSTRAINT programa_configuraciones_pkey PRIMARY KEY (id);


--
-- Name: programa_modulos programa_modulos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programa_modulos
    ADD CONSTRAINT programa_modulos_pkey PRIMARY KEY (id);


--
-- Name: programa_requisitos programa_requisitos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programa_requisitos
    ADD CONSTRAINT programa_requisitos_pkey PRIMARY KEY (id);


--
-- Name: programa_unidades programa_unidades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programa_unidades
    ADD CONSTRAINT programa_unidades_pkey PRIMARY KEY (id);


--
-- Name: programas_estudio programas_estudio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programas_estudio
    ADD CONSTRAINT programas_estudio_pkey PRIMARY KEY (id);


--
-- Name: registros_practicas registros_practicas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registros_practicas
    ADD CONSTRAINT registros_practicas_pkey PRIMARY KEY (id);


--
-- Name: resoluciones_convalidacion resoluciones_convalidacion_numero_resolucion_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resoluciones_convalidacion
    ADD CONSTRAINT resoluciones_convalidacion_numero_resolucion_key UNIQUE (numero_resolucion);


--
-- Name: resoluciones_convalidacion resoluciones_convalidacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resoluciones_convalidacion
    ADD CONSTRAINT resoluciones_convalidacion_pkey PRIMARY KEY (id);


--
-- Name: silabos silabos_carga_lectiva_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.silabos
    ADD CONSTRAINT silabos_carga_lectiva_id_key UNIQUE (carga_lectiva_id);


--
-- Name: silabos silabos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.silabos
    ADD CONSTRAINT silabos_pkey PRIMARY KEY (id);


--
-- Name: solicitudes_tramites solicitudes_tramites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_tramites
    ADD CONSTRAINT solicitudes_tramites_pkey PRIMARY KEY (id);


--
-- Name: tesoreria_conceptos tesoreria_conceptos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tesoreria_conceptos
    ADD CONSTRAINT tesoreria_conceptos_pkey PRIMARY KEY (id);


--
-- Name: tesoreria_configuracion tesoreria_configuracion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tesoreria_configuracion
    ADD CONSTRAINT tesoreria_configuracion_pkey PRIMARY KEY (id);


--
-- Name: tesoreria_pagos tesoreria_pagos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tesoreria_pagos
    ADD CONSTRAINT tesoreria_pagos_pkey PRIMARY KEY (id);


--
-- Name: tutorias tutorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutorias
    ADD CONSTRAINT tutorias_pkey PRIMARY KEY (id);


--
-- Name: unidades_plan unidades_plan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades_plan
    ADD CONSTRAINT unidades_plan_pkey PRIMARY KEY (id);


--
-- Name: ix_admision_postulantes_dni; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_admision_postulantes_dni ON public.admision_postulantes USING btree (dni);


--
-- Name: ix_admision_postulantes_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_admision_postulantes_id ON public.admision_postulantes USING btree (id);


--
-- Name: ix_beneficios_estudiante_estudiante_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_beneficios_estudiante_estudiante_id ON public.beneficios_estudiante USING btree (estudiante_id);


--
-- Name: ix_beneficios_estudiante_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_beneficios_estudiante_id ON public.beneficios_estudiante USING btree (id);


--
-- Name: ix_beneficios_estudiante_periodo_validez_fin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_beneficios_estudiante_periodo_validez_fin_id ON public.beneficios_estudiante USING btree (periodo_validez_fin_id);


--
-- Name: ix_beneficios_estudiante_periodo_validez_inicio_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_beneficios_estudiante_periodo_validez_inicio_id ON public.beneficios_estudiante USING btree (periodo_validez_inicio_id);


--
-- Name: ix_carga_lectiva_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_carga_lectiva_id ON public.carga_lectiva USING btree (id);


--
-- Name: ix_convalidaciones_detalle_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_convalidaciones_detalle_id ON public.convalidaciones_detalle USING btree (id);


--
-- Name: ix_convalidaciones_detalle_resolucion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_convalidaciones_detalle_resolucion_id ON public.convalidaciones_detalle USING btree (resolucion_id);


--
-- Name: ix_convalidaciones_detalle_unidad_destino_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_convalidaciones_detalle_unidad_destino_id ON public.convalidaciones_detalle USING btree (unidad_destino_id);


--
-- Name: ix_core_audit_logs_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_core_audit_logs_event_id ON public.core_audit_logs USING btree (event_id);


--
-- Name: ix_core_audit_logs_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_core_audit_logs_event_type ON public.core_audit_logs USING btree (event_type);


--
-- Name: ix_core_audit_logs_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_core_audit_logs_request_id ON public.core_audit_logs USING btree (request_id);


--
-- Name: ix_core_audit_logs_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_core_audit_logs_source ON public.core_audit_logs USING btree (source);


--
-- Name: ix_core_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_core_audit_logs_user_id ON public.core_audit_logs USING btree (user_id);


--
-- Name: ix_core_modules_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_core_modules_id ON public.core_modules USING btree (id);


--
-- Name: ix_core_modules_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_core_modules_name ON public.core_modules USING btree (name);


--
-- Name: ix_core_permissions_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_core_permissions_id ON public.core_permissions USING btree (id);


--
-- Name: ix_core_permissions_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_core_permissions_name ON public.core_permissions USING btree (name);


--
-- Name: ix_core_roles_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_core_roles_id ON public.core_roles USING btree (id);


--
-- Name: ix_core_roles_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_core_roles_name ON public.core_roles USING btree (name);


--
-- Name: ix_core_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_core_users_email ON public.core_users USING btree (email);


--
-- Name: ix_core_users_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_core_users_id ON public.core_users USING btree (id);


--
-- Name: ix_estudiantes_codigo_estudiante; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_estudiantes_codigo_estudiante ON public.estudiantes USING btree (codigo_estudiante);


--
-- Name: ix_estudiantes_dni; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_estudiantes_dni ON public.estudiantes USING btree (dni);


--
-- Name: ix_estudiantes_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_estudiantes_id ON public.estudiantes USING btree (id);


--
-- Name: ix_evaluacion_registros_estudiante_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_evaluacion_registros_estudiante_id ON public.evaluacion_registros USING btree (estudiante_id);


--
-- Name: ix_evaluacion_registros_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_evaluacion_registros_id ON public.evaluacion_registros USING btree (id);


--
-- Name: ix_evaluacion_registros_matricula_detalle_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_evaluacion_registros_matricula_detalle_id ON public.evaluacion_registros USING btree (matricula_detalle_id);


--
-- Name: ix_evaluacion_registros_periodo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_evaluacion_registros_periodo_id ON public.evaluacion_registros USING btree (periodo_id);


--
-- Name: ix_evaluacion_registros_unidad_didactica_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_evaluacion_registros_unidad_didactica_id ON public.evaluacion_registros USING btree (unidad_didactica_id);


--
-- Name: ix_historial_academico_estudiante_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_historial_academico_estudiante_id ON public.historial_academico USING btree (estudiante_id);


--
-- Name: ix_historial_academico_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_historial_academico_id ON public.historial_academico USING btree (id);


--
-- Name: ix_historial_academico_periodo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_historial_academico_periodo_id ON public.historial_academico USING btree (periodo_id);


--
-- Name: ix_horarios_periodo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_horarios_periodo_id ON public.horarios_periodo USING btree (id);


--
-- Name: ix_matricula_detalles_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_matricula_detalles_id ON public.matricula_detalles USING btree (id);


--
-- Name: ix_matricula_detalles_matricula_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_matricula_detalles_matricula_id ON public.matricula_detalles USING btree (matricula_id);


--
-- Name: ix_matricula_detalles_unidad_didactica_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_matricula_detalles_unidad_didactica_id ON public.matricula_detalles USING btree (unidad_didactica_id);


--
-- Name: ix_matriculas_estudiante_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_matriculas_estudiante_id ON public.matriculas USING btree (estudiante_id);


--
-- Name: ix_matriculas_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_matriculas_id ON public.matriculas USING btree (id);


--
-- Name: ix_matriculas_periodo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_matriculas_periodo_id ON public.matriculas USING btree (periodo_id);


--
-- Name: ix_matriculas_programa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_matriculas_programa_id ON public.matriculas USING btree (programa_id);


--
-- Name: ix_modulos_plan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_modulos_plan_id ON public.modulos_plan USING btree (id);


--
-- Name: ix_outbox_events_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_outbox_events_id ON public.outbox_events USING btree (id);


--
-- Name: ix_outbox_events_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_outbox_events_published ON public.outbox_events USING btree (published);


--
-- Name: ix_perfiles_personal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_perfiles_personal_id ON public.perfiles_personal USING btree (id);


--
-- Name: ix_periodos_academicos_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_periodos_academicos_id ON public.periodos_academicos USING btree (id);


--
-- Name: ix_planes_estudio_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_planes_estudio_codigo ON public.planes_estudio USING btree (codigo);


--
-- Name: ix_planes_estudio_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_planes_estudio_id ON public.planes_estudio USING btree (id);


--
-- Name: ix_planes_trabajo_docente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_planes_trabajo_docente_id ON public.planes_trabajo_docente USING btree (id);


--
-- Name: ix_programa_configuraciones_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_programa_configuraciones_id ON public.programa_configuraciones USING btree (id);


--
-- Name: ix_programa_modulos_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_programa_modulos_id ON public.programa_modulos USING btree (id);


--
-- Name: ix_programa_requisitos_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_programa_requisitos_id ON public.programa_requisitos USING btree (id);


--
-- Name: ix_programa_unidades_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_programa_unidades_id ON public.programa_unidades USING btree (id);


--
-- Name: ix_programas_estudio_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_programas_estudio_codigo ON public.programas_estudio USING btree (codigo);


--
-- Name: ix_programas_estudio_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_programas_estudio_id ON public.programas_estudio USING btree (id);


--
-- Name: ix_registros_practicas_estudiante_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_registros_practicas_estudiante_id ON public.registros_practicas USING btree (estudiante_id);


--
-- Name: ix_registros_practicas_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_registros_practicas_id ON public.registros_practicas USING btree (id);


--
-- Name: ix_registros_practicas_modulo_formativo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_registros_practicas_modulo_formativo_id ON public.registros_practicas USING btree (modulo_formativo_id);


--
-- Name: ix_resoluciones_convalidacion_estudiante_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_resoluciones_convalidacion_estudiante_id ON public.resoluciones_convalidacion USING btree (estudiante_id);


--
-- Name: ix_resoluciones_convalidacion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_resoluciones_convalidacion_id ON public.resoluciones_convalidacion USING btree (id);


--
-- Name: ix_silabos_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_silabos_id ON public.silabos USING btree (id);


--
-- Name: ix_solicitudes_tramites_estudiante_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_solicitudes_tramites_estudiante_id ON public.solicitudes_tramites USING btree (estudiante_id);


--
-- Name: ix_solicitudes_tramites_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_solicitudes_tramites_id ON public.solicitudes_tramites USING btree (id);


--
-- Name: ix_tesoreria_conceptos_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tesoreria_conceptos_activo ON public.tesoreria_conceptos USING btree (activo);


--
-- Name: ix_tesoreria_conceptos_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tesoreria_conceptos_codigo ON public.tesoreria_conceptos USING btree (codigo);


--
-- Name: ix_tesoreria_conceptos_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tesoreria_conceptos_id ON public.tesoreria_conceptos USING btree (id);


--
-- Name: ix_tesoreria_configuracion_clave; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_tesoreria_configuracion_clave ON public.tesoreria_configuracion USING btree (clave);


--
-- Name: ix_tesoreria_configuracion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tesoreria_configuracion_id ON public.tesoreria_configuracion USING btree (id);


--
-- Name: ix_tesoreria_pagos_codigo_recibo; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_tesoreria_pagos_codigo_recibo ON public.tesoreria_pagos USING btree (codigo_recibo);


--
-- Name: ix_tesoreria_pagos_concepto_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tesoreria_pagos_concepto_codigo ON public.tesoreria_pagos USING btree (concepto_codigo);


--
-- Name: ix_tesoreria_pagos_concepto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tesoreria_pagos_concepto_id ON public.tesoreria_pagos USING btree (concepto_id);


--
-- Name: ix_tesoreria_pagos_dni; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tesoreria_pagos_dni ON public.tesoreria_pagos USING btree (dni);


--
-- Name: ix_tesoreria_pagos_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tesoreria_pagos_estado ON public.tesoreria_pagos USING btree (estado);


--
-- Name: ix_tesoreria_pagos_estudiante_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tesoreria_pagos_estudiante_id ON public.tesoreria_pagos USING btree (estudiante_id);


--
-- Name: ix_tesoreria_pagos_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tesoreria_pagos_id ON public.tesoreria_pagos USING btree (id);


--
-- Name: ix_tutorias_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tutorias_id ON public.tutorias USING btree (id);


--
-- Name: ix_unidades_plan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_unidades_plan_id ON public.unidades_plan USING btree (id);


--
-- Name: beneficios_estudiante beneficios_estudiante_estudiante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beneficios_estudiante
    ADD CONSTRAINT beneficios_estudiante_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES public.estudiantes(id);


--
-- Name: carga_lectiva carga_lectiva_periodo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carga_lectiva
    ADD CONSTRAINT carga_lectiva_periodo_id_fkey FOREIGN KEY (periodo_id) REFERENCES public.periodos_academicos(id);


--
-- Name: carga_lectiva carga_lectiva_programa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carga_lectiva
    ADD CONSTRAINT carga_lectiva_programa_id_fkey FOREIGN KEY (programa_id) REFERENCES public.programas_estudio(id);


--
-- Name: convalidaciones_detalle convalidaciones_detalle_resolucion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.convalidaciones_detalle
    ADD CONSTRAINT convalidaciones_detalle_resolucion_id_fkey FOREIGN KEY (resolucion_id) REFERENCES public.resoluciones_convalidacion(id);


--
-- Name: core_role_permissions core_role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.core_role_permissions
    ADD CONSTRAINT core_role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.core_permissions(id) ON DELETE CASCADE;


--
-- Name: core_role_permissions core_role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.core_role_permissions
    ADD CONSTRAINT core_role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.core_roles(id) ON DELETE CASCADE;


--
-- Name: core_user_roles core_user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.core_user_roles
    ADD CONSTRAINT core_user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.core_roles(id);


--
-- Name: core_user_roles core_user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.core_user_roles
    ADD CONSTRAINT core_user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.core_users(id);


--
-- Name: historial_academico historial_academico_estudiante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_academico
    ADD CONSTRAINT historial_academico_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES public.estudiantes(id);


--
-- Name: horarios_periodo horarios_periodo_periodo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horarios_periodo
    ADD CONSTRAINT horarios_periodo_periodo_id_fkey FOREIGN KEY (periodo_id) REFERENCES public.periodos_academicos(id);


--
-- Name: horarios_periodo horarios_periodo_programa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horarios_periodo
    ADD CONSTRAINT horarios_periodo_programa_id_fkey FOREIGN KEY (programa_id) REFERENCES public.programas_estudio(id);


--
-- Name: matricula_detalles matricula_detalles_matricula_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matricula_detalles
    ADD CONSTRAINT matricula_detalles_matricula_id_fkey FOREIGN KEY (matricula_id) REFERENCES public.matriculas(id);


--
-- Name: matriculas matriculas_estudiante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matriculas
    ADD CONSTRAINT matriculas_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES public.estudiantes(id);


--
-- Name: modulos_plan modulos_plan_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modulos_plan
    ADD CONSTRAINT modulos_plan_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.planes_estudio(id);


--
-- Name: perfiles_personal perfiles_personal_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perfiles_personal
    ADD CONSTRAINT perfiles_personal_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.core_users(id) ON DELETE CASCADE;


--
-- Name: planes_trabajo_docente planes_trabajo_docente_periodo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planes_trabajo_docente
    ADD CONSTRAINT planes_trabajo_docente_periodo_id_fkey FOREIGN KEY (periodo_id) REFERENCES public.periodos_academicos(id);


--
-- Name: planes_trabajo_docente planes_trabajo_docente_programa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planes_trabajo_docente
    ADD CONSTRAINT planes_trabajo_docente_programa_id_fkey FOREIGN KEY (programa_id) REFERENCES public.programas_estudio(id);


--
-- Name: programa_configuraciones programa_configuraciones_programa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programa_configuraciones
    ADD CONSTRAINT programa_configuraciones_programa_id_fkey FOREIGN KEY (programa_id) REFERENCES public.programas_estudio(id);


--
-- Name: programa_modulos programa_modulos_programa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programa_modulos
    ADD CONSTRAINT programa_modulos_programa_id_fkey FOREIGN KEY (programa_id) REFERENCES public.programas_estudio(id);


--
-- Name: programa_requisitos programa_requisitos_programa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programa_requisitos
    ADD CONSTRAINT programa_requisitos_programa_id_fkey FOREIGN KEY (programa_id) REFERENCES public.programas_estudio(id);


--
-- Name: programa_unidades programa_unidades_programa_modulo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programa_unidades
    ADD CONSTRAINT programa_unidades_programa_modulo_id_fkey FOREIGN KEY (programa_modulo_id) REFERENCES public.programa_modulos(id);


--
-- Name: registros_practicas registros_practicas_estudiante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registros_practicas
    ADD CONSTRAINT registros_practicas_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES public.estudiantes(id);


--
-- Name: resoluciones_convalidacion resoluciones_convalidacion_estudiante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resoluciones_convalidacion
    ADD CONSTRAINT resoluciones_convalidacion_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES public.estudiantes(id);


--
-- Name: silabos silabos_carga_lectiva_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.silabos
    ADD CONSTRAINT silabos_carga_lectiva_id_fkey FOREIGN KEY (carga_lectiva_id) REFERENCES public.carga_lectiva(id);


--
-- Name: solicitudes_tramites solicitudes_tramites_estudiante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_tramites
    ADD CONSTRAINT solicitudes_tramites_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES public.estudiantes(id);


--
-- Name: tesoreria_pagos tesoreria_pagos_concepto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tesoreria_pagos
    ADD CONSTRAINT tesoreria_pagos_concepto_id_fkey FOREIGN KEY (concepto_id) REFERENCES public.tesoreria_conceptos(id);


--
-- Name: tesoreria_pagos tesoreria_pagos_estudiante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tesoreria_pagos
    ADD CONSTRAINT tesoreria_pagos_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES public.estudiantes(id);


--
-- Name: tutorias tutorias_periodo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutorias
    ADD CONSTRAINT tutorias_periodo_id_fkey FOREIGN KEY (periodo_id) REFERENCES public.periodos_academicos(id);


--
-- Name: tutorias tutorias_programa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutorias
    ADD CONSTRAINT tutorias_programa_id_fkey FOREIGN KEY (programa_id) REFERENCES public.programas_estudio(id);


--
-- Name: unidades_plan unidades_plan_modulo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades_plan
    ADD CONSTRAINT unidades_plan_modulo_id_fkey FOREIGN KEY (modulo_id) REFERENCES public.modulos_plan(id);


--
-- PostgreSQL database dump complete
--


