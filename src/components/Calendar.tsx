import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarProps {
  services: Array<{
    id: string;
    name: string;
    price: number;
    timestamp: Date;
  }>;
  onDateSelect: (date: Date) => void;
  selectedDate: Date;
  onMonthChange?: (year: number, month: number) => void;
}

export function Calendar({ services, onDateSelect, selectedDate, onMonthChange }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Notificar cambio de mes
  useEffect(() => {
    if (onMonthChange) {
      onMonthChange(currentMonth.getFullYear(), currentMonth.getMonth());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [currentMonth]);

  const getEarningsForDate = (date: Date | null) => {
    if (!date) return 0;
    return services
      .filter((service) => {
        const serviceDate = new Date(service.timestamp);
        return serviceDate.toDateString() === date.toDateString();
      })
      .reduce((total, service) => total + service.price, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date | null) => {
    if (!date) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <h2 className="text-xl font-bold text-white">
          {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
        </h2>
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
          <div key={day} className="text-center text-gray-400 text-sm font-semibold py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {daysInMonth.map((date, index) => {
          const earnings = getEarningsForDate(date);
          const hasEarnings = earnings > 0;

          return (
            <button
              key={index}
              onClick={() => date && onDateSelect(date)}
              disabled={!date}
              className={`
                aspect-square p-2 rounded-lg transition-all
                ${!date ? 'invisible' : ''}
                ${isSelected(date) ? 'bg-white text-black font-bold' : ''}
                ${isToday(date) && !isSelected(date) ? 'border-2 border-white text-white' : ''}
                ${!isSelected(date) && !isToday(date) ? 'text-gray-300 hover:bg-white/10' : ''}
                ${hasEarnings && !isSelected(date) ? 'bg-white/5' : ''}
              `}
            >
              {date && (
                <div className="flex flex-col items-center justify-center h-full">
                  <span className="text-sm">{date.getDate()}</span>
                  {hasEarnings && (
                    <span className="text-xs text-green-400 font-semibold mt-1">
                      {formatCurrency(earnings).replace('$', '').replace('.', '')}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
