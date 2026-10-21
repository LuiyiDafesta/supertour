import { describe, it, expect } from 'vitest';

describe('Trip Date and Calendar Calculations', () => {
  it('correctly calculates the days in months for standard and leap years', () => {
    // 2024 is leap year, 2026 is standard
    const feb2024 = new Date(2024, 2, 0).getDate();
    const feb2026 = new Date(2026, 2, 0).getDate();
    expect(feb2024).toBe(29);
    expect(feb2026).toBe(28);

    // October, November, December 2026
    const oct2026 = new Date(2026, 10, 0).getDate();
    const nov2026 = new Date(2026, 11, 0).getDate();
    const dec2026 = new Date(2026, 12, 0).getDate();
    expect(oct2026).toBe(31);
    expect(nov2026).toBe(30);
    expect(dec2026).toBe(31);
  });

  it('correctly identifies day-of-week starting offset', () => {
    // 1st of October 2026 is a Thursday (index 4)
    const oct1Offset = new Date(2026, 9, 1).getDay();
    expect(oct1Offset).toBe(4);

    // 1st of November 2026 is a Sunday (index 0)
    const nov1Offset = new Date(2026, 10, 1).getDay();
    expect(nov1Offset).toBe(0);

    // 1st of December 2026 is a Tuesday (index 2)
    const dec1Offset = new Date(2026, 11, 1).getDay();
    expect(dec1Offset).toBe(2);
  });

  it('correctly parses dates in ISO, SQL and space-separated formats', () => {
    const parseDateParts = (rawDate: string) => {
      const dateOnly = rawDate.split('T')[0].split(' ')[0];
      const [year, month, day] = dateOnly.split('-');
      return { year: parseInt(year, 10), month: parseInt(month, 10), day: parseInt(day, 10) };
    };

    expect(parseDateParts('2026-11-15T14:30:00Z')).toEqual({ year: 2026, month: 11, day: 15 });
    expect(parseDateParts('2027-01-20 00:00:00')).toEqual({ year: 2027, month: 1, day: 20 });
    expect(parseDateParts('2026-12-08')).toEqual({ year: 2026, month: 12, day: 8 });
  });
});
