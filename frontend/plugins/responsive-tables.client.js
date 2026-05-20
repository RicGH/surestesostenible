export default defineNuxtPlugin((nuxtApp) => {
  function aplicarLabels(table) {
    const headers = Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent.trim());
    if (!headers.length) return;
    table.querySelectorAll('tbody tr').forEach((tr) => {
      const tds = tr.querySelectorAll('td');
      if (tds.length === 1 && tds[0].colSpan > 1) return;
      tds.forEach((td, i) => {
        const label = headers[i];
        if (label && td.getAttribute('data-label') !== label) {
          td.setAttribute('data-label', label);
        }
      });
    });
  }

  function escanear() {
    document.querySelectorAll('table.table').forEach(aplicarLabels);
  }

  let pendiente = false;
  function programarEscaneo() {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => {
      pendiente = false;
      escanear();
    });
  }

  nuxtApp.hook('app:mounted', () => {
    escanear();
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'childList' && (m.addedNodes.length || m.removedNodes.length)) {
          if (Array.from(m.addedNodes).some((n) => n.nodeType === 1) ||
              (m.target.closest && m.target.closest('table.table'))) {
            programarEscaneo();
            return;
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });

  nuxtApp.hook('page:finish', () => {
    setTimeout(escanear, 50);
  });
});
