import React from 'react';
import type { Report } from '../types';
import { getTimeAgo, getStatusLabel, getCriticalityLabel } from '../utils';

interface DashboardProps {
  reports: Report[];
  onViewReport: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ reports, onViewReport }) => {
  const total = reports.length;
  const pending = reports.filter((r) => r.status === 'beklemede').length;
  const reviewing = reports.filter((r) => r.status === 'inceleniyor').length;
  const resolved = reports.filter((r) => r.status === 'cozuldu').length;
  const criticalCount = reports.filter((r) => r.criticality === 'kritik').length;

  const recentReports = [...reports]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

  const categories: Record<string, number> = {};
  reports.forEach((r) => {
    categories[r.categoryLabel] = (categories[r.categoryLabel] || 0) + 1;
  });

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-label">Toplam Bildirim</div>
          <div className="stat-number">{total}</div>
        </div>
        <div className="stat-card pending">
          <div className="stat-label">Beklemede</div>
          <div className="stat-number">{pending}</div>
        </div>
        <div className="stat-card reviewing">
          <div className="stat-label">İnceleniyor</div>
          <div className="stat-number">{reviewing}</div>
        </div>
        <div className="stat-card resolved">
          <div className="stat-label">Çözüldü</div>
          <div className="stat-number">{resolved}</div>
        </div>
        <div className="stat-card critical">
          <div className="stat-label">Kritik</div>
          <div className="stat-number">{criticalCount}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-secondary)' }}>
            SON BİLDİRİMLER
          </h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fotoğraf</th>
                  <th>Açıklama</th>
                  <th>Kategori</th>
                  <th>Durum</th>
                  <th>Aciliyet</th>
                  <th>Zaman</th>
                </tr>
              </thead>
              <tbody>
                {recentReports.map((r) => {
                  let badgeDotColor = 'var(--low)';
                  if (r.criticality === 'kritik') badgeDotColor = 'var(--critical)';
                  else if (r.criticality === 'yuksek') badgeDotColor = 'var(--high)';
                  else if (r.criticality === 'orta') badgeDotColor = 'var(--medium)';

                  return (
                    <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => onViewReport(r.id)}>
                      <td>
                        <img 
                          src={r.image || ''} 
                          className="report-image" 
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} 
                        />
                      </td>
                      <td>
                        <div className="report-desc">{r.description}</div>
                        <div className="report-address">📍 {r.address}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '12px' }}>
                          {r.categoryLabel}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${r.status}`}>
                          {getStatusLabel(r.status)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${r.criticality}`}>
                          <span className="badge-dot" style={{ background: badgeDotColor }}></span>{' '}
                          {getCriticalityLabel(r.criticality)}
                        </span>
                      </td>
                      <td className="time-cell">{getTimeAgo(r.timestamp)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-secondary)' }}>
            KATEGORİ DAĞILIMI
          </h3>
          <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: '20px', boxShadow: '0 1px 4px var(--shadow)' }}>
            {Object.entries(categories).map(([cat, count]) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={cat} style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{cat}</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div style={{ background: 'var(--bg)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ background: 'var(--primary)', height: '100%', width: `${pct}%`, borderRadius: '4px', transition: 'width 0.3s' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};
