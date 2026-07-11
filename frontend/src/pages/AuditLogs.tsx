import { useEffect, useState } from 'react';
import { ClipboardList, User, Clock, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
        if (!res.ok) {
          throw new Error('Forbidden');
        }
        return res.json();
      })
      .then(data => {
        setLogs(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="audit-container">
      <div className="audit-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1>{t('Compliance Audit Logs')}</h1>
          <p className="subtitle">{t('Immutable ledger of all administrative actions')}</p>
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
