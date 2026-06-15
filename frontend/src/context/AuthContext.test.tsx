import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

// Mock the API client
vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import apiClient from '../api/client';

const mockApiClient = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

function TestConsumer() {
  const { user, isAuthenticated, isAdmin, isLoading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="admin">{String(isAdmin)}</span>
      <span data-testid="user">{user ? user.name : 'none'}</span>
      <button onClick={() => login('test@test.com', 'pass')}>Login</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with loading state and checks session on mount', async () => {
    mockApiClient.get.mockRejectedValueOnce({ error: 'Not authenticated', status: 401 });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('sets user when session check succeeds', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      data: { id: 1, email: 'user@test.com', name: 'Test User', role: 'user' },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('user').textContent).toBe('Test User');
    expect(screen.getByTestId('admin').textContent).toBe('false');
  });

  it('sets isAdmin to true for admin users', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      data: { id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin' },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('admin').textContent).toBe('true');
    });
  });

  it('login sets user on success', async () => {
    mockApiClient.get.mockRejectedValueOnce({ error: 'Not authenticated', status: 401 });
    mockApiClient.post.mockResolvedValueOnce({
      data: { id: 2, email: 'test@test.com', name: 'Logged In', role: 'user' },
    });

    const user = userEvent.setup();
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await user.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
      expect(screen.getByTestId('user').textContent).toBe('Logged In');
    });
  });

  it('logout clears user', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      data: { id: 1, email: 'user@test.com', name: 'Test User', role: 'user' },
    });
    mockApiClient.post.mockResolvedValueOnce(undefined);

    const user = userEvent.setup();
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });

    await user.click(screen.getByText('Logout'));

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('false');
      expect(screen.getByTestId('user').textContent).toBe('none');
    });
  });

  it('throws error when useAuth is used outside AuthProvider', () => {
    // Suppress React error boundary output
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TestConsumer />)).toThrow(
      'useAuth must be used within an AuthProvider',
    );

    spy.mockRestore();
  });
});
