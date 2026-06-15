import { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/client';

interface Booking {
  id: number;
  user_name: string;
  resource_type: string;
  resource_identifier: string;
  booking_date: string;
}

interface BookingsResponse {
  data: {
    bookings: Booking[];
    total: number;
  };
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultStartDate(): string {
  return formatDate(new Date());
}

function getDefaultEndDate(): string {
  const end = new Date();
  end.setDate(end.getDate() + 30);
  return formatDate(end);
}

type ResourceTypeFilter = 'all' | 'desk' | 'parking_spot';

export default function BookingOverviewPage() {
  const [startDate, setStartDate] = useState<string>(getDefaultStartDate);
  const [endDate, setEndDate] = useState<string>(getDefaultEndDate);
  const [resourceType, setResourceType] = useState<ResourceTypeFilter>('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let path = `/admin/bookings?startDate=${startDate}&endDate=${endDate}`;
      if (resourceType !== 'all') {
        path += `&resourceType=${resourceType}`;
      }
      const response = await apiClient.get<BookingsResponse>(path);
      setBookings(response.data.bookings);
      setTotal(response.data.total);
    } catch {
      setError('Failed to load bookings. Please try again.');
      setBookings([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, resourceType]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  function formatResourceType(type: string): string {
    if (type === 'desk') return 'Desk';
    if (type === 'parking_spot') return 'Parking';
    return type;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary-700 mb-1">Booking Overview</h1>
        <p className="text-neutral-600 text-sm">View all bookings across users.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col tablet:flex-row gap-4 items-start tablet:items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor="start-date" className="text-sm font-medium text-neutral-700">
            Start Date
          </label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="end-date" className="text-sm font-medium text-neutral-700">
            End Date
          </label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="resource-type" className="text-sm font-medium text-neutral-700">
            Resource Type
          </label>
          <select
            id="resource-type"
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value as ResourceTypeFilter)}
            className="border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
          >
            <option value="all">All</option>
            <option value="desk">Desk</option>
            <option value="parking_spot">Parking</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div role="alert" className="p-3 rounded-md text-sm font-medium bg-danger-100 text-danger-800 border border-danger-300">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="text-neutral-500 text-sm">Loading bookings...</div>
      )}

      {/* Results */}
      {!isLoading && !error && (
        <>
          {/* Total count */}
          <div className="text-sm text-neutral-600">
            Total bookings: <span className="font-semibold text-neutral-800">{total}</span>
          </div>

          {bookings.length === 0 ? (
            /* Empty state */
            <div className="text-center py-12 text-neutral-500">
              <p className="text-lg font-medium">No bookings found for the selected criteria</p>
            </div>
          ) : (
            <>
              {/* Desktop table view */}
              <div className="hidden tablet:block overflow-x-auto">
                <table className="w-full text-sm text-left border border-neutral-200 rounded-lg overflow-hidden">
                  <thead className="bg-neutral-100 text-neutral-700">
                    <tr>
                      <th className="px-4 py-3 font-semibold">User Name</th>
                      <th className="px-4 py-3 font-semibold">Resource Type</th>
                      <th className="px-4 py-3 font-semibold">Resource Identifier</th>
                      <th className="px-4 py-3 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3 text-neutral-800">{booking.user_name}</td>
                        <td className="px-4 py-3 text-neutral-800">{formatResourceType(booking.resource_type)}</td>
                        <td className="px-4 py-3 text-neutral-800 font-mono">{booking.resource_identifier}</td>
                        <td className="px-4 py-3 text-neutral-800">{booking.booking_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card view */}
              <div className="tablet:hidden space-y-3">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="border border-neutral-200 rounded-lg p-4 bg-white shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-neutral-800">{booking.user_name}</span>
                      <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                        {formatResourceType(booking.resource_type)}
                      </span>
                    </div>
                    <div className="text-sm text-neutral-600 space-y-1">
                      <p>
                        <span className="text-neutral-500">Resource:</span>{' '}
                        <span className="font-mono">{booking.resource_identifier}</span>
                      </p>
                      <p>
                        <span className="text-neutral-500">Date:</span> {booking.booking_date}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
