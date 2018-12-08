setInterval(clock, 1000);

function renderNav() {
  let pages = new Map();
  pages.set('index.html', 'Camera');
  pages.set('controls.html', 'Controls');
  pages.set('telemetry.html', 'Telemetry');
  pages.set('telemetry-brief.html', 'Telemetry Brief');
  pages.set('files.html', 'Files');
  pages.set('troubleshooting.html', 'Troubleshooting');
  pages.set('video-gl.html', 'WebGL Camera (Beta)');

  let locations = new Map();
  locations.set('211', 'Side');
  locations.set('213', 'Bore');
  locations.set('215', 'Forward');
  locations.set('217', 'Up');
  locations.set('218', 'Down');


  // set page title
  let loc = window.location.pathname.split('/');
  loc = loc[loc.length-1];
  if (loc.match(/\.html$/) === null)
    loc = 'index.html';
  let t = pages.get(loc);
  document.title = `${t} ${window.location.port}`;

  let active, navTemplate = '<ul>';
  for (let [page, name] of pages) {
    active = loc === page ? 'class="active"': '';
    navTemplate += `<li><a ${active} href="${page}">${name}</a></li>`;
  }
  for (let [ip, location] of locations) {
    navTemplate += `<li><span class="dot" id="video-${ip}-record"><span class="tooltiptext">${location}</span></span></li>`;
  }
  navTemplate += '<li><div class="clock"></div></li>';
  navTemplate += `</ul>`;
  let elem = document.getElementsByTagName('nav')[0];
  if (elem !== undefined) {
    elem.innerHTML = navTemplate;
  }
}

function clock() { // We create a new Date object and assign it to a variable called "time".
  var time = new Date(),

      // Access the "getHours" method on the Date object with the dot accessor.
      hours = time.getHours(),

      // Access the "getMinutes" method with the dot accessor.
      minutes = time.getMinutes(),


      seconds = time.getSeconds();

  document.querySelectorAll('.clock')[0].innerHTML = harold(hours) + ":" + harold(minutes) + ":" + harold(seconds);

  function harold(standIn) {
    if (standIn < 10) {
      standIn = '0' + standIn
    }
    return standIn;
  }
}

