import { useState } from 'react';
import { useAuth } from './useAuth';
import { GraduationCap, Users, ClipboardList, MonitorSmartphone, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';

export function LoginForm() {
  const { login } = useAuth();
  const [form, setForm] = useState({
    email: 'admin@siga.edu',
    password: 'admin123',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(form.email, form.password);

    if (!result.success) {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-panel overflow-hidden max-w-5xl w-full flex flex-col lg:flex-row shadow-glass-lg">
        {/* Left Side: Marca institucional */}
        <div className="hidden lg:flex lg:w-5/12 flex-col justify-center p-12 text-white bg-gradient-to-br from-primary-dark via-primary to-secondary">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-blue-100/80 font-semibold">Instituto de Educación Superior</p>
              <h1 className="text-3xl font-extrabold tracking-tight leading-tight">IESTP Suiza</h1>
            </div>
          </div>

          <h4 className="text-xl font-medium mb-3 leading-relaxed drop-shadow-sm">
            Tu aliado en la gestión académica institucional.
          </h4>
          <p className="text-blue-100/90 font-light mb-10 text-sm">
            Control modular, escalable y diseñado para el futuro de la educación técnica.
          </p>

          <div className="space-y-4">
            {[
              { icon: Users, label: '11 Carreras Profesionales' },
              { icon: ClipboardList, label: 'Control de Matrícula y Notas' },
              { icon: MonitorSmartphone, label: 'Gestión Académica Integrada' },
            ].map((feature) => {
              const FeatureIcon = feature.icon;
              return (
                <div key={feature.label} className="flex items-center space-x-3 bg-white/10 p-3.5 rounded-xl backdrop-blur-sm border border-white/10">
                  <FeatureIcon className="w-5 h-5 text-blue-100 shrink-0" />
                  <span className="font-medium text-sm">{feature.label}</span>
                </div>
              );
            })}
          </div>

          <p className="mt-auto pt-10 text-xs text-blue-200/70">
            Sistema Integrado de Gestión Académica · v1.1 MVP
          </p>
        </div>

        {/* Right Side: Formulario */}
        <div className="w-full lg:w-7/12 p-8 md:p-12 lg:p-14 bg-white">
          <div className="mb-10">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-soft text-primary-dark text-xs font-semibold mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              Acceso al sistema
            </span>
            <h2 className="text-3xl font-bold text-slate-text tracking-tight">Iniciar Sesión</h2>
            <p className="text-slate-500 mt-2">Bienvenido al ecosistema SIGA del IESTP Suiza</p>
          </div>

          <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-5">
            <div>
              <label htmlFor="email" className="label">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                <input
                  type="email"
                  className="input-field pl-10"
                  id="email"
                  placeholder="admin@siga.edu"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="label">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pl-10 pr-11"
                  id="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy transition-colors p-1 rounded-lg"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3.5 rounded-lg text-sm border border-red-100 flex items-start gap-2.5 animate-fade-in">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Ingresando...
                </>
              ) : (
                <>
                  Ingresar al Sistema
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-8">
            <span className="text-slate-500 text-sm">¿Problemas con tu cuenta? </span>
            <a href="#" className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors">
              Contacta a Soporte
            </a>
          </div>

          <div className="mt-10 p-4 rounded-xl text-center bg-slate-light border border-dashed border-slate-300">
            <p className="text-slate-500 text-sm">
              <strong className="text-navy">Modo Demo Activo:</strong> admin@siga.edu / admin123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}