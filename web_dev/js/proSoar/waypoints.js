/**
 * waypoints.js
 * 
 * This is part of proSoar. 
 * 
 * (c) 2012, Tobias Lohner <tobias@lohner-net.de>
 *
 * Licenced under GPL v2
**/


var Waypoint = new Class({
  initialize: function(options) {
    this.name = options.name;
    this.lat = options.lat;
    this.lon = options.lon;
    this.addType(options.type);
    this.onMap = false;
    this.mapId = -1;
    this.fileId = options.fileId;
    this.display = options.display;
    this.runwayDirection = options.runwayDirection?options.runwayDirection:45;
    this.altitude = options.altitude?options.altitude:0;
    this.comment = options.comment?options.comment:'';
//    console.log("creating new waypoint " + options.name);
  },

  addType: function(types) {
    if (String(types).contains('A'))
      this.airport = true;
    else
      this.airport = false;

    if (String(types).contains('L'))
      this.landable = true;
    else
      this.landable = false;

    if (String(types).contains('T'))
      this.turnpoint = true;
    else
      this.turnpoint = false;
  },

  getName: function() {
    return this.name;
  },

  getLon: function() {
    return this.lon;
  },

  getLat: function() {
    return this.lat;
  },

  getType: function() {
    type  = this.airport?'A':'';
    type += this.landable?'L':'';
    type += this.turnpoint?'T':'';
    return type;
  },

  getRunwayDirection: function() {
    return this.runwayDirection;
  },

  getAltitude: function() {
    return this.altitude;
  },

  getComment: function() {
    return this.comment;
  },

  isAirport: function() {
    return this.airport;
  },

  isLandable: function() {
    return this.landable;
  },

  isTurnpoint: function() {
    return this.turnpoint;
  },

  isTurnpointOnly: function() {
    return this.turnpoint && !this.airport && !this.landable;
  },

  isOnMap: function() {
    return this.onMap;
  },

  setOnMap: function(onMap) {
    this.onMap = onMap;
  },

  setMapId: function(mapId) {
    this.mapId = mapId;
  },

  getMapId: function() {
    return this.mapId;
  },

  // returns if this item should be displayed at all
  isViewable: function() {
    return this.display;
  },


  // set if this item is viewable or not
  setViewable: function(display) {
    this.display = display;
  },

  toggleViewable: function() {
    this.display = !this.display;
  },

  setFileId: function(fileId) {
    this.fileId = fileId;
  },

  getFileId: function() {
    return this.fileId;
  },

});

