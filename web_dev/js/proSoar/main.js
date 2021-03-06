/**
 *  proSoar.js
 * 
 * This is proSoar. It's a software for online soaring task generation.
 * 
 * (c) 2012, Tobias Lohner <tobias@lohner-net.de>
 *
 * Licenced under GPL v2
**/

/**
* @requires proSoar/rtree.js
* @requires proSoar/dialogs.js
* @requires proSoar/fai.js
* @requires proSoar/map.js
* @requires proSoar/sector.js
* @requires proSoar/faitrianglerenderer.js
* @requires proSoar/sectorrenderer.js
* @requires proSoar/settings.js 
* @requires proSoar/task.js
* @requires proSoar/taskstore.js
* @requires proSoar/tasklist.js
* @requires proSoar/turnpoint.js
* @requires proSoar/waypoints.js
* @requires proSoar/search.js
* @requires proSoar/igcfile.js
* @requires proSoar/google.js
**/

var ProSoar = new Class({

  Implements: Events,

  initialize: function() {

     // set some variables
     this.dialogOverlay = false;
   
    // initialize settings 
    this.settings = new Settings();
    this.settings.addEvent("SettingsLoaded", function() {
      this.includeNewWaypointsToMap('moved');
      this.displayTurnpointFiles();
    }.bind(this));

    // create the map, and it's layers
    this.map = new MapWindow(initialLocation);
    this.map.addWaypointLayers();
    this.map.addTaskLayer();
    this.addButtonBar();  
 
    // create the waypoint container and the task
    this.waypoints = new WaypointContainer(this.settings);
    this.task = new Task();

    // initialize task list display
    this.tasklist = new TaskList(this);
    
    // add some events 
    this.waypoints.addEvent("NewWaypointsAdded", function() {
      this.includeNewWaypointsToMap('added'); }.bind(this));

    this.map.addEvent("MapHasMoved", function() {
      this.includeNewWaypointsToMap('moved');
    }.bind(this));

    this.map.addEvent("finishDrawTask", this.finishDrawTask.bind(this));
    this.map.addEvent("modifyTaskPoint", this.modifyTaskPoint.bind(this));
    this.map.addEvent("editTurnpoint", this.editTurnpoint.bind(this));
    this.map.addEvent("sectorHoverIn", this.sectorHoverIn.bind(this));
    this.map.addEvent("sectorHoverOut", this.sectorHoverOut.bind(this));
    
    // load settings
    //this.settings.getSettingsFromJSON();
    this.settings.getInitialSettings();

    // initialize task store class
    this.taskStore = new TaskStore();
    this.taskStore.addEvent("loadTask", this.loadTask.bind(this));
    this.taskStore.addEvent("setSettings", function(settings) {
      this.settings.addSettingsFromJSON(settings);
    }.bind(this));  

    // initialize Infoscreen
    this.InfoscreenIGC = new InfoscreenIGC(this);

    // enable task creation  
    this.map.drawTaskLine();
  },


  // include waypoints from waypoint container into map
  includeNewWaypointsToMap: function(cause) {
//    console.log("updating waypoints display in viewport");

    var resolution = this.map.getResolution();
    var bounds = this.map.getExtent().toArray();
   
    var width = bounds[2] - bounds[0];
    var height = bounds[3] - bounds[1];

    var boundsExtended = [ (bounds[0]-width/3),
                           (bounds[1]-height/3),
                           (bounds[2]+width/3),
                           (bounds[3]+height/3) ];

    if (resolution <= 1222) {
      if (cause == 'moved') {
        this.waypoints.checkChunk(boundsExtended[0], boundsExtended[1],
          boundsExtended[2], boundsExtended[3]);
      }
    }    

    Array.each(this.waypoints.getInsideBounds(boundsExtended[0], boundsExtended[1],
          boundsExtended[2], boundsExtended[3]), function(item, key, object) {
      // add items when within 2 times the viewport
      if (item.isViewable()) {
        if (!item.isOnMap() && item.isAirport() && resolution <= 1222) {
          item.setMapId(this.map.addAirport(item.getLon(), item.getLat(),
            item.getName(), item.getRunwayDirection()));
          item.setOnMap(true);
        }

        if (!item.isOnMap() && item.isTurnpointOnly() && resolution <= 610) {
          item.setMapId(this.map.addTurnpoint(item.getLon(), item.getLat(), item.getName()));
          item.setOnMap(true);
        }
      }
    }, this);

    // remove unused airports
    var airportArray = this.map.getAirportArray();
    for (var i = airportArray.length-1; i >= 0; i--) {
      if (airportArray[i].lon < boundsExtended[0]
          || airportArray[i].lon > boundsExtended[2]
          || airportArray[i].lat < boundsExtended[1]
          || airportArray[i].lat > boundsExtended[3]) {

        //console.log("remove airport: " + this.waypoints.getById(item.waypointId).getName());
        this.waypoints.getByLonLat(airportArray[i].lon, airportArray[i].lat).setOnMap(false);
        this.map.removeAirport(i);
      }
    }

    // remove unused turnpoints
    var turnpointArray = this.map.getTurnpointArray();
    for (var i = turnpointArray.length-1; i >= 0; i--) {
      if (turnpointArray[i].lon < boundsExtended[0]
          || turnpointArray[i].lon > boundsExtended[2]
          || turnpointArray[i].lat < boundsExtended[1]
          || turnpointArray[i].lat > boundsExtended[3]) {

        //console.log("remove turnpoint: " + this.waypoints.getById(item.waypointId).getName());
        this.waypoints.getByLonLat(turnpointArray[i].lon, turnpointArray[i].lat).setOnMap(false);
        this.map.removeTurnpoint(i);
      }
    }

  },
  
  // finish the task creation
  finishDrawTask: function(components) {
//console.log("finish draw task");
    if (this.task.getLength() == 2) return;

    this.task.last();
    this.map.deleteTurnpointSector(this.task.getCurrentTurnpoint().getSector().getId());
    this.task.deleteCurrent();

    this.task.getCurrentTurnpoint().getSector().setType(
      Task.prototype.types[this.task.getType()].defaults.finish);

    this.task.getCurrentTurnpoint().getSector().setRadius(
      Sector.prototype.types[this.task.getCurrentTurnpoint().getSector().getType()].radius_def);

    this.map.changeTurnpointSector(this.task.getCurrentTurnpoint().getSector());

    this.tasklist.update('delete', this.task.getPosition());
    if (this.task.getLength() > 1)
      this.adjustTaskTPSectorOrientation(this.task.getPosition());
//console.log(components);
    var i = 0;
    this.task.first();
    do {
      this.task.getCurrentTurnpoint().setMapId(components[i].id);
      i++;
    } while (this.task.next());
  },


  // modify a task point
  modifyTaskPoint: function(e) {
//console.log(e);
    var position;

    if (e.taskLength == this.task.getLength() && e.position != -1) {
      // a task point has been modified...
      position = e.position;

      this.task.gotoTurnpoint(position);
      this.task.setCurrentLonLat(e.point.lon, e.point.lat);
      
      this.task.getCurrentTurnpoint().setWaypointName(this.waypoints.getByLonLat(e.lon, e.lat).getName());
      this.task.getCurrentTurnpoint().setWaypointAltitude(this.waypoints.getByLonLat(e.lon, e.lat).getAltitude());
      this.task.getCurrentTurnpoint().setWaypointComment(this.waypoints.getByLonLat(e.lon, e.lat).getComment());
      this.map.moveTurnpointSector(e.point, this.task.getCurrentTurnpoint().getSector().getId());
      this.tasklist.update('move', position);
      this.adjustTaskTPSectorOrientation(position);

    } else if (e.taskLength > this.task.getLength()) {
      // there's a new task point...
      
      this.task.gotoTurnpoint(e.position - 1);

      var sectorType;
      if (e.position == 1)
        sectorType = Task.prototype.types[this.task.getType()].defaults.start;
      else if (e.position > 1 && e.position == this.task.getLength()+1) {
        sectorType = Task.prototype.types[this.task.getType()].defaults.finish;
        
        if (e.position > 2) {
          this.task.getCurrentTurnpoint().getSector().setType(
            Task.prototype.types[this.task.getType()].defaults.sector);
          this.task.getCurrentTurnpoint().getSector().setRadius(
            Sector.prototype.types[this.task.getCurrentTurnpoint().getSector().getType()].radius_def);
          this.map.changeTurnpointSector(this.task.getCurrentTurnpoint().getSector());
        }
      } else
        sectorType = Task.prototype.types[this.task.getType()].defaults.sector;

      this.task.addAfterCurrent(e.point, sectorType, -1,
        {name: this.waypoints.getByLonLat(e.lon, e.lat).getName(),
         altitude: this.waypoints.getByLonLat(e.lon, e.lat).getAltitude(),
         comment: this.waypoints.getByLonLat(e.lon, e.lat).getComment()
      });
//      this.task.getCurrentTurnpoint().setWaypointId(e.waypointId); 
//      this.task.getCurrentTurnpoint().setWaypointName(this.waypoints.getById(e.waypointId).getName()); 
      this.task.getCurrentTurnpoint().setMapId(e.mapId);
      this.task.getCurrentTurnpoint().getSector().setId(
        this.map.addTurnpointSector(e.point, this.task.getCurrentTurnpoint().getSector()) );
      
      position = e.position;

      this.tasklist.update('modify', position-1);
      this.tasklist.update('add', position);
      this.adjustTaskTPSectorOrientation(position);

    } else if (e.taskLength < this.task.getLength() && this.task.getLength() > 2) {
      // a task point has been removed...

      var i = 0;
      this.task.first();
      do {
        if (this.task.getCurrentTurnpoint().getMapId() != e.mapIds[i]) {
          // we found the removed turnpoint at position i
          this.map.deleteTurnpointSector(this.task.getCurrentTurnpoint().getSector().getId());
          this.task.deleteCurrent();
      
          position = i+1;
          
          var sectorType;
          if (position == 1) {
            this.task.first();
            sectorType = Task.prototype.types[this.task.getType()].defaults.start;
            this.task.getCurrentTurnpoint().getSector().setType(sectorType);
            this.task.getCurrentTurnpoint().getSector().setRadius(
              Sector.prototype.types[this.task.getCurrentTurnpoint().getSector().getType()].radius_def);
            this.map.changeTurnpointSector(this.task.getCurrentTurnpoint().getSector());
          } else if (position-1 == this.task.getLength()) {
            this.task.last();
            sectorType = Task.prototype.types[this.task.getType()].defaults.finish;
            this.task.getCurrentTurnpoint().getSector().setType(sectorType);
            this.task.getCurrentTurnpoint().getSector().setRadius(
              Sector.prototype.types[this.task.getCurrentTurnpoint().getSector().getType()].radius_def);
            this.map.changeTurnpointSector(this.task.getCurrentTurnpoint().getSector());
          }

          break;
        }
        i++;
      } while (this.task.next());
      this.tasklist.update('delete', position);
      this.adjustTaskTPSectorOrientation(position);
    }

    // draw the fai triangle if it exists *** needs some rework ***
    var fai = this.task.getFaiTriangle();
    if (fai.isFAI) {
      
      this.task.gotoTurnpoint(fai.i+1);
      var point1 = this.task.getCurrentTurnpoint().getLonLat();

      this.task.gotoTurnpoint(fai.j+1);
      var point2 = this.task.getCurrentTurnpoint().getLonLat();

      this.task.gotoTurnpoint(fai.k+1);
      var point3 = this.task.getCurrentTurnpoint().getLonLat();

      this.map.drawFaiTriangle({
        point1: point1,
        point2: point2,
        point3: point3
      });
    } else {
      this.map.removeFaiTriangle();
    }

  },

  adjustTaskTPSectorOrientation: function(position) {
//    if (this.task.getLength() < 2) return;

    var pos_restore = this.task.getPosition();
    
    var pos_start = Math.max(position - 1, 1);
    var pos_end = Math.min(pos_start + 3, this.task.getLength());

    position = pos_start;
    this.task.gotoTurnpoint(position);

    var bearing_pc = 0;
    var bearing_cn = 0;
    var current_id = 0;

    while (position <= pos_end) {
      
      current_id = this.task.getCurrentTurnpoint().getSector().getId();
      bearing_cn = this.task.getCurrentTurnpoint().getNextBearing();
      bearing_pc = (this.task.getCurrentTurnpoint().getPreviousBearing() + 180)%360;

      if (!Sector.prototype.types[this.task.getCurrentTurnpoint().getSector().getType()].norotate) {

        if (position == 1) {
          this.map.rotateTurnpointSector(
            current_id,
            bearing_cn - 180);
        } else if (position == this.task.getLength()) {
          this.map.rotateTurnpointSector(
            current_id,
            bearing_pc);
        } else {
          var adjust = 0;
          if ((bearing_pc - bearing_cn) < 0)
            adjust = 180;

          this.map.rotateTurnpointSector(
            current_id,
            (bearing_cn + bearing_pc)/2 + 90 + adjust);
        } 
      }

      this.task.next();
      position++;
    }

    this.task.gotoTurnpoint(pos_restore);

  },

  editTurnpoint: function(sectorId) {
    if (this.task.getLength() > 1 && !this.dialogOverlay)
      var editTurnpoint = new dlgEditTurnpoints(this, sectorId);
  },

  sectorHoverIn: function(sectorId) {
    var position = 0;

    this.task.first();
    do {
      if (this.task.getCurrentTurnpoint().getSector().getId() == sectorId)
        position = this.task.getPosition();
    } while (this.task.next());
    
    this.map.highlightSectorIn(sectorId);
    $('task-turnpoint-' + position).addClass('hover');
  },

  sectorHoverOut: function(sectorId) {
    var position = 0;

    this.task.first();
    do {
      if (this.task.getCurrentTurnpoint().getSector().getId() == sectorId)
        position = this.task.getPosition();
    } while (this.task.next());

    this.map.highlightSectorOut(sectorId);
    $('task-turnpoint-' + position).removeClass('hover');
  },
  
  newTask: function() {
    var newTaskDialog = new dlgNewTask(proSoar);
  },

  loadTask: function(task, zoom) {
    this.map.newTask();
    this.tasklist.clear();

    delete this.task;
    this.task = task;

    var turnpoints = new Array();
    this.task.first();
    do {
      turnpoints.push(this.task.getCurrentTurnpoint().getLonLat());
    } while (this.task.next());

    var components = this.map.loadTask(turnpoints);

    var i = 0;
    this.task.first();
    do {
      this.task.getCurrentTurnpoint().setMapId(components[i].id);
      this.task.getCurrentTurnpoint().getSector().setId(
        this.map.addTurnpointSector(this.task.getCurrentTurnpoint().getLonLat(),
          this.task.getCurrentTurnpoint().getSector()) );

      this.tasklist.update('modify', i);
      this.tasklist.update('fill', i+1);

      i++;
    } while (this.task.next());

    do {
      this.adjustTaskTPSectorOrientation(i);
      i--;
    } while (this.task.previous());

    this.tasklist.displayTaskDistance();

    // draw the fai triangle if it exists *** needs some rework ***
    var fai = this.task.getFaiTriangle();
    if (fai.isFAI) {

      this.task.gotoTurnpoint(fai.i+1);
      var point1 = this.task.getCurrentTurnpoint().getLonLat();

      this.task.gotoTurnpoint(fai.j+1);
      var point2 = this.task.getCurrentTurnpoint().getLonLat();

      this.task.gotoTurnpoint(fai.k+1);
      var point3 = this.task.getCurrentTurnpoint().getLonLat();

      this.map.drawFaiTriangle({
        point1: point1,
        point2: point2,
        point3: point3
      });
    } else {
      this.map.removeFaiTriangle();
    }

    if (!arguments[1]) this.map.zoomTo(this.task.getTaskBounds());

//    console.log("Load task:");
//    console.log(task);
  },

  saveTask: function(mode) {
    var saveTaskDialog = new dlgSaveTask(proSoar);
  },

  aboutDialog: function() {
    var aboutDialog = new dlgAbout(proSoar);
  },

  displayTurnpointFiles: function() {
    $('waypoint-files-list').empty();

    Array.each(this.settings.getTurnpointFiles(), function(item, key, object) {
      var waypointFile = new Element('li', {
        html: '<input type="checkbox" onclick="javascipt:proSoar.toggleTurnpointFile('+item.fileId+');" ' +
              (item.display?'checked="checked" ':'') + 'id="waypoint-file-input-' + item.fileId + '" />' +
              '<label for=waypoint-file-input-' + item.fileId + '>' + item.filename + '</label>' + 
              '<img src="images/delete.png" onclick="javascript:proSoar.deleteWaypointFile('+item.fileId+');" />',
        id: 'waypoint-file-' + item.fileId
      });

      $('waypoint-files-list').grab(waypointFile);
    });
  },

  toggleTurnpointFile: function(fileId) {

    Array.each(this.waypoints.getArray(), function(item, key, object) {
      if(item.getFileId() == fileId) {
        item.toggleViewable();
      }
    });

    var turnpointFile = this.settings.getTurnpointFile(fileId);

    turnpointFile.display = !turnpointFile.display;

    if (!turnpointFile.display) {
      // remove unused turnpoints
      var turnpointArray = this.map.getTurnpointArray();
      for (var i = turnpointArray.length-1; i >= 0; i--) {
        //console.log("remove turnpoint: " + this.waypoints.getById(item.waypointId).getName());
        var waypoint = this.waypoints.getByLonLat(turnpointArray[i].lon, turnpointArray[i].lat);
        if (!waypoint.isViewable()) {
          waypoint.setOnMap(false);
          this.map.removeTurnpoint(i);
        }
      }
    } else {
      this.includeNewWaypointsToMap('moved');
    }
  },

  deleteWaypointFile: function(fileId) {
    var deleteWaypointFileDialog = new dlgDeleteWaypointFile(proSoar, fileId);
  },

  addWaypointFile: function() {
    var addWaypointFileDialog = new dlgWaypointUpload(proSoar);
  },

  addButtonBar: function() {
    $('buttonbar-normal').addEvent('click', function() {
      if (this.map.taskModifyLine.active)
        this.map.taskModifyLine.unselectFeature(this.map.taskModifyLine.feature);
      else if (this.map.taskDrawLine.active)
        this.map.taskDrawLine.finishSketch();
    }.bind(this));

    $('buttonbar-add').addEvent('click', function() {
      if (this.map.taskModifyLine.active && this.map.taskLayer.features[0])
        this.map.taskModifyLine.selectFeature(this.map.taskLayer.features[0]);
    }.bind(this));

    $('buttonbar-remove').addEvent('click', function() {
      if (this.map.taskModifyLine.active && this.map.taskLayer.features[0]) {
//        this.map.taskModifyLine.handlers.click = new OpenLayers.Handler.Feature(this.map.taskModifyLine, this.map.taskLayer, {
//         'click': function(evt) {
//            console.log(evt);
//          }
//        });
//        this.map.taskModifyLine.handlers.click.activate();
        alert("Use the <del> key while hovering a turnpoint with your mouse.");
        this.map.taskModifyLine.selectFeature(this.map.taskLayer.features[0]);
      }
    }.bind(this));

    $('buttonbar-new').addEvent('click', function() {
      return this.newTask();
    }.bind(this)),

    $('buttonbar-save').addEvent('click', function() {
      return this.saveTask();
    }.bind(this));

    $('buttonbar-search').addEvents({
      'mouseover': function() {
        var search = new SearchBox(this);
        return true;
      }.bind(this),
      'click': function() {
        var search = new SearchBox(this);
        return true;
      }.bind(this)
    });

  },

  moveTurnpointUp: function(position) {
    this.task.moveUp(position);
    this.loadTask(this.task, true);
  },

  moveTurnpointDown: function(position) {
    this.task.moveDown(position);
    this.loadTask(this.task, true);
  },

  removeTaskTurnpoint: function(position) {
    this.map.deleteTaskPoint(position);
  }

});
/*
function Util_distVincenty(point1, point2) {
  var lon1 = point1.lon * Math.PI/180;
  var lat1 = point1.lat * Math.PI/180;
  var lon2 = point2.lon * Math.PI/180;
  var lat2 = point2.lat * Math.PI/180;

  var dlon = lon2 - lon1
  var dlat = lat2 - lat1;
  
  var a = Math.pow(Math.sin(dlat/2),2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(dlon/2),2);
  var c = 2 * Math.asin(Math.min(1, Math.sqrt(a)));
  
  return c * 6378137;
}*/


