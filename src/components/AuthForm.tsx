import React, { useState } from 'react';
import { Scissors, LogIn, UserPlus } from 'lucide-react';
import * as data from '../lib/data';
import { supabase } from '../lib/supabase';

interface AuthFormProps {
  onSuccess: () => void;
}

export function AuthForm({ onSuccess }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [barbershopName, setBarbershopName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showSuccessAlert = (action: 'login' | 'register', userRole: 'admin' | 'barber' | null) => {
    let message = '';
    
    switch (action) {
      case 'register':
        message = 'Te registraste correctamente';
        break;
      case 'login':
        switch (userRole) {
          case 'admin':
            message = 'Te logueaste correctamente como administrador';
            break;
          case 'barber':
            message = 'Te logueaste correctamente como barbero';
            break;
          default:
            message = 'Te logueaste correctamente';
            break;
        }
        break;
      default:
        message = 'Operación exitosa';
    }
    
    alert(message);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Verificar configuración de Supabase primero
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      setLoading(false);
      setError('⚠️ Supabase no está configurado. Crea un archivo .env.local en la raíz del proyecto con:\n\nVITE_SUPABASE_URL=tu_url\nVITE_SUPABASE_ANON_KEY=tu_key\n\nReinicia el servidor después de crear el archivo.');
      return;
    }

    let isComplete = false;

    // Timeout de seguridad reducido: si pasa más de 10 segundos, cancelar
    const timeoutId = setTimeout(() => {
      if (!isComplete) {
        console.error('Timeout en handleSubmit - la operación está tardando demasiado');
        setError('La operación está tardando demasiado. Verifica:\n1. Tu conexión a internet\n2. Que Supabase esté funcionando\n3. Abre la consola (F12) para ver más detalles');
        setLoading(false);
      }
    }, 10000); // Reducido de 30 a 10 segundos

    try {
      if (isLogin) {
        console.log('[AuthForm] Iniciando sesión...');
        try {
          const result = await data.signInWithPassword({ email, password });
          console.log('[AuthForm] Login exitoso:', result);
          const userRole = result.user?.role === 'admin' ? 'admin' : result.user?.role === 'barber' ? 'barber' : null;
          // Mostrar alert y redirigir inmediatamente (el AuthContext se actualizará automáticamente)
          isComplete = true;
          clearTimeout(timeoutId);
          showSuccessAlert('login', userRole);
          onSuccess();
        } catch (loginError: any) {
          // El error ya fue lanzado por signInWithPassword, solo necesitamos asegurarnos de que se maneje
          throw loginError;
        }
      } else {
        if (!barbershopName.trim()) {
          clearTimeout(timeoutId);
          throw new Error('Completa el nombre de la barbería');
        }
        
        console.log('Iniciando registro...');
        await data.signUp(email, password, barbershopName);
        console.log('Registro exitoso, verificando sesión...');
        
        // Verificar si hay sesión activa después del registro
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        console.log('Sesión después del registro:', sessionData, sessionError);
        
        if (sessionData?.session) {
          // Si hay sesión, mostrar éxito y redirigir inmediatamente
          console.log('Sesión encontrada, redirigiendo...');
          isComplete = true;
          clearTimeout(timeoutId);
          showSuccessAlert('register', 'admin');
          onSuccess();
        } else {
          // Si no hay sesión, mostrar mensaje específico sobre verificación de email
          console.warn('No hay sesión después del registro - requiere verificación de email');
          isComplete = true;
          clearTimeout(timeoutId);
          setError('Tu cuenta se creó exitosamente. Revisa tu email para verificar tu cuenta. Después de verificar, podrás iniciar sesión.');
          setLoading(false);
          // No llamar a onSuccess() porque no hay sesión activa
          return;
        }
      }
    } catch (err: any) {
      isComplete = true;
      clearTimeout(timeoutId);
      console.error('Error en handleSubmit:', err);
      const errorMessage = err.message || 'Ocurrió un error';
      
      // Mensajes de error más específicos
      if (errorMessage.includes('Supabase no está configurado') || errorMessage.includes('no está configurado')) {
        setError('⚠️ Error de configuración: Falta configurar Supabase.\n\nCrea un archivo .env.local en la raíz del proyecto con:\nVITE_SUPABASE_URL=tu_url\nVITE_SUPABASE_ANON_KEY=tu_key\n\nLuego reinicia el servidor de desarrollo.');
      } else if (errorMessage.includes('verificar tu email') || errorMessage.includes('email')) {
        setError(errorMessage);
      } else if (errorMessage.includes('network') || errorMessage.includes('Network') || errorMessage.includes('fetch')) {
        setError('Error de conexión: No se pudo conectar a Supabase. Verifica tu conexión a internet y que las credenciales de Supabase sean correctas.');
      } else {
        setError(errorMessage);
      }
      
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Scissors className="w-10 h-10 text-gray-400" />
            <h1 className="text-4xl font-bold text-white">fzbarber</h1>
            <Scissors className="w-10 h-10 text-gray-400 scale-x-[-1]" />
          </div>
          <p className="text-gray-400">Sistema de Control de Ganancias</p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-gray-700">
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 px-4 rounded-lg transition-all ${
                isLogin
                  ? 'bg-white text-black font-semibold'
                  : 'bg-transparent text-gray-400 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4 inline mr-2" />
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 px-4 rounded-lg transition-all ${
                !isLogin
                  ? 'bg-white text-black font-semibold'
                  : 'bg-transparent text-gray-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4 inline mr-2" />
              Registrarse
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/5 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white transition-colors"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-white/5 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white transition-colors"
                placeholder="••••••••"
              />
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="barbershopName" className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre de la barbería
                </label>
                <input
                  id="barbershopName"
                  type="text"
                  value={barbershopName}
                  onChange={(e) => setBarbershopName(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white transition-colors"
                  placeholder="Mi Barbería"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm whitespace-pre-line">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Procesando...' : isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          {isLogin
            ? '¿No tienes cuenta? Haz clic en "Registrarse"'
            : '¿Ya tienes cuenta? Haz clic en "Iniciar Sesión"'}
        </p>
      </div>
    </div>
  );
}
