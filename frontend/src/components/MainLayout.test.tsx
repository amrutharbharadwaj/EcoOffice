import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import MainLayout from './MainLayout';

const mockAuthValues = {
  user: { id: 1, email: 'test@example.com', name: 'Test User', role: 'user' as const },
  isAuthenticated: true,
  isAdmin: false,
  isLoading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
};

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthValues,
}));

describe('MainLayout', () => {
  it('renders child route content when authenticated', () => {
    render(
      <MemoryRouter initialEntries={['/desks']}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/desks" element={<div>Desk Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Desk Content')).toBeInTheDocument();
  });

  it('renders the NavBar when authenticated', () => {
    render(
      <MemoryRouter initialEntries={['/desks']}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/desks" element={<div>Desk Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('EcoOffice')).toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    mockAuthValues.isAuthenticated = false;
    render(
      <MemoryRouter initialEntries={['/desks']}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/desks" element={<div>Desk Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByText('Desk Content')).not.toBeInTheDocument();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    mockAuthValues.isAuthenticated = true;
  });

  it('shows loading state while auth is loading', () => {
    mockAuthValues.isLoading = true;
    render(
      <MemoryRouter initialEntries={['/desks']}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/desks" element={<div>Desk Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Desk Content')).not.toBeInTheDocument();
    mockAuthValues.isLoading = false;
  });
});
