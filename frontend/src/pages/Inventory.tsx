import { useEffect, useState } from 'react';
import { 
  Package, AlertTriangle, ArrowDownToLine, 
  DollarSign, RefreshCcw, BrainCircuit, BarChart2 
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

export const Inventory = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

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
        <h1>Supply Chain & Logistics</h1>
        <p className="subtitle">Real-time valuation, stock distribution, and AI restock predictions</p>
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
            <RefreshCcw size={28} className="text-accent" />
            <div className="stat-info">
              <h3>Inventory Turnover Rate</h3>
              <span>12.4x <small style={{ fontSize: '1rem', color: '#94a3b8' }}>/ yr</small></span>
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

      {/* Inventory Master Ledger Table */}
      <div className="inventory-table-wrapper glass-panel">
        <div className="panel-header" style={{ marginBottom: '16px' }}>
          <h3>Master Stock Ledger</h3>
        </div>
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
      </div>
    </div>
  );
};
