import { render, screen } from '@testing-library/react';
import DigitalCuratorApp from './DigitalCuratorApp';

var mockIsSupabaseConfigured = false;
var mockSupabase;

jest.mock('./lib/supabase', () => {
  mockSupabase = {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: jest.fn(() => ({
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      })),
      signOut: jest.fn(),
    },
  };

  return {
    get isSupabaseConfigured() {
      return mockIsSupabaseConfigured;
    },
    supabase: mockSupabase,
  };
});

beforeEach(() => {
  mockIsSupabaseConfigured = false;
  mockSupabase.auth.getSession.mockClear();
  mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
  mockSupabase.auth.onAuthStateChange.mockClear();
  mockSupabase.auth.onAuthStateChange.mockReturnValue({
    data: {
      subscription: {
        unsubscribe: jest.fn(),
      },
    },
  });
  window.localStorage.clear();
});

test('renders setup guidance when Supabase env vars are missing', () => {
  render(<DigitalCuratorApp />);

  expect(screen.getByText(/connect supabase to unlock the workspace/i)).toBeInTheDocument();
  expect(mockSupabase.auth.getSession).not.toHaveBeenCalled();
});

test('renders the auth screen when Supabase is configured and no session exists', async () => {
  mockIsSupabaseConfigured = true;

  render(<DigitalCuratorApp />);

  expect(await screen.findByRole('button', { name: /giriş yap|sign in/i })).toBeInTheDocument();
  expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(1);
  expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalledTimes(1);
});
