import React, { useState, useEffect, useMemo } from 'react';
import { Scissors, Calendar as CalendarIcon, DollarSign, TrendingUp, Users, LogOut, Trash2 } from 'lucide-react';
import * as data from '../lib/data';
import { useAuth } from '../contexts/AuthContext';
import { Calendar } from './Calendar';
import { Navbar } from './Navbar';

interface Service {
  id: string;
  name: string;
  price: number;
  timestamp: Date;
}

type ServiceType = data.ServiceType;

export function Dashboard() {
  const { user, signOut, role, barbershop } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [activeTab, setActiveTab] = useState<'resumen' | 'analiticas' | 'barberos' | 'editar'>('resumen');
  const [barbers, setBarbers] = useState<Array<{ id: string; email: string }>>([]);
  const [newBarberEmail, setNewBarberEmail] = useState('');
  const [newBarberPassword, setNewBarberPassword] = useState('');
  const [assignBarberId, setAssignBarberId] = useState<string>('');
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [editingBarberId, setEditingBarberId] = useState<string>('');
  const [editingEmail, setEditingEmail] = useState('');
  const [editingPassword, setEditingPassword] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [selectedBarberForGoals, setSelectedBarberForGoals] = useState<string>('');
  const [weeklyServicesGoal, setWeeklyServicesGoal] = useState<number>(0);
  const [weeklyRevenueGoal, setWeeklyRevenueGoal] = useState<number>(0);
  const [rankingPeriod, setRankingPeriod] = useState<'day' | '7d' | 'month'>('day');
  const [rankingRows, setRankingRows] = useState<Array<{ id: string; email: string; services: number; revenue: number }>>([]);
  const [calendarMonth, setCalendarMonth] = useState<{ year: number; month: number }>({ 
    year: new Date().getFullYear(), 
    month: new Date().getMonth() 
  });

  useEffect(() => {
    loadServices(true); // Cargar inicial con loading
    // Cargar barberos si admin
    if (role === 'admin' && barbershop?.id) {
      loadBarbers();
    }
    (async () => {
      const types = await data.getServiceTypes();
      setServiceTypes(types);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, user?.id, barbershop?.id]);

  // Recargar servicios cuando el admin cambia a analíticas para asegurar datos actualizados
  // Comentado temporalmente para permitir navegación libre
  // useEffect(() => {
  //   // Solo recargar si estamos en analíticas, no bloquear navegación
  //   if (role === 'admin' && activeTab === 'analiticas' && barbershop?.id) {
  //     // Usar requestIdleCallback o setTimeout para no bloquear
  //     const timeoutId = setTimeout(() => {
  //       loadServices(false).catch((err) => {
  //         console.error('Error loading services in analytics:', err);
  //       });
  //       loadBarbers().catch((err) => {
  //         console.error('Error loading barbers in analytics:', err);
  //       });
  //     }, 100);
  //     return () => clearTimeout(timeoutId);
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [activeTab]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const loadServices = async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      if (!barbershop?.id) {
        setServices([]);
        if (showLoading) {
          setLoading(false);
        }
        return;
      }
      // Los barberos solo ven sus propios servicios, el admin ve todos
      const barberUserId = role === 'barber' && user?.id ? user.id : undefined;
      const rows = await data.listServices(barbershop.id, barberUserId);
      setServices(rows.map((r) => ({ ...r, timestamp: new Date(r.timestamp) })) as any);
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const addService = async (serviceType: ServiceType) => {
    if (!user) return;
    // Requiere perfil cargado
    if (!barbershop?.id) {
      alert('No se encontró la barbería del usuario');
      return;
    }

    try {
      const created = await data.addService({
            user_id: user.id,
        barberUserId: role === 'admin' && assignBarberId ? assignBarberId : user.id,
        barbershopId: barbershop.id,
            name: serviceType.name,
            price: serviceType.price,
      });
      setServices((prev) => [{ ...created, timestamp: new Date(created.timestamp) } as any, ...prev]);
    } catch (error) {
      console.error('Error adding service:', error);
    }
  };

  const loadBarbers = async () => {
    if (!barbershop?.id) return;
    const list = await data.listBarbers(barbershop.id);
    setBarbers(list.map((b) => ({ id: b.id, email: b.email })));
  };

  const addBarber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barbershop?.id) return;
    if (!newBarberEmail || !newBarberPassword) return;
    try {
      await data.createBarber(newBarberEmail, newBarberPassword, barbershop.id);
      setNewBarberEmail('');
      setNewBarberPassword('');
      await loadBarbers();
    } catch (err: any) {
      alert(err.message || 'Error creando barbero');
    }
  };

  const generateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barbershop?.id || !inviteEmail) return;
    try {
      const { link, email, password } = await data.createInvite(inviteEmail, barbershop.id);
      setInviteLink(link);
      
      // Enviar correo con las credenciales
      try {
        const { sendInviteEmail } = await import('../lib/email');
        await sendInviteEmail({ 
          toEmail: email, 
          inviteLink: link, 
          password: password 
        });
        alert('Invitación generada y correo enviado exitosamente');
      } catch (emailErr: any) {
        // Si falla el envío del correo, mostrar el link manualmente
        console.error('Error enviando correo:', emailErr);
        alert(`Invitación generada. Link: ${link}\nEmail: ${email}\nContraseña: ${password}\n\nNota: No se pudo enviar el correo automáticamente.`);
      }
      
      // Limpiar el formulario
      setInviteEmail('');
    } catch (err: any) {
      alert(err.message || 'Error generando invitación');
    }
  };

  const saveGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBarberForGoals) return;
    try {
      await data.setGoals(selectedBarberForGoals, {
        weekly: { targetServices: weeklyServicesGoal || undefined, targetRevenue: weeklyRevenueGoal || undefined },
      });
      alert('Metas guardadas');
    } catch (err: any) {
      alert(err.message || 'Error guardando metas');
    }
  };

  const loadRanking = async () => {
    if (!barbershop?.id) return;
    const rows = await data.getRanking(barbershop.id, rankingPeriod);
    setRankingRows(rows);
  };

  const deleteService = async (serviceId: string) => {
    if (!user) return;

    // Confirmar eliminación
    if (!window.confirm('¿Estás seguro de que quieres eliminar este servicio?')) {
      return;
    }

    try {
      await data.deleteService(serviceId, user.id);
      setServices((prev) => prev.filter((service) => service.id !== serviceId));
    } catch (error) {
      console.error('Error deleting service:', error);
      alert('Error al eliminar el servicio. Inténtalo de nuevo.');
    }
  };

  const getTodaysServices = () => {
    const today = new Date();
    return services.filter((service) => {
      const serviceDate = new Date(service.timestamp);
      return serviceDate.toDateString() === today.toDateString();
    });
  };

  const getServicesForDate = (date: Date) => {
    return services.filter((service) => {
      const serviceDate = new Date(service.timestamp);
      return serviceDate.toDateString() === date.toDateString();
    });
  };

  const getWeeklyServices = () => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);

    return services.filter((service) => {
      const serviceDate = new Date(service.timestamp);
      return serviceDate >= weekStart;
    });
  };

  const getMonthlyServices = () => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    return services.filter((service) => {
      const serviceDate = new Date(service.timestamp);
      return serviceDate >= monthStart;
    });
  };

  const getYearlyServices = () => {
    const today = new Date();
    const yearStart = new Date(today.getFullYear(), 0, 1);

    return services.filter((service) => {
      const serviceDate = new Date(service.timestamp);
      return serviceDate >= yearStart;
    });
  };

  const getServicesForMonth = (year: number, month: number) => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    return services.filter((service) => {
      const serviceDate = new Date(service.timestamp);
      return serviceDate >= monthStart && serviceDate <= monthEnd;
    });
  };

  const calculateEarnings = (serviceList: Service[]) => {
    return serviceList.reduce((total, service) => total + service.price, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const todaysServices = getTodaysServices();
  const weeklyServices = getWeeklyServices();
  const monthlyServices = getMonthlyServices();
  const yearlyServices = getYearlyServices();
  const selectedDateServices = getServicesForDate(selectedDate);

  // Mostrar loading solo en carga inicial, permitir navegación siempre
  const isInitialLoad = loading && services.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {isInitialLoad && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-white text-xl">Cargando...</div>
        </div>
      )}
      <div className="container mx-auto px-4 py-8">
        <div className="sticky top-0 z-10 backdrop-blur bg-black/30 border border-gray-700 rounded-xl p-2 mb-6">
          <Navbar active={activeTab} onChange={setActiveTab} isAdmin={role === 'admin'} />
        </div>
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Scissors className="w-8 h-8 text-gray-400" />
            <h1 className="text-4xl font-bold text-white">fzbarber</h1>
            <Scissors className="w-8 h-8 text-gray-400 scale-x-[-1]" />
          </div>
          <p className="text-gray-300 text-lg">Sistema de Control de Ganancias</p>
          {barbershop?.name && (
            <p className="text-gray-400 mt-1">Barbería: <span className="text-white font-semibold">{barbershop.name}</span></p>
          )}
          <div className="flex items-center justify-center gap-2 mt-2 text-gray-400">
            <CalendarIcon className="w-4 h-4" />
            <span>
              {currentDate.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
          <button
            onClick={signOut}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-gray-700 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>

        {role === 'admin' && activeTab === 'analiticas' && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-gray-700 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Analíticas Generales</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-6 h-6 text-white" />
              <h3 className="text-white font-semibold">Hoy</h3>
            </div>
            <p className="text-2xl font-bold text-white">
                  {formatCurrency(calculateEarnings(getTodaysServices()))}
            </p>
                <p className="text-gray-400 text-sm">{getTodaysServices().length} servicios</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-6 h-6 text-white" />
              <h3 className="text-white font-semibold">Esta Semana</h3>
            </div>
            <p className="text-2xl font-bold text-white">
                  {formatCurrency(calculateEarnings(getWeeklyServices()))}
            </p>
                <p className="text-gray-400 text-sm">{getWeeklyServices().length} servicios</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <CalendarIcon className="w-6 h-6 text-white" />
              <h3 className="text-white font-semibold">Este Mes</h3>
            </div>
            <p className="text-2xl font-bold text-white">
                  {formatCurrency(calculateEarnings(getMonthlyServices()))}
            </p>
                <p className="text-gray-400 text-sm">{getMonthlyServices().length} servicios</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-white" />
              <h3 className="text-white font-semibold">Este Año</h3>
            </div>
            <p className="text-2xl font-bold text-white">
                  {formatCurrency(calculateEarnings(getYearlyServices()))}
            </p>
                <p className="text-gray-400 text-sm">{getYearlyServices().length} servicios</p>
          </div>
        </div>

            {/* Analíticas por Barbero */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-6 text-center">Cortes por Barbero</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-gray-300">
                  <thead className="text-gray-400 border-b border-gray-700">
                    <tr>
                      <th className="py-3 px-4">Barbero</th>
                      <th className="py-3 px-4 text-center">Cortes Hoy</th>
                      <th className="py-3 px-4 text-center">Ingresos Hoy</th>
                      <th className="py-3 px-4 text-center">Cortes Esta Semana</th>
                      <th className="py-3 px-4 text-center">Ingresos Semana</th>
                      <th className="py-3 px-4 text-center">Cortes Este Mes</th>
                      <th className="py-3 px-4 text-center">Ingresos Mes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {barbers.length === 0 ? (
                      <tr>
                        <td className="py-4 px-4 text-center text-gray-500" colSpan={7}>
                          No hay barberos registrados
                        </td>
                      </tr>
                    ) : (
                      (() => {
                        // Calcular todo antes del map para evitar bloqueos
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const weekStart = new Date(today);
                        weekStart.setDate(today.getDate() - today.getDay());
                        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                        
                        return barbers.map((barber) => {
                          const barberServices = services.filter((s) => s.barberUserId === barber.id);
                          
                          const todayServices = barberServices.filter((s) => {
                            const serviceDate = new Date(s.timestamp);
                            return serviceDate.toDateString() === today.toDateString();
                          });
                          
                          const weekServices = barberServices.filter((s) => {
                            const serviceDate = new Date(s.timestamp);
                            return serviceDate >= weekStart;
                          });
                          
                          const monthServices = barberServices.filter((s) => {
                            const serviceDate = new Date(s.timestamp);
                            return serviceDate >= monthStart;
                          });
                          
                          return (
                            <tr key={barber.id} className="border-b border-gray-800 hover:bg-white/5">
                              <td className="py-3 px-4 font-medium text-white">{barber.email}</td>
                              <td className="py-3 px-4 text-center">{todayServices.length}</td>
                              <td className="py-3 px-4 text-center">{formatCurrency(calculateEarnings(todayServices))}</td>
                              <td className="py-3 px-4 text-center">{weekServices.length}</td>
                              <td className="py-3 px-4 text-center">{formatCurrency(calculateEarnings(weekServices))}</td>
                              <td className="py-3 px-4 text-center">{monthServices.length}</td>
                              <td className="py-3 px-4 text-center">{formatCurrency(calculateEarnings(monthServices))}</td>
                            </tr>
                          );
                        });
                      })()
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="space-y-4">
            <Calendar
              services={services}
              onDateSelect={setSelectedDate}
              selectedDate={selectedDate}
              onMonthChange={(year, month) => setCalendarMonth({ year, month })}
            />
            {/* Resumen del mes visible en el calendario */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
              <p className="text-gray-400 text-sm mb-2">Total del mes</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(calculateEarnings(getServicesForMonth(calendarMonth.year, calendarMonth.month)))}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {getServicesForMonth(calendarMonth.year, calendarMonth.month).length} servicios
              </p>
            </div>
          </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-gray-700 lg:col-span-2">
                <h3 className="text-2xl font-bold text-white mb-6 text-center">
              {selectedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
            <div className="mb-6">
              <div className="bg-white/5 rounded-lg p-4 border border-gray-700">
                <p className="text-gray-400 text-sm mb-1">Total del día</p>
                <p className="text-3xl font-bold text-white">{formatCurrency(calculateEarnings(selectedDateServices))}</p>
                <p className="text-gray-400 text-sm mt-1">{selectedDateServices.length} servicios</p>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {selectedDateServices.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No hay servicios registrados</p>
              ) : (
                <div className="space-y-3">
                  {selectedDateServices.map((service) => (
                    <div
                      key={service.id}
                      className="bg-white/5 rounded-lg p-4 flex justify-between items-center border border-gray-800"
                    >
                      <div className="flex-1">
                        <p className="text-white font-medium">{service.name}</p>
                        <p className="text-gray-400 text-sm">
                          {service.timestamp.toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-white font-bold">{formatCurrency(service.price)}</div>
                        <button
                          onClick={() => deleteService(service.id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Eliminar servicio"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
            </div>
          </div>
        )}

        {role === 'admin' && activeTab === 'barberos' && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-gray-700 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Gestionar Barberos</h2>
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-2">Invitar barbero</h3>
              <form onSubmit={generateInvite} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email para invitar"
                  className="px-4 py-2 bg-white/5 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white"
                  required
                />
                <button type="submit" className="px-4 py-2 bg-white text-black rounded-lg font-semibold">Generar invitación</button>
                {inviteLink && (
                  <a className="px-4 py-2 bg-white/10 border border-gray-700 rounded-lg text-gray-200 truncate" href={inviteLink} target="_blank" rel="noreferrer">
                    {inviteLink}
                  </a>
                )}
              </form>
            </div>
            <form onSubmit={addBarber} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <input
                type="email"
                value={newBarberEmail}
                onChange={(e) => setNewBarberEmail(e.target.value)}
                placeholder="email del barbero"
                className="px-4 py-2 bg-white/5 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white"
                required
              />
              <input
                type="password"
                value={newBarberPassword}
                onChange={(e) => setNewBarberPassword(e.target.value)}
                placeholder="contraseña"
                className="px-4 py-2 bg-white/5 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white"
                required
                minLength={6}
              />
              <button type="submit" className="px-4 py-2 bg-white text-black rounded-lg font-semibold">Agregar Barbero</button>
            </form>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-gray-300">
                <thead className="text-gray-400">
                  <tr>
                    <th className="py-2">Email</th>
                    <th className="py-2">ID</th>
                    <th className="py-2">Rol</th>
                    <th className="py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {barbers.length === 0 ? (
                    <tr><td className="py-2" colSpan={3}>Sin barberos</td></tr>
                  ) : (
                    barbers.map((b) => (
                      <tr key={b.id}>
                        <td className="py-2">
                          {editingBarberId === b.id ? (
                            <input
                              type="email"
                              value={editingEmail}
                              onChange={(e) => setEditingEmail(e.target.value)}
                              className="px-3 py-1 bg-white/5 border border-gray-700 rounded text-white w-full"
                            />
                          ) : (
                            b.email
                          )}
                        </td>
                        <td className="py-2 text-xs text-gray-500">{b.id}</td>
                        <td className="py-2">
                          <select
                            className="px-3 py-1 bg-white/5 border border-gray-700 rounded text-white"
                            defaultValue={'barber'}
                            onChange={async (e) => {
                              try {
                                await data.updateRole(b.id, e.target.value as any);
                                await loadBarbers();
                              } catch (err: any) {
                                alert(err.message || 'Error cambiando rol');
                              }
                            }}
                          >
                            <option value="admin">admin</option>
                            <option value="barber">barber</option>
                            <option value="cashier">cashier</option>
                            <option value="auditor">auditor</option>
                          </select>
                        </td>
                        <td className="py-2">
                          <div className="flex gap-2 justify-end">
                            {editingBarberId === b.id ? (
                              <>
                                <input
                                  type="password"
                                  value={editingPassword}
                                  onChange={(e) => setEditingPassword(e.target.value)}
                                  placeholder="(opcional) nueva contraseña"
                                  className="px-3 py-1 bg-white/5 border border-gray-700 rounded text-white"
                                />
                                <button
                                  className="px-3 py-1 bg-white text-black rounded"
                                  onClick={async () => {
                                    try {
                                      await data.updateBarber(b.id, {
                                        email: editingEmail || undefined,
                                        password: editingPassword || undefined,
                                      });
                                      setEditingBarberId('');
                                      setEditingEmail('');
                                      setEditingPassword('');
                                      await loadBarbers();
                                    } catch (err: any) {
                                      alert(err.message || 'Error actualizando barbero');
                                    }
                                  }}
                                >
                                  Guardar
                                </button>
                                <button
                                  className="px-3 py-1 bg-gray-600 text-white rounded"
                                  onClick={() => {
                                    setEditingBarberId('');
                                    setEditingEmail('');
                                    setEditingPassword('');
                                  }}
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="px-3 py-1 bg-white/10 border border-gray-700 rounded"
                                  onClick={() => {
                                    setEditingBarberId(b.id);
                                    setEditingEmail(b.email);
                                    setEditingPassword('');
                                  }}
                                >
                                  Editar
                                </button>
                                <button
                                  className="px-3 py-1 bg-red-600 text-white rounded"
                                  onClick={async () => {
                                    if (!confirm('¿Borrar barbero y sus servicios?')) return;
                                    try {
                                      await data.deleteBarber(b.id, { removeServices: true });
                                      await loadBarbers();
                                      // Si el barbero asignado actual fue borrado, limpiar selección
                                      if (assignBarberId === b.id) setAssignBarberId('');
                                      // Opcional: recargar servicios ya que quitamos los del barbero
                                      await loadServices();
                                    } catch (err: any) {
                                      alert(err.message || 'Error borrando barbero');
                                    }
                                  }}
                                >
                                  Borrar
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {role === 'admin' && activeTab === 'barberos' && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-gray-700 mb-8">
            <h3 className="text-white font-semibold mb-4">Horarios y Metas (simple)</h3>
            <form onSubmit={saveGoals} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Barbero</label>
                <select
                  value={selectedBarberForGoals}
                  onChange={(e) => setSelectedBarberForGoals(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-gray-700 rounded text-white"
                >
                  <option value="">Seleccionar</option>
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id}>{b.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Meta semanal (servicios)</label>
                <input type="number" min={0} value={weeklyServicesGoal} onChange={(e) => setWeeklyServicesGoal(parseInt(e.target.value||'0',10))} className="w-full px-3 py-2 bg-white/5 border border-gray-700 rounded text-white" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Meta semanal (ingresos)</label>
                <input type="number" min={0} value={weeklyRevenueGoal} onChange={(e) => setWeeklyRevenueGoal(parseInt(e.target.value||'0',10))} className="w-full px-3 py-2 bg-white/5 border border-gray-700 rounded text-white" />
              </div>
              <button type="submit" className="px-4 py-2 bg-white text-black rounded-lg font-semibold">Guardar metas</button>
            </form>
          </div>
        )}

        {role === 'admin' && activeTab === 'barberos' && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-gray-700 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Ranking de productividad</h3>
              <select value={rankingPeriod} onChange={async (e)=>{ setRankingPeriod(e.target.value as any); await loadRanking(); }} className="px-3 py-2 bg-white/5 border border-gray-700 rounded text-white">
                <option value="day">Hoy</option>
                <option value="7d">Últimos 7 días</option>
                <option value="month">Este mes</option>
              </select>
            </div>
            <button onClick={loadRanking} className="mb-3 px-3 py-1 bg-white/10 border border-gray-700 rounded text-gray-200">Actualizar</button>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-gray-300">
                <thead className="text-gray-400">
                  <tr>
                    <th className="py-2">Barbero</th>
                    <th className="py-2">Servicios</th>
                    <th className="py-2">Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingRows.length === 0 ? (
                    <tr><td className="py-2" colSpan={3}>Sin datos</td></tr>
                  ) : (
                    rankingRows.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2">{r.email}</td>
                        <td className="py-2">{r.services}</td>
                        <td className="py-2">{formatCurrency(r.revenue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'resumen' && (
        <></>
        )}

        {activeTab === 'resumen' && (
        <div className="grid grid-cols-1 gap-8 mb-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Registrar Servicio</h2>
            <div className="grid grid-cols-1 gap-4">
              {role === 'admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Asignar a barbero</label>
                  <select
                    value={assignBarberId}
                    onChange={(e) => setAssignBarberId(e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-gray-700 rounded-lg text-white"
                  >
                    <option value="">(Yo mismo)</option>
                    {barbers.map((b) => (
                      <option key={b.id} value={b.id}>{b.email}</option>
                    ))}
                  </select>
                </div>
              )}
              {serviceTypes.map((service, index) => (
                <button
                  key={index}
                  onClick={() => addService(service)}
                  className="bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white p-4 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl border border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{service.icon}</div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-sm">{service.name}</div>
                      <div className="text-lg font-bold">{formatCurrency(service.price)}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        )}

        {role === 'admin' && activeTab === 'editar' && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-gray-700 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Editar precios de cortes</h2>
            <div className="space-y-3">
              {serviceTypes.map((t, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                  <input
                    type="text"
                    value={t.name}
                    onChange={(e) => {
                      const next = [...serviceTypes];
                      next[idx] = { ...next[idx], name: e.target.value };
                      setServiceTypes(next);
                    }}
                    className="px-4 py-2 bg-white/5 border border-gray-700 rounded-lg text-white"
                  />
                  <input
                    type="number"
                    min={0}
                    value={t.price}
                    onChange={(e) => {
                      const next = [...serviceTypes];
                      next[idx] = { ...next[idx], price: parseInt(e.target.value||'0',10) };
                      setServiceTypes(next);
                    }}
                    className="px-4 py-2 bg-white/5 border border-gray-700 rounded-lg text-white"
                  />
                  <div className="text-gray-400">{t.icon}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <button
                className="px-4 py-2 bg-white text-black rounded-lg font-semibold"
                onClick={async () => {
                  await data.setServiceTypes(serviceTypes);
                  alert('Precios guardados');
                }}
              >
                Guardar cambios
              </button>
              <button
                className="px-4 py-2 bg-white/10 border border-gray-700 rounded-lg text-gray-200"
                onClick={async () => {
                  const types = await data.getServiceTypes();
                  setServiceTypes(types);
                }}
              >
                Deshacer
              </button>
            </div>
          </div>
        )}

        {activeTab === 'resumen' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Servicios de Hoy</h2>
            <div className="max-h-96 overflow-y-auto">
              {todaysServices.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No hay servicios registrados hoy</p>
              ) : (
                <div className="space-y-3">
                  {todaysServices.map((service) => (
                    <div
                      key={service.id}
                      className="bg-white/5 rounded-lg p-4 flex justify-between items-center border border-gray-800"
                    >
                      <div className="flex-1">
                        <p className="text-white font-medium">{service.name}</p>
                        <p className="text-gray-400 text-sm">
                          {service.timestamp.toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-white font-bold">{formatCurrency(service.price)}</div>
                        <button
                          onClick={() => deleteService(service.id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Eliminar servicio"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        <div className="text-center mt-8 text-gray-500">
          <p className="text-sm">© 2024 Peluquería El Estilo - Sistema de Control de Ganancias</p>
        </div>
      </div>
    </div>
  );
}
