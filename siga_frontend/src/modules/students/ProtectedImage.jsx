import { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../../core/api/client';

export function ProtectedImage({ src, alt = '', className, fallback = null, lazy = false }) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(
    () => !lazy || typeof IntersectionObserver === 'undefined'
  );
  const holderRef = useRef(null);

  useEffect(() => {
    if (!lazy || visible) return;
    const node = holderRef.current;
    if (!node) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some(e => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [lazy, visible]);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setObjectUrl(null);

    if (!src || !visible) return;

    fetch(`${API_BASE}${src}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('No disponible');
        return res.blob();
      })
      .then(blob => {
        if (cancelled) return;
        setObjectUrl(URL.createObjectURL(blob));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [src, visible]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const ready = src && !failed && objectUrl;
  const content = ready
    ? <img
        src={objectUrl}
        alt={alt}
        className={lazy ? 'w-full h-full object-cover' : className}
      />
    : fallback;

  if (!lazy) return content;

  return (
    <span ref={holderRef} className={`block ${className}`}>
      {content}
    </span>
  );
}
