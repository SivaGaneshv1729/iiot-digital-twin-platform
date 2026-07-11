import { useEffect, useState } from 'react';
import { ClipboardList, User, Clock, CheckCircle, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import './AuditLogs.css';

/**
 * @interface AuditLog
 * @description Defines the structure of an immutable compliance record.
 * Used for tracking user actions within the factory digital twin.
 */
interface AuditLog {
  id: number;
  action: string;
  time: string;
  username: string;
  role: string;
}

/**
 * @component AuditLogs
 * @description The central Compliance and Auditing Ledger.
 * Provides a read-only view of historical administrative actions with export capabilities
 * for regulatory compliance.
 */
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
        if (!res.ok) {
          throw new Error('Forbidden');
        }
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

  return (
    <div className="audit-container">
      <div className="audit-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>{t('Compliance Audit Logs')}</h1>
          <p className="subtitle">{t('Immutable ledger of all administrative actions')}</p>
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

      <div className="audit-card glass-panel">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <ClipboardList className="text-accent" />
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>System Activity</h2>
        </div>
        
        <div className="card-body" style={{ padding: '0' }}>
          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Loading secure logs...</div>
          ) : logs.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>No administrative actions recorded yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Role</th>
                    <th>Action</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td className="time-cell">
                        <Clock size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                        {new Date(log.time).toLocaleString()}
                      </td>
                      <td className="user-cell">
                        <User size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                        {log.username}
                      </td>
                      <td>
                        <span className={`role-badge ${log.role.toLowerCase()}`}>
                          {log.role}
                        </span>
                      </td>
                      <td className="action-cell">{log.action}</td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', color: '#10b981', fontSize: '0.8rem', gap: '4px' }}>
                          <CheckCircle size={14} /> Success
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
  );
};
