export const getEnv = (key: string, fallback: string = ""): string => {
  try {
    const value =
      typeof process !== "undefined" && process.env
        ? process.env[key]
        : undefined;

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }

    return fallback;
  } catch {
    return fallback;
  }
};