import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TodayView } from './TodayView';
import { ALL_MONTHS, type Plant, type TaskType } from '../types';
import { todayIso } from '../lib/schedule';
import { addDays, format, parseISO } from 'date-fns';

type MarkDoneFn = (plantId: string, taskType: TaskType) => void;
type OpenFn = (plantId: string) => void;

vi.mock('../lib/photos', () => ({
  usePhotoUrl: () => undefined,
}));

const isoOffset = (days: number) =>
  format(addDays(parseISO(todayIso()), days), 'yyyy-MM-dd');

const allYear = ALL_MONTHS;

describe('TodayView — tap-to-open behavior', () => {
  let onMarkDone: ReturnType<typeof vi.fn<MarkDoneFn>>;
  let onOpen: ReturnType<typeof vi.fn<OpenFn>>;

  beforeEach(() => {
    onMarkDone = vi.fn<MarkDoneFn>();
    onOpen = vi.fn<OpenFn>();
  });

  it('shows an empty state when there are no plants', () => {
    render(
      <TodayView uid="u1" plants={[]} onMarkDone={onMarkDone} onOpen={onOpen} />,
    );
    expect(screen.getByText(/No plants yet/i)).toBeInTheDocument();
  });

  it("clicking the plant's header row in 'Today' calls onOpen with the plant id", async () => {
    const user = userEvent.setup();
    const plants: Plant[] = [
      {
        id: 'p1',
        name: 'Monstera',
        schedules: { water: [{ intervalDays: 7, activeMonths: allYear }] },
        lastDone: { water: isoOffset(-7) }, // due today
      },
    ];
    render(
      <TodayView uid="u1" plants={plants} onMarkDone={onMarkDone} onOpen={onOpen} />,
    );

    await user.click(screen.getByRole('button', { name: /Open Monstera/i }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith('p1');
    expect(onMarkDone).not.toHaveBeenCalled();
  });

  it("clicking a task button in 'Today' calls onMarkDone, not onOpen", async () => {
    const user = userEvent.setup();
    const plants: Plant[] = [
      {
        id: 'p1',
        name: 'Monstera',
        schedules: { water: [{ intervalDays: 7, activeMonths: allYear }] },
        lastDone: { water: isoOffset(-7) },
      },
    ];
    render(
      <TodayView uid="u1" plants={plants} onMarkDone={onMarkDone} onOpen={onOpen} />,
    );

    // Multiple buttons may contain "Water" text; find the task button explicitly.
    const waterButton = screen
      .getAllByRole('button')
      .find((b) => /Water/i.test(b.textContent ?? '') && !/Open/i.test(b.getAttribute('aria-label') ?? ''));
    expect(waterButton).toBeDefined();
    await user.click(waterButton!);

    expect(onMarkDone).toHaveBeenCalledTimes(1);
    expect(onMarkDone).toHaveBeenCalledWith('p1', 'water');
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("clicking the header row in 'Coming Up' also calls onOpen", async () => {
    const user = userEvent.setup();
    const plants: Plant[] = [
      {
        id: 'p2',
        name: 'Fern',
        schedules: { water: [{ intervalDays: 7, activeMonths: allYear }] },
        lastDone: { water: isoOffset(-4) }, // due in 3 days
      },
    ];
    render(
      <TodayView uid="u1" plants={plants} onMarkDone={onMarkDone} onOpen={onOpen} />,
    );

    expect(screen.getByText(/Coming Up/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Open Fern/i }));
    expect(onOpen).toHaveBeenCalledWith('p2');
  });

  it("'Complete early' on a Coming Up row calls onMarkDone, not onOpen", async () => {
    const user = userEvent.setup();
    const plants: Plant[] = [
      {
        id: 'p2',
        name: 'Fern',
        schedules: { mist: [{ intervalDays: 7, activeMonths: allYear }] },
        lastDone: { mist: isoOffset(-4) },
      },
    ];
    render(
      <TodayView uid="u1" plants={plants} onMarkDone={onMarkDone} onOpen={onOpen} />,
    );

    await user.click(screen.getByRole('button', { name: /Complete early/i }));
    expect(onMarkDone).toHaveBeenCalledWith('p2', 'mist');
    expect(onOpen).not.toHaveBeenCalled();
  });
});
