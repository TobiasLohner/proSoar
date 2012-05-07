/**
 *  map.js
 * 
 * This is proSoar. It's a software for online soaring task generation.
 * 
 * (c) 2012, Tobias Lohner <tobias@lohner-net.de>
 *
 * Licenced under GPL v2
**/

OpenLayers.ImgPath = "images/OpenLayers/"

var MapWindow = new Class({

  Implements: Events,

  initialize: function(loc) {
    this.map = new OpenLayers.Map('map', {
      eventListeners: {
        "moveend": function(e) {
              this.fireEvent('MapHasMoved');
        }.bind(this) },
      controls: [],
//      projection: new OpenLayers.Projection("EPSG:900913"),
      projection: "EPSG:900913",
      theme: null
    });

    OpenLayers.Layer.Vector.prototype.renderers = ["SVG2", "VML", "Canvas"];
 
    this.map.addControl(new OpenLayers.Control.PanZoomBar());
    this.map.addControl(new OpenLayers.Control.LayerSwitcher({'ascending':false}));
    this.keyboardControl = new OpenLayers.Control.KeyboardDefaults();
    this.map.addControl(this.keyboardControl);
    this.map.addControl(new OpenLayers.Control.Navigation());
    this.map.addControl(new OpenLayers.Control.ScaleLine({geodesic: true}));
    this.map.addControl(new OpenLayers.Control.Attribution({ separator: '<br />'}));

/*    this.map.div.oncontextmenu = function noContextMenu(e) {
      if (OpenLayers.Event.isRightClick(e)){
        console.log(e);
        console.log("Right button click"); // Add the right click menu here
      }
    };
*/

    var osm = new OpenLayers.Layer.OSM("OSM Map");
    osm.addOptions({
      transitionEffect: "resize",
      numZoomLevels: 17
    });
    this.map.addLayer(osm);

    var hillshading = new OpenLayers.Layer.TMS("Hill shading",
//      "http://toolserver.org/~cmarqu/hill/", {
      "terrain/", {
      type: 'png',
      getURL: function osm_getTileURL(bounds) {
        var res = this.map.getResolution();
        var x = Math.round((bounds.left - this.maxExtent.left) / (res * this.tileSize.w));
        var y = Math.round((this.maxExtent.top - bounds.top) / (res * this.tileSize.h));
        var z = this.map.getZoom();
        var limit = Math.pow(2, z);
        if (y < 0 || y >= limit) return OpenLayers.Util.getImagesLocation() + "404.png";
        else x = ((x % limit) + limit) % limit;
        return this.url + z + "/" + x + "/" + y + "." + this.type;
      },
      isBaseLayer: false,
      transparent: true,
      'visibility': true, 
      'displayInLayerSwitcher': false,
    });
    this.map.addLayer(hillshading);
    
    osm.events.register('visibilitychanged', this, function() { hillshading.setVisibility(osm.getVisibility()); });



    var airspace = new OpenLayers.Layer.TMS("Airspace",
      "airspace/", {
      type: 'png',
      getURL: function osm_getTileURL(bounds) {
        var res = this.map.getResolution();
        var x = Math.round((bounds.left - this.maxExtent.left) / (res * this.tileSize.w));
        var y = Math.round((this.maxExtent.top - bounds.top) / (res * this.tileSize.h));
        var z = this.map.getZoom();
        var limit = Math.pow(2, z);
        if (y < 0 || y >= limit) return OpenLayers.Util.getImagesLocation() + "404.png";
        else x = ((x % limit) + limit) % limit;
        return this.url + z + "/" + x + "/" + y + "." + this.type;
      },
      isBaseLayer: false,
      transparent: true,
      'visibility': true,
      'displayInLayerSwitcher': true
    });
    this.map.addLayer(airspace);


    // add google maps if google script loaded
    if (window.google) {
      var google_phy = new OpenLayers.Layer.Google(
        "Google Physical",
        {type: google.maps.MapTypeId.TERRAIN}
      );

      var google_sat = new OpenLayers.Layer.Google(
        "Google Satellite",
        {type: google.maps.MapTypeId.SATELLITE, numZoomLevels: 20}
      );
 
      this.map.addLayers([google_phy, google_sat]);
    }

    OpenLayers.Feature.Vector.style['default']['strokeWidth'] = '4';
 
    this.map.setCenter(
      new OpenLayers.LonLat(loc.lon, loc.lat).transform(
        new OpenLayers.Projection("EPSG:4326"),
        this.map.getProjectionObject() ),
      9 );
  },

  getExtent: function() {
    return this.map.getExtent().transform(
      this.map.getProjectionObject(),
      new OpenLayers.Projection("EPSG:4326") );
  },

  getResolution: function() {
    return this.map.getResolution();
  },

  zoomTo: function(bounds) {
    var zoomBounds = new OpenLayers.Bounds.fromArray(bounds);
    this.map.zoomToExtent(zoomBounds.transform(
      new OpenLayers.Projection("EPSG:4326"),
      this.map.getProjectionObject()
    ));
  },

  deactivateKeyboardControls: function() {
    this.keyboardControl.deactivate();
  },

  activateKeyboardControls: function() {
    this.keyboardControl.activate();
  },

  addWaypointLayers: function() {

    this.addAirportsLayer();
    this.addTurnpointsLayer();
    
    this.selectFeature = new OpenLayers.Control.SelectFeature(
      [this.turnpointLayer, this.airportLayer], {
      toggle: true,
      clickout: true,
      callbacks: {
        'out': this.onWaypointHoverOut.bind(this),
        'click': function(evt) {
          if (evt.layer.name == "Task") this.taskModifyLine.selectFeature(evt);
          else if (evt.layer.name == "Airports" || evt.layer.name == "Turnpoints") this.onWaypointSelect(evt);
          else if (evt.layer.name == "Task Turnpoint Sectors" && !this.taskDrawLine.active)
            this.fireEvent("editTurnpoint", evt.sectorId); //this.onTaskTurnpointSectorSelect(evt.sectorId);
        }.bind(this),
        'clickout': function(evt) {
          if (evt.layer.name == "Airports" || evt.layer.name == "Turnpoints") this.onWaypointUnselect(evt);
          else this.taskModifyLine.unselectFeature(evt);
        }.bind(this)
      }
    });

    this.selectFeature.handlers.feature.stopUp = false;    
    this.selectFeature.handlers.feature.stopDown = false;
    
    this.hoverFeature = new OpenLayers.Control.SelectFeature(
      [this.turnpointLayer, this.airportLayer], {
      hover: true,
      highlightOnly: true,
      eventListeners: {
        featurehighlighted: function(evt) {
          if (evt.feature.layer.name == "Airports"
              || evt.feature.layer.name == "Turnpoints") this.onWaypointHoverIn(evt.feature);
          else if (evt.feature.layer.name == "Task Turnpoint Sectors" &&
                   !this.taskDrawLine.active) {
            this.onSectorHoverIn(evt.feature);
          }
        }.bind(this),
        featureunhighlighted: function(evt) {
          if (evt.feature.layer.name == "Airports"
              || evt.feature.layer.name == "Turnpoints") this.onWaypointHoverOut(evt.feature);
          else if (evt.feature.layer.name == "Task Turnpoint Sectors") this.onSectorHoverOut(evt.feature);
        }.bind(this)
      }
    });

    this.hoverFeature.handlers.feature.stopUp = false;    
    this.hoverFeature.handlers.feature.stopDown = false;
    
    this.map.addControl(this.hoverFeature);
    this.map.addControl(this.selectFeature);
    this.hoverFeature.activate();
    this.selectFeature.activate();
  },

  addAirportsLayer: function() {
    this.airportLayer = new OpenLayers.Layer.Vector("Airports", {
      maxResolution: 1222,
      styleMap: new OpenLayers.StyleMap({
        // Set the external graphic and background graphic images.
        externalGraphic: "images/marker_airport_ws.png",
//        backgroundGraphic: "images/marker_middle_airport_shadow.png",
        // Makes sure the background graphic is placed correctly relative
        // to the external graphic.
        graphicXOffset: -(32/2),
        graphicYOffset: -(40/2),
        graphicWidth: 32,
        graphicHeight: 40,
//        backgroundXOffset: -(31/2),
//        backgroundYOffset: -(39/2),
//        backgroundWidth: 31,
//        backgroundHeight: 39,
        // Set the z-indexes of both graphics to make sure the background
        // graphics stay in the background (shadows on top of markers looks
        // odd; let's not do that).
        graphicZIndex: 3000,
//        backgroundGraphicZIndex: 10,
        pointRadius: 10,
        // rotate to match runway direction
        rotation: "${runwayDirection}"
      }),
      rendererOptions: {yOrdering: true},
      attribution: "Airport data by <a href='http://www.segelflug.de/vereine/welt2000/'>WELT 2000</a>" +
                   " project, <a href='http://opendatacommons.org/licenses/odbl/1.0/'>ODbL 1.0</a> "
    });

    this.map.addLayer(this.airportLayer);
    this.airportArray = Array();
  },

  
  addTurnpointsLayer: function() {
 //   console.log("adding turnpoints layer");

    this.turnpointLayer = new OpenLayers.Layer.Vector("Turnpoints", {
      maxResolution: 610,
      styleMap: new OpenLayers.StyleMap({
        // Set the external graphic and background graphic images.
        externalGraphic: "images/marker_turnpoint_ws.png",
//        backgroundGraphic: "images/marker_small_turnpoint_shadow.png",
        // Makes sure the background graphic is placed correctly relative
        // to the external graphic.
        graphicXOffset: -(23/2),
        graphicYOffset: -(23/2),
        graphicWidth: 23,
        graphicHeight: 23,
//        backgroundXOffset: -(23/2),
//        backgroundYOffset: -(23/2),
//        backgroundWidth: 23,
//        backgroundHeight: 23,
        // Set the z-indexes of both graphics to make sure the background
        // graphics stay in the background (shadows on top of markers looks
        // odd; let's not do that).
        graphicZIndex: 2000,
//        backgroundGraphicZIndex: 10,
        pointRadius: 10
      }),
      rendererOptions: {yOrdering: true}
    });

    this.map.addLayer(this.turnpointLayer);

    this.turnpointArray = Array();
  },

  addAirport: function(lon, lat, name, runwayDirection) {
    var feature = new OpenLayers.Feature.Vector(
      new OpenLayers.Geometry.Point(lon, lat).transform(
        new OpenLayers.Projection("EPSG:4326"),
        this.map.getProjectionObject() ),
      { runwayDirection: runwayDirection }
    );
    
    feature.data.popupContentHTML = 
      "<div class='header_airport'><img src='images/marker_airport.png' />Airport:</div><div class='name'>"+name+"</div>";
    feature.data.popupContentShortHTML =
      "<div class='header_airport'><img src='images/marker_airport.png' />"+name+"</div>";

    feature.lon = lon;
    feature.lat = lat;

    this.airportLayer.addFeatures([feature]);
    
    this.airportArray.push(feature);
    return this.airportArray.length - 1;
  },
 
  removeAirport: function(id) {
    this.airportLayer.destroyFeatures(this.airportArray[id]);
    if (this.airportArray[id].popup)
      this.onWaypointUnselect(this.airportArray[id]);

    this.airportArray.splice(id, 1);
  },

  getAirportArray: function() {
    return this.airportArray;
  },

  addTurnpoint: function(lon, lat, name) {

    var feature = new OpenLayers.Feature.Vector(
      new OpenLayers.Geometry.Point(lon, lat).transform(
        new OpenLayers.Projection("EPSG:4326"),
        this.map.getProjectionObject() )
    );

    feature.data.popupContentHTML =
      "<div class='header_turnpoint'><img src='images/marker_turnpoint.png' />Turnpoint:</div><div class='name'>"+name+"</div>";
    feature.data.popupContentShortHTML =
      "<div class='header_turnpoint'><img src='images/marker_turnpoint.png' />"+name+"</div>";

    feature.lon = lon;
    feature.lat = lat;

    this.turnpointLayer.addFeatures([feature]);
    
    this.turnpointArray.push(feature);
    return this.turnpointArray.length - 1;    
  },
  
  removeTurnpoint: function(id) {
    this.turnpointLayer.destroyFeatures(this.turnpointArray[id]);
    if (this.turnpointArray[id].popup)
      this.onWaypointUnselect(this.turnpointArray[id]);

    this.turnpointArray.splice(id, 1);
  },

  getTurnpointArray: function() {
    return this.turnpointArray;
  },

  onWaypointSelect: function(feature) {
    if (feature.popup_hover) this.onWaypointHoverOut(feature);
    if (this.map.popup) this.onWaypointUnselect(this.map.popup); 

    var FramedCloud = OpenLayers.Class(OpenLayers.Popup.FramedCloud, {
      'autoSize': false,
      'minSize': new OpenLayers.Size(150,40)
    });

    var popup = new FramedCloud(
      feature.id + "_popup",
      feature.geometry.getBounds().getCenterLonLat(),
      null,
      feature.data.popupContentHTML,
      { size: new OpenLayers.Size(20, 0),
        offset: new OpenLayers.Pixel(-10,0) },
      true,
      function(evt) { this.onWaypointUnselect(feature) }.bind(this)
    );
    
    var popup_content_size = OpenLayers.Util.getRenderedDimensions(
      feature.data.popupContentHTML,
      null,
      {displayClass: 'olPopup'} );

//    console.log(popup);
//    console.log(popup_content_size);
//    console.log(popup.getSafeContentSize(popup_content_size));

    //popup.contentSize = popup.getSafeContentSize(new OpenLayers.Size(180, 80));
    //popup_content_size = popup.getSafeContentSize(popup_content_size);

//    popup.autoSize = false;
    popup_content_size.h += 35+9;
    popup_content_size.w += 17;
    popup.setSize(popup_content_size);

    feature.popup = popup;
    this.map.addPopup(popup);
    this.map.popup = feature;
  },

  onWaypointUnselect: function(feature) {
    if (feature.popup == null) return;
    this.map.removePopup(feature.popup);
    feature.popup.destroy();
    feature.popup = null;
  },

  onWaypointHoverIn: function(feature) {
    if (this.map.popup_hover) this.onWaypointHoverOut(this.map.popup_hover);
   
    var popup_anchored = OpenLayers.Class(OpenLayers.Popup.Anchored, {
      'displayClass': 'olPopup olPopupHover'
    });
 
  //  var popup = new OpenLayers.Popup.Anchored(
    var popup = new popup_anchored(
      feature.id + '_popup_hover',
      feature.geometry.getBounds().getCenterLonLat(),
      null,
      feature.data.popupContentShortHTML,
      { size: new OpenLayers.Size(20, 0),
        offset: new OpenLayers.Pixel(0,-20) },
      false,
      null );

    var popup_content_size = OpenLayers.Util.getRenderedDimensions(
      feature.data.popupContentShortHTML,
      null,
      {displayClass: 'olPopup'} );

    popup.keepInMap = false;
    popup.autoSize = false;
//    popup_content_size.h += 5;
//    popup_content_size.w += 5;
    //popup.contentSize = popup.getSafeContentSize(popup_content_size);
    popup.setSize(popup_content_size);

    popup.calculateRelativePosition = function() { return "br" };
    
    feature.popup_hover = popup;
    this.map.addPopup(popup);
    this.map.popup_hover = feature;
  },

  onWaypointHoverOut: function(feature) {
    if ((feature.layer && feature.layer.name == "Task") || feature.popup_hover == null) return;
    this.map.removePopup(feature.popup_hover);
    this.map.popup_hover = null;
    feature.popup_hover.destroy();
    feature.popup_hover = null;
  },

  onSectorHoverIn: function(feature) {
    this.fireEvent("sectorHoverIn", feature.sectorId);
  },

  onSectorHoverOut: function(feature) {
    this.fireEvent("sectorHoverOut", feature.sectorId);
  },

  highlightSectorIn: function(sectorId) {
    this.taskTurnpointSectorsLayer.drawFeature(this.taskTurnpointSectors[sectorId], 'hover');
  },

  highlightSectorOut: function(sectorId) {
    this.taskTurnpointSectorsLayer.drawFeature(this.taskTurnpointSectors[sectorId], 'default');
  },

  addTaskLayer: function() {
    this.taskLayer = new OpenLayers.Layer.Vector("Task", {
      styleMap: new OpenLayers.StyleMap({
        'default': new OpenLayers.Style({
          fillColor: "#2200bd",
          fillOpacity: 0.4,
          pointRadius: 14,
          strokeColor: "#2200bd",
          strokeWidth: 4
        }),
        'temporary': new OpenLayers.Style({
          fillColor: "#ee9900",
          fillOpacity: 0.4,
          pointRadius: 14,
          strokeColor: "#ee9900",
          strokeWidth: 4
        }) 
    }) });

    this.taskTurnpointSectorsLayer = new OpenLayers.Layer.Vector("Task Turnpoint Sectors", {
      styleMap: new OpenLayers.StyleMap({
        'default': new OpenLayers.Style({
          fillColor: "#f9e400",
          fillOpacity: 0.25,
          strokeColor: "#f9e400",
          strokeWidth: 4
        }),
        'select':  new OpenLayers.Style({
          fillColor: "#f9e400",
          fillOpacity: 0.25,
          strokeColor: "#f9e400",
          strokeWidth: 4
        }), 
        'hover': new OpenLayers.Style({
          cursor: "pointer",
          fillColor: "#f98000",
          fillOpacity: 0.4,
          strokeColor: "#f98000",
          strokeWidth: 4
        })
      }),
      'displayInLayerSwitcher': false
    });

    this.taskFAILayer = new OpenLayers.Layer.Vector("Special Task Layer", {
      styleMap: new OpenLayers.StyleMap({
        'default': new OpenLayers.Style({
          fillColor: "#3cff00",
          fillOpacity: 0.4,
          strokeColor: "#3cff00",
          strokeOpacity: 0.7,
          strokeWidth: 9
        })
      }),
      'displayInLayerSwitcher': false
    }); 

    this.map.addLayer(this.taskFAILayer);
    this.map.addLayer(this.taskTurnpointSectorsLayer);
    this.map.addLayer(this.taskLayer);

    this.taskLayer.events.register('visibilitychanged', this, function() {
      this.taskTurnpointSectorsLayer.setVisibility(this.taskLayer.getVisibility());
      this.taskFAILayer.setVisibility(this.taskLayer.getVisibility());
    });

    this.map.setLayerIndex(this.taskLayer, 5);
    this.map.setLayerIndex(this.turnpointLayer, 4);
    this.map.setLayerIndex(this.airportLayer, 3);
    this.map.setLayerIndex(this.taskFAILayer, 2);
    this.map.setLayerIndex(this.taskTurnpointSectorsLayer, 1);
    
    this.snapControl = new OpenLayers.Control.Snapping({
      layer: this.taskLayer,
      targets: [this.turnpointLayer, this.airportLayer],
      greedy: true,
      defaults: {
        tolerance: 15
      }
    });
   //console.log(this.snapControl); 
    this.snapControl.events.register('snap', this,
      function(evt) {
        this.snapControl.hasSnappedIn = evt;
      });

    this.snapControl.events.register('unsnap', this,
      function(point) {
        this.snapControl.hasSnappedIn = null;
      });
   
    this.snapControl.activate();


    this.hoverFeature.setLayer(
      [this.taskTurnpointSectorsLayer, this.turnpointLayer, this.airportLayer] );
    
    this.selectFeature.setLayer(
      [this.taskTurnpointSectorsLayer, this.taskLayer, this.turnpointLayer, this.airportLayer] );
  },

  drawTaskLine: function() {
    this.taskDrawLine = new OpenLayers.Control.DrawFeature(
      this.taskLayer, OpenLayers.Handler.Path, {
        callbacks: {
          point: this.onTaskPointAdd.bind(this),
          done: this.onTaskFinished.bind(this)
      }});
 
    this.taskModifyLine = new OpenLayers.Control.ModifyFeature(this.taskLayer, { standalone: true });

    this.taskLayer.events.on({
      'featuremodified': function(evt) {
        this.onTaskPointModified(evt);
      }.bind(this),
      'vertexmodified': function(evt) {
        this.onTaskPointModified(evt);
      }.bind(this),
      'sketchmodified': function(evt) {
        this.onTaskDrawModified(evt);
      }.bind(this)
    });
    
    this.map.addControl(this.taskDrawLine);
    this.map.addControl(this.taskModifyLine);


    this.taskDrawLine.activate();
  },

  onTaskPointAdd: function(point) {
    var snapWaypoint = null;
    
    if (this.snapControl.hasSnappedIn) {
      point = this.snapControl.hasSnappedIn.point;
      snapWaypoint = this.findSnapTarget(this.snapControl.hasSnappedIn);
    }

    var originTrans = point.clone();
    if (this.map.getProjectionObject().getCode() !== "EPSG:4326") {
        originTrans = originTrans.transform(this.map.getProjectionObject(), new OpenLayers.Projection("EPSG:4326"));
    }
    var latlon = new OpenLayers.LonLat(originTrans.x, originTrans.y);

    this.fireEvent("modifyTaskPoint", {
      point: latlon,
      mapId: point.id,
      position: point.parent.components.length,
      taskLength: point.parent.components.length,
      lon: snapWaypoint?snapWaypoint.lon:null,
      lat: snapWaypoint?snapWaypoint.lat:null
    });

  },


  addTurnpointSector: function(point, sector) {
    var lonlat = new OpenLayers.LonLat(point.lon, point.lat);

    var taskTurnpointSector = new OpenLayers.Feature.Vector(
      this.createTurnpointSectorGeometry(lonlat, sector) );
  
    taskTurnpointSector.bearing = 0;
    taskTurnpointSector.origin = lonlat;
 
    if (!this.taskTurnpointSectors)
      this.taskTurnpointSectors = new Array();

    var id = this.taskTurnpointSectors.push(taskTurnpointSector) - 1;

    this.taskTurnpointSectors[id].sectorId = id;
    this.taskTurnpointSectorsLayer.addFeatures([this.taskTurnpointSectors[id]]);
    return id;
  },

  changeTurnpointSector: function(sector) {

    var sectorId = sector.getId();
    var lonlat = this.taskTurnpointSectors[sectorId].origin;
    var bearing = this.taskTurnpointSectors[sectorId].bearing;
 
    this.taskTurnpointSectorsLayer.destroyFeatures(this.taskTurnpointSectors[sectorId]);
    
    this.taskTurnpointSectors[sectorId] = new OpenLayers.Feature.Vector(
      this.createTurnpointSectorGeometry(lonlat, sector) );
    
    this.taskTurnpointSectors[sectorId].bearing = 0;
    this.taskTurnpointSectors[sectorId].origin = lonlat;
    this.taskTurnpointSectors[sectorId].sectorId = sectorId;

    this.taskTurnpointSectorsLayer.addFeatures(this.taskTurnpointSectors[sectorId]);
  },
 
  deleteTurnpointSector: function(sectorId) {
    this.taskTurnpointSectorsLayer.destroyFeatures([this.taskTurnpointSectors[sectorId]]);
    this.taskTurnpointSectors[sectorId].destroy();
    this.taskTurnpointSectors[sectorId] = null;
  },

  moveTurnpointSector: function(point, sectorId) {

    var to = new OpenLayers.LonLat(point.lon, point.lat);

    var from = this.taskTurnpointSectors[sectorId].origin.transform(
      new OpenLayers.Projection("EPSG:4326"), this.map.getProjectionObject());

    var pixel = this.taskTurnpointSectorsLayer.getViewPortPxFromLonLat(
      to.clone().transform(new OpenLayers.Projection("EPSG:4326"), this.map.getProjectionObject()));

    var lastPixel = this.taskTurnpointSectorsLayer.getViewPortPxFromLonLat(from);
    var res = this.map.getResolution();

    this.taskTurnpointSectors[sectorId].geometry.move(
      res * (pixel.x - lastPixel.x),
      res * (lastPixel.y - pixel.y));

    this.taskTurnpointSectorsLayer.drawFeature(this.taskTurnpointSectors[sectorId]);
    
    this.taskTurnpointSectors[sectorId].origin = to;
  },

  rotateTurnpointSector: function(sectorId, bearing) {
    var old_bearing = this.taskTurnpointSectors[sectorId].bearing;
    if (Math.abs(old_bearing - bearing) < 1) return;
  
    var origin = this.taskTurnpointSectors[sectorId].origin.clone().transform(
      new OpenLayers.Projection("EPSG:4326"), this.map.getProjectionObject() );
    
    this.taskTurnpointSectors[sectorId].geometry.rotate(
      old_bearing - bearing,
      new OpenLayers.Geometry.Point(origin.lon, origin.lat)); 

    this.taskTurnpointSectors[sectorId].bearing = bearing;
    this.taskTurnpointSectorsLayer.drawFeature(this.taskTurnpointSectors[sectorId]);
  },
 
  onTaskPointModified: function(evt) {
    var snapWaypoint = null;
    
    if (this.snapControl.hasSnappedIn) {
      snapWaypoint = this.findSnapTarget(this.snapControl.hasSnappedIn);
    }
    
    var projection = this.map.getProjectionObject();

    if (evt.vertex) {
      Array.each(evt.feature.geometry.components, function(item, key, object) {
        // check if only one point changed
         if (evt.vertex.id == item.id) {
          var point = evt.vertex.clone().transform(
            projection, new OpenLayers.Projection("EPSG:4326"));
          //console.log("found pair");
          this.fireEvent("modifyTaskPoint", {
            point: { lon: point.x, lat: point.y },
            position: key+1,
            mapId: item.id,
            taskLength: evt.feature.geometry.components.length,
            lon: snapWaypoint?snapWaypoint.lon:null,
            lat: snapWaypoint?snapWaypoint.lat:null
          });
        }
      }.bind(this));
    } else {

    // modification has stopped. just compare task point ids to identify removed points
    var pointIds = Array();
   
    Array.each(evt.feature.geometry.components, function(item, key, object) {
      pointIds.push(item.id);
    });
    
    this.fireEvent("modifyTaskPoint", {
      mapIds: pointIds,
      taskLength: evt.feature.geometry.components.length,
      position: -1
    });
    }
  },

  findSnapTarget: function(target) {
    var min = 999999;
    var foundFeature = null;
    
    for (var i = 0; i < target.layer.features.length; i++) {

      var dist = Math.sqrt(
        Math.pow(target.point.x - target.layer.features[i].geometry.x, 2) +
        Math.pow(target.point.y - target.layer.features[i].geometry.y, 2) );
      if (dist < min) {
        foundFeature = target.layer.features[i];
        min = dist;
        if (min < 1) break;
      }
    }

    return foundFeature;
  },
 
  onTaskDrawModified: function(point) {
    var snapWaypoint = null;
    if (this.snapControl.hasSnappedIn) {
      snapWaypoint = this.findSnapTarget(this.snapControl.hasSnappedIn);
    }
    

    var originTrans = new OpenLayers.LonLat(point.vertex.x, point.vertex.y);
    if (this.map.getProjectionObject().getCode() !== "EPSG:4326") {
        originTrans = originTrans.transform(this.map.getProjectionObject(), new OpenLayers.Projection("EPSG:4326"));
    } 
//console.log(point);
    this.fireEvent("modifyTaskPoint", {
      point: { lon: originTrans.lon, lat: originTrans.lat },
      position: point.vertex.parent.components.length,
      mapId: point.vertex.id,
      taskLength: point.vertex.parent.components.length,
      lon: snapWaypoint?snapWaypoint.lon:null,
      lat: snapWaypoint?snapWaypoint.lat:null
    }); 
  },

  onTaskFinished: function(linestring) {
    this.taskDrawLine.deactivate();

    var taskLine = new OpenLayers.Feature.Vector(linestring);
    this.taskLayer.addFeatures(taskLine);

/*
 * activate this for great circle linestring
    this.taskLine = new OpenLayers.Feature.Vector(
      GreatCircle_toLineString(linestring, this.map.getProjectionObject()) );
    this.taskLine.geometry_flat = linestring;
    this.taskLayer.addFeatures(this.taskLine);
*/
 
    this.fireEvent("finishDrawTask", [linestring.components]);
 
    this.taskModifyLine.activate();
  },

  newTask: function() {
    this.taskDrawLine.deactivate();
    this.taskDrawLine.layer.removeAllFeatures();

    this.taskModifyLine.deactivate();
    
    this.taskLayer.removeAllFeatures();
    this.taskTurnpointSectorsLayer.removeAllFeatures();
    this.taskFAILayer.removeAllFeatures();

    if (this.taskTurnpointSectors)
      this.taskTurnpointSectors.empty();

    this.taskDrawLine.activate();
  },

  loadTask: function(turnpoints) {
    this.taskDrawLine.deactivate();

    var points = new Array();

    Array.each(turnpoints, function(item, key, object) {
      var lonlat = new OpenLayers.LonLat(item.lon, item.lat).transform(
        new OpenLayers.Projection("EPSG:4326"), this.map.getProjectionObject());
      points.push(new OpenLayers.Geometry.Point(lonlat.lon, lonlat.lat));
    }.bind(this));

    var linestring = new OpenLayers.Geometry.LineString(points);

    var taskLine = new OpenLayers.Feature.Vector(linestring);
    this.taskLayer.addFeatures(taskLine);

    this.taskModifyLine.activate();

    return linestring.components;
  },

  selectTurnpointSector: function(sectorId) {
    if(this.taskDrawLine.active) return;
    
 //   this.fireEvent("editTurnpoint", sectorId);

    this.taskModifyLine.deactivate();
    this.hoverFeature.deactivate();
    this.selectFeature.deactivate();
    this.hoverFeature.activate();

  },

  unselectTurnpointSector: function() {
    this.taskModifyLine.activate();
    this.selectFeature.activate();
  },

  createTurnpointSectorGeometry: function(lonlat, sector) {
    var radius = sector.getRadius()*1000;
    var inner_radius = sector.getInnerRadius()*1000;
    var start_radial = sector.getStartRadial();
    var end_radial = sector.getEndRadial();
    var turnpointGeometry;

    switch(sector.getType()) {
      case 'circle':
        turnpointGeometry = new OpenLayers.Geometry.Polygon.createSector(
          lonlat, radius, 0, 0, 0, 50, this.map.getProjectionObject());
        break;

      case 'daec':
        turnpointGeometry = new OpenLayers.Geometry.Polygon.createKeyholeSector(
          lonlat, 10000, 500, 48, this.map.getProjectionObject());
        break;

      case 'fai':
        turnpointGeometry = new OpenLayers.Geometry.Polygon.createSector(
          lonlat, 10000, 0, -45, 45, 12, this.map.getProjectionObject());
        break;
      
      case 'faistart':
        turnpointGeometry = new OpenLayers.Geometry.Polygon.createSector(
          lonlat, 1000, 0, -45, 45, 12, this.map.getProjectionObject());
        break;

      case 'faifinish':
        turnpointGeometry = new OpenLayers.Geometry.Polygon.createSector(
          lonlat, 1000, 0, -45, 45, 12, this.map.getProjectionObject());
        break;

      case 'startline':
        turnpointGeometry = new OpenLayers.Geometry.Polygon.createStartLine(
          lonlat, radius, this.map.getProjectionObject());
        break;

      case 'finishline':
        turnpointGeometry = new OpenLayers.Geometry.Polygon.createFinishLine(
          lonlat, radius, this.map.getProjectionObject());
        break;

      case 'bgastartsector':
        turnpointGeometry = new OpenLayers.Geometry.Polygon.createBGAEnhancedOptionSector(
          lonlat, 5000, 0, 48, this.map.getProjectionObject());
        break;

      case 'bgafixedcourse':
        turnpointGeometry = new OpenLayers.Geometry.Polygon.createKeyholeSector(
          lonlat, 20000, 500, 48, this.map.getProjectionObject());
        break;

      case 'bgaenhancedoption':
        turnpointGeometry = new OpenLayers.Geometry.Polygon.createBGAEnhancedOptionSector(
          lonlat, 10000, 500, 48, this.map.getProjectionObject());
        break;

      case 'sector':
        turnpointGeometry = new OpenLayers.Geometry.Polygon.createSector(
          lonlat, radius, inner_radius, start_radial, end_radial,
          50, this.map.getProjectionObject());
        break;

    }

    return turnpointGeometry;
  },

  drawFaiTriangle: function(fai) {
//  drawContestLine: function(points) {
    var point1 = new OpenLayers.LonLat(fai.point1.lon, fai.point1.lat).transform(
      new OpenLayers.Projection("EPSG:4326"), this.map.getProjectionObject());
    var point2 = new OpenLayers.LonLat(fai.point2.lon, fai.point2.lat).transform(
      new OpenLayers.Projection("EPSG:4326"), this.map.getProjectionObject());
    var point3 = new OpenLayers.LonLat(fai.point3.lon, fai.point3.lat).transform(
      new OpenLayers.Projection("EPSG:4326"), this.map.getProjectionObject());
 
    var points = new Array();

    points.push(new OpenLayers.Geometry.Point(point1.lon, point1.lat));
    points.push(new OpenLayers.Geometry.Point(point2.lon, point2.lat));
    points.push(new OpenLayers.Geometry.Point(point3.lon, point3.lat));
    points.push(new OpenLayers.Geometry.Point(point1.lon, point1.lat));

   if (!this.faiTriangle) {
      this.faiTriangle = new OpenLayers.Feature.Vector(
        new OpenLayers.Geometry.LineString(points));
      this.taskFAILayer.addFeatures([this.faiTriangle]);
    } else {

      this.faiTriangle.geometry.components = points;
      this.taskFAILayer.drawFeature(this.faiTriangle);
    } 
    
  },

  removeFaiTriangle: function() {
    if (this.faiTriangle)
      this.taskFAILayer.removeFeatures([this.faiTriangle]);
  }

});


