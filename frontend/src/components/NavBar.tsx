import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NavBar() {
  const { user, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary-100 text-primary-700'
        : 'text-secondary-700 hover:bg-secondary-100 hover:text-secondary-900'
    }`;

  const handleLogout = async () => {
    await logout();
  };

  return (
    <nav className="bg-white border-b border-secondary-200 shadow-sm" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 desktop:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <div className="flex-shrink-0">
            <span className="text-xl font-bold text-primary-700">EcoOffice</span>
          </div>

          {/* Desktop navigation */}
          <div className="hidden tablet:flex tablet:items-center tablet:space-x-4">
            <NavLink to="/desks" className={linkClasses}>
              Desks
            </NavLink>
            <NavLink to="/parking" className={linkClasses}>
              Parking
            </NavLink>
            <NavLink to="/bookings" className={linkClasses}>
              My Bookings
            </NavLink>
            {isAdmin && (
              <>
                <NavLink to="/admin/resources" className={linkClasses}>
                  Admin Resources
                </NavLink>
                <NavLink to="/admin/bookings" className={linkClasses}>
                  Admin Bookings
                </NavLink>
              </>
            )}
          </div>

          {/* User info & logout (desktop) */}
          <div className="hidden tablet:flex tablet:items-center tablet:space-x-4">
            <span className="text-sm text-secondary-600">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-md text-sm font-medium text-danger-600 hover:bg-danger-50 transition-colors"
            >
              Logout
            </button>
          </div>

          {/* Mobile hamburger button */}
          <div className="tablet:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="tablet:hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <NavLink to="/desks" className={linkClasses} onClick={() => setMobileMenuOpen(false)}>
              Desks
            </NavLink>
            <NavLink to="/parking" className={linkClasses} onClick={() => setMobileMenuOpen(false)}>
              Parking
            </NavLink>
            <NavLink to="/bookings" className={linkClasses} onClick={() => setMobileMenuOpen(false)}>
              My Bookings
            </NavLink>
            {isAdmin && (
              <>
                <NavLink to="/admin/resources" className={linkClasses} onClick={() => setMobileMenuOpen(false)}>
                  Admin Resources
                </NavLink>
                <NavLink to="/admin/bookings" className={linkClasses} onClick={() => setMobileMenuOpen(false)}>
                  Admin Bookings
                </NavLink>
              </>
            )}
          </div>
          <div className="border-t border-secondary-200 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-secondary-600">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-md text-sm font-medium text-danger-600 hover:bg-danger-50 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
