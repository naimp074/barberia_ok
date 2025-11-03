import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface Service {
  id: string;
  name: string;
  price: number;
  timestamp: Date;
  barberUserId?: string;
}

interface AnalyticsChartsProps {
  services: Service[];
  barbers: Array<{ id: string; email: string }>;
  selectedMonth: { year: number; month: number };
}

const COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899'];

export function AnalyticsCharts({ services, barbers, selectedMonth }: AnalyticsChartsProps) {
  // 1. Gráfico de líneas: Ganancias diarias del mes
  const dailyEarningsData = useMemo(() => {
    const { year, month } = selectedMonth;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const data = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayServices = services.filter((service) => {
        const serviceDate = new Date(service.timestamp);
        return (
          serviceDate.getFullYear() === year &&
          serviceDate.getMonth() === month &&
          serviceDate.getDate() === day
        );
      });

      const earnings = dayServices.reduce((total, service) => total + service.price, 0);
      const serviceCount = dayServices.length;

      data.push({
        day: day,
        fecha: `${day}/${month + 1}`,
        ganancias: earnings,
        servicios: serviceCount,
      });
    }

    return data;
  }, [services, selectedMonth]);

  // 2. Gráfico de barras: Comparación de barberos
  const barberComparisonData = useMemo(() => {
    const { year, month } = selectedMonth;
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const monthServices = services.filter((service) => {
      const serviceDate = new Date(service.timestamp);
      return serviceDate >= monthStart && serviceDate <= monthEnd;
    });

    const byBarber: Record<string, { earnings: number; count: number; email: string }> = {};

    monthServices.forEach((service) => {
      const barberId = service.barberUserId || 'sin-asignar';
      const barberEmail = barbers.find((b) => b.id === barberId)?.email || 'Sin asignar';

      if (!byBarber[barberId]) {
        byBarber[barberId] = { earnings: 0, count: 0, email: barberEmail };
      }

      byBarber[barberId].earnings += service.price;
      byBarber[barberId].count += 1;
    });

    return Object.values(byBarber)
      .map((data) => ({
        barbero: data.email.length > 15 ? data.email.substring(0, 15) + '...' : data.email,
        ganancias: data.earnings,
        servicios: data.count,
      }))
      .sort((a, b) => b.ganancias - a.ganancias);
  }, [services, barbers, selectedMonth]);

  // 3. Gráfico circular: Distribución de tipos de servicios
  const serviceTypesData = useMemo(() => {
    const { year, month } = selectedMonth;
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const monthServices = services.filter((service) => {
      const serviceDate = new Date(service.timestamp);
      return serviceDate >= monthStart && serviceDate <= monthEnd;
    });

    const byType: Record<string, { count: number; earnings: number }> = {};

    monthServices.forEach((service) => {
      const serviceName = service.name;
      if (!byType[serviceName]) {
        byType[serviceName] = { count: 0, earnings: 0 };
      }
      byType[serviceName].count += 1;
      byType[serviceName].earnings += service.price;
    });

    return Object.entries(byType)
      .map(([name, data]) => ({
        name: name.length > 20 ? name.substring(0, 20) + '...' : name,
        cantidad: data.count,
        ganancias: data.earnings,
      }))
      .sort((a, b) => b.ganancias - a.ganancias);
  }, [services, selectedMonth]);

  // 4. Comparación: Este mes vs mes pasado
  const monthComparisonData = useMemo(() => {
    const { year, month } = selectedMonth;
    
    // Mes actual
    const currentMonthStart = new Date(year, month, 1);
    const currentMonthEnd = new Date(year, month + 1, 0);
    currentMonthEnd.setHours(23, 59, 59, 999);

    const currentMonthServices = services.filter((service) => {
      const serviceDate = new Date(service.timestamp);
      return serviceDate >= currentMonthStart && serviceDate <= currentMonthEnd;
    });

    const currentEarnings = currentMonthServices.reduce((total, service) => total + service.price, 0);
    const currentCount = currentMonthServices.length;

    // Mes pasado
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const prevMonthStart = new Date(prevYear, prevMonth, 1);
    const prevMonthEnd = new Date(prevYear, prevMonth + 1, 0);
    prevMonthEnd.setHours(23, 59, 59, 999);

    const prevMonthServices = services.filter((service) => {
      const serviceDate = new Date(service.timestamp);
      return serviceDate >= prevMonthStart && serviceDate <= prevMonthEnd;
    });

    const prevEarnings = prevMonthServices.reduce((total, service) => total + service.price, 0);
    const prevCount = prevMonthServices.length;

    const difference = currentEarnings - prevEarnings;
    const percentChange = prevEarnings > 0 ? ((difference / prevEarnings) * 100).toFixed(1) : '0';

    return {
      actual: {
        mes: new Date(year, month).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
        ganancias: currentEarnings,
        servicios: currentCount,
      },
      anterior: {
        mes: new Date(prevYear, prevMonth).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
        ganancias: prevEarnings,
        servicios: prevCount,
      },
      diferencia: difference,
      porcentaje: percentChange,
    };
  }, [services, selectedMonth]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
      {/* 1. Gráfico de líneas: Ganancias diarias del mes */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4 text-center">
          Ganancias Diarias del Mes
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyEarningsData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="fecha"
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F3F4F6',
              }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend wrapperStyle={{ color: '#9CA3AF' }} />
            <Line
              type="monotone"
              dataKey="ganancias"
              stroke="#8B5CF6"
              strokeWidth={2}
              name="Ganancias"
              dot={{ fill: '#8B5CF6', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 text-center text-gray-400 text-sm">
          Total del mes: <span className="text-white font-bold">
            {formatCurrency(dailyEarningsData.reduce((sum, day) => sum + day.ganancias, 0))}
          </span>
        </div>
      </div>

      {/* 2. Gráfico de barras: Comparación de barberos */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4 text-center">
          Comparación de Barberos
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barberComparisonData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="barbero"
              stroke="#9CA3AF"
              angle={-45}
              textAnchor="end"
              height={80}
              style={{ fontSize: '11px' }}
            />
            <YAxis
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F3F4F6',
              }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend wrapperStyle={{ color: '#9CA3AF' }} />
            <Bar dataKey="ganancias" fill="#10B981" name="Ganancias" />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          {barberComparisonData.map((barber, index) => (
            <div key={index} className="text-center">
              <div className="text-gray-400">{barber.barbero}</div>
              <div className="text-white font-bold">{formatCurrency(barber.ganancias)}</div>
              <div className="text-gray-500 text-xs">{barber.servicios} servicios</div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Gráfico circular: Distribución de tipos de servicios */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4 text-center">
          Distribución de Servicios
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={serviceTypesData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, ganancias, cantidad }) => {
                const total = serviceTypesData.reduce((sum, s) => sum + s.ganancias, 0);
                const porcentaje = total > 0 ? ((ganancias / total) * 100).toFixed(0) : '0';
                return `${name}: ${porcentaje}%`;
              }}
              outerRadius={100}
              fill="#8884d8"
              dataKey="ganancias"
            >
              {serviceTypesData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F3F4F6',
              }}
              formatter={(value: number) => formatCurrency(value)}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 space-y-2">
          {serviceTypesData.map((service, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-gray-300">{service.name}</span>
              </div>
              <div className="text-white font-semibold">
                {formatCurrency(service.ganancias)} ({service.cantidad})
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Comparación: Este mes vs mes pasado */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4 text-center">
          Comparación Mensual
        </h3>
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Mes Actual</span>
              <span className="text-white font-bold text-lg">
                {formatCurrency(monthComparisonData.actual.ganancias)}
              </span>
            </div>
            <div className="text-sm text-gray-500 mb-4">
              {monthComparisonData.actual.mes} • {monthComparisonData.actual.servicios} servicios
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Mes Anterior</span>
              <span className="text-white font-semibold">
                {formatCurrency(monthComparisonData.anterior.ganancias)}
              </span>
            </div>
            <div className="text-sm text-gray-500 mb-4">
              {monthComparisonData.anterior.mes} • {monthComparisonData.anterior.servicios} servicios
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Diferencia</span>
              <span
                className={`font-bold text-lg ${
                  monthComparisonData.diferencia >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {monthComparisonData.diferencia >= 0 ? '+' : ''}
                {formatCurrency(monthComparisonData.diferencia)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Variación</span>
              <span
                className={`font-semibold ${
                  parseFloat(monthComparisonData.porcentaje) >= 0
                    ? 'text-green-400'
                    : 'text-red-400'
                }`}
              >
                {monthComparisonData.porcentaje}%
              </span>
            </div>
          </div>

          {/* Gráfico de barras comparativo */}
          <div className="mt-6">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={[
                  {
                    mes: monthComparisonData.anterior.mes.split(' ')[0],
                    ganancias: monthComparisonData.anterior.ganancias,
                  },
                  {
                    mes: monthComparisonData.actual.mes.split(' ')[0],
                    ganancias: monthComparisonData.actual.ganancias,
                  },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="mes"
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F3F4F6',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="ganancias" fill="#3B82F6" name="Ganancias" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

