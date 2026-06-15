import { useState, useEffect, useCallback } from 'react';
import apiClient, { ApiError } from '../../api/client';

// --- Types ---

interface Desk {
  id: number;
  identifier: string;
  floor: number;
}

interface ParkingSpot {
  id: number;
  identifier: string;
  locationLabel: string;
}

interface FieldErrors {
  identifier?: string;
  floor?: string;
  locationLabel?: string;
}

type Tab = 'desks' | 'parking';

// --- Validation helpers ---

function validateDeskForm(identifier: string, floor: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!identifier.trim()) {
    errors.identifier = 'Identifier is required';
  } else if (identifier.trim().length > 50) {
    errors.identifier = 'Identifier must be 50 characters or less';
  }
  if (!floor.trim()) {
    errors.floor = 'Floor is required';
  } else if (!Number.isInteger(Number(floor)) || floor.trim() !== String(parseInt(floor.trim(), 10))) {
    errors.floor = 'Floor must be an integer';
  }
  return errors;
}

function validateParkingForm(identifier: string, locationLabel: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!identifier.trim()) {
    errors.identifier = 'Identifier is required';
  } else if (identifier.trim().length > 50) {
    errors.identifier = 'Identifier must be 50 characters or less';
  }
  if (!locationLabel.trim()) {
    errors.locationLabel = 'Location label is required';
  } else if (locationLabel.trim().length > 100) {
    errors.locationLabel = 'Location label must be 100 characters or less';
  }
  return errors;
}

// --- Helper to format today's date ---

