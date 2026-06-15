import { useState, useEffect, useCallback } from 'react';
import apiClient, { ApiError } from '../api/client';
import DatePicker from '../components/DatePicker';
import FloorMapGrid, { Desk } from '../components/FloorMapGrid';
import BookingConfirmDialog from '../components/BookingConfirmDialog';

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isDateInPast(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(dateStr + 'T00:00:00');
  return selected < today;
}

interface AvailabilityResponse {
  data: Desk[];
}

export default function DeskBookingPage() {
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [desks, setDesks] = useState<Desk[]>([]);
  const [selectedDesk, setSelectedDesk] = useState<Desk | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchAvailability = useCallback(async (date: string) => {
    setIsFetching(true);
    setSelectedDesk(null);
    setShowDialog(false);
    try {
      const response = await apiClient.get<AvailabilityResponse>(
        `/availability/desks?date=${date}`,
      );
      setDesks(response.data);
    } catch {
      setDesks([]);
      setNotification({ type: 'error', message: 'Failed to load desk availability.' });
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailability(selectedDate);
    }
  }, [selectedDate, fetchAvailability]);

  // Auto-dismiss notification after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  function handleDeskSelect(desk: Desk) {
    setSelectedDesk(desk);
    setShowDialog(true);
  }
// Create a new desk booking for the selected desk and date
  async function handleConfirmBooking() {
    if (!selectedDesk) return;

    setIsLoading(true);
    try {
      // Send booking request to backend API
      await apiClient.post('/bookings/desks', {
        deskId: selectedDesk.id,
        date: selectedDate,
      });
      setNotification({ type: 'success', message: `Successfully booked ${selectedDesk.identifier} on ${selectedDate}.` });
      setShowDialog(false);
      setSelectedDesk(null);
      // Refresh availability
      fetchAvailability(selectedDate);
    } catch (err) {
      const apiError = err as ApiError;
      const message = apiError?.error || 'Failed to book desk. Please try again.';
      setNotification({ type: 'error', message });
      setShowDialog(false);
    } finally {
      setIsLoading(false);
    }
  }

  function handleCancelDialog() {
    setShowDialog(false);
    setSelectedDesk(null);
  }

  const readOnly = isDateInPast(selectedDate);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary-700 mb-1">Desk Booking</h1>
        <p className="text-neutral-600 text-sm">Select a date and book a desk.</p>
      </div>

      {/* Notification */}
      {notification && (
        <div
          role="alert"
          className={`p-3 rounded-md text-sm font-medium ${
            notification.type === 'success'
              ? 'bg-primary-100 text-primary-800 border border-primary-300'
              : 'bg-danger-100 text-danger-800 border border-danger-300'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Date Picker */}
      <DatePicker value={selectedDate} onChange={setSelectedDate} label="Booking Date" />

      {/* Read-only indicator for past dates */}
      {readOnly && (
        <p className="text-sm text-neutral-500 italic">
          Viewing past date — booking is not available.
        </p>
      )}

      {/* Floor Map Grid */}
      {isFetching ? (
        <div className="text-neutral-500 text-sm">Loading desks...</div>
      ) : (
        <FloorMapGrid
          desks={desks}
          selectedDeskId={selectedDesk?.id ?? null}
          onDeskSelect={handleDeskSelect}
          readOnly={readOnly}
        />
      )}

      {/* Booking Confirm Dialog */}
      {showDialog && selectedDesk && (
        <BookingConfirmDialog
          deskIdentifier={selectedDesk.identifier}
          date={selectedDate}
          onConfirm={handleConfirmBooking}
          onCancel={handleCancelDialog}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
