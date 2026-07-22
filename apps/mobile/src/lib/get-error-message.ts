import { isAxiosError } from "axios";

/** Extracts a human-readable message from an API error, falling back to a generic one. */
export function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string") {
      return message;
    }
  }
  return "Something went wrong. Please try again.";
}
