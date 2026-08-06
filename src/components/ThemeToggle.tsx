import React from 'react';
import { Sun, Moon } from './Icons';

interface ThemeToggleProps {
  theme: 'dark' | 'light';
  onToggle: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className="theme-toggle-btn"
      title={`Alternar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
      aria-label="Alternar tema"
    >
      {theme === 'dark' ? <Sun className="icon" /> : <Moon className="icon" />}
      <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
    </button>
  );
};
