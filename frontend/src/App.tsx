import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DeskBookingPage from './pages/DeskBookingPage';
import ParkingBookingPage from './pages/ParkingBookingPage';
import MyBookingsPage from './pages/MyBookingsPage';
import ResourceManagementPage from './pages/admin/ResourceManagementPage';
import BookingOverviewPage from './pages/admin/BookingOverviewPage';
import MainLayout from './components/MainLayout';
import AdminLayout from './components/AdminLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes (no layout) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Authenticated user routes */}
        <Route element={<MainLayout />}>
          <Route path="/desks" element={<DeskBookingPage />} />
          <Route path="/parking" element={<ParkingBookingPage />} />
          <Route path="/bookings" element={<MyBookingsPage />} />
        </Route>

        {/* Admin routes */}
        <Route element={<AdminLayout />}>
          <Route path="/admin/resources" element={<ResourceManagementPage />} />
          <Route path="/admin/bookings" element={<BookingOverviewPage />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
