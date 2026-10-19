
export function Loading({ text = "Loading…" }) {
  return (
    <p className="notice notice-loading" role="status">
      {text}
    </p>
  );
}

export function ErrorNotice({ message, onRetry }) {
  if (!message) return null;
  return (
    <p className="notice notice-error" role="alert">
      {message}
      {onRetry && (
        <button type="button" className="link" onClick={onRetry}>
          Try again
        </button>
      )}
    </p>
  );
}

export function SuccessNotice({ message }) {
  if (!message) return null;
  return (
    <p className="notice notice-success" role="status">
      {message}
    </p>
  );
}