/*
 * APIMethod: createGeodesicPolygon
 * Create a regular polygon around a radius. Useful for creating circles
 * and the like.
 *
 * Parameters:
 * origin - {<OpenLayers.Geometry.Point>} center of polygon.
 * radius - {Float} distance to vertex, in map units.
 * sides - {Integer} Number of sides. 20 approximates a circle.
 * rotation - {Float} original angle of rotation, in degrees.
 * projection - {<OpenLayers.Projection>} the map's projection
 */
OpenLayers.Geometry.Polygon.createSector = function(origin, radius,
  inner_radius, start_radial, end_radial, sides, projection){
 
  var angle;
  var new_lonlat, geom_point;
    

  if ((end_radial - start_radial)%360 == 0) {    
    var points = new Array();
    for (var i = 0; i < sides; i++) {
        angle = (i * 360 / sides);
        new_lonlat = OpenLayers.Util.destinationVincenty(origin, angle, radius);
        new_lonlat.transform(new OpenLayers.Projection("EPSG:4326"), projection);
        geom_point = new OpenLayers.Geometry.Point(new_lonlat.lon, new_lonlat.lat);
        points.push(geom_point);
    }
    var outer_ring = new OpenLayers.Geometry.LinearRing(points);

    var points = new Array();
    if (inner_radius > 0) {    
      for (var i = 0; i < sides; i++) {
          angle = (i * 360 / sides);
          new_lonlat = OpenLayers.Util.destinationVincenty(origin, angle, inner_radius);
          new_lonlat.transform(new OpenLayers.Projection("EPSG:4326"), projection);
          geom_point = new OpenLayers.Geometry.Point(new_lonlat.lon, new_lonlat.lat);
          points.push(geom_point);
      }
      var inner_ring = new OpenLayers.Geometry.LinearRing(points);
      
      return new OpenLayers.Geometry.Polygon([outer_ring, inner_ring]);
    } else
      return new OpenLayers.Geometry.Polygon([outer_ring]);

  } else {

    var points = new Array();
    for (var i = 0; i <= sides; i++) {
        angle = start_radial + (i * ((end_radial - start_radial + 360)%360) / sides);
        new_lonlat = OpenLayers.Util.destinationVincenty(origin, angle, radius);
        new_lonlat.transform(new OpenLayers.Projection("EPSG:4326"), projection);
        geom_point = new OpenLayers.Geometry.Point(new_lonlat.lon, new_lonlat.lat);
        points.push(geom_point);
    }

    for (var i = sides; i >= 0; i--) {
        angle = start_radial + (i * ((end_radial - start_radial + 360)%360) / sides);
        new_lonlat = OpenLayers.Util.destinationVincenty(origin, angle, inner_radius);
        new_lonlat.transform(new OpenLayers.Projection("EPSG:4326"), projection);
        geom_point = new OpenLayers.Geometry.Point(new_lonlat.lon, new_lonlat.lat);
        points.push(geom_point);
    }

    var ring = new OpenLayers.Geometry.LinearRing(points);
    return new OpenLayers.Geometry.Polygon([ring]);
  }
   
};


