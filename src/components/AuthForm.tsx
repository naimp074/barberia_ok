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
    let timeoutId: NodeJS.Timeout | null = null;

    // Timeout de seguridad: 20 segundos (reducido para feedback más rápido)
    timeoutId = setTimeout(() => {
      if (!isComplete) {
        console.error('[AuthForm] ⏱️ TIMEOUT después de 20 segundos');
        console.error('[AuthForm] El problema más probable es que el perfil no existe');
        console.error('[AuthForm] Ejecuta ARREGLAR_PERFIL_RAPIDO.sql en Supabase SQL Editor');
        isComplete = true;
        setError('⏱️ La operación está tardando demasiado.\n\n' +
          'PROBLEMA MÁS PROBABLE:\n' +
          'Tu cuenta no tiene un perfil en la base de datos.\n\n' +
          'SOLUCIÓN RÁPIDA:\n' +
          '1. Abre Supabase Dashboard → SQL Editor\n' +
          '2. Abre ARREGLAR_PERFIL_RAPIDO.sql\n' +
          '3. Cambia el email en el script\n' +
          '4. Ejecuta el script\n' +
          '5. Intenta login nuevamente\n\n' +
          'O revisa la consola (F12) para más detalles.');
        setLoading(false);
      }
    }, 20000); // 20 segundos

    try {
      if (isLogin) {
        console.log('[AuthForm] Iniciando sesión...');
        try {
          const result = await data.signInWithPassword({ email, password });
          console.log('[AuthForm] Login exitoso');
          
          if (!isComplete) {
            isComplete = true;
            if (timeoutId) clearTimeout(timeoutId);
            
            const userRole = result.user?.role === 'admin' ? 'admin' : result.user?.role === 'barber' ? 'barber' : null;
            showSuccessAlert('login', userRole);
            
            // Pequeño delay para que el usuario vea el mensaje de éxito
            setTimeout(() => {
              onSuccess();
            }, 500);
          }
        } catch (loginError: any) {
          if (!isComplete) {
            isComplete = true;
            if (timeoutId) clearTimeout(timeoutId);
            throw loginError;
          }
        }
      } else {
        // Validación de registro
        if (!barbershopName.trim()) {
          if (timeoutId) clearTimeout(timeoutId);
          setLoading(false);
          setError('Completa el nombre de la barbería');
          return;
        }
        
        console.log('[AuthForm] Iniciando registro...');
        
        try {
          const result = await data.signUp(email, password, barbershopName);
          console.log('[AuthForm] ✅ Registro exitoso');
          
          if (!isComplete) {
            isComplete = true;
            if (timeoutId) clearTimeout(timeoutId);
            
            // Verificar sesión después del registro
            const { data: sessionData } = await supabase.auth.getSession();
            
            if (sessionData?.session) {
              // Si hay sesión, redirigir inmediatamente
              console.log('[AuthForm] Sesión encontrada, redirigiendo...');
              showSuccessAlert('register', 'admin');
              setTimeout(() => onSuccess(), 500);
            } else {
              // Si no hay sesión inmediatamente, intentar una vez más
              console.log('[AuthForm] Esperando sesión...');
              await new Promise(resolve => setTimeout(resolve, 1000));
              const { data: retrySession } = await supabase.auth.getSession();
              
              if (retrySession?.session) {
                showSuccessAlert('register', 'admin');
                setTimeout(() => onSuccess(), 500);
              } else {
                // Aunque no haya sesión, el registro fue exitoso
                console.log('[AuthForm] Registro completado, pidiendo login manual');
                setError('✅ Tu cuenta se creó exitosamente.\n\nAhora puedes iniciar sesión con tu email y contraseña.');
                setLoading(false);
                setIsLogin(true); // Cambiar a modo login automáticamente
              }
            }
          }
        } catch (signUpError: any) {
          if (!isComplete) {
            isComplete = true;
            if (timeoutId) clearTimeout(timeoutId);
            throw signUpError;
          }
        }
      }
    } catch (err: any) {
      if (!isComplete) {
        isComplete = true;
        if (timeoutId) clearTimeout(timeoutId);
        
        console.error('[AuthForm] Error en handleSubmit:', err);
        const errorMessage = err.message || 'Ocurrió un error inesperado';
        
        // Mensajes de error más específicos y útiles
        if (errorMessage.includes('Supabase no está configurado') || errorMessage.includes('no está configurado')) {
          setError('⚠️ Error de configuración\n\nFalta configurar Supabase. Crea un archivo .env.local en la raíz del proyecto con:\n\nVITE_SUPABASE_URL=tu_url\nVITE_SUPABASE_ANON_KEY=tu_key\n\nLuego reinicia el servidor de desarrollo.');
        } else if (errorMessage.includes('verificar') || errorMessage.includes('email')) {
          // Si el mensaje menciona verificación, simplificarlo
          setError(errorMessage.replace(/verificar.*email.*/gi, 'Intenta iniciar sesión con tus credenciales.'));
        } else if (errorMessage.includes('Tiempo de espera') || errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
          setError('⏱️ Tiempo de espera agotado\n\nLa operación está tardando demasiado. Esto puede deberse a:\n\n1. Conexión a internet lenta\n2. Supabase no está disponible temporalmente\n\nIntenta nuevamente en unos momentos.');
        } else if (errorMessage.includes('network') || errorMessage.includes('Network') || errorMessage.includes('fetch') || errorMessage.includes('connection')) {
          setError('🌐 Error de conexión\n\nNo se pudo conectar con Supabase. Verifica:\n\n1. Tu conexión a internet\n2. Que las credenciales de Supabase sean correctas\n3. Que Supabase esté funcionando');
        } else if (errorMessage.includes('incorrectos') || errorMessage.includes('Invalid login')) {
          setError('❌ Credenciales incorrectas\n\nEl email o contraseña que ingresaste no son correctos. Verifica e intenta nuevamente.');
        } else if (errorMessage.includes('ya está registrado') || errorMessage.includes('already registered')) {
          setError('ℹ️ Email ya registrado\n\nEste email ya está registrado. Intenta iniciar sesión o recuperar tu contraseña.');
        } else {
          setError(errorMessage);
        }
        
        setLoading(false);
      }
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
