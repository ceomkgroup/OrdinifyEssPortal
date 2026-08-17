/**
 * Employee/portal permission helpers.
 *
 * Layers (all must pass):
 * 1) Company module enabled (screenControllers / feature flags)
 * 2) Employee permission (e.g. allowWebPunch)
 *
 * If permission is false → do not offer the action (hide or hard-disable).
 */

export function getPunchPermissions(punchPermissions, employee) {
  const source = punchPermissions || employee || {};
  return {
    allowBiometricPunch: source.allowBiometricPunch === true,
    allowMobilePunch: source.allowMobilePunch === true,
    allowWebPunch: source.allowWebPunch === true,
    allowManualPunch: source.allowManualPunch === true,
  };
}

export function canWebPunch(punchPermissions, employee) {
  return getPunchPermissions(punchPermissions, employee).allowWebPunch;
}
