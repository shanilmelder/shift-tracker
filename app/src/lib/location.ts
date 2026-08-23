import * as Location from 'expo-location';

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * The device's current position, or `null` if it cannot be obtained.
 *
 * Requesting the permission is the point. Declaring `NSLocationWhenInUseUsageDescription` and
 * the Android permissions in app.config.ts only makes the permission *available* — the OS
 * prompt appears when an app asks for it, and nothing here ever did. So every
 * `getCurrentPositionAsync` threw, which is why clocking in failed for everyone with an error
 * about retrying when back online.
 *
 * Returns null rather than throwing on refusal or failure, because the caller must carry on
 * regardless: the geofence check is explicitly not allowed to block clocking in or out
 * (FR-038), and the API records a position-less entry as flagged for review instead.
 */
export async function getCurrentCoordinates(): Promise<Coordinates | null> {
  try {
    // Resolves immediately with the existing answer once decided, so this is safe to call on
    // every clock action rather than only the first.
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) return null;

    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: position.coords.latitude, lng: position.coords.longitude };
  } catch {
    // Location services switched off entirely, no fix available, a timeout — all the same
    // outcome for the caller: proceed without a position.
    return null;
  }
}

/** Whether location has already been granted, without prompting. Lets a screen explain the
 * consequence of a refusal without triggering the OS dialog just by being opened. */
export async function hasLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === Location.PermissionStatus.GRANTED;
  } catch {
    return false;
  }
}
