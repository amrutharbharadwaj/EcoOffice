export interface ParkingSpot {
  id: number;
  identifier: string;
  location_label: string;
  status: 'available' | 'booked';
}

interface ParkingSpotListProps {
  spots: ParkingSpot[];
  selectedSpotId: number | null;
  onSelect: (spot: ParkingSpot) => void;
  isLoading?: boolean;
}

export default function ParkingSpotList({
  spots,
  selectedSpotId,
  onSelect,
  isLoading = false,
}: ParkingSpotListProps) {
  if (isLoading) {
    return <p className="text-sm text-neutral-500">Loading parking spots...</p>;
  }

  if (spots.length === 0) {
    return <p className="text-sm text-neutral-500">No parking spots found for this date.</p>;
  }

  return (
    <ul className="space-y-2" role="list" aria-label="Parking spots">
      {spots.map((spot) => {
        const isBooked = spot.status === 'booked';
        const isSelected = spot.id === selectedSpotId;

        let className =
          'flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors';

        if (isBooked) {
          className += ' border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed';
        } else if (isSelected) {
          className += ' border-accent-500 bg-accent-50 text-accent-800 ring-1 ring-accent-500 cursor-pointer';
        } else {
          className += ' border-primary-200 bg-primary-50 text-primary-800 hover:bg-primary-100 cursor-pointer';
        }

        return (
          <li key={spot.id}>
            <button
              type="button"
              className={`${className} w-full text-left`}
              disabled={isBooked}
              onClick={() => onSelect(spot)}
              aria-label={`Parking spot ${spot.identifier}, ${spot.location_label}, ${isBooked ? 'booked' : 'available'}`}
              aria-pressed={isSelected}
            >
              <div>
                <span className="font-medium">{spot.identifier}</span>
                <span className="ml-2 text-neutral-500">{spot.location_label}</span>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  isBooked
                    ? 'bg-neutral-200 text-neutral-500'
                    : isSelected
                      ? 'bg-accent-200 text-accent-800'
                      : 'bg-primary-200 text-primary-800'
                }`}
              >
                {isBooked ? 'Booked' : isSelected ? 'Selected' : 'Available'}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
