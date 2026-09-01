export const getApiUrl = (endpoint: string): string => {
  const ep = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const baseUrl = import.meta.env.VITE_API_URL;
  if (baseUrl && baseUrl !== 'http://localhost:4000' && baseUrl !== '') {
    return `${baseUrl.replace(/\/$/, '')}${ep}`;
  }
  return ep;
};

export const DEFAULT_MACHINES = Array.from({ length: 16 }).map((_, i) => ({
  id: i + 1,
  name: i < 6 ? `CNC Milling ${(i + 1).toString().padStart(2, '0')}` : i < 11 ? `Stamping Press ${(i - 5).toString().padStart(2, '0')}` : `Lathe Machine ${(i - 10).toString().padStart(2, '0')}`,
  status: i === 3 ? 'Maintenance' : i === 7 ? 'Warning' : 'Running',
  temperature: Math.round(45 + (i * 2.5) % 35),
  vibration: Number((0.15 + (i * 0.05) % 0.6).toFixed(2)),
  running_hours: 1200 + i * 340,
  power_draw: Number((12 + (i * 0.8) % 10).toFixed(1))
}));
