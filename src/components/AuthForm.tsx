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
  const [numBarbers, setNumBarbers] = useState<number>(1);
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

    let isComplete = false;

    // Timeout de seguridad: si pasa más de 30 segundos, cancelar
    const timeoutId = setTimeout(() => {
      if (!isComplete) {
        console.error('Timeout en handleSubmit - la operación está tardando demasiado');
        setError('La operación está tardando demasiado. Verifica tu conexión a internet y la configuración de Supabase.');
        setLoading(false);
      }
    }, 30000);

    try {
      if (isLogin) {
        console.log('Iniciando sesión...');
        const result = await data.signInWithPassword({ email, password });
        console.log('Login exitoso:', result);
        const userRole = result.user?.role === 'admin' ? 'admin' : result.user?.role === 'barber' ? 'barber' : null;
        showSuccessAlert('login', userRole);
        // Esperar un momento para que el estado de auth se actualice
        await new Promise(resolve => setTimeout(resolve, 500));
        isComplete = true;
        clearTimeout(timeoutId);
        onSuccess();
      } else {
        if (!barbershopName || numBarbers < 1) {
          clearTimeout(timeoutId);
          throw new Error('Completa el nombre de la barbería y la cantidad de barberos');
        }
        
        console.log('Iniciando registro...');
        await data.signUp(email, password, barbershopName, numBarbers);
        console.log('Registro exitoso, verificando sesión...');
        
        // Verificar si hay sesión activa después del registro
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        console.log('Sesión después del registro:', sessionData, sessionError);
        
        if (sessionData?.session) {
          // Si hay sesión, mostrar éxito y esperar a que el AuthContext se actualice
          console.log('Sesión encontrada, redirigiendo...');
          showSuccessAlert('register', 'admin');
          await new Promise(resolve => setTimeout(resolve, 1000));
          isComplete = true;
          clearTimeout(timeoutId);
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
      if (errorMessage.includes('Supabase no está configurado')) {
        setError('Error de configuración: Falta configurar Supabase. Verifica que tengas VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env.local');
      } else if (errorMessage.includes('verificar tu email') || errorMessage.includes('email')) {
        setError(errorMessage);
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
              <>
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

                <div>
                  <label htmlFor="numBarbers" className="block text-sm font-medium text-gray-300 mb-2">
                    ¿Cuántos barberos son?
                  </label>
                  <input
                    id="numBarbers"
                    type="number"
                    min={1}
                    value={numBarbers}
                    onChange={(e) => setNumBarbers(parseInt(e.target.value || '1', 10))}
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white transition-colors"
                    placeholder="1"
                  />
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
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
