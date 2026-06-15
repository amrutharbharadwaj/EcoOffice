import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import BookingCard, { Booking } from './BookingCard';

const mockBooking: Booking = {
  id: 1,
  resource_type: 'desk',
  resource_identifier: 'D-101',
  booking_date: '2024-06-20',
};

const parkingBooking: Booking = {
  id: 2,
  resource_type: 'parking_spot',
  resource_identifier: 'P-A3',
  booking_date: '2024-06-25',
};

describe('BookingCard', () => {
  it('displays desk resource type label', () => {
    render(<BookingCard booking={mockBooking} onCancel={vi.fn()} />);
    expect(screen.getByText('Desk')).toBeInTheDocument();
  });

  it('displays parking resource type label', () => {
    render(<BookingCard booking={parkingBooking} onCancel={vi.fn()} />);
    expect(screen.getByText('Parking')).toBeInTheDocument();
  });

  it('displays resource identifier', () => {
    render(<BookingCard booking={mockBooking} onCancel={vi.fn()} />);
    expect(screen.getByText('D-101')).toBeInTheDocument();
  });

  it('displays formatted booking date', () => {
    render(<BookingCard booking={mockBooking} onCancel={vi.fn()} />);
    // The date should be formatted (e.g., "Thu, Jun 20, 2024")
    expect(screen.getByText(/Jun 20, 2024/)).toBeInTheDocument();
  });

  it('shows cancel button', () => {
    render(<BookingCard booking={mockBooking} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: /cancel booking/i })).toBeInTheDocument();
  });

  it('shows confirmation buttons after clicking cancel', async () => {
    const user = userEvent.setup();
    render(<BookingCard booking={mockBooking} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /cancel booking/i }));

    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /keep/i })).toBeInTheDocument();
  });

  it('calls onCancel with booking id when confirming cancellation', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<BookingCard booking={mockBooking} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: /cancel booking/i }));
    await user.click(screen.getByRole('button', { name: /confirm cancel/i }));

    expect(onCancel).toHaveBeenCalledWith(1);
  });

  it('dismisses cancel confirmation when clicking Keep', async () => {
    const user = userEvent.setup();
    render(<BookingCard booking={mockBooking} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /cancel booking/i }));
    expect(screen.getByRole('button', { name: /keep/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /keep/i }));
    expect(screen.queryByRole('button', { name: /keep/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel booking/i })).toBeInTheDocument();
  });

  it('disables cancel button when isCancelling is true', () => {
    render(<BookingCard booking={mockBooking} onCancel={vi.fn()} isCancelling={true} />);
    expect(screen.getByRole('button', { name: /cancel booking/i })).toBeDisabled();
  });
});
