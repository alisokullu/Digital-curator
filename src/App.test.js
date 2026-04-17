import { render, screen } from '@testing-library/react';
import DigitalCuratorApp from './DigitalCuratorApp';

test('renders setup guidance when Supabase env vars are missing', () => {
  render(<DigitalCuratorApp />);
  expect(screen.getByText(/connect supabase to unlock the workspace/i)).toBeInTheDocument();
});
