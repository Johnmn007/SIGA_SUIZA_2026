import { useState } from 'react';
import { useAuth } from './useAuth';
import '../../../src/App.css';
import port from '../../assets/port.jpg';

export function LoginForm() {
  const { login } = useAuth();
  const [form, setForm] = useState({ 
    email: 'admin@siga.edu', 
    password: 'admin123' 
  });
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
      <div className="glass-panel overflow-hidden max-w-5xl w-full flex flex-col lg:flex-row shadow-2xl">
        {/* Left Side: Illustration/Brand */}
        <div className="hidden lg:flex lg:w-5/12 flex-col justify-center p-12 text-white bg-gradient-to-br from-primary-dark to-primary">
          <h1 className="text-5xl font-extrabold tracking-tight mb-4 drop-shadow-md">SIGA</h1>
          <h4 className="text-xl font-medium mb-6 leading-relaxed">Tu aliado en la gestión académica institucional.</h4>
          <p className="text-blue-100 font-light mb-10 text-sm">Control modular, escalable y diseñado para el futuro de la educación técnica.</p>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3 bg-white/10 p-3 rounded-lg backdrop-blur-sm">
              <span className="text-2xl">🎓</span>
              <span className="font-medium text-sm">11 Carreras Profesionales</span>
            </div>
            <div className="flex items-center space-x-3 bg-white/10 p-3 rounded-lg backdrop-blur-sm">
              <span className="text-2xl">📊</span>
              <span className="font-medium text-sm">Control de Matrícula y Notas</span>
            </div>
            <div className="flex items-center space-x-3 bg-white/10 p-3 rounded-lg backdrop-blur-sm">
              <span className="text-2xl">🌐</span>
              <span className="font-medium text-sm">Aula Virtual Integrada</span>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full lg:w-7/12 p-8 md:p-12 lg:p-16 bg-white">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Iniciar Sesión</h2>
            <p className="text-slate-500 mt-2">Bienvenido de nuevo al ecosistema SIGA</p>
          </div>

          <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6">
            <div>
              <label htmlFor="email" className="label">
                Correo Electrónico
              </label>
              <input
                type="email"
                className="input-field"
                id="email"
                placeholder="admin@siga.edu"
                value={form.email}
                onChange={(e) => setForm({...form, email: e.target.value})}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Contraseña
              </label>
              <input
                type="password"
                className="input-field"
                id="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({...form, password: e.target.value})}
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100 flex items-start space-x-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full py-3 flex justify-center items-center mt-4"
              disabled={loading}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Ingresar al Sistema'
              )}
            </button>
          </form>

          <div className="text-center mt-8">
            <span className="text-slate-500 text-sm">¿Problemas con tu cuenta? </span>
            <a href="#" className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors">
              Contacta a Soporte
            </a>
          </div>

          <div className="mt-12 p-4 rounded-xl text-center bg-slate-50 border border-dashed border-slate-300">
            <p className="text-slate-500 text-sm">
              <strong className="text-slate-700">Modo Demo Activo:</strong> admin@siga.edu / admin123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}