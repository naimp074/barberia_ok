import React from 'react';

interface NavbarProps {
  active: 'resumen' | 'analiticas' | 'barberos' | 'editar';
  onChange: (tab: 'resumen' | 'analiticas' | 'barberos' | 'editar') => void;
  isAdmin: boolean;
}

export function Navbar({ active, onChange, isAdmin }: NavbarProps) {
  const handleTabChange = React.useCallback((id: 'resumen' | 'analiticas' | 'barberos' | 'editar') => {
    // Usar requestAnimationFrame para asegurar que el cambio se ejecute sin bloqueos
    requestAnimationFrame(() => {
      onChange(id);
    });
  }, [onChange]);

  const Tab = ({ id, label }: { id: 'resumen' | 'analiticas' | 'barberos' | 'editar'; label: string }) => (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleTabChange(id);
      }}
      className={`px-4 py-2 rounded-lg transition-colors ${
        active === id ? 'bg-white text-black font-semibold' : 'text-gray-300 hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-center justify-center gap-2 bg-white/5 border border-gray-700 rounded-xl p-2">
      <Tab id="resumen" label="Resumen" />
      {isAdmin && <Tab id="analiticas" label="Analíticas" />}
      {isAdmin && <Tab id="barberos" label="Barberos" />}
      {isAdmin && <Tab id="editar" label="Editar" />}
    </div>
  );
}
