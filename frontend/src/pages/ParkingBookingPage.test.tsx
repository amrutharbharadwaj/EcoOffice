import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ParkingBookingPage from './ParkingBookingPage';

// Mock apiClient
const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock('../api/client', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
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
      <ParkingBookingPage />
    </MemoryRouter>,
  );
}

const mockSpots = {
  data: [
    { id: 1, identifier: 'P-A1', location_label: 'Level 1 - North', status: 'available' as const },
    { id: 2, identifier: 'P-B2', location_label: 'Level 2 - East', status: 'booked' as const },
    { id: 3, identifier: 'P-C3', location_label: 'Level 1 - South', status: 'available' as const },
  ],
};

describe('ParkingBookingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(mockSpots);
  });

  it('renders the page heading and date picker', async () => {
    renderPage();
    expect(screen.getByText('Parking Booking')).toBeInTheDocument();
    expect(screen.getByLabelText(/booking date/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalled();
    });
  });

  it('fetches parking availability on mount', async () => {
    renderPage();
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/availability/parking?date='));
    });
  });

  it('displays parking spots with identifier and location', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('P-A1')).toBeInTheDocument();
    });
    expect(screen.getByText('Level 1 - North')).toBeInTheDocument();
    expect(screen.getByText('P-B2')).toBeInTheDocument();
    expect(screen.getByText('Level 2 - East')).toBeInTheDocument();
    expect(screen.getByText('P-C3')).toBeInTheDocument();
  });

  it('does not allow selecting a booked spot', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('P-B2')).toBeInTheDocument();
    });
    const bookedButton = screen.getByRole('button', {
      name: /parking spot P-B2.*booked/i,
    });
    expect(bookedButton).toBeDisabled();
  });

  it('shows booking confirmation dialog on available spot click', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('P-A1')).toBeInTheDocument();
    });
    const availableButton = screen.getByRole('button', {
      name: /parking spot P-A1.*available/i,
    });
    await user.click(availableButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/P-A1/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('closes dialog on cancel', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('P-A1')).toBeInTheDocument();
    });
    const availableButton = screen.getByRole('button', {
      name: /parking spot P-A1.*available/i,
    });
    await user.click(availableButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    const dialog = screen.getByRole('dialog');
    const cancelBtn = within(dialog).getByRole('button', { name: /cancel/i });
    await user.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('calls POST /bookings/parking on confirm and shows success', async () => {
    mockPost.mockResolvedValueOnce({ data: { id: 10 } });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('P-A1')).toBeInTheDocument();
    });
    const availableButton = screen.getByRole('button', {
      name: /parking spot P-A1.*available/i,
    });
    await user.click(availableButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    const dialog = screen.getByRole('dialog');
    const confirmBtn = within(dialog).getByRole('button', { name: /confirm/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/bookings/parking', expect.objectContaining({ parkingSpotId: 1 }));
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(/successfully booked/i);
  });

  it('shows error notification on booking failure', async () => {
    mockPost.mockRejectedValueOnce({ error: 'Resource already booked', status: 409 });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('P-A1')).toBeInTheDocument();
    });
    const availableButton = screen.getByRole('button', {
      name: /parking spot P-A1.*available/i,
    });
    await user.click(availableButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    const dialog = screen.getByRole('dialog');
    const confirmBtn = within(dialog).getByRole('button', { name: /confirm/i });
    await user.click(confirmBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent(/resource already booked/i);
  });

  it('shows loading state while fetching spots', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/loading parking spots/i)).toBeInTheDocument();
  });
});
