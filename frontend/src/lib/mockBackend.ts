// Intercept global fetch for Standalone Mode
const originalFetch = window.fetch;

window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);

  // If the request is for our API, intercept it.
  if (url.includes('/api/')) {
    console.log('[MockBackend] Intercepted:', url);
    
    // Simulate slight network delay
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

    let responseData: any = {};

    if (url.includes('/api/auth/login')) {
      responseData = { token: 'mock-standalone-token', user: { name: 'Admin', role: 'Superuser' } };
    } 
    else if (url.includes('/api/production/summary')) {
      responseData = {
        active_machines: 135,
        total_target: 20000,
        total_completed: 18634,
        efficiency: 0.942
      };
    }
    else if (url.includes('/api/machines') && !url.includes('/status') && !url.includes('/history')) {
      responseData = Array.from({ length: 150 }).map((_, i) => ({
        id: i + 1,
        name: `CNC-${(i + 1).toString().padStart(3, '0')}`,
        status: Math.random() > 0.05 ? 'Running' : 'Maintenance',
        temperature: 45 + Math.random() * 40,
        vibration: 0.1 + Math.random() * 0.5,
        running_hours: 1000 + Math.random() * 5000,
        power_draw: 12 + Math.random() * 8
      }));
    }
    else if (url.includes('/api/inventory')) {
      responseData = Array.from({ length: 20 }).map((_, i) => ({
        id: i + 1,
        sku: `PRT-${1000 + i}`,
        name: `Spare Part ${i + 1}`,
        quantity: Math.floor(Math.random() * 500),
        minimum_threshold: 50,
        location: `Zone ${String.fromCharCode(65 + (i % 5))}`
      }));
    }
    else if (url.includes('/api/quality/stats')) {
      responseData = {
        passed: 18000,
        failed: 634,
        yield_rate: 96.59
      };
    }
    else if (url.includes('/api/quality/defect-types')) {
      responseData = [
        { type: 'Dimensional', count: 320 },
        { type: 'Surface', count: 180 },
        { type: 'Assembly', count: 134 }
      ];
    }
    else if (url.includes('/api/ai/metrics')) {
      responseData = {
        rmse: 0.045,
        mae: 0.032,
        r2: 0.98,
        inference_time_ms: 12
      };
    }
    else if (url.includes('/api/audit')) {
      responseData = Array.from({ length: 15 }).map((_, i) => ({
        id: i + 1,
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        user_name: 'Admin',
        action: 'Settings Update',
        details: 'Updated production target configuration',
        ip_address: '192.168.1.100'
      }));
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Pass through all other requests
  return originalFetch(input, init);
};

console.log('[MockBackend] Initialized. All API requests are now running locally.');
