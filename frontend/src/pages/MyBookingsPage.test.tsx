import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MyBookingsPage from './MyBookingsPage';

// Mock apiClient
const mockGet = vi.fn();
const mockDelete = vi.fn();
vi.mock('../api/client', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
  __esModule: true,
}));

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'test@example.com', name: 'Test', role: 'user' },
    isAuthenticated: true,
    isAdmin: false,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <MyBookingsPage />
    </MemoryRouter>,
  );
}

const mockBookingsResponse = {
  data: {
    bookings: [
      { id: 1, resource_type: 'desk', resource_identifier: 'D-101', booking_date: '2024-06-20' },
      { id: 2, resource_type: 'parking_spot', resource_identifier: 'P-A3', booking_date: '2024-06-25' },
    ],
  },
};

const emptyBookingsResponse = {
  data: {
    bookings: [],
    message: 'No upcoming bookings found',
  },
};

describe('MyBookingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(mockBookingsResponse);
  });

  it('renders the page heading', async () => {
    renderPage();
    expect(screen.getByText('My Bookings')).toBeInTheDocument();
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalled();
    });
  });

  it('fetches bookings on mount', async () => {
    renderPage();
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/bookings/mine');
    });
  });

  it('displays booking cards for each booking', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('D-101')).toBeInTheDocument();
    });
    expect(screen.getByText('P-A3')).toBeInTheDocument();
    expect(screen.getByText('Desk')).toBeInTheDocument();
    expect(screen.getByText('Parking')).toBeInTheDocument();
  });

  it('shows empty state message when no bookings', async () => {
    mockGet.mockResolvedValueOnce(emptyBookingsResponse);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No upcoming bookings found')).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching bookings', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/loading bookings/i)).toBeInTheDocument();
  });

  it('calls DELETE on cancel confirm and refreshes list', async () => {
    mockDelete.mockResolvedValueOnce(undefined);
    // After cancel, return empty bookings
    mockGet
      .mockResolvedValueOnce(mockBookingsResponse)
      .mockResolvedValueOnce(emptyBookingsResponse);

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('D-101')).toBeInTheDocument();
    });

    // Click cancel button for D-101
    const cancelButtons = screen.getAllByRole('button', { name: /cancel booking/i });
    await user.click(cancelButtons[0]);

    // Confirm the cancel
    await user.click(screen.getByRole('button', { name: /confirm cancel/i }));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('/bookings/1');
    });

    // Should show success notification
    expect(await screen.findByRole('alert')).toHaveTextContent(/booking cancelled successfully/i);
  });

  it('shows error notification when cancel fails', async () => {
    mockDelete.mockRejectedValueOnce({ error: 'Cannot cancel past booking', status: 400 });

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('D-101')).toBeInTheDocument();
    });

    const cancelButtons = screen.getAllByRole('button', { name: /cancel booking/i });
    await user.click(cancelButtons[0]);
    await user.click(screen.getByRole('button', { name: /confirm cancel/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot cancel past booking/i);
  });

  it('shows error notification when fetch fails', async () => {
    mockGet.mockRejectedValueOnce({ error: 'Network error', status: 500 });
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load bookings/i);
  });
});
