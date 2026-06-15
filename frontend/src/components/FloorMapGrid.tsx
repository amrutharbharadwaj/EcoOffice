interface Desk {
  id: number;
  identifier: string;
  floor: number;
  status: 'available' | 'booked';
}

interface FloorMapGridProps {
  desks: Desk[];
  selectedDeskId: number | null;
  onDeskSelect: (desk: Desk) => void;
  readOnly?: boolean;
}

export default function FloorMapGrid({
  desks,
  selectedDeskId,
  onDeskSelect,
  readOnly = false,
}: FloorMapGridProps) {
  // Group desks by floor
  const floors = desks.reduce<Record<number, Desk[]>>((acc, desk) => {
    if (!acc[desk.floor]) {
      acc[desk.floor] = [];
    }
    acc[desk.floor].push(desk);
    return acc;
  }, {});

  const sortedFloors = Object.keys(floors)
    .map(Number)
    .sort((a, b) => a - b);

  function getDeskClasses(desk: Desk): string {
    const base = 'p-3 rounded-md border-2 text-center text-sm font-medium transition-colors';

    if (desk.id === selectedDeskId) {
      return `${base} bg-accent-100 border-accent-500 text-accent-700 cursor-pointer`;
    }

    if (desk.status === 'booked') {
      return `${base} bg-neutral-200 border-neutral-300 text-neutral-500 cursor-not-allowed`;
    }

    // Available
    if (readOnly) {
      return `${base} bg-primary-100 border-primary-400 text-primary-700 cursor-default`;
    }

    return `${base} bg-primary-100 border-primary-400 text-primary-700 cursor-pointer hover:bg-primary-200`;
  }

  return (
    <div className="space-y-6">
      {sortedFloors.map((floor) => (
        <div key={floor}>
          <h3 className="text-md font-semibold text-neutral-700 mb-3">Floor {floor}</h3>
          <div className="grid grid-cols-2 tablet:grid-cols-4 desktop:grid-cols-6 gap-3">
            {floors[floor].map((desk) => (
              <button
                key={desk.id}
                type="button"
                className={getDeskClasses(desk)}
                onClick={() => {
                  if (!readOnly && desk.status === 'available') {
                    onDeskSelect(desk);
                  }
                }}
                disabled={desk.status === 'booked' || readOnly}
                aria-label={`Desk ${desk.identifier}, ${desk.status === 'booked' ? 'booked' : desk.id === selectedDeskId ? 'selected' : 'available'}`}
              >
                {desk.identifier}
              </button>
            ))}
          </div>
        </div>
      ))}
      {sortedFloors.length === 0 && (
        <p className="text-neutral-500 text-sm">No desks available for this date.</p>
      )}
    </div>
  );
}

export type { Desk };
