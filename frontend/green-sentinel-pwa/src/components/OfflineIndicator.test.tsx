/**
 * OfflineIndicator Component Tests
 */

import { render, screen } from '@testing-library/react';
import { OfflineIndicator } from './OfflineIndicator';
import * as serviceWorkerRegister from '../utils/serviceWorkerRegister';

// Mock the useOfflineStatus hook
jest.mock('../hooks/useOfflineStatus', () => ({
  useOfflineStatus: jest.fn()
}));

import { useOfflineStatus } from '../hooks/useOfflineStatus';

describe('OfflineIndicator Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when online', () => {
    (useOfflineStatus as jest.Mock).mockReturnValue(false);

    const { container } = render(<OfflineIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it('should render offline banner when offline', () => {
    (useOfflineStatus as jest.Mock).mockReturnValue(true);

    render(<OfflineIndicator />);

    const banner = screen.getByText(/You are offline/i);
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveClass('bg-yellow-500');
  });

  it('should display cached data message', () => {
    (useOfflineStatus as jest.Mock).mockReturnValue(true);

    render(<OfflineIndicator />);

    const message = screen.getByText(/displaying cached data/i);
    expect(message).toBeInTheDocument();
  });

  it('should have correct styling classes', () => {
    (useOfflineStatus as jest.Mock).mockReturnValue(true);

    const { container } = render(<OfflineIndicator />);
    const banner = container.querySelector('div');

    expect(banner).toHaveClass('fixed', 'top-0', 'left-0', 'right-0');
    expect(banner).toHaveClass('bg-yellow-500', 'text-white');
    expect(banner).toHaveClass('z-50');
  });
});