function formatToday(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// --- Main Component ---

export default function ResourceManagementPage() {
  const [activeTab, setActiveTab] = useState<Tab>('desks');

  // Desks state
  const [desks, setDesks] = useState<Desk[]>([]);
  const [deskIdentifier, setDeskIdentifier] = useState('');
  const [deskFloor, setDeskFloor] = useState('');
  const [deskErrors, setDeskErrors] = useState<FieldErrors>({});
  const [editingDeskId, setEditingDeskId] = useState<number | null>(null);

  // Parking state
  const [parkingSpots, setParkingSpots] = useState<ParkingSpot[]>([]);
  const [parkingIdentifier, setParkingIdentifier] = useState('');
  const [parkingLocationLabel, setParkingLocationLabel] = useState('');
  const [parkingErrors, setParkingErrors] = useState<FieldErrors>({});
  const [editingParkingId, setEditingParkingId] = useState<number | null>(null);

  // General state
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // --- Fetch Resources ---

  const fetchDesks = useCallback(async () => {
    try {
      const today = formatToday();
      const response = await apiClient.get<{ data: Array<{ id: number; identifier: string; floor: number }> }>(
        `/availability/desks?date=${today}`,
      );
      setDesks(response.data.map((d) => ({ id: d.id, identifier: d.identifier, floor: d.floor })));
    } catch {
      setDesks([]);
    }
  }, []);

  const fetchParkingSpots = useCallback(async () => {
    try {
      const today = formatToday();
      const response = await apiClient.get<{ data: Array<{ id: number; identifier: string; locationLabel: string; location_label?: string }> }>(
        `/availability/parking?date=${today}`,
      );
      setParkingSpots(
        response.data.map((s) => ({
          id: s.id,
          identifier: s.identifier,
          locationLabel: s.locationLabel || s.location_label || '',
        })),
      );
    } catch {
      setParkingSpots([]);
    }
  }, []);

  useEffect(() => {
    fetchDesks();
    fetchParkingSpots();
  }, [fetchDesks, fetchParkingSpots]);

  // Auto-dismiss notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // --- Desk Form Handlers ---

  function handleDeskSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateDeskForm(deskIdentifier, deskFloor);
    setDeskErrors(errors);
    if (Object.keys(errors).length > 0) return;

    if (editingDeskId !== null) {
      updateDesk(editingDeskId);
    } else {
      createDesk();
    }
  }

  async function createDesk() {
    setIsLoading(true);
    try {
      await apiClient.post('/admin/desks', {
        identifier: deskIdentifier.trim(),
        floor: parseInt(deskFloor.trim(), 10),
      });
      setNotification({ type: 'success', message: 'Desk created successfully.' });
      resetDeskForm();
      fetchDesks();
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.fields) {
        const fieldErrors: FieldErrors = {};
        apiError.fields.forEach((f) => {
          if (f.field === 'identifier') fieldErrors.identifier = f.message;
          if (f.field === 'floor') fieldErrors.floor = f.message;
        });
        setDeskErrors(fieldErrors);
      } else {
        setNotification({ type: 'error', message: apiError.error || 'Failed to create desk.' });
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function updateDesk(id: number) {
    setIsLoading(true);
    try {
      await apiClient.put(`/admin/desks/${id}`, {
        identifier: deskIdentifier.trim(),
        floor: parseInt(deskFloor.trim(), 10),
      });
      setNotification({ type: 'success', message: 'Desk updated successfully.' });
      resetDeskForm();
      fetchDesks();
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.fields) {
        const fieldErrors: FieldErrors = {};
        apiError.fields.forEach((f) => {
          if (f.field === 'identifier') fieldErrors.identifier = f.message;
          if (f.field === 'floor') fieldErrors.floor = f.message;
        });
        setDeskErrors(fieldErrors);
      } else {
        setNotification({ type: 'error', message: apiError.error || 'Failed to update desk.' });
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteDesk(id: number) {
    setIsLoading(true);
    try {
      await apiClient.delete(`/admin/desks/${id}`);
      setNotification({ type: 'success', message: 'Desk deleted successfully.' });
      fetchDesks();
    } catch (err) {
      const apiError = err as ApiError;
      setNotification({ type: 'error', message: apiError.error || 'Failed to delete desk.' });
    } finally {
      setIsLoading(false);
    }
  }

  function startEditDesk(desk: Desk) {
    setEditingDeskId(desk.id);
    setDeskIdentifier(desk.identifier);
    setDeskFloor(String(desk.floor));
    setDeskErrors({});
  }

  function resetDeskForm() {
    setDeskIdentifier('');
    setDeskFloor('');
    setDeskErrors({});
    setEditingDeskId(null);
  }

  // --- Parking Form Handlers ---

  function handleParkingSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateParkingForm(parkingIdentifier, parkingLocationLabel);
    setParkingErrors(errors);
    if (Object.keys(errors).length > 0) return;

    if (editingParkingId !== null) {
      updateParkingSpot(editingParkingId);
    } else {
      createParkingSpot();
    }
  }

  async function createParkingSpot() {
    setIsLoading(true);
    try {
      await apiClient.post('/admin/parking', {
        identifier: parkingIdentifier.trim(),
        locationLabel: parkingLocationLabel.trim(),
      });
      setNotification({ type: 'success', message: 'Parking spot created successfully.' });
      resetParkingForm();
      fetchParkingSpots();
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.fields) {
        const fieldErrors: FieldErrors = {};
        apiError.fields.forEach((f) => {
          if (f.field === 'identifier') fieldErrors.identifier = f.message;
          if (f.field === 'locationLabel') fieldErrors.locationLabel = f.message;
        });
        setParkingErrors(fieldErrors);
      } else {
        setNotification({ type: 'error', message: apiError.error || 'Failed to create parking spot.' });
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function updateParkingSpot(id: number) {
    setIsLoading(true);
    try {
      await apiClient.put(`/admin/parking/${id}`, {
        identifier: parkingIdentifier.trim(),
        locationLabel: parkingLocationLabel.trim(),
      });
      setNotification({ type: 'success', message: 'Parking spot updated successfully.' });
      resetParkingForm();
      fetchParkingSpots();
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.fields) {
        const fieldErrors: FieldErrors = {};
        apiError.fields.forEach((f) => {
          if (f.field === 'identifier') fieldErrors.identifier = f.message;
          if (f.field === 'locationLabel') fieldErrors.locationLabel = f.message;
        });
        setParkingErrors(fieldErrors);
      } else {
        setNotification({ type: 'error', message: apiError.error || 'Failed to update parking spot.' });
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteParkingSpot(id: number) {
    setIsLoading(true);
    try {
      await apiClient.delete(`/admin/parking/${id}`);
      setNotification({ type: 'success', message: 'Parking spot deleted successfully.' });
      fetchParkingSpots();
    } catch (err) {
      const apiError = err as ApiError;
      setNotification({ type: 'error', message: apiError.error || 'Failed to delete parking spot.' });
    } finally {
      setIsLoading(false);
    }
  }

  function startEditParking(spot: ParkingSpot) {
    setEditingParkingId(spot.id);
    setParkingIdentifier(spot.identifier);
    setParkingLocationLabel(spot.locationLabel);
    setParkingErrors({});
  }

  function resetParkingForm() {
    setParkingIdentifier('');
    setParkingLocationLabel('');
    setParkingErrors({});
    setEditingParkingId(null);
  }

  // --- Render ---

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary-700 mb-1">Resource Management</h1>
        <p className="text-neutral-600 text-sm">Manage desks and parking spots.</p>
      </div>

      {/* Notification */}
      {notification && (
        <div
          role="alert"
          className={`p-3 rounded-md text-sm font-medium ${
            notification.type === 'success'
              ? 'bg-primary-100 text-primary-800 border border-primary-300'
              : 'bg-danger-100 text-danger-800 border border-danger-300'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-neutral-200" role="tablist" aria-label="Resource tabs">
        <button
          role="tab"
          aria-selected={activeTab === 'desks'}
          aria-controls="panel-desks"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'desks'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
          }`}
          onClick={() => setActiveTab('desks')}
        >
          Desks
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'parking'}
          aria-controls="panel-parking"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'parking'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
          }`}
          onClick={() => setActiveTab('parking')}
        >
          Parking Spots
        </button>
      </div>

      {/* Desks Tab Panel */}
      {activeTab === 'desks' && (
        <div id="panel-desks" role="tabpanel" aria-labelledby="tab-desks" className="space-y-6">
          {/* Add/Edit Desk Form */}
          <form onSubmit={handleDeskSubmit} className="bg-white p-4 rounded-lg border border-neutral-200 space-y-4">
            <h2 className="text-lg font-semibold text-neutral-800">
              {editingDeskId !== null ? 'Edit Desk' : 'Add New Desk'}
            </h2>
            <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
              <div>
                <label htmlFor="desk-identifier" className="block text-sm font-medium text-neutral-700 mb-1">
                  Identifier
                </label>
                <input
                  id="desk-identifier"
                  type="text"
                  value={deskIdentifier}
                  onChange={(e) => setDeskIdentifier(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    deskErrors.identifier ? 'border-danger-500' : 'border-neutral-300'
                  }`}
                  placeholder="e.g. D-101"
                  aria-describedby={deskErrors.identifier ? 'desk-identifier-error' : undefined}
                  aria-invalid={!!deskErrors.identifier}
                />
                {deskErrors.identifier && (
                  <p id="desk-identifier-error" className="mt-1 text-xs text-danger-600">
                    {deskErrors.identifier}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="desk-floor" className="block text-sm font-medium text-neutral-700 mb-1">
                  Floor
                </label>
                <input
                  id="desk-floor"
                  type="text"
                  inputMode="numeric"
                  value={deskFloor}
                  onChange={(e) => setDeskFloor(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    deskErrors.floor ? 'border-danger-500' : 'border-neutral-300'
                  }`}
                  placeholder="e.g. 2"
                  aria-describedby={deskErrors.floor ? 'desk-floor-error' : undefined}
                  aria-invalid={!!deskErrors.floor}
                />
                {deskErrors.floor && (
                  <p id="desk-floor-error" className="mt-1 text-xs text-danger-600">
                    {deskErrors.floor}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editingDeskId !== null ? 'Update Desk' : 'Add Desk'}
              </button>
              {editingDeskId !== null && (
                <button
                  type="button"
                  onClick={resetDeskForm}
                  className="px-4 py-2 bg-neutral-200 text-neutral-700 text-sm font-medium rounded-md hover:bg-neutral-300 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          {/* Desks List */}
          <div className="bg-white rounded-lg border border-neutral-200">
            <div className="px-4 py-3 border-b border-neutral-200">
              <h2 className="text-lg font-semibold text-neutral-800">Existing Desks</h2>
            </div>
            {desks.length === 0 ? (
              <p className="p-4 text-sm text-neutral-500">No desks found.</p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {desks.map((desk) => (
                  <div key={desk.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-neutral-800">{desk.identifier}</span>
                      <span className="text-sm text-neutral-500 ml-3">Floor {desk.floor}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditDesk(desk)}
                        className="px-3 py-1 text-xs font-medium text-accent-700 bg-accent-50 border border-accent-200 rounded-md hover:bg-accent-100 transition-colors"
                        aria-label={`Edit desk ${desk.identifier}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteDesk(desk.id)}
                        disabled={isLoading}
                        className="px-3 py-1 text-xs font-medium text-danger-700 bg-danger-50 border border-danger-200 rounded-md hover:bg-danger-100 disabled:opacity-50 transition-colors"
                        aria-label={`Delete desk ${desk.identifier}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Parking Spots Tab Panel */}
      {activeTab === 'parking' && (
        <div id="panel-parking" role="tabpanel" aria-labelledby="tab-parking" className="space-y-6">
          {/* Add/Edit Parking Spot Form */}
          <form onSubmit={handleParkingSubmit} className="bg-white p-4 rounded-lg border border-neutral-200 space-y-4">
            <h2 className="text-lg font-semibold text-neutral-800">
              {editingParkingId !== null ? 'Edit Parking Spot' : 'Add New Parking Spot'}
            </h2>
            <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
              <div>
                <label htmlFor="parking-identifier" className="block text-sm font-medium text-neutral-700 mb-1">
                  Identifier
                </label>
                <input
                  id="parking-identifier"
                  type="text"
                  value={parkingIdentifier}
                  onChange={(e) => setParkingIdentifier(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    parkingErrors.identifier ? 'border-danger-500' : 'border-neutral-300'
                  }`}
                  placeholder="e.g. P-A01"
                  aria-describedby={parkingErrors.identifier ? 'parking-identifier-error' : undefined}
                  aria-invalid={!!parkingErrors.identifier}
                />
                {parkingErrors.identifier && (
                  <p id="parking-identifier-error" className="mt-1 text-xs text-danger-600">
                    {parkingErrors.identifier}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="parking-location" className="block text-sm font-medium text-neutral-700 mb-1">
                  Location Label
                </label>
                <input
                  id="parking-location"
                  type="text"
                  value={parkingLocationLabel}
                  onChange={(e) => setParkingLocationLabel(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    parkingErrors.locationLabel ? 'border-danger-500' : 'border-neutral-300'
                  }`}
                  placeholder="e.g. Level B1, Near Elevator"
                  aria-describedby={parkingErrors.locationLabel ? 'parking-location-error' : undefined}
                  aria-invalid={!!parkingErrors.locationLabel}
                />
                {parkingErrors.locationLabel && (
                  <p id="parking-location-error" className="mt-1 text-xs text-danger-600">
                    {parkingErrors.locationLabel}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editingParkingId !== null ? 'Update Parking Spot' : 'Add Parking Spot'}
              </button>
              {editingParkingId !== null && (
                <button
                  type="button"
                  onClick={resetParkingForm}
                  className="px-4 py-2 bg-neutral-200 text-neutral-700 text-sm font-medium rounded-md hover:bg-neutral-300 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          {/* Parking Spots List */}
          <div className="bg-white rounded-lg border border-neutral-200">
            <div className="px-4 py-3 border-b border-neutral-200">
              <h2 className="text-lg font-semibold text-neutral-800">Existing Parking Spots</h2>
            </div>
            {parkingSpots.length === 0 ? (
              <p className="p-4 text-sm text-neutral-500">No parking spots found.</p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {parkingSpots.map((spot) => (
                  <div key={spot.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-neutral-800">{spot.identifier}</span>
                      <span className="text-sm text-neutral-500 ml-3">{spot.locationLabel}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditParking(spot)}
                        className="px-3 py-1 text-xs font-medium text-accent-700 bg-accent-50 border border-accent-200 rounded-md hover:bg-accent-100 transition-colors"
                        aria-label={`Edit parking spot ${spot.identifier}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteParkingSpot(spot.id)}
                        disabled={isLoading}
                        className="px-3 py-1 text-xs font-medium text-danger-700 bg-danger-50 border border-danger-200 rounded-md hover:bg-danger-100 disabled:opacity-50 transition-colors"
                        aria-label={`Delete parking spot ${spot.identifier}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
