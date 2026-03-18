(() => {
  try {
    const measurementId = document.currentScript?.getAttribute('data-measurement-id') || '';
    if (!measurementId) return;

    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }

    window.gtag = window.gtag || gtag;
    window.gtag('js', new Date());
    window.gtag('config', measurementId, { anonymize_ip: true });
  } catch {
    // Avoid breaking page execution if analytics bootstrap fails.
  }
})();

