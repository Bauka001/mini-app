const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const resolveApiBaseUrl = () => {
  const configuredUrl = `${import.meta.env.VITE_API_URL || ''}`.trim();

  if (configuredUrl) {
    return trimTrailingSlash(configuredUrl);
  }

  const { hostname, origin } = window.location;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  return isLocalhost ? 'http://localhost:3001' : origin;
};

export const apiBaseUrl = resolveApiBaseUrl();

export const buildApiUrl = (path: string) => `${apiBaseUrl}${path}`;
