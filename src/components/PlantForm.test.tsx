import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlantForm } from './PlantForm';
import { todayIso } from '../lib/schedule';
import type { Plant } from '../types';

vi.mock('../lib/photos', () => ({
  usePhotoUrl: () => undefined,
  uploadPhoto: vi.fn(),
  deletePhoto: vi.fn(),
}));

function enableWater() {
  // The Water section uses a checkbox labelled with the emoji + "Water".
  const checkbox = screen.getByRole('checkbox', { name: /Water/i });
  return checkbox;
}

function waterSection() {
  // Each task gets its own fieldset; find the one containing "Water".
  const checkbox = screen.getByRole('checkbox', { name: /Water/i });
  const fieldset = checkbox.closest('fieldset');
  if (!fieldset) throw new Error('Water fieldset not found');
  return within(fieldset);
}

describe('PlantForm — Last done field', () => {
  let onSave: ReturnType<typeof vi.fn<(plant: Plant) => void>>;

  beforeEach(() => {
    onSave = vi.fn<(plant: Plant) => void>();
  });

  it('does not show the Last done field for a task that is not enabled', () => {
    render(
      <PlantForm uid="u1" plant={null} onSave={onSave} onDelete={null} onCancel={() => {}} />,
    );
    // No section is enabled by default for new plants → no Last done input anywhere.
    expect(screen.queryByLabelText(/Last done/i)).not.toBeInTheDocument();
  });

  it('shows the Last done field for an enabled task', async () => {
    const user = userEvent.setup();
    render(
      <PlantForm uid="u1" plant={null} onSave={onSave} onDelete={null} onCancel={() => {}} />,
    );

    await user.click(enableWater());

    const section = waterSection();
    expect(section.getByLabelText(/Last done/i)).toBeInTheDocument();
    expect(section.getByRole('button', { name: 'Today' })).toBeInTheDocument();
  });

  it("clicking 'Today' sets the date to today's ISO and Save persists it", async () => {
    const user = userEvent.setup();
    render(
      <PlantForm uid="u1" plant={null} onSave={onSave} onDelete={null} onCancel={() => {}} />,
    );
    await user.type(screen.getByPlaceholderText(/e.g. Monstera/i), 'Fern');
    await user.click(enableWater());

    const section = waterSection();
    await user.click(section.getByRole('button', { name: 'Today' }));

    const input = section.getByLabelText(/Last done/i) as HTMLInputElement;
    expect(input.value).toBe(todayIso());

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved: Plant = onSave.mock.calls[0][0];
    expect(saved.lastDone.water).toBe(todayIso());
  });

  it('lets the user set a custom past date and Save persists it', async () => {
    const user = userEvent.setup();
    render(
      <PlantForm uid="u1" plant={null} onSave={onSave} onDelete={null} onCancel={() => {}} />,
    );
    await user.type(screen.getByPlaceholderText(/e.g. Monstera/i), 'Cactus');
    await user.click(enableWater());

    const section = waterSection();
    const input = section.getByLabelText(/Last done/i) as HTMLInputElement;
    // user-event's type() is character-by-character; date inputs in jsdom
    // are more reliable with a single change event.
    fireEvent.change(input, { target: { value: '2026-05-01' } });

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved: Plant = onSave.mock.calls[0][0];
    expect(saved.lastDone.water).toBe('2026-05-01');
  });

  it('Clear removes the lastDone entry for the task', async () => {
    const user = userEvent.setup();
    const existing: Plant = {
      id: 'p1',
      name: 'Aloe',
      schedules: { water: [{ intervalDays: 7, activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }] },
      lastDone: { water: '2026-05-01' },
    };
    render(
      <PlantForm uid="u1" plant={existing} onSave={onSave} onDelete={() => {}} onCancel={() => {}} />,
    );

    const section = waterSection();
    expect((section.getByLabelText(/Last done/i) as HTMLInputElement).value).toBe('2026-05-01');

    await user.click(section.getByRole('button', { name: 'Clear' }));
    expect((section.getByLabelText(/Last done/i) as HTMLInputElement).value).toBe('');

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const saved: Plant = onSave.mock.calls[0][0];
    expect(saved.lastDone.water).toBeUndefined();
  });

  it('preserves lastDone for tasks that are not edited', async () => {
    const user = userEvent.setup();
    const existing: Plant = {
      id: 'p1',
      name: 'Pothos',
      schedules: { water: [{ intervalDays: 7, activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }] },
      lastDone: { water: '2026-05-01' },
    };
    render(
      <PlantForm uid="u1" plant={existing} onSave={onSave} onDelete={() => {}} onCancel={() => {}} />,
    );

    // Don't touch the Water section. Just save.
    await user.click(screen.getByRole('button', { name: 'Save' }));
    const saved: Plant = onSave.mock.calls[0][0];
    expect(saved.lastDone.water).toBe('2026-05-01');
  });
});
