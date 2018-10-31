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


function PlaceList(id) {
  const _rootElement = document.getElementById(id);
  let _places = [];
  let _activePopup = false;

  this.clear = () => {
    _rootElement.innerHTML = '';

    _places.forEach(p => p.marker.remove());
    _places.length = 0;

    if (_activePopup) {
      _activePopup.remove();
      _activePopup = false;
    }
  }

  this.show = (places) => {
    /* Note: this is not the nicest way of doing this. Aside from re-rdring on
     * each single addition it is also not escaping data properly, beter use a
     * framework in real code! */

    this.clear();

    _places = places.map(place => {
      place.marker =
          L.circleMarker([
             // TODO: Why do I have to swap here? (Swapping data
             // import in server is wrong)
             place.geometry.coordinates[1], place.geometry.coordinates[0]
           ]).addTo(mymap);

      const tags = [];
      for (const key in place.tags) {
        tags.push(`<li>${key}: ${place.tags[key]}</li>`);
      }

      place.div = document.createElement('div');
      place.div.innerHTML =
          `<p><b>${place.tags.name}</b> (${place.lat},${place.lon})</p>
	    <ul>${tags.join("\n")}</ul>`;

      _rootElement.appendChild(place.div).parentNode;

      place.div.onmouseover = () => {
        place.marker.setStyle({radius : 20, color : 'red'});

        _activePopup = L.popup()
            .setLatLng([ place.lat, place.lon ])
            .setContent(place.div.innerHTML)
            .openOn(mymap);
      };

      place.div.onmouseout =
          () => { place.marker.setStyle({radius : 10, color : 'blue'}); };

      place.div.onclick = () => {
        /* ... */
      };


      return place;
    });
  }
}

const places = new PlaceList('list');

async function doQuery() {
  const query = sel.toGeoJSON();
  query.withphone = document.getElementById('withphone').checked;
  query.applewine = document.getElementById('applewine').checked;
  query.namecontains = document.getElementById('namecontains').value;

  const result = await fetch('/getPlaces', {
    method : 'POST',
    headers : {'Content-Type' : 'application/json'},
    body : JSON.stringify(query)
  });

  const data = await result.json();
  places.show(data.places);
}
