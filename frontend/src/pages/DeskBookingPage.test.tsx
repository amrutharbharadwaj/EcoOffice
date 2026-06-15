import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DeskBookingPage from './DeskBookingPage';

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
      <DeskBookingPage />
    </MemoryRouter>,
  );
}

const mockDesks = {
  data: [
    { id: 1, identifier: 'D-101', floor: 1, status: 'available' as const },
    { id: 2, identifier: 'D-102', floor: 1, status: 'booked' as const },
    { id: 3, identifier: 'D-201', floor: 2, status: 'available' as const },
  ],
};

describe('DeskBookingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(mockDesks);
  });

  it('renders the page heading and date picker', async () => {
    renderPage();
    expect(screen.getByText('Desk Booking')).toBeInTheDocument();
    expect(screen.getByLabelText(/booking date/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalled();
    });
  });

  it('fetches desk availability on mount', async () => {
    renderPage();
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/availability/desks?date='));
    });
  });

  it('displays desks grouped by floor', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Floor 1')).toBeInTheDocument();
      expect(screen.getByText('Floor 2')).toBeInTheDocument();
    });
    expect(screen.getByText('D-101')).toBeInTheDocument();
    expect(screen.getByText('D-102')).toBeInTheDocument();
    expect(screen.getByText('D-201')).toBeInTheDocument();
  });

  it('does not allow selecting a booked desk', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('D-102')).toBeInTheDocument();
    });
    const bookedDesk = screen.getByText('D-102');
    expect(bookedDesk.closest('button')).toBeDisabled();
  });

  it('shows booking confirmation dialog on available desk click', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('D-101')).toBeInTheDocument();
    });
    await user.click(screen.getByText('D-101'));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/D-101/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('closes dialog on cancel', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('D-101')).toBeInTheDocument();
    });
    await user.click(screen.getByText('D-101'));
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

  it('calls POST /bookings/desks on confirm and shows success', async () => {
    mockPost.mockResolvedValueOnce({ data: { id: 10 } });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('D-101')).toBeInTheDocument();
    });
    await user.click(screen.getByText('D-101'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    const dialog = screen.getByRole('dialog');
    const confirmBtn = within(dialog).getByRole('button', { name: /confirm/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/bookings/desks', expect.objectContaining({ deskId: 1 }));
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(/successfully booked/i);
  });

  it('shows error notification on booking failure', async () => {
    mockPost.mockRejectedValueOnce({ error: 'Resource already booked', status: 409 });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('D-101')).toBeInTheDocument();
    });
    await user.click(screen.getByText('D-101'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    const dialog = screen.getByRole('dialog');
    const confirmBtn = within(dialog).getByRole('button', { name: /confirm/i });
    await user.click(confirmBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent(/resource already booked/i);
  });

  it('shows loading state while fetching desks', () => {
    // Return a promise that never resolves to keep loading state
    mockGet.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/loading desks/i)).toBeInTheDocument();
  });
});
