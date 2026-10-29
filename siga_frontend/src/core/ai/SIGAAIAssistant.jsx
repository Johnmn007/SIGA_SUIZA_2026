import { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Sparkles, 
  Send, 
  X, 
  RotateCcw, 
  ChevronDown, 
  GraduationCap, 
  BookOpen, 
  ShieldCheck, 
  HelpCircle, 
  Award,
  Layers,
  KeyRound,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

// Base de conocimiento institucional y normativa MINEDU del IESTP Suiza
const INSTITUTIONAL_KB = {
  carreras: [
    { nombre: 'Desarrollo de Sistemas de Información', creditos: 126, modulos: 3, duracion: '6 Semestres (3 Años)', resolucion: 'R.M. 0584722' },
    { nombre: 'Enfermería Técnica', creditos: 126, modulos: 3, duracion: '6 Semestres (3 Años)', resolucion: 'R.M. 0584722' },
    { nombre: 'Contabilidad', creditos: 126, modulos: 3, duracion: '6 Semestres (3 Años)', resolucion: 'R.M. 0584722' },
    { nombre: 'Construcción Civil', creditos: 128, modulos: 3, duracion: '6 Semestres (3 Años)', resolucion: 'R.M. 0584722' },
    { nombre: 'Mecatrónica Automotriz', creditos: 126, modulos: 3, duracion: '6 Semestres (3 Años)', resolucion: 'R.M. MINEDU' },
    { nombre: 'Producción Agropecuaria', creditos: 126, modulos: 3, duracion: '6 Semestres (3 Años)', resolucion: 'R.M. MINEDU' },
    { nombre: 'Electricidad Industrial', creditos: 126, modulos: 3, duracion: '6 Semestres (3 Años)', resolucion: 'R.M. MINEDU' },
    { nombre: 'Mecánica de Producción Industrial', creditos: 126, modulos: 3, duracion: '6 Semestres (3 Años)', resolucion: 'R.M. MINEDU' },
    { nombre: 'Gestión Administrativa', creditos: 126, modulos: 3, duracion: '6 Semestres (3 Años)', resolucion: 'R.M. MINEDU' },
    { nombre: 'Guía Oficial de Turismo', creditos: 126, modulos: 3, duracion: '6 Semestres (3 Años)', resolucion: 'R.M. MINEDU' },
    { nombre: 'Asistencia Administrativa', creditos: 126, modulos: 3, duracion: '6 Semestres (3 Años)', resolucion: 'R.M. MINEDU' }
  ],
  normas: {
    regla70: `Según los lineamientos del MINEDU (DOC-10 y DOC-15) para la Educación Técnico-Productiva y Superior Tecnológica:
• **Regla del 70% de Créditos:** El estudiante debe aprobar como mínimo el **70% del total de créditos** matriculados en el semestre lectivo para tener derecho a ser promovido al siguiente periodo.
• **Desaprobación (> 30%):** Si reprueba más del 30% de los créditos del semestre, entra en condición de repitencia modular y no puede llevar unidades didácticas del siguiente ciclo con prerequisitos pendientes.
• **Límite por Semestre:** La carga máxima regular es de **24 créditos académicos** por semestre.`,
    notaMinima: `En el sistema de calificación tecnológica oficial:
• **Escala vigesimal:** La calificación se realiza de 0 a 20 puntos.
• **Nota mínima aprobatoria:** **13 (trece)** puntos. Toda fracción igual o mayor a 0.5 se redondea al entero superior inmediato.
• **Proceso de recuperación:** Las notas entre 10 y 12 dan derecho a evaluación extraordinaria de recuperación.
• **Desaprobación directa:** Notas menores a 10 no tienen derecho a recuperación inmediata.`,
    certificacionModular: `Cada carrera profesional técnica cuenta con:
• **3 Módulos Formativos:** Estructurados a lo largo de los 6 semestres académicos.
• **Certificación Modular Oficial:** Al concluir satisfactoriamente cada módulo de 2 semestres y sus respectivas horas de Experiencias Formativas en Situaciones Reales de Trabajo (EFSRT), el estudiante recibe un Certificado Modular con valor para inserción laboral.`
  },
  usuarios: [
    { rol: 'Superadmin / Administrador', email: 'admin@siga.edu', clave: 'admin123', descripcion: 'Acceso total al sistema, creación de carreras y mallas' },
    { rol: 'Docente', email: 'docente@siga.edu', clave: 'docente123', descripcion: 'Registro de calificaciones y sílabos' },
    { rol: 'Secretaría Académica', email: 'secretaria@siga.edu', clave: 'secretaria123', descripcion: 'Matrículas, trámites y reportes académicos' }
  ]
};

// Generador de ids de mensajes fuera del render (Date.now es impuro en render)
let messageIdSeq = 0;
const nextMessageId = () => `${Date.now()}-${(messageIdSeq += 1)}`;

// Generador de respuestas con inteligencia contextual institucional
function generateAIResponse(userInput) {
  const query = (userInput || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 1. Regla del 70% de créditos o cómo pasar de semestre
  if (query.includes('70') || query.includes('pasar de semestre') || query.includes('promocion') || query.includes('doc-10') || query.includes('doc-15') || query.includes('aprobar semestre')) {
    return {
      title: 'Regla del 70% de Créditos (Normativa MINEDU)',
      badge: 'Normativa DOC-10 / DOC-15',
      content: `Para la promoción de semestre académico en los Institutos de Educación Superior Tecnológica según el MINEDU:

1. **Aprobación Mínima (70%):** El estudiante debe haber aprobado obligatoriamente el **70% de créditos** de las unidades didácticas matriculadas en el periodo lectivo.
2. **Repitencia Modular:** Si el estudiante desaprueba el 30% o más de los créditos matriculados, no podrá promoverse de forma automática y deberá subsanar o repetir las unidades desaprobadas.
3. **Prerrequisitos:** Ningún estudiante puede matricularse en una unidad didáctica si no ha aprobado su prerrequisito curricular previo.
4. **Carga máxima:** La matrícula regular no puede exceder los **24 créditos** por semestre lectivo.`
    };
  }

  // 2. Nota mínima aprobatoria
  if (query.includes('nota') || query.includes('calificacion') || query.includes('13') || query.includes('minima') || query.includes('recuperacion') || query.includes('subsanacion')) {
    return {
      title: 'Sistema de Calificación y Nota Mínima',
      badge: 'Escala Vigesimal Oficial',
      content: `${INSTITUTIONAL_KB.normas.notaMinima}

Recuerda que la asistencia mínima requerida para tener derecho a evaluación es del **70% de horas lectivas** de la unidad didáctica.`
    };
  }

  // 3. Consulta de carreras / programas
  if (query.includes('carrera') || query.includes('programa') || query.includes('todas las carrera') || query.includes('cuantas carrera') || query.includes('catalogo')) {
    const lista = INSTITUTIONAL_KB.carreras.map((c, i) => `${i + 1}. **${c.nombre}** (${c.creditos} créditos · ${c.resolucion})`).join('\n');
    return {
      title: '11 Carreras Profesionales Técnicas del IESTP Suiza',
      badge: '100% Licenciadas por MINEDU',
      content: `El **IESTP Suiza** cuenta con 11 programas de estudio oficiales, todos con plan formativo modular:\n\n${lista}\n\n💡 *Cada carrera consta de 6 semestres académicos organizados en 3 módulos formativos con certificación progresiva.*`
    };
  }

  // 4. Consulta específica sobre Sistemas / DSI
  if (query.includes('sistema') || query.includes('dsi') || query.includes('computo') || query.includes('software') || query.includes('programacion')) {
    const c = INSTITUTIONAL_KB.carreras[0];
    return {
      title: `Programa: ${c.nombre}`,
      badge: `${c.creditos} Créditos · ${c.resolucion}`,
      content: `El programa de **${c.nombre}** forma profesionales capacitados para desarrollar, implementar y administrar sistemas de software empresarial, bases de datos y soluciones web/móviles.

• **Duración:** ${c.duracion}
• **Créditos Totales:** ${c.creditos} créditos modulares.
• **Certificación:** 3 certificaciones modulares (Desarrollo Web, Gestión de Bases de Datos y Soluciones Empresariales).
• **Modalidad:** Presencial con turnos Diurno y Nocturno.`
    };
  }

  // 5. Consulta sobre Construcción Civil
  if (query.includes('construccion') || query.includes('civil') || query.includes('obras') || query.includes('edificacion')) {
    const c = INSTITUTIONAL_KB.carreras[3];
    return {
      title: `Programa: ${c.nombre}`,
      badge: `${c.creditos} Créditos MINEDU`,
      content: `El programa de **${c.nombre}** prepara técnicos expertos en topografía, supervisión de obra, diseño de estructuras, metrados y control de calidad en proyectos de infraestructura civil.

• **Duración:** ${c.duracion}
• **Créditos Totales:** ${c.creditos} créditos (diseño modular MINEDU).
• **Resolución:** ${c.resolucion}.`
    };
  }

  // 6. Consulta sobre Enfermería Técnica
  if (query.includes('enfermer') || query.includes('salud') || query.includes('clinica')) {
    const c = INSTITUTIONAL_KB.carreras[1];
    return {
      title: `Programa: ${c.nombre}`,
      badge: `${c.creditos} Créditos de Salud`,
      content: `El programa de **${c.nombre}** brinda formación integral para la atención integral del paciente, asistencia en procedimientos clínicos, salud comunitaria y primeros auxilios.

• **Duración:** ${c.duracion}
• **Créditos Totales:** ${c.creditos} créditos.
• **Prácticas:** Horas clínicas en centros de salud y hospitales de la región.`
    };
  }

  // 7. Eliminación de carreras y prevención de duplicados
  if (query.includes('eliminar') || query.includes('duplicad') || query.includes('borrar') || query.includes('repetid')) {
    return {
      title: 'Integridad y Eliminación de Carreras',
      badge: 'Seguridad Académica',
      content: `En la vista de **Gestión Académica Central**:

1. **Eliminar Carrera:** Cada tarjeta cuenta con un botón rojo **'Eliminar'**. Por seguridad institucional, el sistema **bloquea la eliminación** si la carrera tiene estudiantes o módulos asignados.
2. **Prevención de Duplicados:** Tanto el frontend como el backend realizan validaciones automáticas con normalización Unicode. Si intentas crear una carrera con un código o nombre ya existente, el sistema lo rechazará inmediatamente para proteger el catálogo oficial.`
    };
  }

  // 8. Usuarios de prueba y credenciales
  if (query.includes('usuario') || query.includes('credencial') || query.includes('clave') || query.includes('password') || query.includes('login') || query.includes('contrasena')) {
    const uList = INSTITUTIONAL_KB.usuarios.map(u => `• **${u.rol}:** \`${u.email}\` | Clave: \`${u.clave}\` (${u.descripcion})`).join('\n');
    return {
      title: 'Credenciales de Prueba del Sistema',
      badge: 'Entorno de Desarrollo 2026',
      content: `Puedes ingresar al SIGA Suiza con las siguientes cuentas de prueba:\n\n${uList}`
    };
  }

  // 9. Malla Curricular y Módulos
  if (query.includes('malla') || query.includes('modulo') || query.includes('periodo') || query.includes('semestre') || query.includes('curriculum')) {
    return {
      title: 'Estructura Modular y Malla Curricular',
      badge: 'Modelo Formativo Tecnológico',
      content: `${INSTITUTIONAL_KB.normas.certificacionModular}

Para explorar la malla interactiva de cualquier carrera, haz clic en el botón **'Ver Malla'** en la tarjeta del programa correspondiente dentro de Gestión Académica.`
    };
  }

  // 10. Parametrización
  if (query.includes('parametro') || query.includes('parametrizacion') || query.includes('aforo') || query.includes('turno') || query.includes('coordinador')) {
    return {
      title: 'Parametrización de Programas de Estudio',
      badge: 'Configuración Operativa',
      content: `Al hacer clic en el botón **'Parametrización'** de una carrera podrás configurar:
• **Aforo Máximo:** Cantidad máxima de estudiantes admitidos por sección (por defecto 35).
• **Turnos:** Asignación de turnos operativos (Mañana, Tarde, Noche).
• **Docente Coordinador:** Nombre del responsable del programa académico.
• **Periodo Académico Base:** Asignación al calendario lectivo en curso.`
    };
  }

  // Fallback Inteligente
  return {
    title: 'Asistente Institucional SIGA AI',
    badge: 'IESTP Suiza 2026',
    content: `He recibido tu consulta sobre *" ${userInput} "*.

Puedo brindarte información precisa sobre:
• **Las 11 carreras profesionales técnicas** del IESTP Suiza y sus créditos.
• **Normativa MINEDU DOC-10 y DOC-15** (Regla del 70% de créditos para pasar de semestre, notas mínimas, repitencia modular).
• **Operaciones del SIGA:** Mallas modulares, eliminación de carreras protegidas, prevención de duplicados y parametrización de turnos.
• **Credenciales y roles:** Acceso como Superadmin, Docente o Secretaría Académica.

Haz clic en uno de los botones de sugerencia abajo o escribe tu pregunta específica.`
  };
}

export function SIGAAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      title: '¡Bienvenido al Asistente Virtual SIGA!',
      badge: 'IA Curricular & Normativa MINEDU',
      content: `¡Hola! Soy **SIGA AI**, el asistente de inteligencia académica del **IESTP Suiza**.

Estoy preparado para resolver tus dudas sobre el catálogo de carreras, la regla del **70% de créditos (DOC-10/15)** para pasar de semestre, el sistema de calificaciones, mallas curriculares y usuarios de prueba del sistema.

¿En qué puedo ayudarte hoy?`,
      time: 'Ahora'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  const handleSendMessage = (textToSend) => {
    const query = textToSend || inputMessage;
    if (!query.trim()) return;

    const userMsg = {
      id: nextMessageId(),
      sender: 'user',
      content: query.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    // Respuesta inteligente simulando inferencia cognitiva
    setTimeout(() => {
      const response = generateAIResponse(query);
      const aiMsg = {
        id: nextMessageId(),
        sender: 'ai',
        title: response.title,
        badge: response.badge,
        content: response.content,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 450);
  };

  const clearChat = () => {
    setMessages([
      {
        id: nextMessageId(),
        sender: 'ai',
        title: 'Chat Reiniciado',
        badge: 'SIGA AI · Listo',
        content: `El historial de conversación ha sido restablecido. Puedes realizar nuevas preguntas sobre el catálogo de carreras, reglas de promoción de semestre o normativa MINEDU.`,
        time: 'Ahora'
      }
    ]);
  };

  // Preguntas sugeridas para interacción instantánea
  const quickQuestions = [
    '¿Cuáles son las 11 carreras del IESTP Suiza?',
    'Regla del 70% de créditos para pasar de semestre',
    '¿Cuál es la nota mínima aprobatoria?',
    'Créditos de Desarrollo de Sistemas',
    '¿Cómo funciona la eliminación y duplicados?',
    'Usuarios y contraseñas de prueba'
  ];

  return (
    <>
      {/* Botón Flotante Launcher */}
      <div className="fixed bottom-6 right-6 z-40">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Abrir Asistente SIGA AI"
            className="group relative flex items-center gap-3 px-5 py-3.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-2xl shadow-indigo-500/40 hover:shadow-indigo-500/60 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer border border-white/20"
          >
            {/* Pulsing Ring */}
            <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 opacity-40 blur-sm group-hover:opacity-75 transition duration-300 animate-pulse-subtle" />
            
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/20 backdrop-blur-md">
              <Sparkles size={18} className="text-amber-300 animate-pulse" />
            </div>

            <div className="relative text-left">
              <span className="block text-xs font-black tracking-wider uppercase">SIGA AI</span>
              <span className="block text-[11px] font-medium text-blue-100 hidden sm:block">Asistente Virtual</span>
            </div>

            <span className="relative flex h-2.5 w-2.5 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
          </button>
        )}
      </div>

      {/* Ventana de Chat Flotante Modal */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-[420px] h-[610px] max-h-[calc(100vh-2rem)] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden animate-fade-in font-sans">
          
          {/* Header del Asistente */}
          <div className="relative overflow-hidden bg-gradient-to-r from-[#071329] via-[#0A2552] to-[#00388F] text-white p-4 flex items-center justify-between border-b border-white/10">
            {/* Glow decorativo */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-400/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-3 relative z-10">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 border border-white/20 shadow-md">
                <Bot size={22} className="text-white" />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0A2552]" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm tracking-tight text-white">SIGA AI</h3>
                  <span className="px-1.5 py-0.2 rounded bg-indigo-500/40 text-[9px] font-bold text-cyan-200 uppercase tracking-widest border border-indigo-400/30">
                    2.0
                  </span>
                </div>
                <p className="text-[11px] text-blue-200/80 font-medium flex items-center gap-1">
                  <span>IESTP Suiza</span>
                  <span>•</span>
                  <span className="text-emerald-300">Normativa MINEDU</span>
                </p>
              </div>
            </div>

            {/* Acciones de Cabecera */}
            <div className="flex items-center gap-1 relative z-10">
              <button 
                onClick={clearChat}
                title="Reiniciar conversación"
                className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <RotateCcw size={16} />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                title="Cerrar asistente"
                className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Área de Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/70">
            {messages.map((msg) => {
              const isAi = msg.sender === 'ai';
              return (
                <div 
                  key={msg.id}
                  className={`flex flex-col ${isAi ? 'items-start' : 'items-end'}`}
                >
                  <div 
                    className={`max-w-[88%] rounded-2xl p-3.5 text-xs sm:text-[13px] leading-relaxed shadow-sm ${
                      isAi 
                        ? 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-sm' 
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-sm shadow-indigo-500/10'
                    }`}
                  >
                    {isAi && msg.title && (
                      <div className="mb-2 pb-2 border-b border-slate-100">
                        {msg.badge && (
                          <span className="inline-block px-2 py-0.5 rounded-md bg-blue-50 text-primary border border-blue-200 text-[10px] font-bold uppercase tracking-wider mb-1">
                            {msg.badge}
                          </span>
                        )}
                        <h4 className="font-bold text-slate-900 text-xs sm:text-[13px]">
                          {msg.title}
                        </h4>
                      </div>
                    )}

                    <div className="whitespace-pre-line space-y-1">
                      {msg.content.split('\n').map((paragraph, idx) => {
                        if (!paragraph) return <div key={idx} className="h-1.5" />;
                        
                        // Parse bold markdown **text**
                        const parts = paragraph.split(/(\*\*.*?\*\*|`.*?`)/g);
                        return (
                          <p key={idx}>
                            {parts.map((part, pIdx) => {
                              if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={pIdx} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
                              }
                              if (part.startsWith('`') && part.endsWith('`')) {
                                return (
                                  <code key={pIdx} className="bg-slate-100 text-primary-dark px-1.5 py-0.5 rounded text-[11px] font-mono border border-slate-200">
                                    {part.slice(1, -1)}
                                  </code>
                                );
                              }
                              return part;
                            })}
                          </p>
                        );
                      })}
                    </div>

                    <div className={`text-[10px] mt-2 text-right ${isAi ? 'text-slate-400' : 'text-blue-100'}`}>
                      {msg.time}
                    </div>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-2xl max-w-[140px]">
                <Bot size={14} className="text-primary animate-spin" />
                <span className="text-xs text-slate-500 font-medium">Analizando...</span>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          <div className="p-2.5 bg-white border-t border-slate-100 overflow-x-auto">
            <div className="flex items-center gap-1.5 whitespace-nowrap scrollbar-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 pl-1">
                <Sparkles size={11} className="text-amber-500" />
                Sugerencias:
              </span>
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q)}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-primary text-[11px] font-medium border border-slate-200/80 hover:border-blue-200 transition-all cursor-pointer flex-shrink-0"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input Footer */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            className="p-3 bg-white border-t border-slate-200/80 flex items-center gap-2"
          >
            <input 
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Pregunta sobre carreras, regla del 70% o normas..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 transition-all"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white disabled:opacity-40 disabled:pointer-events-none hover:shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Send size={16} />
            </button>
          </form>

        </div>
      )}
    </>
  );
}
