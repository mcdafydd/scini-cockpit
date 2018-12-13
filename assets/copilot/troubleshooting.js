window.onload = init;

function init() {
  renderNav();
  initMqtt();
  initListeners();

  getData();

  let ua = navigator.appVersion.match(/Chrome\/.*\ /);
  let browser = document.getElementById('browser');
  if (ua !== null) {
    browser.style = 'color:greenyellow;';
    browser.innerHTML = ua[0] + '.';
  } else {
    browser.style = 'color:red;';
    browser.innerHTML = 'something else. Fix this first!';
  }
}

function initListeners() {
  const buttons = document.getElementsByClassName('video-restart');
  for (let i=0; i<buttons.length; i++) {
    buttons[i].addEventListener('click', () => {
      console.log('sending video restart');
      let topic = 'video/restart';
      mqttWorker.port.postMessage({topic: topic, payload: '1'});
    }, false);
  }
}

function getData() {
  var xhr = new XMLHttpRequest();

  xhr.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      let obj = JSON.parse(this.responseText);
      createLocTable(obj.locations);
      createPro4Table(obj.pro4);
    }
  }
  xhr.open('GET', 'data.json', true);
  xhr.setRequestHeader('Content-type', 'application/json');
  xhr.send();
}

function createLocTable(obj) {
  let txt = '<table border="1">';
  txt += '<th class="tg-0lax"><em>Location</em></th>';
  txt += '<th class="tg-0lax"><em>IP</em></th>';
  txt += '<th class="tg-0lax"><em>Master</em></th>';
  txt += '<th class="tg-0lax"><em>Crumb</em></th>';
  txt += '<th class="tg-0lax"><em>Light</em></th>';
  txt += '<th class="tg-0lax"><em>Focus</em></th>';
  txt += '<th class="tg-0lax"><em>Mic</em></th>';
  for (let prop in obj) {
    txt += `<tr style="color: ${obj[prop].color};"}><td>${prop}</td>`;
    txt += `<td>${obj[prop].ip}</td>`;
    txt += `<td>${obj[prop].master}</td>`;
    txt += `<td>${obj[prop].crumb}</td>`;
    txt += `<td>${obj[prop].light}</td>`;
    txt += `<td>${obj[prop].focus}</td>`;
    txt += `<td>${obj[prop].mic}</td></tr>`;
  }
  txt += '</table>'
  document.getElementById('data-locations').innerHTML = txt;
}

function createPro4Table(obj) {
  let t = Object.keys(obj.thrusters);
  let d = Object.keys(obj.devices);

  let maxRows = 6;

  let txt = '<table border="1">';
  txt += '<th class="tg-0lax"><em>Thruster</em></th>';
  txt += '<th class="tg-0lax"><em>Pro4 ID</em></th>';
  txt += '<th class="tg-0lax"><em>Device</em></th>';
  txt += '<th class="tg-0lax"><em>Pro4 ID</em></th>';
  for (let i=0; i < maxRows; i++) {
    txt += `<tr><td>${t[i]}</td>`;
    txt += `<td>${obj.thrusters[t[i]]}</td>`;
    txt += `<td>${d[i]}</td>`;
    txt += `<td>${obj.devices[d[i]]}</td></tr>`;
  }
  txt += '</table>'
  txt = txt.replace(/undefined/g, '');
  document.getElementById('data-pro4').innerHTML = txt;
}