OpenLayers.Geometry.Polygon.createKeyholeSector = function(origin, outer_radius, inner_radius, sides, projection)
{

  var angle;
  var new_lonlat, geom_point;
  var points = new Array();

  for (var i = 0; i < sides; i++) {
    angle = (i * 360 / sides) - 45;
    if (angle >= -45 && angle <= 45) {
      new_lonlat = OpenLayers.Util.destinationVincenty(origin, angle, outer_radius);
    } else {
      new_lonlat = OpenLayers.Util.destinationVincenty(origin, angle, inner_radius);
    }
    new_lonlat.transform(new OpenLayers.Projection("EPSG:4326"), projection);
    geom_point = new OpenLayers.Geometry.Point(new_lonlat.lon, new_lonlat.lat);
    points.push(geom_point);
  }

  var ring = new OpenLayers.Geometry.LinearRing(points);
  return new OpenLayers.Geometry.Polygon([ring]);
};

OpenLayers.Geometry.Polygon.createBGAEnhancedOptionSector = function(origin, outer_radius, inner_radius, sides, projection)
{

  var angle;
  var new_lonlat, geom_point;
  var points = new Array();

  for (var i = 0; i < sides; i++) {
    angle = (i * 360 / sides) - 90;
    if (angle >= -90 && angle <= 90) {
      new_lonlat = OpenLayers.Util.destinationVincenty(origin, angle, outer_radius);
    } else {
      new_lonlat = OpenLayers.Util.destinationVincenty(origin, angle, inner_radius);
    }
    new_lonlat.transform(new OpenLayers.Projection("EPSG:4326"), projection);
    geom_point = new OpenLayers.Geometry.Point(new_lonlat.lon, new_lonlat.lat);
    points.push(geom_point);
  }

  var ring = new OpenLayers.Geometry.LinearRing(points);
  return new OpenLayers.Geometry.Polygon([ring]);
};


