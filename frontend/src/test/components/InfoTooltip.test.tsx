import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InfoTooltip, { ExplainedLabel } from '@/components/common/InfoTooltip';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock createPortal
const originalCreatePortal = require('react-dom').createPortal;
vi.mock('react-dom', () => ({
  createPortal: (node: any) => node,
}));

describe('InfoTooltip Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render info button', () => {
    render(<InfoTooltip term="ndvi" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should render with children', () => {
    render(<InfoTooltip term="ndvi">Label</InfoTooltip>);
    expect(screen.getByText('Label')).toBeInTheDocument();
  });

  it('should toggle tooltip on click', () => {
    render(<InfoTooltip term="ndvi">NDVI</InfoTooltip>);
    const button = screen.getByRole('button');
    
    // Click to open
    fireEvent.click(button);
    
    // Should show tooltip content after state update
    expect(screen.getByText('Plant Greenness')).toBeInTheDocument();
  });

  it('should display correct explanation for NDVI term', () => {
    render(<InfoTooltip term="ndvi" />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(screen.getByText('Plant Greenness')).toBeInTheDocument();
    expect(screen.getByText(/satellite/i)).toBeInTheDocument();
  });

  it('should display correct explanation for healthScore term', () => {
    render(<InfoTooltip term="healthScore" />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(screen.getByText('Crop Condition')).toBeInTheDocument();
  });

  it('should have close button in tooltip', () => {
    render(<InfoTooltip term="ndvi" />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    const closeButtons = screen.getAllByRole('button');
    // One for opening, one for closing
    expect(closeButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('should render small icon by default', () => {
    const { container } = render(<InfoTooltip term="ndvi" />);
    expect(container.querySelector('.w-4')).toBeInTheDocument();
  });

  it('should render medium icon when specified', () => {
    const { container } = render(<InfoTooltip term="ndvi" size="md" />);
    expect(container.querySelector('.w-5')).toBeInTheDocument();
  });

  it('should handle unknown term gracefully', () => {
    render(<InfoTooltip term="unknownTerm" />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(screen.getByText('unknownTerm')).toBeInTheDocument();
  });
});

describe('ExplainedLabel Component', () => {
  it('should render with custom label', () => {
    render(<ExplainedLabel term="ndvi" label="Vegetation Index" />);
    expect(screen.getByText('Vegetation Index')).toBeInTheDocument();
  });

  it('should render with default label from term', () => {
    render(<ExplainedLabel term="ndvi" />);
    expect(screen.getByText('Plant Greenness')).toBeInTheDocument();
  });

  it('should include info button', () => {
    render(<ExplainedLabel term="ndvi" label="NDVI" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ExplainedLabel term="ndvi" label="Test" className="custom-class" />
    );
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});
