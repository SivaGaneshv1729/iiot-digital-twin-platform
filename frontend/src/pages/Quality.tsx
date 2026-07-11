import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Target, ScanEye } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import './Quality.css';

interface QualityInspection {
  id: number;
  batch_number: string;
  machine_name: string;
  product_name: string;
  status: string;
  defect_reason: string | null;
  inspector: string;
  inspection_time: string;
}

const COLORS = ['#10b981', '#ef4444'];

export const Quality = () => {
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [stats, setStats] = useState({ passed: 0, failed: 0, defect_rate: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQualityData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        const [inspectionsRes, statsRes] = await Promise.all([
          fetch('http://localhost:4000/api/quality', { headers }),
          fetch('http://localhost:4000/api/quality/stats', { headers })
        ]);

        if (inspectionsRes.ok && statsRes.ok) {
          setInspections(await inspectionsRes.json());
          setStats(await statsRes.json());
        }
      } catch (err) {
        console.error('Failed to fetch quality data', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchQualityData();
  }, []);

  const chartData = [
    { name: 'Passed', value: stats.passed },
    { name: 'Failed', value: stats.failed }
  ];

  return (
    <div className="quality-container">
      <div className="quality-header">
        <h1>Quality Assurance</h1>
        <p className="subtitle">Real-time defect tracking and computer vision inspection</p>
      </div>

      <div className="quality-top-grid">
        {/* CV Mockup Panel */}
        <div className="cv-mockup-panel glass-panel">
          <div className="panel-header">
            <h3><ScanEye size={18} /> Live Assembly Vision</h3>
            <span className="live-indicator">LIVE</span>
          </div>
          <div className="camera-feed">
            <div className="cv-overlay">
              <div className="bounding-box valid"></div>
              <div className="bounding-box invalid">
                <span className="defect-label">Micro-fracture 89%</span>
              </div>
              <div className="scanning-line"></div>
            </div>
            <div className="feed-info">
              <span>Cam: L-102</span>
              <span>Model: YOLO-v8</span>
            </div>
          </div>
        </div>

        {/* Stats Panel */}
        <div className="quality-stats-panel glass-panel">
          <div className="stat-card">
            <Target size={24} className="text-accent" />
            <div>
              <h3>Defect Rate</h3>
              <span className="stat-value">{stats.defect_rate}%</span>
            </div>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#13141f', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              <div className="legend-item"><span className="dot pass"></span> Passed ({stats.passed})</div>
              <div className="legend-item"><span className="dot fail"></span> Failed ({stats.failed})</div>
            </div>
          </div>
        </div>
      </div>

      {/* Inspections Table */}
      <div className="inspections-table-wrapper glass-panel">
        <div className="panel-header">
          <h3>Recent Inspections</h3>
        </div>
        {loading ? (
          <div className="loading-state">Loading inspections...</div>
        ) : (
          <table className="quality-table">
            <thead>
              <tr>
                <th>Batch</th>
                <th>Product</th>
                <th>Machine</th>
                <th>Status</th>
                <th>Reason</th>
                <th>Inspector</th>
              </tr>
            </thead>
            <tbody>
              {inspections.map(item => (
                <tr key={item.id}>
                  <td className="batch-number">{item.batch_number}</td>
                  <td>{item.product_name}</td>
                  <td>{item.machine_name}</td>
                  <td>
                    {item.status === 'Pass' ? (
                      <span className="badge status-pass"><ShieldCheck size={12}/> Pass</span>
                    ) : (
                      <span className="badge status-fail"><ShieldAlert size={12}/> Fail</span>
                    )}
                  </td>
                  <td className="defect-reason">{item.defect_reason || '-'}</td>
                  <td>{item.inspector}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
