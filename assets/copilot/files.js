window.onload = init;

function init() {
  renderNav();
  loadIframe();
  initMqtt();
}

function loadIframe() {
  let uri = 'http://' + window.location.hostname + ':8000';
  let iframe = document.getElementById('files-iframe');
  if (iframe) {
    iframe.src = uri;
  }
}