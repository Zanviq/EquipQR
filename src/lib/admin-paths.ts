export function encodePathSegment(value: string) {
  return encodeURIComponent(value);
}

export function adminEquipmentPath(assetNumber: string) {
  return `/admin/equipment/${encodePathSegment(assetNumber)}`;
}

export function adminUserPath(employeeNumber: string) {
  return `/admin/users/${encodePathSegment(employeeNumber)}`;
}
