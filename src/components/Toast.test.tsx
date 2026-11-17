import { afterEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toast } from './Toast';
import { resetToastsForTests, showError } from '../lib/toast';

describe('Toast', () => {
  afterEach(() => resetToastsForTests());

  it('renders nothing until an error is shown', () => {
    render(<Toast />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    act(() => showError("Couldn't load plant photos."));
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load plant photos.");
  });

  it('dismisses when the close button is tapped', async () => {
    const user = userEvent.setup();
    render(<Toast />);
    act(() => showError('Save failed'));

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
