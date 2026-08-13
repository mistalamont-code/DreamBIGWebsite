(function () {
  var productionHosts = ['lifeafterhighschoolbook.com', 'www.lifeafterhighschoolbook.com'];
  if (productionHosts.indexOf(location.hostname.toLowerCase()) === -1) return;

  window.va = window.va || function () {
    (window.vaq = window.vaq || []).push(arguments);
  };

  var script = document.createElement('script');
  script.defer = true;
  script.src = '/_vercel/insights/script.js';
  document.head.appendChild(script);
})();