var WaypointContainer = new Class({

  Implements: Events,

  initialize: function(settings) {
    this.rt = new RTree();
    this.chunks = new Object();
    this.settings = settings;
    this.dummyWaypoint = new Waypoint({
      name: _("Free turnpoint"),
      lat: 0,
      lon: 0,
      type: "ATL",
      fileId: -1,
      display: false,
      altitude: -9999,
      comment: '',
    });
  },

  populateFromJSON: function(fileId, jsonUrl) {
    var jsonRequest = new Request.JSON({
      url: jsonUrl,
      async: true,
      secure: true,
      onSuccess: function(data) {
          this.addWaypointsFromJSON(fileId, data)
        }.bind(this),
      onError: function(text, error) {
//        console.log("Error: " + text + " " + error);
      },
    });

    jsonRequest.get();
  },

  addWaypointsFromJSON: function(fileId, data) {
    if (!this.chunks['lon' + data[0].chunk.lon_left + 'lat' + data[0].chunk.lat_lower])
      this.chunks['lon' + data[0].chunk.lon_left + 'lat' + data[0].chunk.lat_lower] = new Object();
    if (this.chunks['lon' + data[0].chunk.lon_left + 'lat' + data[0].chunk.lat_lower][fileId]) return;

    this.chunks['lon' + data[0].chunk.lon_left + 'lat' + data[0].chunk.lat_lower][fileId] = true;
    
    var display = true;

    if (fileId != 0) {
      for (var i = 1; i < this.settings.getTurnpointFiles().length; i++) {
        if (this.settings.getTurnpointFiles()[i].fileId == fileId)
          display = this.settings.getTurnpointFiles()[i].display;
      }
    }

    var waypoints_len = data.length;

    for (var i = 1; i != waypoints_len; i++) {
      data[i].fileId = fileId;
      data[i].display = display;
      data[i].lon = Math.round(data[i].lon*10000000)/10000000;
      data[i].lat = Math.round(data[i].lat*10000000)/10000000;
      this.rt.insert({x: data[i].lon, y: data[i].lat,
                      w: 0, h: 0}, // make items very small
                     new Waypoint(data[i]));
    }

//    console.log("fire event: NewWaypointsAdded");
    this.fireEvent('NewWaypointsAdded');
//    document.fireEvent('onNewWaypointsAdded'); //, false, 500);
  },

  removeWaypoints: function(fileId) {
    if (fileId < 1) return;

    Array.each(this.getArray(), function(item, key, object) {
      if (item.getFileId() == fileId) {
        this.rt.remove({x: item.getLon(), y: item.getLat(), w: 0, h: 0}, item);
      }
    }.bind(this));

    Array.each(this.getArray(), function(item, key, object) {
      if (item.getFileId() > fileId) {
        item.setFileId(item.getFileId()-1);
      }
    });

    Object.each(this.chunks, function(item, key, object) {
      item[fileId] = false;
    });
  },

  getByLonLat: function(lon, lat) {
    if (lon == null || lat == null) return this.dummyWaypoint;

    var result = this.rt.search({x: lon, y: lat, w: 0, h: 0});

    if (result.length == 0) return this.dummyWaypoint;
    else return result[0];
  },

  getInsideBounds: function(lon_left, lat_lower, lon_right, lat_upper) {
    var result = this.rt.search({x: lon_left, y: lat_lower,
                                 w: (lon_right-lon_left), h: (lat_upper-lat_lower)});
    return result;
  },

  getArray: function() {
    return this.rt.search({x: -180, y: -90, w: 360, h: 180});
  },

  checkChunk: function(lon_left, lat_lower, lon_right, lat_upper) {
    // check if we need to download a new chunk of waypoints...?
    var factor = 5;
    
    // no need to check if lon_right is smaller than lon_left because openlayers
    // always keeps lon_right > lon_left.
    var chunk_lat_lower = Math.floor(lat_lower / factor);
    var chunk_lat_upper = Math.ceil(lat_upper / factor);
    var chunk_lon_left = Math.floor(lon_left / factor);
    var chunk_lon_right = Math.ceil(lon_right / factor);
    
    for (var i = chunk_lon_left; i < chunk_lon_right; i++) {
      for (var j = chunk_lat_lower; j < chunk_lat_upper; j++) {
        if (!this.chunks['lon' + i*factor + 'lat' + j*factor] ||
            !this.chunks['lon' + i*factor + 'lat' + j*factor][0])
          this.getChunk(i*factor, j*factor, 'airports');
        
        Array.each(this.settings.getTurnpointFiles(), function(item, key, object) {
          if (item.display &&
              (!this.chunks['lon' + i*factor + 'lat' + j*factor] ||
               !this.chunks['lon' + i*factor + 'lat' + j*factor][item.fileId] ))
            this.getChunk(i*factor, j*factor, 'turnpoints', item.fileId);
        }, this);
      }
    }
  },

  getChunk: function(lon_left, lat_lower, type, fileId) {
    // download chunk from server
    
    if (type == 'airports')
      this.populateFromJSON(0, 'airports/lon'+lon_left+'/lat'+lat_lower);
//      this.populateFromJSON(0, 'dynamic/waypoints.pl?type=airport&lon='+lon_left+'&lat='+lat_lower);

    else if (type == 'turnpoints')
      this.populateFromJSON(fileId, 'waypoints/'+fileId+'/lon'+lon_left+'/lat'+lat_lower);
//      this.populateFromJSON(fileId, 'dynamic/bin/get_waypoints.py?' +
//        'id=' + fileId + '&lon=' + lon_left + '&lat=' + lat_lower);
/*      this.populateFromJSON(fileId, 'dynamic/waypoints.pl?uid=' +
        this.settings.getUID() + '&type=turnpoint' + 
        '&id=' + fileId + '&lon=' + lon_left + '&lat=' + lat_lower); */
  },

});


