/**
 * Manajer Koneksi Server-Sent Events (SSE) dengan Reconnect Otomatis
 */

let eventSource = null;
const listeners = new Set();

export function subscribeToEvents(callback) {
  listeners.add(callback);
  ensureConnection();

  return () => {
    listeners.delete(callback);
    if (listeners.size === 0 && eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
}

function ensureConnection() {
  if (eventSource && eventSource.readyState !== EventSource.CLOSED) {
    return;
  }

  try {
    eventSource = new EventSource('/api/events');

    eventSource.onopen = () => {
      notify({ type: 'status', connected: true });
    };

    eventSource.addEventListener('connected', (e) => {
      try {
        const data = JSON.parse(e.data);
        notify({ type: 'connected', data });
      } catch (_) {}
    });

    eventSource.addEventListener('qna_update', (e) => {
      try {
        const data = JSON.parse(e.data);
        notify({ type: 'qna_update', data });
      } catch (_) {}
    });

    eventSource.addEventListener('form_update', (e) => {
      try {
        const data = JSON.parse(e.data);
        notify({ type: 'form_update', data });
      } catch (_) {}
    });

    eventSource.addEventListener('session_update', (e) => {
      try {
        const data = JSON.parse(e.data);
        notify({ type: 'session_update', data });
      } catch (_) {}
    });

    eventSource.onerror = () => {
      notify({ type: 'status', connected: false });
    };
  } catch (err) {
    console.error('Error saat inisialisasi SSE:', err);
  }
}

function notify(payload) {
  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (err) {
      console.error('Error in SSE listener callback:', err);
    }
  });
}

