interface BookingConfirmDialogProps {
  open?: boolean;
  resourceLabel?: string;
  deskIdentifier?: string;
  date: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function BookingConfirmDialog({
  open,
  resourceLabel,
  deskIdentifier,
  date,
  onConfirm,
  onCancel,
  isLoading = false,
}: BookingConfirmDialogProps) {
  // Support both usage patterns:
  // 1. open prop controls visibility (parking page passes open explicitly)
  // 2. No open prop — rendered conditionally by parent (desk page wraps in {showDialog && ...})
  if (open === false) return null;

  const label = resourceLabel || (deskIdentifier ? `Desk ${deskIdentifier}` : 'Resource');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg mx-4">
        <h2 id="booking-dialog-title" className="text-lg font-semibold text-neutral-800">
          Confirm Booking
        </h2>
        <p className="mt-3 text-sm text-neutral-600">
          {label} on {date}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {isLoading ? 'Booking...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