function Util_distVincenty(point1, point2) {
  return OpenLayers.Util.distVincenty(point1, point2) * 1000;
}



function calculateBearing(point0, point1) {

    var pt0 = {
      lon: point0.lon * Math.PI/180,
      lat: point0.lat * Math.PI/180 };

    var pt1 = {
      lon: point1.lon * Math.PI/180,
      lat: point1.lat * Math.PI/180 };

    var bearing = 0;
    var adjust = 0;

    var a = Math.cos(pt1.lat) * Math.sin(pt1.lon - pt0.lon);
    var b = Math.cos(pt0.lat) * Math.sin(pt1.lat) - 
      Math.sin(pt0.lat) * Math.cos(pt1.lat) * Math.cos(pt1.lon - pt0.lon);

    if ((a == 0) && (b == 0)) {
      bearing = 0;
    } else if (b == 0) {
      if (a < 0)
        bearing = 3 * Math.PI/2;
      else
        bearing = Math.PI/2;
    } else if (b < 0) {
      adjust = Math.PI;
    } else {
      if (a < 0)
        adjust = 2 * Math.PI;
      else
        adjust = 0;
    }

    bearing = (Math.atan(a/b) + adjust) * 180/Math.PI;
    return bearing?bearing:0;
}

function formatDate() {
  date = new Date();

  dateString = date.getDate() + '.' + (date.getMonth()+1) + '.' + date.getFullYear();

  return dateString;
}  
