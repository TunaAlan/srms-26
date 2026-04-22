import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import type { Report } from '../types';
import { getStatusLabel, getCriticalityLabel } from '../utils';

interface MapViewProps {
  reports: Report[];
  focusReport?: Report | null;
  onReportClick?: (report: Report) => void;
}

const statusColors: Record<string, string> = {
  pending:     '#E8A317',
  in_progress: '#0288D1',
  resolved:    '#0D9E4F',
  rejected:    '#D32F2F',
};

const critColors: Record<string, string> = {
  kritik: '#D32F2F',
  yuksek: '#E8651A',
  orta: '#E8A317',
  dusuk: '#0D9E4F',
};

// Inner component that can use useMap() hook
const FocusController: React.FC<{ report: Report | null | undefined }> = ({ report }) => {
  const map = useMap();
  useEffect(() => {
    if (report && report.latitude && report.longitude) {
      map.flyTo([report.latitude, report.longitude], 16, { duration: 1.2 });
    }
  }, [report, map]);
  return null;
};

export const MapView: React.FC<MapViewProps> = ({ reports, focusReport, onReportClick }) => {
  return (
    <div className="map-wrapper">
      <MapContainer 
        center={[39.9334, 32.8597]} 
        zoom={12} 
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FocusController report={focusReport} />

        <MarkerClusterGroup
          chunkedLoading
          showCoverageOnHover={false}
          maxClusterRadius={60}
          spiderfyOnMaxZoom={true}
          spiderfyDistanceMultiplier={1.8}
          disableClusteringAtZoom={17}
          iconCreateFunction={(cluster: { getChildCount: () => number }) => {
            const count = cluster.getChildCount();
            const size = count < 5 ? 36 : count < 15 ? 44 : 52;
            return L.divIcon({
              html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#005BAA;border:3px solid white;box-shadow:0 2px 8px rgba(0,91,170,0.4);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:${size < 44 ? 13 : 15}px;font-family:'Plus Jakarta Sans',sans-serif;">${count}</div>`,
              iconSize: [size, size],
              iconAnchor: [size / 2, size / 2],
              className: '',
            });
          }}
        >
          {reports.map((r) => {
            if (!r.latitude && !r.longitude) return null;
            const color = statusColors[r.status] || '#8E95A8';
            const critColor = critColors[r.criticality] || '#8E95A8';
            
            const isFocused = focusReport?.id === r.id;
            const icon = L.divIcon({
              html: `<div style="width:${isFocused ? 24 : 18}px;height:${isFocused ? 24 : 18}px;border-radius:50%;background:${color};border:${isFocused ? '4px solid #005BAA' : '3px solid white'};box-shadow:0 2px 6px rgba(0,0,0,0.3);transition:all 0.3s;"></div>`,
              iconSize: [isFocused ? 32 : 24, isFocused ? 32 : 24],
              iconAnchor: [isFocused ? 16 : 12, isFocused ? 16 : 12],
              className: '',
            });

            return (
              <Marker key={r.id} position={[r.latitude, r.longitude]} icon={icon}>
                <Popup>
                  <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", minWidth: '200px' }}>
                    {r.image && (
                      <img 
                        src={r.image} 
                        style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '6px', marginBottom: '8px' }} 
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} 
                      />
                    )}
                    <div style={{ fontWeight: 700, color: '#005BAA', fontSize: '12px', textTransform: 'uppercase', marginBottom: '4px' }}>
                      {r.categoryLabel}
                    </div>
                    <div style={{ fontSize: '13px', marginBottom: '6px' }}>
                      {r.description.substring(0, 80)}...
                    </div>
                    <div style={{ fontSize: '11px', color: '#8E95A8' }}>
                      {r.address && <span>📍 {r.address}</span>}
                      {r.aiUnit && <span style={{ marginLeft: r.address ? '8px' : '0' }}>🏢 {r.aiUnit}</span>}
                    </div>
                    <div style={{ marginTop: '6px', display: 'flex', gap: '4px' }}>
                      <span style={{
                        background: r.status === 'pending' ? '#FFF8E6' : r.status === 'in_progress' ? '#E3F2FD' : r.status === 'rejected' ? '#FDEDED' : r.status === 'resolved' ? '#E6F7ED' : '#F5F5F5',
                        color: r.status === 'pending' ? '#E8A317' : r.status === 'in_progress' ? '#0288D1' : r.status === 'rejected' ? '#D32F2F' : r.status === 'resolved' ? '#0D9E4F' : '#8E95A8',
                        padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700
                      }}>
                        {getStatusLabel(r.status)}
                      </span>
                      <span style={{
                        background: `${critColor}20`,
                        color: critColor,
                        padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700
                      }}>
                        {getCriticalityLabel(r.criticality)}
                      </span>
                    </div>
                    {onReportClick && (
                      <button
                        onClick={() => onReportClick(r)}
                        style={{
                          marginTop: '8px', width: '100%', padding: '5px 0',
                          background: '#005BAA', color: 'white', border: 'none',
                          borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        👁️ Raporu Görüntüle
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
};
