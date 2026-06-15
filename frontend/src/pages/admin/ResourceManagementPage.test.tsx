import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ResourceManagementPage from './ResourceManagementPage';

// Mock apiClient
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock('../../api/client', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

function renderPage() {
  return render(<ResourceManagementPage />);
}

describe('ResourceManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: [] });
  });

  describe('Tab navigation', () => {
    it('renders Desks and Parking Spots tabs', () => {
      renderPage();
      expect(screen.getByRole('tab', { name: /desks/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /parking spots/i })).toBeInTheDocument();
    });

    it('shows Desks tab as active by default', () => {
      renderPage();
      expect(screen.getByRole('tab', { name: /desks/i })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: /parking spots/i })).toHaveAttribute('aria-selected', 'false');
    });

    it('switches to Parking Spots tab on click', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole('tab', { name: /parking spots/i }));

      expect(screen.getByRole('tab', { name: /parking spots/i })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: /desks/i })).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('Desk form validation', () => {
    it('shows error when identifier is empty on submit', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText(/floor/i), '3');
      await user.click(screen.getByRole('button', { name: /add desk/i }));

      expect(screen.getByText(/identifier is required/i)).toBeInTheDocument();
    });

    it('shows error when identifier exceeds 50 chars', async () => {
      const user = userEvent.setup();
      renderPage();

      const longIdentifier = 'A'.repeat(51);
      await user.type(screen.getByLabelText(/identifier/i), longIdentifier);
      await user.type(screen.getByLabelText(/floor/i), '1');
      await user.click(screen.getByRole('button', { name: /add desk/i }));

      expect(screen.getByText(/identifier must be 50 characters or less/i)).toBeInTheDocument();
    });

    it('shows error when floor is empty on submit', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText(/identifier/i), 'D-101');
      await user.click(screen.getByRole('button', { name: /add desk/i }));

      expect(screen.getByText(/floor is required/i)).toBeInTheDocument();
    });

    it('shows error when floor is not an integer', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText(/identifier/i), 'D-101');
      await user.type(screen.getByLabelText(/floor/i), '2.5');
      await user.click(screen.getByRole('button', { name: /add desk/i }));

      expect(screen.getByText(/floor must be an integer/i)).toBeInTheDocument();
    });
  });

  describe('Desk CRUD operations', () => {
    it('calls create API with valid desk data', async () => {
      mockPost.mockResolvedValueOnce({ data: { id: 1, identifier: 'D-101', floor: 2 } });
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText(/identifier/i), 'D-101');
      await user.type(screen.getByLabelText(/floor/i), '2');
      await user.click(screen.getByRole('button', { name: /add desk/i }));

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/admin/desks', { identifier: 'D-101', floor: 2 });
      });
    });

    it('displays existing desks from API', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/availability/desks')) {
          return Promise.resolve({ data: [{ id: 1, identifier: 'D-101', floor: 1 }, { id: 2, identifier: 'D-202', floor: 2 }] });
        }
        return Promise.resolve({ data: [] });
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('D-101')).toBeInTheDocument();
        expect(screen.getByText('D-202')).toBeInTheDocument();
      });
    });

    it('populates form when Edit is clicked', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/availability/desks')) {
          return Promise.resolve({ data: [{ id: 1, identifier: 'D-101', floor: 3 }] });
        }
        return Promise.resolve({ data: [] });
      });
      const user = userEvent.setup();
      renderPage();

      await waitFor(() => expect(screen.getByText('D-101')).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /edit desk d-101/i }));

      expect(screen.getByLabelText(/identifier/i)).toHaveValue('D-101');
      expect(screen.getByLabelText(/floor/i)).toHaveValue('3');
      expect(screen.getByRole('button', { name: /update desk/i })).toBeInTheDocument();
    });

    it('calls delete API when Delete is clicked', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/availability/desks')) {
          return Promise.resolve({ data: [{ id: 5, identifier: 'D-501', floor: 5 }] });
        }
        return Promise.resolve({ data: [] });
      });
      mockDelete.mockResolvedValueOnce(undefined);
      const user = userEvent.setup();
      renderPage();

      await waitFor(() => expect(screen.getByText('D-501')).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /delete desk d-501/i }));

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalledWith('/admin/desks/5');
      });
    });
  });

  describe('Parking Spots form validation', () => {
    it('shows error when parking identifier is empty', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole('tab', { name: /parking spots/i }));
      await user.type(screen.getByLabelText(/location label/i), 'Level B1');
      await user.click(screen.getByRole('button', { name: /add parking spot/i }));

      expect(screen.getByText(/identifier is required/i)).toBeInTheDocument();
    });

    it('shows error when location label is empty', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole('tab', { name: /parking spots/i }));
      await user.type(screen.getByLabelText(/identifier/i), 'P-A01');
      await user.click(screen.getByRole('button', { name: /add parking spot/i }));

      expect(screen.getByText(/location label is required/i)).toBeInTheDocument();
    });

    it('shows error when location label exceeds 100 chars', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole('tab', { name: /parking spots/i }));
      await user.type(screen.getByLabelText(/identifier/i), 'P-A01');
      const longLabel = 'B'.repeat(101);
      await user.type(screen.getByLabelText(/location label/i), longLabel);
      await user.click(screen.getByRole('button', { name: /add parking spot/i }));

      expect(screen.getByText(/location label must be 100 characters or less/i)).toBeInTheDocument();
    });
  });

  describe('Parking Spots CRUD operations', () => {
    it('calls create API with valid parking spot data', async () => {
      mockPost.mockResolvedValueOnce({ data: { id: 1, identifier: 'P-A01', locationLabel: 'Level B1' } });
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole('tab', { name: /parking spots/i }));
      await user.type(screen.getByLabelText(/identifier/i), 'P-A01');
      await user.type(screen.getByLabelText(/location label/i), 'Level B1');
      await user.click(screen.getByRole('button', { name: /add parking spot/i }));

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/admin/parking', { identifier: 'P-A01', locationLabel: 'Level B1' });
      });
    });

    it('displays existing parking spots from API', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/availability/parking')) {
          return Promise.resolve({ data: [{ id: 1, identifier: 'P-A01', locationLabel: 'Level B1' }] });
        }
        return Promise.resolve({ data: [] });
      });

      renderPage();
      const user = userEvent.setup();
      await user.click(screen.getByRole('tab', { name: /parking spots/i }));

      await waitFor(() => {
        expect(screen.getByText('P-A01')).toBeInTheDocument();
        expect(screen.getByText('Level B1')).toBeInTheDocument();
      });
    });

    it('calls delete API when parking Delete is clicked', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/availability/parking')) {
          return Promise.resolve({ data: [{ id: 3, identifier: 'P-C01', locationLabel: 'Roof' }] });
        }
        return Promise.resolve({ data: [] });
      });
      mockDelete.mockResolvedValueOnce(undefined);
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole('tab', { name: /parking spots/i }));
      await waitFor(() => expect(screen.getByText('P-C01')).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /delete parking spot p-c01/i }));

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalledWith('/admin/parking/3');
      });
    });
  });

  describe('Server-side error handling', () => {
    it('displays field errors from server on desk creation', async () => {
      mockPost.mockRejectedValueOnce({
        error: 'Validation error',
        fields: [{ field: 'identifier', message: 'Identifier already exists' }],
        status: 409,
      });
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText(/identifier/i), 'D-101');
      await user.type(screen.getByLabelText(/floor/i), '1');
      await user.click(screen.getByRole('button', { name: /add desk/i }));

      await waitFor(() => {
        expect(screen.getByText(/identifier already exists/i)).toBeInTheDocument();
      });
    });

    it('displays general error notification on server failure', async () => {
      mockPost.mockRejectedValueOnce({
        error: 'Internal server error',
        status: 500,
      });
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText(/identifier/i), 'D-101');
      await user.type(screen.getByLabelText(/floor/i), '1');
      await user.click(screen.getByRole('button', { name: /add desk/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/internal server error/i);
      });
    });
  });
});
