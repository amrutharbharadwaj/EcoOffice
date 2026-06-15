import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NavBar from './NavBar';

const mockLogout = vi.fn();

const mockAuthValues = {
  user: { id: 1, email: 'test@example.com', name: 'Test User', role: 'user' as 'user' | 'admin' },
  isAuthenticated: true,
  isAdmin: false,
  isLoading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: mockLogout,
};

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthValues,
}));

function renderNavBar() {
  return render(
    <MemoryRouter>
      <NavBar />
    </MemoryRouter>,
  );
}

describe('NavBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthValues.isAdmin = false;
    mockAuthValues.user = { id: 1, email: 'test@example.com', name: 'Test User', role: 'user' };
  });

  it('renders the brand name', () => {
    renderNavBar();
    expect(screen.getByText('EcoOffice')).toBeInTheDocument();
  });

  it('renders navigation links for Desks, Parking, and My Bookings', () => {
    renderNavBar();
    expect(screen.getAllByText('Desks').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Parking').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('My Bookings').length).toBeGreaterThanOrEqual(1);
  });

  it('displays user name', () => {
    renderNavBar();
    expect(screen.getAllByText('Test User').length).toBeGreaterThanOrEqual(1);
  });

  it('does not show admin links for regular users', () => {
    renderNavBar();
    expect(screen.queryByText('Admin Resources')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin Bookings')).not.toBeInTheDocument();
  });

  it('shows admin links when user has admin role', () => {
    mockAuthValues.isAdmin = true;
    mockAuthValues.user = { id: 1, email: 'admin@example.com', name: 'Admin User', role: 'admin' };
    renderNavBar();
    expect(screen.getAllByText('Admin Resources').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Admin Bookings').length).toBeGreaterThanOrEqual(1);
  });

  it('calls logout when logout button is clicked', () => {
    renderNavBar();
    const logoutButtons = screen.getAllByText('Logout');
    fireEvent.click(logoutButtons[0]);
    expect(mockLogout).toHaveBeenCalled();
  });

  it('toggles mobile menu on hamburger click', () => {
    renderNavBar();
    const menuButton = screen.getByLabelText('Open menu');
    fireEvent.click(menuButton);
    expect(screen.getByLabelText('Close menu')).toBeInTheDocument();
  });
});
