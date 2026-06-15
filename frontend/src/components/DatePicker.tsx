import { useMemo } from 'react';

interface DatePickerProps {
  label?: string;
  value: string;
  onChange: (date: string) => void;
}

export default function DatePicker({ label = 'Select Date', value, onChange }: DatePickerProps) {
  const { minDate, maxDate } = useMemo(() => {
    const today = new Date();
    const max = new Date();
    max.setDate(today.getDate() + 30);

    const toISO = (d: Date) => d.toISOString().split('T')[0];
    return { minDate: toISO(today), maxDate: toISO(max) };
  }, []);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="date-picker" className="text-sm font-medium text-neutral-700">
        {label}
      </label>
      <input
        id="date-picker"
        type="date"
        value={value}
        min={minDate}
        max={maxDate}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-800 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
    </div>
  );
}
