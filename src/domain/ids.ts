const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function evaluationIdFromParam(value: string): string | null {
  return UUID.test(value) ? value : null;
}

export function cycleIdFromParam(value: string): string | null {
  return UUID.test(value) ? value : null;
}

export function managerIdFromQuery(value: unknown): string | null {
  return typeof value === "string" && UUID.test(value) ? value : null;
}

export function userIdFromHeader(value: unknown): string | null {
  if (Array.isArray(value)) {
    return managerIdFromQuery(value[0]);
  }
  return managerIdFromQuery(value);
}
