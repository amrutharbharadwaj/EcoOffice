import { useState } from 'react';

export interface Booking {
  id: number;
  resource_type: 'desk' | 'parking_spot';
  resource_identifier: string;
  booking_date: string;
}

interface BookingCardProps {
  booking: Booking;
  onCancel: (bookingId: number) => void;
  isCancelling?: boolean;
}

export default function BookingCard({ booking, onCancel, isCancelling = false }: BookingCardProps) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const resourceTypeLabel = booking.resource_type === 'desk' ? 'Desk' : 'Parking';

  const formattedDate = new Date(booking.booking_date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  function handleCancelClick() {
    setConfirmingCancel(true);
  }

  function handleConfirmCancel() {
    onCancel(booking.id);
    setConfirmingCancel(false);
  }

  function handleDismissCancel() {
    setConfirmingCancel(false);
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm" data-testid="booking-card">
      <div className="flex items-start justify-between">
        <div>
          <span className="inline-block rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700">
            {resourceTypeLabel}
          </span>
          <p className="mt-2 text-lg font-semibold text-neutral-800">{booking.resource_identifier}</p>
          <p className="mt-1 text-sm text-neutral-500">{formattedDate}</p>
        </div>
        <div>
          {!confirmingCancel ? (
            <button
              type="button"
              onClick={handleCancelClick}
              disabled={isCancelling}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              aria-label={`Cancel booking for ${booking.resource_identifier}`}
            >
              Cancel
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDismissCancel}
                disabled={isCancelling}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                aria-label={`Confirm cancel booking for ${booking.resource_identifier}`}
              >
                {isCancelling ? 'Cancelling...' : 'Confirm'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