OpenLayers.Geometry.Polygon.createStartLine = function(origin, radius, projection)
{
  return OpenLayers.Geometry.Polygon.createLine(origin, radius, projection);
};

OpenLayers.Geometry.Polygon.createFinishLine = function(origin, radius, projection)
{
  return OpenLayers.Geometry.Polygon.createLine(origin, radius, projection);
};




OpenLayers.Geometry.Polygon.createLine = function(origin, radius, projection)
{
  var angle;
  var new_lonlat, geom_point;
  var points = new Array();

  new_lonlat = OpenLayers.Util.destinationVincenty(origin, -90, radius);
  new_lonlat.transform(new OpenLayers.Projection("EPSG:4326"), projection);
  geom_point = new OpenLayers.Geometry.Point(new_lonlat.lon, new_lonlat.lat);
  points.push(geom_point);

  new_lonlat = origin.clone().transform(new OpenLayers.Projection("EPSG:4326"), projection);
  geom_point = new OpenLayers.Geometry.Point(new_lonlat.lon, new_lonlat.lat);
  points.push(geom_point);
  
  new_lonlat = OpenLayers.Util.destinationVincenty(origin, +90, radius);
  new_lonlat.transform(new OpenLayers.Projection("EPSG:4326"), projection);
  geom_point = new OpenLayers.Geometry.Point(new_lonlat.lon, new_lonlat.lat);
  points.push(geom_point);

  var ring = new OpenLayers.Geometry.LineString(points);
  return ring;
};



