const layers = {
  local : L.tileLayer('/assets/tiles/{z}/{x}/{y}.png', {
    attribution :
        '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
    maxZoom : 17,
  }),
  OSM : L.tileLayer("//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution :
        '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
  })
};

var mymap = L.map('map').setView([50.1174, 8.627023], 15);

layers.local.addTo(mymap);

L.control.layers(layers).addTo(mymap);

const radisson = L.circleMarker([50.1174, 8.627023], { color: 'green'}).addTo(mymap);

function SelectionHandler(map, options) {
  const _map = map;
  const _path = [];
  let _polygon = null;
  const _options = Object.assign({ 'color': 'blue' }, options);
  let _preview;

  map.on('click', e => {
    _path.push(e.latlng);

    switch (_path.length) {
    case 1:
      _polygon =
          L.circle(_path[0], Object.assign(_options, {radius : 2, fill: true})).addTo(_map);
      break;
    case 2:
      _polygon.remove();
      _polygon = L.polygon(_path, _options).addTo(_map);
      break;
    case 3:
      // TODO: trigger event to be ready
      // fall-through
    default:
      _polygon.setLatLngs(_path);
    }
  });

  map.on('mousemove', e => {
    if (!_path.length) {
      return;
    }
    const path = _path.slice(0);
    path.push(e.latlng);

    if (_preview) {
      _preview.setLatLngs(path);
    } else {
      _preview = L.polygon(path, Object.assign(_options, { opacity: .3, fill: true })).addTo(_map);
    }
  });

  map.on('mouseout', () => this.clearPreview());

  this.toGeoJSON = function() {
    return _polygon.toGeoJSON(); 
  }

  this.clearPreview = function() {
    if (_preview) {
      _preview.remove();
      _preview = null;
    }
  }

  this.clear = function() {
    _path.length = 0;
    if (_polygon) {
      _polygon.remove();
      _polygon = null;
    }
    this.clearPreview();
  }
}

const sel = new SelectionHandler(mymap, {color: 'red'});

const markers = [];
markers.clear = function() {
  this.forEach(m => m.remove());
  this.length = 0;
}


async function doQuery() {
  const geojson = sel.toGeoJSON();

  const myHeaders = new Headers();
  myHeaders.append('Content-Type', 'application/json');
  const result = await fetch(
      '/getLocations',
      {method : 'POST', headers : myHeaders, body : JSON.stringify(geojson)});

  const data = await result.json();
  markers.clear();
  data.places.forEach(p => {
    markers.push(L.circleMarker([
                    // TODO: Why do I have to swap here? (Swapping data
                    // import in server is wrong)
                    p.geometry.coordinates[1], p.geometry.coordinates[0]
                  ]).addTo(mymap));
  });
}
