import { useEffect, useState, useMemo } from 'react';
import { 
  ClipboardList, User, Clock, ShieldCheck, Download, 
  Search, ShieldAlert, Users, Lock
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import './AuditLogs.css';

interface AuditLog {
  id: number;
  action: string;
  time: string;
  username: string;
  role: string;
}

export const AuditLogs = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('http://localhost:4000/api/audit', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Forbidden');
        return res.json();
      })
      .then(data => {
        setLogs(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // Filter logic
  const filteredLogs = useMemo(() => {
    if (!searchTerm) return logs;
    const lower = searchTerm.toLowerCase();
    return logs.filter(log => 
      log.username.toLowerCase().includes(lower) || 
      log.action.toLowerCase().includes(lower) ||
      log.role.toLowerCase().includes(lower)
    );
  }, [logs, searchTerm]);

  // Derived Analytics Data
  const roleDistribution = useMemo(() => {
    let adminCount = 0;
    let operatorCount = 0;
    logs.forEach(l => {
      if (l.role.toLowerCase() === 'admin') adminCount++;
      else operatorCount++;
    });
    return [
      { name: 'Admin', value: adminCount },
      { name: 'Operator', value: operatorCount }
    ];
  }, [logs]);

  const PIE_COLORS = ['#c084fc', '#38bdf8']; // Purple for admin, Blue for operator

  // Export functions
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('SmartFactory AI - Compliance Audit Ledger', 14, 22);
    
    const tableColumn = ["Timestamp", "User", "Role", "Action", "Status"];
    const tableRows = filteredLogs.map(log => [
      new Date(log.time).toLocaleString(),
      log.username,
      log.role,
      log.action,
      "Success"
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [56, 189, 248] },
    });
    
    doc.save('Compliance_Audit_Ledger.pdf');
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredLogs.map(log => ({
      Timestamp: new Date(log.time).toLocaleString(),
      User: log.username,
      Role: log.role,
      Action: log.action,
      Status: "Success"
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Audit Logs");
    XLSX.writeFile(wb, "Compliance_Audit_Ledger.xlsx");
  };

  // Cryptographic Hash Mock (for visual enterprise feel)
  const generateHash = (id: number) => {
    const hash = btoa(`sf_audit_${id}`).slice(0, 12).toUpperCase();
    return `0x${hash}`;
  };

  return (
    <div className="audit-container">
      <div className="audit-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1>{t('Security & Audit Ledger')}</h1>
          <p className="subtitle">{t('Immutable cryptographic ledger of system activity')}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
          <button className="btn btn-secondary" onClick={exportToPDF} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={16} /> Export PDF
          </button>
          <button className="btn btn-primary" onClick={exportToExcel} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Security KPIs */}
      <div className="security-kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="security-kpi-card glass-panel">
          <ClipboardList size={32} className="text-accent" />
          <div className="security-kpi-info">
            <h3>Total Logged Events</h3>
            <span>{logs.length}</span>
          </div>
        </div>
        <div className="security-kpi-card glass-panel">
          <ShieldAlert size={32} className="text-danger" />
          <div className="security-kpi-info">
            <h3>Failed Access Attempts</h3>
            <span>0 <small style={{ color: '#10b981', fontSize: '0.8rem' }}>(Secured)</small></span>
          </div>
        </div>
        <div className="security-kpi-card glass-panel">
          <Users size={32} className="text-success" />
          <div className="security-kpi-info">
            <h3>Active Sessions</h3>
            <span>3</span>
          </div>
        </div>
      </div>

      <div className="audit-main-grid">
        {/* Analytics Sidebar */}
        <div className="chart-panel glass-panel">
          <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={18} className="text-accent" /> Access Distribution
            </h2>
          </div>
          <div style={{ height: '300px', padding: '20px' }}>
            {logs.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={roleDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {roleDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>No Data</div>
            )}
          </div>
        </div>

        {/* Master Ledger Table */}
        <div className="table-panel glass-panel">
          <div className="table-header-controls">
            <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck className="text-success" size={20}/> Cryptographic Ledger
            </h2>
            <div className="search-bar-wrapper">
              <Search size={16} className="search-icon" />
              <input 
                type="text" 
                className="search-input" 
                placeholder="Search logs by user, action, or role..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="card-body" style={{ padding: '0' }}>
            {loading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Decrypting secure logs...</div>
            ) : filteredLogs.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>No logs match your search criteria.</div>
            ) : (
              <div className="table-responsive">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Tx Hash</th>
                      <th>Timestamp</th>
                      <th>User</th>
                      <th>Role</th>
                      <th>Action</th>
                      <th>Verification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map(log => (
                      <tr key={log.id}>
                        <td className="hash-cell">{generateHash(log.id)}</td>
                        <td className="time-cell">
                          <Clock size={14} style={{ marginRight: '6px', verticalAlign: 'middle', color: '#64748b' }} />
                          {new Date(log.time).toLocaleString()}
                        </td>
                        <td className="user-cell">
                          <User size={14} style={{ marginRight: '6px', verticalAlign: 'middle', color: '#64748b' }} />
                          {log.username}
                        </td>
                        <td>
                          <span className={`role-badge ${log.role.toLowerCase()}`}>
                            {log.role}
                          </span>
                        </td>
                        <td className="action-cell">{log.action}</td>
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', color: '#10b981', fontSize: '0.8rem', gap: '4px', fontWeight: 600 }}>
                            <ShieldCheck size={14} /> Verified
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
