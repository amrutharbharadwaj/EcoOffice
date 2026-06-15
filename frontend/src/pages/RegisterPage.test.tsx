import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RegisterPage from './RegisterPage';

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock auth context
const mockRegister = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    register: mockRegister,
    login: vi.fn(),
    user: null,
    isAuthenticated: false,
    isAdmin: false,
    isLoading: false,
    logout: vi.fn(),
  }),
}));

function renderRegisterPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the registration form with email, name, and password fields', () => {
    renderRegisterPage();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('shows a link to the login page', () => {
    renderRegisterPage();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });

  it('shows validation error when email is empty on blur', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.click(screen.getByLabelText(/email/i));
    await user.tab();

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
  });

  it('shows validation error for invalid email format', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.tab();

    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
  });

  it('shows validation error when name is empty on blur', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.click(screen.getByLabelText(/name/i));
    await user.tab();

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
  });

  it('shows validation error when password is too short', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByLabelText(/password/i), 'short');
    await user.tab();

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it('shows validation error when password is empty on blur', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.click(screen.getByLabelText(/password/i));
    await user.tab();

    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });

  it('disables submit button when form is invalid', () => {
    renderRegisterPage();
    expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled();
  });

  it('enables submit button when form is valid', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    expect(screen.getByRole('button', { name: /create account/i })).toBeEnabled();
  });

  it('calls register and navigates to /login on success', async () => {
    mockRegister.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('test@example.com', 'John Doe', 'password123');
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });

  it('displays general error on registration failure', async () => {
    mockRegister.mockRejectedValueOnce({
      error: 'Email already registered',
      status: 409,
    });
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/email already registered/i)).toBeInTheDocument();
  });

  it('displays field-level errors from server', async () => {
    mockRegister.mockRejectedValueOnce({
      error: 'Validation error',
      fields: [
        { field: 'email', message: 'Invalid email format' },
        { field: 'name', message: 'Name too long' },
      ],
      status: 400,
    });
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/invalid email format/i)).toBeInTheDocument();
    expect(screen.getByText(/name too long/i)).toBeInTheDocument();
  });

  it('validates email length limit (254 chars)', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    const emailInput = screen.getByLabelText(/email/i);
    const longEmail = 'a'.repeat(246) + '@test.com'; // 255 chars total, exceeds 254

    await user.click(emailInput);
    await user.paste(longEmail);
    await user.tab();

    expect(await screen.findByText(/254 characters or less/i)).toBeInTheDocument();
  });

  it('validates name length limit (100 chars)', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    const longName = 'A'.repeat(101);
    await user.type(screen.getByLabelText(/name/i), longName);
    await user.tab();

    expect(await screen.findByText(/100 characters or less/i)).toBeInTheDocument();
  });
});
