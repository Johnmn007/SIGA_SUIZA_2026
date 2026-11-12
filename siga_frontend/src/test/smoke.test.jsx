import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Componente simple para prueba de humo
function HeaderBadge({ title, status }) {
  return (
    <header className="p-4 bg-blue-600 text-white rounded">
      <h1 className="text-xl font-bold">{title}</h1>
      <span data-testid="status-badge" className="text-sm font-semibold">
        {status}
      </span>
    </header>
  );
}

describe('Frontend Smoke Test Suite', () => {
  it('debe inicializar vitest y el entorno jsdom correctamente', () => {
    expect(window).toBeDefined();
    expect(document).toBeDefined();
  });

  it('debe renderizar un componente React y verificar elementos en el DOM', () => {
    render(<HeaderBadge title="SIGA Suiza 2026 - Módulo de Pruebas" status="Activo" />);
    
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('SIGA Suiza 2026 - Módulo de Pruebas');
    const badge = screen.getByTestId('status-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Activo');
  });
});
