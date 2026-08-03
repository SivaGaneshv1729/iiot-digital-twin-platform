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
      responseData = Array.from({ length: 16 }).map((_, i) => ({
        id: i + 1,
        name: i < 6 ? `CNC Milling ${(i + 1).toString().padStart(2, '0')}` : i < 11 ? `Stamping Press ${(i - 5).toString().padStart(2, '0')}` : `Lathe Machine ${(i - 10).toString().padStart(2, '0')}`,
        status: i === 3 ? 'Maintenance' : i === 7 ? 'Warning' : 'Running',
        temperature: Math.round(45 + (i * 2.5) % 35),
        vibration: Number((0.15 + (i * 0.05) % 0.6).toFixed(2)),
        running_hours: 1200 + i * 340,
        power_draw: Number((12 + (i * 0.8) % 10).toFixed(1))
      }));
    }
    else if (url.includes('/api/ai/predict/maintenance')) {
      responseData = { failure_probability: 14 };
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
      const actions = [
        'SYSTEM_INITIALIZATION: Digital twin platform boot & telemetry sync',
        'PREDICTIVE_MAINTENANCE: CNC Milling 01 vibration threshold adjusted',
        'AR_INSPECTION_MODE: Activated visual telemetry overlay',
        'QUALITY_AUDIT: Automated CV inspection passed batch #8942',
        'MODEL_RETRAIN: XGBoost RUL prediction pipeline triggered',
        'FIRMWARE_UPDATE: Gateway IoT sensor node updated to v2.4.1'
      ];
      responseData = Array.from({ length: 15 }).map((_, i) => ({
        id: i + 1,
        time: new Date(Date.now() - i * 3600000 * 2).toISOString(),
        username: i % 2 === 0 ? 'tanaka_eng' : 'sato_op',
        role: i % 3 === 0 ? 'Admin' : 'Operator',
        action: actions[i % actions.length]
      }));
    }
    else if (url.includes('/history')) {
      responseData = Array.from({ length: 60 }).map((_, i) => ({
        time: new Date(Date.now() - (60 - i) * 60000).toISOString(),
        temperature: 40 + Math.random() * 20
      }));
    }
    else if (url.includes('/api/ai/forecast/temperature')) {
      responseData = { forecast: Array.from({ length: 20 }).map(() => 50 + Math.random() * 30) };
    }
    else if (url.includes('/api/ai/predict/maintenance')) {
      responseData = { failure_probability: Math.floor(Math.random() * 100) };
    }
    else if (url.includes('/api/quality/trends')) {
      responseData = Array.from({ length: 7 }).map((_, i) => ({
        date: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString(),
        defectRate: 1 + Math.random() * 4
      }));
    }
    else if (url.match(/\/api\/quality$/)) {
      responseData = Array.from({ length: 7 }).map((_, i) => ({
        date: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString(),
        passed: 2000 + Math.floor(Math.random() * 500),
        failed: 50 + Math.floor(Math.random() * 100),
        yield: 95 + Math.random() * 4
      }));
    }
    else if (url.includes('/api/ai/chat')) {
      let userQuery = '';
      try {
        if (init?.body) {
          const parsed = JSON.parse(init.body.toString());
          userQuery = (parsed.question || parsed.prompt || '').toLowerCase();
        }
      } catch {}

      let aiResponse = "";
      if (userQuery.includes('risk') || userQuery.includes('fail') || userQuery.includes('anomaly') || userQuery.includes('bad')) {
        aiResponse = "⚠️ **High-Risk Machinery Telemetry Alert:**\n\n• **Stamping Press 04 (Block B)**: Temperature **89.4°C** (Normal < 70°C). Vibration amplitude **0.84 mm/s** (Threshold 0.50). Estimated Remaining Useful Life (RUL): **48 Hours**.\n• **CNC Milling 02 (Block A)**: Minor bearing spall detected. Vibration **0.52 mm/s**.\n\n**Recommendation**: Schedule preventive lubrication & bearing replacement during the 18:00 shift change.";
      } else if (userQuery.includes('temp') || userQuery.includes('heat') || userQuery.includes('thermal') || userQuery.includes('hot')) {
        aiResponse = "🌡️ **Thermal Telemetry Scan Results:**\n\n• **Max Temperature**: 89.4°C on *Stamping Press 04* (Block B)\n• **Plant Average Temp**: 48.2°C across 16 active units\n• **Cooling Loops**: Chiller Line #2 operating at 98% load.\n\n*AI Thermal Heatmap visual mode is recommended to highlight thermal gradient boundaries in 3D.*";
      } else if (userQuery.includes('oee') || userQuery.includes('output') || userQuery.includes('production') || userQuery.includes('efficiency')) {
        aiResponse = "📊 **Live Production & OEE Summary:**\n\n• **Overall Plant Efficiency (OEE)**: **94.2%** (+1.2% vs yesterday target)\n• **Shift Units Completed**: **18,634** / 20,000 Target (93.17% quota fulfilled)\n• **Active Operational Machines**: **135 / 140** Units\n• **Target Completion ETA**: **16:45 PM** today.";
      } else if (userQuery.includes('quality') || userQuery.includes('defect') || userQuery.includes('fpy') || userQuery.includes('yield')) {
        aiResponse = "🛡️ **Quality Assurance & CV Inspection Telemetry:**\n\n• **First Pass Yield (FPY)**: **96.59%**\n• **Live CCTV Vision (YOLO-v8x)**: Scanning Assembly Floor (Cam L-102)\n• **Top Defect Category**: Micro-fractures on hydraulic cylinder sleeves (8 instances today).\n• **Automated E-Stop**: Armed and linked to real-time CV vision failure trigger.";
      } else if (userQuery.includes('part') || userQuery.includes('inventory') || userQuery.includes('stock') || userQuery.includes('spare')) {
        aiResponse = "📦 **Inventory & Spares Telemetry:**\n\n• **Low Stock Alert**: Hydraulic Seal Kits (`PRT-1002`) down to **12 units** in Zone C (Minimum threshold 50).\n• **Automated Order**: Reorder ticket #8941 dispatched to supplier.\n• **Stock Health**: 19 / 20 SKUs within safe operating stock limits.";
      } else {
        aiResponse = `🤖 **SmartFactory AI Operations Intelligence:**\n\nAnalyzed query: "${userQuery || 'General Status'}"\n\n• **Factory Health**: 78% Overall Plant Health (128 Healthy, 18 At Risk, 6 Maintenance)\n• **Active Telemetry**: 16 IoT Node Clusters streaming @ 100ms intervals\n• **Status**: All critical safety interlocks and 3D digital twin overlays active. Ask me about **machines**, **risk**, **OEE**, **temperature**, or **quality**!`;
      }

      responseData = { response: aiResponse, answer: aiResponse };
    }
    else if (url.includes('/api/push/vapidPublicKey')) {
      responseData = { publicKey: "mock-vapid-public-key" };
    }
    else if (
      url.includes('/status') || 
      url.includes('emergency') || 
      url.includes('inject-defect') || 
      url.includes('/api/ai/train') || 
      url.includes('/api/push/subscribe')
    ) {
      responseData = { success: true };
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
