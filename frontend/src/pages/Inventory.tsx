import { useEffect, useState } from 'react';
import { Package, AlertTriangle, ArrowDownToLine } from 'lucide-react';
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
          setInventory(data);
        }
      } catch (err) {
        console.error('Failed to fetch inventory', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInventory();
  }, []);

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <h1>Inventory Management</h1>
        <p className="subtitle">Real-time stock levels and warehouse locations</p>
      </div>

      <div className="inventory-stats grid">
        <div className="stat-card glass-panel">
          <Package size={24} className="text-accent" />
          <div className="stat-info">
            <h3>Total Items</h3>
            <span>{inventory.length}</span>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <AlertTriangle size={24} className="text-warning" />
          <div className="stat-info">
            <h3>Low Stock Alerts</h3>
            <span>{inventory.filter(i => i.quantity <= i.min_threshold).length}</span>
          </div>
        </div>
      </div>

      <div className="inventory-table-wrapper glass-panel">
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
                        <span className="badge status-low"><AlertTriangle size={12}/> Low Stock</span>
                      ) : (
                        <span className="badge status-ok">In Stock</span>
                      )}
                    </td>
                    <td>
                      <button className="icon-btn action-btn">
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
