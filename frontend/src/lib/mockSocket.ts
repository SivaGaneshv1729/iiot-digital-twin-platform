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
    // Generate 150 machines once
    const machines = Array.from({ length: 150 }).map((_, i) => ({
      id: i + 1,
      name: `CNC-${(i + 1).toString().padStart(3, '0')}`,
      status: Math.random() > 0.05 ? 'Running' : (Math.random() > 0.5 ? 'Maintenance' : 'Error'),
      temperature: 45 + Math.random() * 40,
      vibration: 0.1 + Math.random() * 0.5,
      running_hours: 1000 + Math.random() * 5000,
      power_draw: 12 + Math.random() * 8
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

export const io = (url?: string) => {
  return new MockSocket();
};
