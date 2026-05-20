export const useApi = () => {
  const config = useRuntimeConfig();
  const auth = useAuth();
  const router = useRouter();

  function buildHeaders(opts) {
    const headers = { ...(opts.headers || {}) };
    if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
    if (!(opts.body instanceof FormData) && opts.body) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  }

  async function request(path, opts = {}) {
    const res = await fetch(`${config.public.apiBase}${path}`, {
      ...opts,
      headers: buildHeaders(opts),
      body: opts.body instanceof FormData
        ? opts.body
        : opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (res.status === 401) {
      auth.logout();
      router.push('/login');
      try { useToast().warning('Sesión expirada', 'Inicia sesión de nuevo para continuar.'); } catch {}
      throw new Error('Sesión expirada');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    return data;
  }

  async function download(path, filename) {
    const res = await fetch(`${config.public.apiBase}${path}`, { headers: buildHeaders({}) });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'archivo';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function viewBlob(path) {
    const res = await fetch(`${config.public.apiBase}${path}`, { headers: buildHeaders({}) });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    return { url, mime: blob.type, blob };
  }

  function uploadWithProgress(path, formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${config.public.apiBase}${path}`);
      if (auth.token) xhr.setRequestHeader('Authorization', `Bearer ${auth.token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && typeof onProgress === 'function') {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        let data = {};
        try { data = JSON.parse(xhr.responseText || '{}'); } catch {}
        if (xhr.status === 401) {
          auth.logout();
          router.push('/login');
          try { useToast().warning('Sesión expirada', 'Inicia sesión de nuevo para continuar.'); } catch {}
          reject(new Error('Sesión expirada'));
          return;
        }
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error(data.error || `Error ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error('Error de red'));
      xhr.send(formData);
    });
  }

  return {
    get: (p) => request(p),
    post: (p, body) => request(p, { method: 'POST', body }),
    put: (p, body) => request(p, { method: 'PUT', body }),
    del: (p) => request(p, { method: 'DELETE' }),
    upload: (p, formData) => request(p, { method: 'POST', body: formData }),
    uploadWithProgress,
    download,
    viewBlob,
  };
};
