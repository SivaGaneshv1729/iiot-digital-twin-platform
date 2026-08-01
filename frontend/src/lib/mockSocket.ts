// Mock Socket.io Client for Standalone Frontend
type Callback = (...args: any[]) => void;

class MockSocket {
  private listeners: Record<string, Callback[]> = {};
  private intervals: number[] = [];

  constructor() {
    // Simulate connection delay
    setTimeout(() => {
      this.emitLocal('connect');
      this.startTelemetry();
    }, 500);
  }

  on(event: string, callback: Callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback?: Callback) {
    if (!this.listeners[event]) return;
    if (callback) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    } else {
      delete this.listeners[event];
    }
  }

  emit(event: string, ...args: any[]) {
    // Client sending an event to server (no-op in mock)
    console.log(`[MockSocket] Emitting ${event}`, args);
  }

  disconnect() {
    this.intervals.forEach(window.clearInterval);
    this.emitLocal('disconnect');
  }

  // Internal method to trigger events from the "server"
  private emitLocal(event: string, ...args: any[]) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(...args));
    }
  }

  private startTelemetry() {
    // Generate 16 active factory machines
    const machines = Array.from({ length: 16 }).map((_, i) => ({
      id: i + 1,
      name: i < 6 ? `CNC Milling ${(i + 1).toString().padStart(2, '0')}` : i < 11 ? `Stamping Press ${(i - 5).toString().padStart(2, '0')}` : `Lathe Machine ${(i - 10).toString().padStart(2, '0')}`,
      status: i === 3 ? 'Maintenance' : i === 7 ? 'Warning' : 'Running',
      temperature: Math.round(45 + (i * 2.5) % 35),
      vibration: Number((0.15 + (i * 0.05) % 0.6).toFixed(2)),
      running_hours: 1200 + i * 340,
      power_draw: Number((12 + (i * 0.8) % 10).toFixed(1))
    }));

    const interval = window.setInterval(() => {
      // Perturb data
      machines.forEach(m => {
        if (m.status === 'Running') {
          m.temperature += (Math.random() - 0.5) * 2;
          m.vibration += (Math.random() - 0.5) * 0.1;
          
          // Add some random errors
          if (Math.random() < 0.001) m.status = 'Error';
        }
      });
      this.emitLocal('telemetry_update', machines);
    }, 2000); // 2 second updates to save battery on frontend simulation

    this.intervals.push(interval);
  }
}

export const io = (_url?: string) => {
  return new MockSocket();
};
