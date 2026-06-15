import { useState, useEffect, useCallback } from 'react';
import apiClient, { ApiError } from '../api/client';
import DatePicker from '../components/DatePicker';
import ParkingSpotList, { ParkingSpot } from '../components/ParkingSpotList';
import BookingConfirmDialog from '../components/BookingConfirmDialog';

interface AvailabilityResponse {
  data: ParkingSpot[];
}

export default function ParkingBookingPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [isLoadingSpots, setIsLoadingSpots] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchAvailability = useCallback(async (date: string, clearNotification = true) => {
    setIsLoadingSpots(true);
    setSelectedSpot(null);
    setDialogOpen(false);
    if (clearNotification) {
      setNotification(null);
    }
    try {
      const response = await apiClient.get<AvailabilityResponse>(
        `/availability/parking?date=${date}`
      );
      setSpots(response.data);
    } catch (err) {
      const apiErr = err as ApiError;
      setSpots([]);
      setNotification({ type: 'error', message: apiErr.error || 'Failed to load parking spots' });
    } finally {
      setIsLoadingSpots(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailability(selectedDate);
    }
  }, [selectedDate, fetchAvailability]);

  const handleSpotSelect = (spot: ParkingSpot) => {
    setSelectedSpot(spot);
    setDialogOpen(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedSpot) return;

    setIsBooking(true);
    setNotification(null);
    try {
      await apiClient.post('/bookings/parking', {
        parkingSpotId: selectedSpot.id,
        date: selectedDate,
      });
      setNotification({ type: 'success', message: `Successfully booked ${selectedSpot.identifier} on ${selectedDate}` });
      setDialogOpen(false);
      setSelectedSpot(null);
      // Refresh availability to reflect the new booking
      fetchAvailability(selectedDate, false);
    } catch (err) {
      const apiErr = err as ApiError;
      setNotification({ type: 'error', message: apiErr.error || 'Failed to book parking spot' });
      setDialogOpen(false);
    } finally {
      setIsBooking(false);
    }
  };

  const handleCancelDialog = () => {
    setDialogOpen(false);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-primary-700 mb-6">Parking Booking</h1>

      {notification && (
        <div
          role="alert"
          className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${
            notification.type === 'success'
              ? 'bg-primary-50 text-primary-800 border border-primary-200'
              : 'bg-danger-50 text-danger-800 border border-danger-200'
          }`}
        >
          {notification.message}
        </div>
      )}

      <div className="mb-6">
        <DatePicker
          label="Booking Date"
          value={selectedDate}
          onChange={setSelectedDate}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-neutral-700 mb-3">Available Parking Spots</h2>
        <ParkingSpotList
          spots={spots}
          selectedSpotId={selectedSpot?.id ?? null}
          onSelect={handleSpotSelect}
          isLoading={isLoadingSpots}
        />
      </div>

      <BookingConfirmDialog
        open={dialogOpen}
        resourceLabel={`Parking spot ${selectedSpot?.identifier ?? ''}`}
        date={selectedDate}
        onConfirm={handleConfirmBooking}
        onCancel={handleCancelDialog}
        isLoading={isBooking}
      />
    </div>
  );
}
