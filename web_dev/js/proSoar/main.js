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
* @requires proSoar/dialogs.js
* @requires proSoar/fai.js
* @requires proSoar/map.js
* @requires proSoar/sector.js
* @requires proSoar/settings.js 
* @requires proSoar/task.js
* @requires proSoar/taskstore.js
* @requires proSoar/turnpoint.js
* @requires proSoar/waypoints.js
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

    var boundsExtended = [ (bounds[0]-width/2),
                           (bounds[1]-height/2),
                           (bounds[2]+width/2),
                           (bounds[3]+height/2) ];

    if (resolution <= 1222) {
      if (cause == 'moved') {
        this.waypoints.checkChunk(boundsExtended[0], boundsExtended[1],
          boundsExtended[2], boundsExtended[3]);
      }
    }    

    Array.each(this.waypoints.getArray(), function(item, key, object) {
      // add items when within 2 times the viewport
      if ((item.getLon() > boundsExtended[0]
           && item.getLon() < boundsExtended[2]
           && item.getLat() > boundsExtended[1]
           && item.getLat() < boundsExtended[3])
          && item.isViewable() ) {

        if (!item.isOnMap() && item.isAirport() && resolution <= 1222) {
          item.setMapId(this.map.addAirport(item.getLon(), item.getLat(),
            item.getName(), item.getRunwayDirection(), key));
          item.setOnMap(true);
        }

        if (!item.isOnMap() && item.isTurnpointOnly() && resolution <= 610) {
          item.setMapId(this.map.addTurnpoint(item.getLon(), item.getLat(), item.getName(), key));
          item.setOnMap(true);
        }
      }
    }, this);

    // remove unused airports
    Array.each(this.map.getAirportArray(), function(item, key, object) {
      if (item == null) return;

      if (item.lon < boundsExtended[0]
          || item.lon > boundsExtended[2]
          || item.lat < boundsExtended[1]
          || item.lat > boundsExtended[3]) {

        //console.log("remove airport: " + this.waypoints.getById(item.waypointId).getName());
        this.map.removeAirport(key);
        this.waypoints.getById(item.waypointId).setOnMap(false);
      }
    }, this);

   // remove unused turnpoints
    Array.each(this.map.getTurnpointArray(), function(item, key, object) {
      if (item == null) return;

      if (item.lon < boundsExtended[0]
          || item.lon > boundsExtended[2]
          || item.lat < boundsExtended[1]
          || item.lat > boundsExtended[3]) {

        //console.log("remove turnpoint: " + this.waypoints.getById(item.waypointId).getName());
        this.map.removeTurnpoint(key);
        this.waypoints.getById(item.waypointId).setOnMap(false);
      }
    }, this);

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

    this.updateTaskListDisplay('delete', this.task.getPosition());
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
      
      this.task.getCurrentTurnpoint().setWaypointId(e.waypointId); 
      this.task.getCurrentTurnpoint().setWaypointName(this.waypoints.getById(e.waypointId).getName()); 
      this.task.getCurrentTurnpoint().setWaypointAltitude(this.waypoints.getById(e.waypointId).getAltitude()); 
      this.task.getCurrentTurnpoint().setWaypointComment(this.waypoints.getById(e.waypointId).getComment()); 
      this.map.moveTurnpointSector(e.point, this.task.getCurrentTurnpoint().getSector().getId());
      this.updateTaskListDisplay('move', position);
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
        {id: e.waypointId,
         name: this.waypoints.getById(e.waypointId).getName(),
         altitude: this.waypoints.getById(e.waypointId).getAltitude(),
         comment: this.waypoints.getById(e.waypointId).getComment()
      });
