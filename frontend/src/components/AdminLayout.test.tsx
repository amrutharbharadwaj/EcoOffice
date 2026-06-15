import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import AdminLayout from './AdminLayout';

const mockAuthValues = {
  user: { id: 1, email: 'admin@example.com', name: 'Admin User', role: 'admin' as const },
  isAuthenticated: true,
  isAdmin: true,
  isLoading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
};

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthValues,
}));

describe('AdminLayout', () => {
  it('renders child route content when user is admin', () => {
    render(
      <MemoryRouter initialEntries={['/admin/resources']}>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route path="/admin/resources" element={<div>Admin Resources Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Admin Resources Content')).toBeInTheDocument();
  });

  it('renders the NavBar for admin users', () => {
    render(
      <MemoryRouter initialEntries={['/admin/resources']}>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route path="/admin/resources" element={<div>Admin Resources Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('EcoOffice')).toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    mockAuthValues.isAuthenticated = false;
    mockAuthValues.isAdmin = false;
    render(
      <MemoryRouter initialEntries={['/admin/resources']}>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route path="/admin/resources" element={<div>Admin Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    mockAuthValues.isAuthenticated = true;
    mockAuthValues.isAdmin = true;
  });

  it('redirects to /desks when authenticated but not admin', () => {
    mockAuthValues.isAuthenticated = true;
    mockAuthValues.isAdmin = false;
    render(
      <MemoryRouter initialEntries={['/admin/resources']}>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route path="/admin/resources" element={<div>Admin Content</div>} />
          </Route>
          <Route path="/desks" element={<div>Desks Page</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    expect(screen.getByText('Desks Page')).toBeInTheDocument();
    mockAuthValues.isAdmin = true;
  });

  it('shows loading state while auth is loading', () => {
    mockAuthValues.isLoading = true;
    render(
      <MemoryRouter initialEntries={['/admin/resources']}>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route path="/admin/resources" element={<div>Admin Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    mockAuthValues.isLoading = false;
  });
});
