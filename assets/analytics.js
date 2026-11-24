// Configured by the server; empty IDs never load third-party scripts.
(() => {
  'use strict';
  if (/^\/(admin|api)(\/|$)/.test(window.location.pathname)) return;
  const config = document.currentScript?.dataset;
  if (!config || window.laveliyaAnalyticsLoaded) return;
  window.laveliyaAnalyticsLoaded = true;
  const load = src => {
    const script = document.createElement('script');
    script.async = true;
    script.src = src;
    document.head.append(script);
  };
  if (/^G-[A-Z0-9]{4,20}$/.test(config.google || '')) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', config.google);
    load('https://www.googletagmanager.com/gtag/js?id=' + config.google);
  }
  if (/^[1-9][0-9]{0,11}$/.test(config.yandex || '')) {
    window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
    window.ym.l = Date.now();
    window.ym(Number(config.yandex), 'init', {
      clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false
    });
    load('https://mc.yandex.ru/metrika/tag.js');
  }
})();
