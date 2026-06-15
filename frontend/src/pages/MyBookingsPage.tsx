import { useState, useEffect, useCallback } from 'react';
import apiClient, { ApiError } from '../api/client';
import BookingCard, { Booking } from '../components/BookingCard';

interface BookingsResponse {
  data: {
    bookings: Booking[];
    message?: string;
  };
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get<BookingsResponse>('/bookings/mine');
      setBookings(response.data.bookings);
    } catch {
      setNotification({ type: 'error', message: 'Failed to load bookings' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  async function handleCancel(bookingId: number) {
    setCancellingId(bookingId);
    try {
      await apiClient.delete(`/bookings/${bookingId}`);
      setNotification({ type: 'success', message: 'Booking cancelled successfully' });
      await fetchBookings();
    } catch (err) {
      const apiErr = err as ApiError;
      setNotification({ type: 'error', message: apiErr.error || 'Failed to cancel booking' });
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-primary-700 mb-6">My Bookings</h1>

      {notification && (
        <div
          role="alert"
          className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${
            notification.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {notification.message}
        </div>
      )}

      {isLoading ? (
        <p className="text-neutral-500">Loading bookings...</p>
      ) : bookings.length === 0 ? (
        <p className="text-neutral-600">No upcoming bookings found</p>
      ) : (
        <div className="grid gap-4">
          {bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onCancel={handleCancel}
              isCancelling={cancellingId === booking.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
