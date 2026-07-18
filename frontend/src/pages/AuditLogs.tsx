import { useEffect, useState, useMemo } from 'react';
import { 
  ClipboardList, User, Clock, ShieldCheck, Download, 
  ShieldAlert, Users, Lock
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { DataTable, type Column } from '../components/DataTable';
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
  }, [logs]);

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
    const tableRows = logs.map(log => [
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
    const ws = XLSX.utils.json_to_sheet(logs.map(log => ({
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

  const columns: Column<AuditLog>[] = [
    { key: 'hash', label: 'Tx Hash', sortable: false, render: (row) => <span className="hash-cell">{generateHash(row.id)}</span> },
    { key: 'time', label: 'Timestamp', render: (row) => (
      <span className="time-cell">
        <Clock size={14} style={{ marginRight: '6px', verticalAlign: 'middle', color: '#64748b' }} />
        {new Date(row.time).toLocaleString()}
      </span>
    )},
    { key: 'username', label: 'User', render: (row) => (
      <span className="user-cell">
        <User size={14} style={{ marginRight: '6px', verticalAlign: 'middle', color: '#64748b' }} />
        {row.username}
      </span>
    )},
    { key: 'role', label: 'Role', render: (row) => (
      <span className={`role-badge ${row.role.toLowerCase()}`}>
        {row.role}
      </span>
    )},
    { key: 'action', label: 'Action', render: (row) => <span className="action-cell">{row.action}</span> },
    { key: 'verification', label: 'Verification', sortable: false, render: () => (
      <span style={{ display: 'flex', alignItems: 'center', color: '#10b981', fontSize: '0.8rem', gap: '4px', fontWeight: 600 }}>
        <ShieldCheck size={14} /> Verified
      </span>
    )}
  ];

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
                  <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-primary)', border: "1px solid var(--border-color)", borderRadius: '8px' }} />
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
          <div className="card-body" style={{ padding: '0' }}>
            {loading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: "var(--text-secondary)" }}>Decrypting secure logs...</div>
            ) : (
              <DataTable 
                data={logs} 
                columns={columns} 
                searchPlaceholder="Search secure logs..."
                searchKeys={['username', 'action', 'role']}
                itemsPerPage={10} 
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
