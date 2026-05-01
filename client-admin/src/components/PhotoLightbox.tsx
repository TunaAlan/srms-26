import { useState } from 'react';

interface PhotoLightboxProps {
  src: string;
  alt?: string;
}

export function PhotoLightbox({ src, alt = 'rapor görseli' }: PhotoLightboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        style={{ position: 'relative', cursor: 'zoom-in', marginBottom: '16px' }}
        onClick={() => setOpen(true)}
      >
        <img
          src={src}
          alt={alt}
          className="modal-image"
          style={{ marginBottom: 0, display: 'block' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0)',
          borderRadius: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.15s',
        }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.25)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0)'; }}
        >
          <span style={{
            fontSize: '28px', opacity: 0,
            transition: 'opacity 0.15s',
            pointerEvents: 'none',
            filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))',
          }}
            className="lightbox-icon"
          >🔍</span>
        </div>
      </div>

      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setOpen(false)}
        >
          <button
            onClick={() => setOpen(false)}
            style={{
              position: 'absolute', top: '20px', right: '24px',
              background: 'rgba(255,255,255,0.15)', border: 'none',
              color: '#fff', fontSize: '22px', width: '40px', height: '40px',
              borderRadius: '50%', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(4px)',
            }}
          >✕</button>
          <img
            src={src}
            alt={alt}
            style={{
              maxWidth: '92vw', maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
