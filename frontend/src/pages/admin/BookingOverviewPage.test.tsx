import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BookingOverviewPage from './BookingOverviewPage';

// Mock apiClient
const mockGet = vi.fn();
vi.mock('../../api/client', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
  },
  __esModule: true,
}));

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'admin@example.com', name: 'Admin', role: 'admin' },
    isAuthenticated: true,
    isAdmin: true,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <BookingOverviewPage />
    </MemoryRouter>,
  );
}

const mockBookingsResponse = {
  data: {
    bookings: [
      { id: 1, user_name: 'John Doe', resource_type: 'desk', resource_identifier: 'D-101', booking_date: '2024-06-20' },
      { id: 2, user_name: 'Jane Smith', resource_type: 'parking_spot', resource_identifier: 'P-05', booking_date: '2024-06-21' },
    ],
    total: 2,
  },
};

const mockEmptyResponse = {
  data: {
    bookings: [],
    total: 0,
  },
};

describe('BookingOverviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(mockBookingsResponse);
  });

  it('renders the page heading and filter controls', async () => {
    renderPage();
    expect(screen.getByText('Booking Overview')).toBeInTheDocument();
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/resource type/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalled();
    });
  });

  it('fetches bookings on mount with default date range', async () => {
    renderPage();
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/admin/bookings?startDate='));
    });
    const callArg = mockGet.mock.calls[0][0] as string;
    expect(callArg).toContain('startDate=');
    expect(callArg).toContain('endDate=');
    // Should not include resourceType when 'all' is selected
    expect(callArg).not.toContain('resourceType=');
  });

  it('displays bookings in a table with correct columns', async () => {
    renderPage();
    await waitFor(() => {
      // Both desktop table and mobile cards render data, so use getAllByText
      expect(screen.getAllByText('John Doe').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText('Jane Smith').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('D-101').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('P-05').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('2024-06-20').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('2024-06-21').length).toBeGreaterThanOrEqual(1);
    // Check table headers exist (using role columnheader)
    expect(screen.getByRole('columnheader', { name: 'User Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Resource Type' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Resource Identifier' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Date' })).toBeInTheDocument();
  });

  it('displays the total booking count', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
    expect(screen.getByText(/total bookings/i)).toBeInTheDocument();
  });

  it('shows empty state when no bookings match filter', async () => {
    mockGet.mockResolvedValueOnce(mockEmptyResponse);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No bookings found for the selected criteria')).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/loading bookings/i)).toBeInTheDocument();
  });

  it('refetches when resource type filter changes', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    const select = screen.getByLabelText(/resource type/i);
    await user.selectOptions(select, 'desk');

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('resourceType=desk'));
    });
  });

  it('refetches when start date changes', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    const startInput = screen.getByLabelText(/start date/i);
    await user.clear(startInput);
    await user.type(startInput, '2024-07-01');

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('startDate=2024-07-01'));
    });
  });

  it('shows error state when API fails', async () => {
    mockGet.mockRejectedValueOnce({ error: 'Server error', status: 500 });
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to load bookings/i);
    });
  });
});
