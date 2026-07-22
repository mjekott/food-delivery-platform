import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const BIOMETRIC_ENABLED_KEY = "biometricEnabled";

export type BiometricLabel =
  | "Face ID"
  | "Fingerprint"
  | "Passcode"
  | "Biometrics";

/**
 * True when the device can authenticate the user at all — biometric (face /
 * fingerprint) OR a device passcode. Reflects whatever the user has set up.
 */
export const isBiometricAvailable = async (): Promise<boolean> => {
  const level = await LocalAuthentication.getEnrolledLevelAsync();
  return level !== LocalAuthentication.SecurityLevel.NONE;
};

/**
 * A user-facing label for the auth method the device will actually use, based on
 * what the user has configured: enrolled biometrics, else the device passcode.
 */
export const getBiometricLabel = async (): Promise<BiometricLabel> => {
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  if (isEnrolled) {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (
      types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
    ) {
      return "Face ID";
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return "Fingerprint";
    }
    return "Biometrics";
  }

  return "Passcode";
};

/** Prompts the OS biometric check. Returns true only on a successful match. */
export const authenticate = async (promptMessage: string): Promise<boolean> => {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: "Cancel",
    disableDeviceFallback: false,
  });
  return result.success;
};

export const isBiometricEnabled = async (): Promise<boolean> => {
  const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
  return value === "true";
};

export const setBiometricEnabled = async (enabled: boolean): Promise<void> => {
  await SecureStore.setItemAsync(
    BIOMETRIC_ENABLED_KEY,
    enabled ? "true" : "false",
  );
};
