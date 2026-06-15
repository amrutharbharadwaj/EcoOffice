import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NavBar from './NavBar';

export default function MainLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="text-secondary-500 text-sm">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      <NavBar />
      <main className="w-full px-4 py-6 tablet:px-6 desktop:px-8 max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
