import { useEffect, useState } from 'react';
import { 
  ShieldCheck, ShieldAlert, Target, ScanEye, Download, BadgeCheck
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import './Quality.css';

/**
 * @interface QualityInspection
 */
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

const PIE_COLORS = ['#10b981', '#ef4444'];

// Mock Analytics Data for Enterprise Expansion
const defectTypeData = [
  { name: 'Micro-fracture', count: 45 },
  { name: 'Alignment', count: 30 },
  { name: 'Scratch', count: 25 },
  { name: 'Dimensional', count: 15 },
  { name: 'Paint Flaw', count: 10 },
];

const qualityTrendData = [
  { day: 'Mon', defects: 12, fpy: 94 },
  { day: 'Tue', defects: 15, fpy: 92 },
  { day: 'Wed', defects: 8, fpy: 96 },
  { day: 'Thu', defects: 5, fpy: 98 },
  { day: 'Fri', defects: 18, fpy: 89 },
  { day: 'Sat', defects: 10, fpy: 95 },
  { day: 'Sun', defects: 7, fpy: 97 },
];

/**
 * @component Quality
 * @description Expanded Enterprise Quality Assurance Dashboard.
 */
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
          const inspData = await inspectionsRes.json();
          setInspections(Array.isArray(inspData) ? inspData : []);
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

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('SmartFactory AI - Quality Assurance Report', 14, 22);
    
    const tableColumn = ["Batch", "Product", "Machine", "Status", "Reason", "Inspector"];
    const tableRows = inspections.map(item => [
      item.batch_number,
      item.product_name,
      item.machine_name,
      item.status,
      item.defect_reason || '-',
      item.inspector
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [56, 189, 248] },
    });
    
    doc.save('Quality_Assurance_Report.pdf');
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(inspections.map(item => ({
      Batch: item.batch_number,
      Product: item.product_name,
      Machine: item.machine_name,
      Status: item.status,
      Reason: item.defect_reason || '-',
      Inspector: item.inspector,
      Time: new Date(item.inspection_time).toLocaleString()
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Quality Inspections");
    XLSX.writeFile(wb, "Quality_Assurance_Report.xlsx");
  };

  const pieData = [
    { name: 'Passed', value: stats.passed },
    { name: 'Failed', value: stats.failed }
  ];

  // Derive First Pass Yield (FPY) from defect rate
  const fpy = stats.defect_rate ? (100 - stats.defect_rate).toFixed(1) : '100.0';

  return (
    <div className="quality-container">
      <div className="quality-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Quality Assurance Analytics</h1>
          <p className="subtitle">Enterprise defect tracking, CV inspection, and yield analytics</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={exportToPDF} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={16} /> PDF
          </button>
          <button className="btn btn-primary" onClick={exportToExcel} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={16} /> Excel
          </button>
        </div>
      </div>

      <div className="quality-analytics-grid">
        
        {/* CV Mockup Panel (Left Column) */}
        <div className="cv-mockup-panel glass-panel">
          <div className="panel-header">
            <h3><ScanEye size={18} className="text-accent" /> Live Assembly Vision</h3>
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

        {/* Top KPI Row */}
        <div className="quality-kpi-row">
          <div className="stat-card glass-panel">
            <Target size={28} className="text-danger" />
            <div>
              <div className="stat-label">Total Defect Rate</div>
              <div className="stat-value">{stats.defect_rate}%</div>
            </div>
          </div>
          
          <div className="stat-card glass-panel">
            <BadgeCheck size={28} className="text-success" />
            <div>
              <div className="stat-label">First Pass Yield (FPY)</div>
              <div className="stat-value">{fpy}%</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="stat-label" style={{ alignSelf: 'flex-start' }}>Inspection Breakdown</div>
            <div className="chart-wrapper-small">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={5} dataKey="value">
                    {pieData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-legend" style={{ marginTop: 0 }}>
              <div className="legend-item"><span className="dot pass"></span> Pass</div>
              <div className="legend-item"><span className="dot fail"></span> Fail</div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="quality-charts-row">
          
          {/* Defect Type Bar Chart */}
          <div className="chart-container-box glass-panel">
            <div className="panel-header">
              <h3>Defect Categorization</h3>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={defectTypeData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" tick={{fill: '#64748b', fontSize: 11}} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" tick={{fill: '#64748b', fontSize: 11}} width={90} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                  <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={16}>
                    {defectTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#f59e0b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 7-Day Trend Area Chart */}
          <div className="chart-container-box glass-panel">
            <div className="panel-header">
              <h3>7-Day Quality Trend (FPY %)</h3>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={qualityTrendData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFpy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" tick={{fill: '#64748b', fontSize: 11}} />
                  <YAxis domain={[80, 100]} stroke="#64748b" tick={{fill: '#64748b', fontSize: 11}} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="fpy" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorFpy)" name="FPY (%)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </div>

      {/* Inspections Table */}
      <div className="inspections-table-wrapper glass-panel">
        <div className="panel-header" style={{ marginBottom: '16px' }}>
          <h3>Recent Inspection Ledger</h3>
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
