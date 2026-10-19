// Throw this from a route (or inside a transaction) to send a specific status.
// The error handler turns it into { message } with that status.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
