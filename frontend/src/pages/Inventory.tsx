import { useEffect, useState } from 'react';
import { 
  Package, AlertTriangle, ArrowDownToLine, 
  DollarSign, BrainCircuit, BarChart2, Briefcase, Box, ChevronRight
} from 'lucide-react';
import { io } from 'socket.io-client';
import { 
  Treemap, ResponsiveContainer, Tooltip 
} from 'recharts';
import './Inventory.css';

interface InventoryItem {
  id: number;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  min_threshold: number;
  location: string;
  last_updated: string;
}

// Mock Unit Prices for Financial Valuation
const UNIT_PRICES: Record<string, number> = {
  'Steel Sheets (Grade A)': 2.50,
  'Aluminum Coils': 4.20,
  'Circuit Boards v2': 15.00,
  'Hydraulic Fluid': 8.50,
  'Assembled Engine Block': 1200.00
};

// Mock Daily Depletion Rate for AI Prediction
const DAILY_DEPLETION_RATES: Record<string, number> = {
  'Steel Sheets (Grade A)': 85,
  'Aluminum Coils': 30,
  'Circuit Boards v2': 15,
  'Hydraulic Fluid': 5,
  'Assembled Engine Block': 1
};

// Custom Tooltip for Treemap
const TreemapTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: '#f8fafc' }}>
        <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>{payload[0].payload.name}</p>
        <p style={{ margin: 0, color: '#94a3b8' }}>Volume: {payload[0].value}</p>
      </div>
    );
  }
  return null;
};

// Mock ERP Data
const MOCK_ORDERS = [
  { id: 'ORD-992', client: 'Tesla Inc.', product: 'EV Battery Casings', quantity: 50000, status: 'Active', progress: 68, machine: 'CNC-1' },
  { id: 'ORD-993', client: 'Boeing', product: 'Turbine Blades', quantity: 1500, status: 'Active', progress: 24, machine: 'CNC-2' },
  { id: 'ORD-994', client: 'Toyota', product: 'Engine Blocks', quantity: 12000, status: 'Pending', progress: 0, machine: 'Pending Assignment' },
  { id: 'ORD-995', client: 'Sony', product: 'Circuit Boards v2', quantity: 100000, status: 'Completed', progress: 100, machine: 'Assembly-A' },
];

const MOCK_BOM = [
  { id: 1, product: 'EV Battery Casings', components: [{ name: 'Aluminum Coils', qty: 1.5, unit: 'Tons' }, { name: 'Thermal Paste', qty: 200, unit: 'Liters' }] },
  { id: 2, product: 'Turbine Blades', components: [{ name: 'Steel Sheets (Grade A)', qty: 3, unit: 'Tons' }, { name: 'Ceramic Coating', qty: 50, unit: 'Liters' }] },
  { id: 3, product: 'Engine Blocks', components: [{ name: 'Cast Iron', qty: 5, unit: 'Tons' }, { name: 'Hydraulic Fluid', qty: 100, unit: 'Liters' }] }
];