/*

GreatCircle_toLineString = function (linestring, projection) {

  var waypoints = Array();

  for (var i = 0; i < linestring.components.length-1; i++) {

    var lonlat1 = linestring.components[i].clone().transform(
      projection, new OpenLayers.Projection("EPSG:4326")
    );
    
    var lonlat2 = linestring.components[i+1].clone().transform(
      projection, new OpenLayers.Projection("EPSG:4326")
    );

    // Convert incoming coordinates to radians
    var lon1 = lonlat1.x * Math.PI/180;
    var lat1 = lonlat1.y * Math.PI/180;
    var lon2 = lonlat2.x * Math.PI/180;
    var lat2 = lonlat2.y * Math.PI/180;

    var sl = Math.min(lon1, lon2);
    var el = Math.max(lon1, lon2);

    if (Math.abs(lon1 - lon2) <= 0.00001) {
      lon2 = sl + Math.PI; // Avoid 'divide by zero' error in following eq.
    }

    // If longitudes and latitudes are each 180 degrees apart then
    // tweak one lat by a millionth of a degree to avoid ambiguity in cross-polar route
    if (Math.abs(lon2 - lon1) == Math.PI) {
      if (lat1 + lat2 == 0)  {
        lat2 += Math.PI/18000000;
      }
    }

    var lon = sl;
    var elon = el;
    var incr = 1 * Math.PI/180.0;

    if ((lon1 - lon2) < -Math.PI || (lon1 - lon2) > Math.PI) {
      // reverse route
      lon = el;
      elon = sl + 2*Math.PI;
    } 

    while(lon <= elon) {
      
      lat = Math.atan((Math.sin(lat1) * Math.cos(lat2) * Math.sin(lon - lon2) -
        Math.sin(lat2) * Math.cos(lat1) * Math.sin(lon - lon1)) / 
        (Math.cos(lat1) * Math.cos(lat2) * Math.sin(lon1 - lon2)));

      var p = {
        x: lon * 180/Math.PI,
        y: lat * 180/Math.PI
      };
      
      waypoints.push(new OpenLayers.Geometry.Point(p.x, p.y).transform(
          new OpenLayers.Projection("EPSG:4326"), projection
        ) );
          
     if (lon < elon && (lon + incr) >= elon)
       lon = elon;
     else
       lon = lon + incr;
     }
   }
   var ls = new OpenLayers.Geometry.LineString( waypoints );
   return ls;
}
*/