//      this.task.getCurrentTurnpoint().setWaypointId(e.waypointId); 
//      this.task.getCurrentTurnpoint().setWaypointName(this.waypoints.getById(e.waypointId).getName()); 
      this.task.getCurrentTurnpoint().setMapId(e.mapId);
      this.task.getCurrentTurnpoint().getSector().setId(
        this.map.addTurnpointSector(e.point, this.task.getCurrentTurnpoint().getSector()) );
      
      position = e.position;

      this.updateTaskListDisplay('modify', position-1);
      this.updateTaskListDisplay('add', position);
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
      this.updateTaskListDisplay('delete', position);
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

  updateTaskListDisplay: function(action, position) {
    if (position < 1) return;

    var pos_restore = this.task.getPosition();
 
    var previousNumTP = 0;
    var currentNumTP = this.task.getLength();

    if (action == 'add')
      previousNumTP = currentNumTP - 1;
    else if (action == 'delete')
      previousNumTP = currentNumTP + 1;
    else if (action == 'modify' || action == 'move')
      previousNumTP = currentNumTP;
      
    if ((currentNumTP > previousNumTP && position == currentNumTP)
        || action == 'fill') {
      // add at end of list
      this.task.gotoTurnpoint(position);
      $('task-turnpoints').grab( this.prepareTPInfo(this.task.getCurrentTurnpoint()) );

    } else if (currentNumTP > previousNumTP && position < currentNumTP) {
      // add in the middle of list

      this.task.last();
      do {
        this.prepareTPInfo(this.task.getCurrentTurnpoint()).replaces(
          $('task-turnpoint-' + (this.task.getPosition()-1)) );
      } while (this.task.previous() && this.task.getPosition() != position);

      $('task-turnpoint-' + (position+1)).grab(
        this.prepareTPInfo(this.task.getCurrentTurnpoint()), 'before' );
    
    } else if (currentNumTP < previousNumTP) {
      // delete from the list

      $('task-turnpoint-' + position).destroy();

      if (position == previousNumTP) {
        this.task.last();
        this.prepareTPInfo(this.task.getCurrentTurnpoint()).replaces(
          $('task-turnpoint-' + (this.task.getPosition())) );
      } else {
        this.task.gotoTurnpoint(position);

        do {
        this.prepareTPInfo(this.task.getCurrentTurnpoint()).replaces(
          $('task-turnpoint-' + (this.task.getPosition()+1)) );
        } while (this.task.next());
      }

    } else {
      // only TP change

      this.task.gotoTurnpoint(position);
     
      if (action == 'modify') {
        this.prepareTPInfo(this.task.getCurrentTurnpoint()).replaces(
          $('task-turnpoint-' + position) );

      } else if (action == 'move') {
        this.prepareTPName(this.task.getCurrentTurnpoint()).replaces(
          $('task-turnpoint-name-' + position) );
      }
    }
    
    if (this.task.getLength() > 1) {
      this.displayTaskDistance();
    }

    this.task.gotoTurnpoint(pos_restore);
  },

  clearTaskListDisplay: function() {
    $('task-turnpoints').empty();
  },

  prepareTPName: function(turnpoint) {
    var tpNameString;

    switch (turnpoint.getPosition()) {
      case 1:
        tpNameString = "Start:&nbsp;"; break;
      case this.task.getLength():
        tpNameString = "Finish:&nbsp;"; break;
      default:
        tpNameString = "TP&nbsp;" + (turnpoint.getPosition()-1) + ":&nbsp;";
    }

    tpNameString += turnpoint.getWaypointName(); //getWaypointId()?
//      this.waypoints.getById(turnpoint.getWaypointId()).getName():"Free turnpoint";

    var tpCoordinates = OpenLayers.Util.getFormattedLonLat(turnpoint.getLat(), "lat", "dms") +
      "&nbsp;" + OpenLayers.Util.getFormattedLonLat(turnpoint.getLon(), "lon", "dms");

    return new Element('div', {
      id: "task-turnpoint-name-" + turnpoint.getPosition(),
      html: "<div class='title'>" + tpNameString + "</div>" +
        "<span class='coordinates'>" + tpCoordinates + "</span>"
    });
  },

  prepareTPInfo: function(turnpoint) {
    
    var tpInfo = new Element('div', {
      id: "task-turnpoint-" + turnpoint.getPosition(),
      'class': "turnpoint",
      'onmouseover': "javascript:proSoar.sectorHoverIn(" + turnpoint.getSector().getId() + ")",
      'onmouseout': "javascript:proSoar.sectorHoverOut(" + turnpoint.getSector().getId() + ")",
      'onclick': "javascript:proSoar.editTurnpoint(" + turnpoint.getSector().getId() + ")",
      html: "<img src='images/sector_" + turnpoint.getSector().getType() + ".png' width='40' height='40' />"
    });

    var tpName = this.prepareTPName(turnpoint);
    tpInfo.grab(tpName);

    var tpType = turnpoint.getSector().getName();
    if (Sector.prototype.types[turnpoint.getSector().getType()].radius)
      tpType += ", R = " + turnpoint.getSector().getRadius() + " km";
   
    tpInfo.grab(new Element('span', {
      'class': "type",
      html: tpType
    }) ); 

    return tpInfo;
  },

  taskGeneralOptions: function() {
    console.log("Unused?!?");
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

  displayTaskDistance: function() {
    var distance = this.task.getTotalDistance();
 
    $('task-total-distance').set('text', distance + " km");
    
    var faiDistance = this.task.getFaiTriangle().isFAI?this.task.getFaiTriangle().distance:0;
    faiDistance = Math.round(faiDistance/100)/10;

    $('task-is-fai').set('text', faiDistance?'FAI triangle ('+faiDistance+' km)':'');
  },

  newTask: function() {
    var newTaskDialog = new dlgNewTask(proSoar);
  },

  loadTask: function(task) {
    this.map.newTask();
    this.clearTaskListDisplay();

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

      this.updateTaskListDisplay('modify', i);
      this.updateTaskListDisplay('fill', i+1);

      i++;
    } while (this.task.next());

    do {
      this.adjustTaskTPSectorOrientation(i);
      i--;
    } while (this.task.previous());

    this.displayTaskDistance();

    this.map.zoomTo(this.task.getTaskBounds());

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

    Object.each(this.settings.getTurnpointFiles(), function(item, key, object) {
      if(item.fileId == fileId) item.display = !item.display;
    });

    this.includeNewWaypointsToMap('moved');
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
