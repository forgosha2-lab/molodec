// Simple console-based logger for request metadata
export function logRequest(req) {
  const { method, path } = req;
  console.log(`[${new Date().toISOString()}] Request received: ${method} ${path}`);
}