export const Inventory = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ledger' | 'orders' | 'bom'>('ledger');

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:4000/api/inventory', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setInventory(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to fetch inventory', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInventory();

    // Subscribe to live inventory depletion stream
    const socket = io('http://localhost:4000');
    socket.on('inventory_update', (data: InventoryItem[]) => {
      if (Array.isArray(data)) {
        setInventory(data);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Calculate Total Financial Valuation
  const totalValuation = inventory.reduce((acc, item) => {
    const price = UNIT_PRICES[item.item_name] || 10;
    return acc + (item.quantity * price);
  }, 0);

  // Prepare Treemap Data based on location
  const locationMap: Record<string, number> = {};
  inventory.forEach(item => {
    if (!locationMap[item.location]) locationMap[item.location] = 0;
    locationMap[item.location] += item.quantity;
  });
  const treemapData = Object.keys(locationMap).map(loc => ({
    name: loc,
    size: locationMap[loc],
    fill: loc.includes('A') ? '#3b82f6' : loc.includes('B') ? '#10b981' : loc.includes('Outbound') ? '#f59e0b' : '#8b5cf6'
  }));

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <h1>Enterprise ERP & Supply Chain</h1>
        <p className="subtitle">Real-time capital valuation, manufacturing orders, and bill of materials</p>
      </div>

      <div className="inventory-analytics-grid">
        
        {/* Column 1: Financial & Core KPIs */}
        <div className="kpi-column">
          <div className="stat-card glass-panel">
            <DollarSign size={28} className="text-success" />
            <div className="stat-info">
              <h3>Total Capital Valuation</h3>
              <span>${totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
          
          <div className="stat-card glass-panel">
            <Briefcase size={28} className="text-accent" />
            <div className="stat-info">
              <h3>Live Order Fulfillment</h3>
              <span>92.4% <small style={{ fontSize: '1rem', color: '#94a3b8' }}>On-Time</small></span>
            </div>
          </div>

          <div className="stat-card glass-panel" style={{ border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <Package size={28} className="text-warning" />
            <div className="stat-info">
              <h3>Low Stock Alerts</h3>
              <span className="text-warning">{inventory.filter(i => i.quantity <= i.min_threshold).length}</span>
            </div>
          </div>
        </div>

        {/* Column 2: Warehouse Spatial Distribution */}
        <div className="chart-container-box glass-panel">
          <div className="panel-header">
            <h3><BarChart2 size={18} className="text-accent"/> Spatial Distribution</h3>
          </div>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#94a3b8' }}>Physical stock allocation by warehouse zone</p>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap 
                data={treemapData} 
                dataKey="size" 
                stroke="#0f172a" 
                fill="#3b82f6"
              >
                <Tooltip content={<TreemapTooltip />} />
              </Treemap>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Column 3: AI Predictive Restock Insights */}
        <div className="chart-container-box glass-panel">
          <div className="panel-header">
            <h3>Predictive Restocking</h3>
            <span className="ai-badge"><BrainCircuit size={12} /> AI Insight</span>
          </div>
          
          <div className="predictive-list">
            {inventory.slice(0, 5).map(item => {
              const depletionRate = DAILY_DEPLETION_RATES[item.item_name] || 10;
              const daysLeft = Math.floor(item.quantity / depletionRate);
              const isWarning = daysLeft <= 14;

              return (
                <div className="predictive-item" key={item.id}>
                  <div className="predictive-info">
                    <h4>{item.item_name}</h4>
                    <p>Current: {item.quantity} {item.unit} • Burn: {depletionRate}/day</p>
                  </div>
                  <div className={isWarning ? 'depletion-warning' : 'depletion-safe'}>
                    {daysLeft} Days Left
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ERP Tabs Section */}
      <div className="inventory-table-wrapper glass-panel">
        <div className="erp-tabs">
          <button 
            className={`erp-tab ${activeTab === 'ledger' ? 'active' : ''}`}
            onClick={() => setActiveTab('ledger')}
          >
            <Package size={16} /> Master Stock Ledger
          </button>
          <button 
            className={`erp-tab ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <Briefcase size={16} /> Manufacturing Orders
          </button>
          <button 
            className={`erp-tab ${activeTab === 'bom' ? 'active' : ''}`}
            onClick={() => setActiveTab('bom')}
          >
            <Box size={16} /> Bill of Materials (BOM)
          </button>
        </div>

        <div className="erp-tab-content">
          {activeTab === 'ledger' && (
            <>
              {loading ? (
                <div className="loading-state">Loading inventory data...</div>
              ) : (
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>Category</th>
                      <th>Location</th>
                      <th>Quantity</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map(item => {
                      const isLow = item.quantity <= item.min_threshold;
                      return (
                        <tr key={item.id} className={isLow ? 'row-warning' : ''}>
                          <td className="item-name">{item.item_name}</td>
                          <td><span className="badge category-badge">{item.category}</span></td>
                          <td>{item.location}</td>
                          <td className="quantity-cell">
                            {item.quantity} <span className="unit">{item.unit}</span>
                          </td>
                          <td>
                            {isLow ? (
                              <span className="badge status-low"><AlertTriangle size={12}/> Critical</span>
                            ) : (
                              <span className="badge status-ok">Stable</span>
                            )}
                          </td>
                          <td>
                            <button className="action-btn">
                              <ArrowDownToLine size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </>
          )}

          {activeTab === 'orders' && (
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Client</th>
                  <th>Product Target</th>
                  <th>Assigned Machine</th>
                  <th>Progress</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_ORDERS.map(order => (
                  <tr key={order.id}>
                    <td className="item-name" style={{ color: '#3b82f6' }}>{order.id}</td>
                    <td style={{ fontWeight: 600 }}>{order.client}</td>
                    <td>{order.quantity.toLocaleString()} x {order.product}</td>
                    <td><span className="badge category-badge">{order.machine}</span></td>
                    <td style={{ width: '200px' }}>
                      <div className="progress-bar-bg" style={{ width: '100%', height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                        <div className="progress-bar-fill" style={{ width: `${order.progress}%`, height: '100%', background: order.progress === 100 ? '#10b981' : '#3b82f6' }}></div>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>{order.progress}% Completed</span>
                    </td>
                    <td>
                      <span className={`badge ${order.status === 'Active' ? 'status-ok' : order.status === 'Pending' ? 'status-low' : 'status-completed'}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'bom' && (
            <div className="bom-explorer">
              {MOCK_BOM.map(bom => (
                <div key={bom.id} className="bom-card">
                  <div className="bom-header">
                    <Package size={20} className="text-accent" />
                    <h4>{bom.product}</h4>
                  </div>
                  <div className="bom-components">
                    {bom.components.map((comp, idx) => (
                      <div key={idx} className="bom-component-item">
                        <ChevronRight size={16} className="text-secondary" />
                        <span className="comp-name">{comp.name}</span>
                        <span className="comp-qty">{comp.qty} {comp.unit} / batch</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
