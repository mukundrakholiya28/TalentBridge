import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';

// Mock the headers to avoid router/theme dependencies
vi.mock('../app/components/RecruiterHeader', () => ({
  RecruiterHeader: () => <div data-testid="recruiter-header">Recruiter Header</div>
}));
vi.mock('../app/components/DashboardHeader', () => ({
  DashboardHeader: () => <div data-testid="dashboard-header">Dashboard Header</div>
}));

import { Settings } from '../app/pages/Settings';

describe('Settings header selection', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('renders recruiter header when userRole is recruiter', () => {
    localStorage.setItem('userRole', 'recruiter');
    render(<Settings />);
    expect(screen.queryByTestId('recruiter-header')).toBeTruthy();
    expect(screen.queryByTestId('dashboard-header')).toBeNull();
  });

  it('renders dashboard header when userRole is candidate', () => {
    localStorage.setItem('userRole', 'candidate');
    render(<Settings />);
    expect(screen.queryByTestId('dashboard-header')).toBeTruthy();
    expect(screen.queryByTestId('recruiter-header')).toBeNull();
  });
});
