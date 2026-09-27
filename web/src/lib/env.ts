import "server-only";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  backendApiBaseUrl: () => required("BACKEND_API_BASE_URL"),
  googleClientId: () => required("GOOGLE_CLIENT_ID"),
  googleClientSecret: () => required("GOOGLE_CLIENT_SECRET"),
  appUrl: () => required("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
};

export const SESSION_COOKIE_NAME = "okl_session";
