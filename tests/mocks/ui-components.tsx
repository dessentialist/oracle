import React from 'react';

// Mock Card component
export const Card = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={`mock-card ${className || ''}`} data-testid="mock-card">
    {children}
  </div>
);

// Mock CardContent component
export const CardContent = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={`mock-card-content ${className || ''}`} data-testid="mock-card-content">
    {children}
  </div>
);

// Mock Button component
export const Button = ({
  variant = 'default',
  className,
  children,
  onClick,
  disabled,
}: {
  variant?: string,
  className?: string,
  children: React.ReactNode,
  onClick?: () => void,
  disabled?: boolean
}) => (
  <button 
    className={`mock-button mock-button-${variant} ${className || ''}`}
    onClick={onClick}
    disabled={disabled}
    data-testid="mock-button"
  >
    {children}
  </button>
);

// Mock Progress component
export const Progress = ({ value, className }: { value: number, className?: string }) => (
  <div 
    className={`mock-progress ${className || ''}`}
    role="progressbar" 
    aria-valuenow={value} 
    aria-valuemin={0} 
    aria-valuemax={100}
    data-testid="mock-progress"
    style={{ width: '100%' }}
  >
    <div
      style={{ width: `${value}%` }}
      className="mock-progress-indicator"
    />
  </div>
);

// Mock Toaster component
export const Toaster = () => <div data-testid="mock-toaster" />;