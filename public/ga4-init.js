(() => {
  try {
    const measurementId = document.currentScript?.getAttribute('data-measurement-id') || '';
    if (!measurementId) return;

    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }

    window.gtag = window.gtag || gtag;

    // GA4 Consent Mode v2: set default-denied BEFORE gtag('js') / gtag('config').
    // The banner's accept handler later calls gtag('consent','update',...) to
    // grant analytics_storage. Cookieless pings flow throughout for modeling.
    // wait_for_update gives the banner a brief window to fire its update
    // before gtag commits to the default-denied state.
    window.gtag('consent', 'default', {
      ad_storage: 'denied',
      analytics_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      wait_for_update: 500,
    });

    window.gtag('js', new Date());
    window.gtag('config', measurementId, { anonymize_ip: true });
  } catch {
    // Avoid breaking page execution if analytics bootstrap fails.
  }
})();

