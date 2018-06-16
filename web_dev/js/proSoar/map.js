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

    OpenLayers.Layer.Vector.prototype.renderers = ["SVG", "VML", "Canvas"];
 
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

    var osm = new OpenLayers.Layer.OSM(_("OSM Map"));
    osm.addOptions({
      transitionEffect: "resize",
      numZoomLevels: 17
    });
    this.map.addLayer(osm);

    // beware: the map projection is set only after the first layer has been added
    this.map_projection = this.map.getProjectionObject();
    this.epsg4326 = new OpenLayers.Projection("EPSG:4326");

    var hillshading = new OpenLayers.Layer.XYZ(_("Hill shading"),
      "http://c.tiles.wmflabs.org/hillshading/${z}/${x}/${y}.png", {
      isBaseLayer: false,
      sphericalMercator: true,
      transparent: true,
      'visibility': true,
      'displayInLayerSwitcher': false,
    });
    this.map.addLayer(hillshading);
    
    osm.events.register('visibilitychanged', this, function() { hillshading.setVisibility(osm.getVisibility()); });

    var airspace = new OpenLayers.Layer.XYZ(_("Airspace"),
      "https://www.skylines.aero/mapproxy/tiles/1.0.0/airspace/${z}/${x}/${y}.png", {
      isBaseLayer: false,
      transparent: true,
      'visibility': true,
      'displayInLayerSwitcher': true
    });
    this.map.addLayer(airspace);

    OpenLayers.Feature.Vector.style['default']['strokeWidth'] = '4';
 
    this.map.setCenter(
      new OpenLayers.LonLat(loc.lon, loc.lat).transform(
        this.epsg4326,
        this.map_projection ),
      9 );

    this.addGoogleLayers();
  },

  addGoogleLayers: function() {
    var google_phy_dummy = new OpenLayers.Layer.Vector(_("Google Physical"), {
      eventListeners: {
        "visibilitychanged": function(e) {
          loadGoogle();
        }.bind(this)
      },
      isBaseLayer: true,
      visibility: false
    });

    var google_sat_dummy = new OpenLayers.Layer.Vector(_("Google Satellite"), {
      eventListeners: {
        "visibilitychanged": function(e) {
          loadGoogle();
        }.bind(this) 
      },
      isBaseLayer: true,
      visibility: false
    });
    this.map.addLayers([google_phy_dummy, google_sat_dummy]);
  },

  addRealGoogleLayers: function() {
    // add google maps if google script loaded
    if (window.google) {
      var google_phy = new OpenLayers.Layer.Google(
        _("Google Physical"),
        {type: google.maps.MapTypeId.TERRAIN}
      );

      var google_sat = new OpenLayers.Layer.Google(
        _("Google Satellite"),
        {type: google.maps.MapTypeId.SATELLITE, numZoomLevels: 20}
      );

      var google_phy_dummy = this.map.getLayersByName(_("Google Physical"))[0];
      var google_sat_dummy = this.map.getLayersByName(_("Google Satellite"))[0];

      this.map.addLayers([google_phy, google_sat]);

      if (this.map.baseLayer.name == _("Google Physical")) this.map.setBaseLayer(google_phy);
      else this.map.setBaseLayer(google_sat);

      this.map.removeLayer(google_phy_dummy);
      this.map.removeLayer(google_sat_dummy);
    }
  },

  getExtent: function() {
    return this.map.getExtent().transform(
      this.map_projection,
      this.epsg4326 );
  },

  getResolution: function() {
    return this.map.getResolution();
  },

  zoomTo: function(bounds) {
    var zoomBounds = new OpenLayers.Bounds.fromArray(bounds);
    this.map.zoomToExtent(zoomBounds.transform(
      this.epsg4326,
      this.map_projection
    ));
  },

  panTo: function(lon, lat, bbox) {
    var lonlat = new OpenLayers.LonLat(lon, lat).transform(
      this.epsg4326, this.map_projection);

    var bounds = new OpenLayers.Bounds(bbox[2], bbox[0], bbox[3], bbox[1]).transform(
      this.epsg4326, this.map_projection);

    var zoom = Math.min(12, this.map.getZoomForExtent(bounds));
    this.map.zoomTo(zoom);
    this.map.panTo(lonlat);
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
          if (evt.layer.name == _("Task")) this.taskModifyLine.selectFeature(evt);
          else if (evt.layer.name == _("Airports") || evt.layer.name == _("Turnpoints")) this.onWaypointSelect(evt);
          else if (evt.layer.name == _("Task Turnpoint Sectors") && !this.taskDrawLine.active)
            this.fireEvent("editTurnpoint", evt.sectorId); //this.onTaskTurnpointSectorSelect(evt.sectorId);
        }.bind(this),
        'clickout': function(evt) {
          if (evt.layer.name == _("Airports") || evt.layer.name == _("Turnpoints")) this.onWaypointUnselect(evt);
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
          if (evt.feature.layer.name == _("Airports")
              || evt.feature.layer.name == _("Turnpoints")) this.onWaypointHoverIn(evt.feature);
          else if (evt.feature.layer.name == _("Task Turnpoint Sectors") &&
                   !this.taskDrawLine.active) {
            this.onSectorHoverIn(evt.feature);
          }
        }.bind(this),
        featureunhighlighted: function(evt) {
          if (evt.feature.layer.name == _("Airports")
              || evt.feature.layer.name == _("Turnpoints")) this.onWaypointHoverOut(evt.feature);
          else if (evt.feature.layer.name == _("Task Turnpoint Sectors")) this.onSectorHoverOut(evt.feature);
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
    this.airportLayer = new OpenLayers.Layer.Vector(_("Airports"), {
      maxResolution: 1222,
      styleMap: new OpenLayers.StyleMap({
        // Set the external graphic and background graphic images.
        externalGraphic: "images/marker_airport.png",
//        backgroundGraphic: "images/marker_middle_airport_shadow.png",
        // Makes sure the background graphic is placed correctly relative
        // to the external graphic.
//        graphicXOffset: -(23/2),
//        graphicYOffset: -(30/2),
        graphicWidth: 23,
        graphicHeight: 30,
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

    this.turnpointLayer = new OpenLayers.Layer.Vector(_("Turnpoints"), {
      maxResolution: 610,
      styleMap: new OpenLayers.StyleMap({
        // Set the external graphic and background graphic images.
        externalGraphic: "images/marker_turnpoint.png",
//        backgroundGraphic: "images/marker_small_turnpoint_shadow.png",
        // Makes sure the background graphic is placed correctly relative
        // to the external graphic.
//        graphicXOffset: -(20/2),
//        graphicYOffset: -(20/2),
        graphicWidth: 20,
        graphicHeight: 20,
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
        this.epsg4326,
        this.map_projection ),
      { runwayDirection: runwayDirection }
    );
    
    feature.data.popupContentHTML = 
      "<div class='header_airport'><img src='images/marker_airport.png' />"+_("Airport")+":</div><div class='name'>"+name+"</div>";
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
        this.epsg4326,
        this.map_projection )
    );

    feature.data.popupContentHTML =
      "<div class='header_turnpoint'><img src='images/marker_turnpoint.png' />"+_("Turnpoint")+":</div><div class='name'>"+name+"</div>";
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
    if ((feature.layer && feature.layer.name == _("Task")) || feature.popup_hover == null) return;
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

  addIGCLayer: function() {
    this.igcLayer = new OpenLayers.Layer.Vector(_("IGC"), {
      styleMap: new OpenLayers.StyleMap({
        'default': new OpenLayers.Style({
          strokeColor: "${color}",
          strokeWidth: 2
        })
    }) });

    this.map.addLayer(this.igcLayer);
    this.map.events.register("moveend", this.igcLayer, this.igcLayer.redraw);
  },

  addIGCFeature: function(flight) {
    var colors = ['#df0044', '#ff29d4', '#0049f5', '#9d00e0']

    var id = this.igcLayer.features.length;

    var vertices = new Array();
    var verticesLoD = new Array();
    var igc_bounds = new OpenLayers.Bounds();

    vertices[0] = new OpenLayers.Geometry.Point(flight[0][0], flight[0][1]);
    verticesLoD[0] = flight[0][2];
    igc_bounds.extend(vertices[0]);

    for (var i = 1, len = flight.length; i < len; i++) {
      vertices[i] = new OpenLayers.Geometry.Point(
        vertices[i-1].x + flight[i][0], vertices[i-1].y + flight[i][1]);
      verticesLoD[i] = flight[i][2];
      igc_bounds.extend(vertices[i]);
    }

    this.igcLayer.addFeatures(new OpenLayers.Feature.Vector(
      new OpenLayers.Geometry.ProgressiveLineString(vertices, verticesLoD, [0, 8, 10, 12]),
      { color: colors[id%(colors.length)] }
    ));
    this.map.zoomToExtent(igc_bounds);

    return this.igcLayer.features[id].id;
  },

  removeIGCFeature: function(id) {
    this.igcLayer.destroyFeatures(this.igcLayer.getFeatureById(id));
  },

  addTaskLayer: function() {
    this.taskLayer = new OpenLayers.Layer.Vector(_("Task"), {
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

    this.taskTurnpointSectorsLayer = new OpenLayers.Layer.Vector(_("Task Turnpoint Sectors"), {
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

    this.taskFAILayer = new OpenLayers.Layer.Vector(_("Special Task Layer"), {
      styleMap: new OpenLayers.StyleMap({
        'default': new OpenLayers.Style({
          fillColor: "#3cff00",
          fillOpacity: 0.4,
          strokeColor: "#3cff00",
          strokeOpacity: 0.7,
          strokeWidth: 9
        }),
        'faisector': new OpenLayers.Style({
          fillColor: "${color}",
          fillOpacity: 0.15,
          strokeColor: "${color}",
          strokeOpacity: 0.7,
          strokeWidth: 2
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
    if (this.map_projection.getCode() !== "EPSG:4326") {
        originTrans = originTrans.transform(this.map_projection, this.epsg4326);
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
      this.epsg4326, this.map_projection);

    var pixel = this.taskTurnpointSectorsLayer.getViewPortPxFromLonLat(
      to.clone().transform(this.epsg4326, this.map_projection));

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
      this.epsg4326, this.map_projection );
    
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

    if (evt.vertex) {
      Array.each(evt.feature.geometry.components, function(item, key, object) {
        // check if only one point changed
         if (evt.vertex.id == item.id) {
          var point = evt.vertex.clone().transform(
            this.map_projection, this.epsg4326);
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

  deleteTaskPoint: function(pointId) {
    var task = this.taskLayer.features[0];
    var taskline = task.geometry.components;

    pointId = pointId - 1;

    if (taskline.length > 2 && pointId < taskline.length) {
      taskline.splice(pointId, 1);
    } else {
      return;
    }

    task.geometry.components = taskline;

    var modifiedState = this.taskModifyLine.virtualVertices.length?true:false;
    if (modifiedState) this.taskModifyLine.deactivate();

    this.taskLayer.drawFeature(task);

    if (modifiedState) {
      this.taskModifyLine.activate();
      this.taskModifyLine.selectFeature(this.taskLayer.features[0]);
    }

    // compare task point ids to identify removed points
    var pointIds = Array();

    Array.each(taskline, function(item, key, object) {
      pointIds.push(item.id);
    });

    this.fireEvent("modifyTaskPoint", {
      mapIds: pointIds,
      taskLength: taskline.length,
      position: -1
    });
  },

  findSnapTarget: function(target) {
    var min = 999999999;
    var foundFeature = null;
    
    for (var i = 0; i < target.layer.features.length; i++) {

      var dist = Math.pow(target.point.x - target.layer.features[i].geometry.x, 2) +
                 Math.pow(target.point.y - target.layer.features[i].geometry.y, 2);
      if (dist < min) {
        foundFeature = target.layer.features[i];
        min = dist;
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
    if (this.map_projection.getCode() !== "EPSG:4326") {
        originTrans = originTrans.transform(this.map_projection, this.epsg4326);
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
      GreatCircle_toLineString(linestring, this.map_projection) );
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
        this.epsg4326, this.map_projection);
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
    var turnpointGeometry;

    switch(sector.getType()) {
      case 'circle':
        turnpointGeometry = new OpenLayers.Geometry.Polygon.createSector(
          lonlat, radius, 0, 0, 0, 50);
        break;

      case 'daec':
        turnpointGeometry = new OpenLayers.Geometry.Polygon.createKeyholeSector(
          lonlat, 10000, 500, 48);
        break;

      case 'fai':
        turnpointGeometry = new OpenLayers.Geometry.Polygon.createSector(
          lonlat, 10000, 0, -45, 45, 12);
        break;
      
      case 'faistart':
        turnpointGeometry = new OpenLayers.Geometry.Polygon.createSector(
          lonlat, 1000, 0, -45, 45, 12);
        break;

      case 'faifinish':
        turnpointGeometry = new OpenLayers.Geometry.Polygon.createSector(
          lonlat, 1000, 0, -45, 45, 12);
        break;

      case 'startline':
        turnpointGeometry = new OpenLayers.Geometry.Polygon.createStartLine(
          lonlat, radius);
        break;

      case 'finishline':
        turnpointGeometry = new OpenLayers.Geometry.Polygon.createFinishLine(
          lonlat, radius);
        break;

      case 'bgastartsector':
        turnpointGeometry = new OpenLayers.Geometry.Polygon.createBGAEnhancedOptionSector(
          lonlat, 5000, 0, 48);
        break;

      case 'bgafixedcourse':
        turnpointGeometry = new OpenLayers.Geometry.Polygon.createKeyholeSector(
          lonlat, 20000, 500, 48);
        break;

      case 'bgaenhancedoption':
        turnpointGeometry = new OpenLayers.Geometry.Polygon.createBGAEnhancedOptionSector(
          lonlat, 10000, 500, 48);
        break;

      case 'sector':
        var inner_radius = sector.getInnerRadius()*1000;
        var start_radial = sector.getStartRadial();
        var end_radial = sector.getEndRadial();
        turnpointGeometry = new OpenLayers.Geometry.Polygon.createSector(
          lonlat, radius, inner_radius, start_radial, end_radial, 50);
        break;

    }

    return turnpointGeometry.transform(this.epsg4326, this.map_projection);
  },

  drawFaiTriangle: function(fai) {
    var point1 = new OpenLayers.LonLat(fai.point1.lon, fai.point1.lat).transform(
      this.epsg4326, this.map_projection);
    var point2 = new OpenLayers.LonLat(fai.point2.lon, fai.point2.lat).transform(
      this.epsg4326, this.map_projection);
    var point3 = new OpenLayers.LonLat(fai.point3.lon, fai.point3.lat).transform(
      this.epsg4326, this.map_projection);
 
    var triangle = new Array();

    triangle.push(new OpenLayers.Geometry.Point(point1.lon, point1.lat));
    triangle.push(new OpenLayers.Geometry.Point(point2.lon, point2.lat));
    triangle.push(new OpenLayers.Geometry.Point(point3.lon, point3.lat));
    triangle.push(new OpenLayers.Geometry.Point(point1.lon, point1.lat));

    var reverse = this.calculateTriangleDirection(fai.point1, fai.point2, fai.point3);

    var triangle_feature = this.taskFAILayer.getFeaturesByAttribute('type', 'triangle');
    var sector1_feature = this.taskFAILayer.getFeaturesByAttribute('type', 'sector1');
    var sector2_feature = this.taskFAILayer.getFeaturesByAttribute('type', 'sector2');
    var sector3_feature = this.taskFAILayer.getFeaturesByAttribute('type', 'sector3');

    if (triangle_feature.length == 0) {
      triangle_feature = new OpenLayers.Feature.Vector(
        new OpenLayers.Geometry.LineString(triangle), { 'type': 'triangle' });

      sector1_feature = new OpenLayers.Feature.Vector(
        new OpenLayers.Geometry.LinearRing(GenerateFAITriangleArea(fai.point1, fai.point2, reverse))
          .transform(this.epsg4326, this.map_projection),
        { 'type': 'sector1', color: '#22ff00' } );
      sector1_feature.renderIntent = 'faisector';

      sector2_feature = new OpenLayers.Feature.Vector(
        new OpenLayers.Geometry.LinearRing(GenerateFAITriangleArea(fai.point2, fai.point3, reverse))
          .transform(this.epsg4326, this.map_projection),
        { 'type': 'sector2', color: '#ff4600' } );
      sector2_feature.renderIntent = 'faisector';

      sector3_feature = new OpenLayers.Feature.Vector(
        new OpenLayers.Geometry.LinearRing(GenerateFAITriangleArea(fai.point3, fai.point1, reverse))
          .transform(this.epsg4326, this.map_projection),
        { 'type': 'sector3', color: '#0064ff' } );
      sector3_feature.renderIntent = 'faisector';

      this.taskFAILayer.addFeatures([triangle_feature, sector1_feature, sector2_feature, sector3_feature]);

    } else {
      triangle_feature[0].geometry.components = triangle;

      sector1_feature[0].geometry.components =
        GenerateFAITriangleArea(fai.point1, fai.point2, reverse);
      sector1_feature[0].geometry.transform(this.epsg4326, this.map_projection);

      sector2_feature[0].geometry.components =
        GenerateFAITriangleArea(fai.point2, fai.point3, reverse);
      sector2_feature[0].geometry.transform(this.epsg4326, this.map_projection);

      sector3_feature[0].geometry.components =
        GenerateFAITriangleArea(fai.point3, fai.point1, reverse);
      sector3_feature[0].geometry.transform(this.epsg4326, this.map_projection);

      this.taskFAILayer.drawFeature(triangle_feature[0]);
      this.taskFAILayer.drawFeature(sector1_feature[0]);
      this.taskFAILayer.drawFeature(sector2_feature[0]);
      this.taskFAILayer.drawFeature(sector3_feature[0]);
    } 
    
  },

  removeFaiTriangle: function() {
    if (this.taskFAILayer.getFeaturesByAttribute('type', 'triangle').lenght != 0) {
      this.taskFAILayer.removeAllFeatures();
    }
  },

  calculateTriangleDirection: function(point1, point2, point3) {
    var p1_p2 = calculateBearing(point1, point2);
    var p2_p3 = calculateBearing(point2, point3);
    var p3_p1 = calculateBearing(point3, point1);

    var p1_p2_p3_angle = p2_p3 - (p1_p2+180);
    var p2_p3_p1_angle = p3_p1 - (p2_p3+180);
    var p3_p1_p2_angle = p1_p2 - (p3_p1+180);

    p1_p2_p3_angle = p1_p2_p3_angle%360;
    p2_p3_p1_angle = p2_p3_p1_angle%360;
    p3_p1_p2_angle = p3_p1_p2_angle%360;

    return (p1_p2_p3_angle + p2_p3_p1_angle + p3_p1_p2_angle + 360 > 0)?true:false;
  }

});

