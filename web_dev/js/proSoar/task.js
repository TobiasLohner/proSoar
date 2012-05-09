/**
 * task.js
 * 
 * This is part of proSoar. 
 * 
 * (c) 2012, Tobias Lohner <tobias@lohner-net.de>
 *
 * Licenced under GPL v2
**/

var Task = new Class({

  types: {
    racing: {
      name: _("Racing Task"),
      start: { startline: true, circle: true, faistart: true, bgastartsector: true },
      sectors: { daec: true, circle: true, fai: true, bgafixedcourse: true, bgaenhancedoption: true },
      finish: { finishline: true, circle: true, faifinish: true },
      defaults: { start: 'startline', sector: 'daec', finish: 'finishline' },
      aat_min_time: false,
      fai_finish_def: false,
    },
    aat: {
      name: _("Assigned Area Task"),
      start: { startline: true, circle: true, faistart: true, bgastartsector: true },
      sectors: { circle: true, sector: true },
      finish: { finishline: true, circle: true, faifinish: true },
      defaults: { start: 'startline', sector: 'circle', finish: 'finishline' },
      aat_min_time: true,
      fai_finish_def: false,
    },
    fai: {
      name: _("FAI badge/records"),
      start: { startline: true, faistart: true },
      sectors: { fai: true, circle: true },
      finish: { finishline: true, faifinish: true },
      defaults: { start: 'startline', sector: 'fai', finish: 'finishline' },
      aat_min_time: false,
      fai_finish_def: true,
    },
  },

  initialize: function() {
    this.current = null;
    this.taskLength = 0;
    this.fai = new FAI(this);
    this.options = new Object();
    this.setOptions({
      type: 'racing',
      aat_min_time: 3*3600,
      start_max_speed: 60,
      start_max_height: 2000,
      start_max_height_ref: 'MSL',
      finish_min_height: 0,
      finish_min_height_ref: 'AGL',
      fai_finish: false,
    });
  },

  setOptions: function(options) {
    if (typeof options.type == "string")
      this.options.type = options.type;
 
    if (typeof options.aat_min_time == "number")
      this.options.aat_min_time = options.aat_min_time;

    if (typeof options.start_max_speed == "number")
      this.options.start_max_speed = options.start_max_speed;

    if (typeof options.start_max_height == "number")
      this.options.start_max_height = options.start_max_height;

    if (typeof options.start_max_height_ref == 'string')
      if (options.start_max_height_ref == 'AGL')
        this.options.start_max_height_ref = 'AGL';
      else
        this.options.start_max_height_ref = 'MSL';

    if (typeof options.finish_min_height == "number")
      this.options.finish_min_height = options.finish_min_height;

    if (typeof options.finish_min_height_ref == 'string')
      if (options.finish_min_height_ref == 'AGL')
        this.options.finish_min_height_ref = 'AGL';
      else
        this.options.finish_min_height_ref = 'MSL';

    if (typeof options.fai_finish != "undefined")
      this.options.fai_finish = options.fai_finish?true:false;
  },

  getOptions: function() {
    return this.options;
  },

  // add TP in task after current TP
//  addAfterCurrent: function(lonlat, type, sectorId, waypoint_id, waypoint_name) {
  addAfterCurrent: function(lonlat, type, sectorId, waypoint) {
    //console.log("addAfterCurrent");
    var previous = this.current?this.current:null;
    var next = this.current?this.current.getNext():null;
    var position = this.current?(this.current.getPosition()+1):1;    

    this.current = new Turnpoint({
      previous: previous,
      next: next,
      options: {
        lon: lonlat.lon,
        lat: lonlat.lat,
        waypoint: waypoint,
        position: position,
        sector: {
          type: type,
          sectorId: sectorId,
        },
      },
    });

    if (previous) {
      previous.setNext(this.current);
      previous.updateNextLeg();
      previous.updateBearing();
    }    

    if (next) {
      next.setPrevious(this.current);
      next.updateBearing();
    }

    var insertPosition = position;

    while(this.next()) {
      position++;
      this.current.setPosition(position);
    }

    this.taskLength++;

    this.fai.addTurnpoint(insertPosition);

    this.gotoTurnpoint(insertPosition);
  },

  // return current TP
  getCurrentTurnpoint: function() {
    return this.current;
  },  

  // return next TP
  getNextTurnpoint: function() {
    return this.current.getNext()?this.current.getNext():false;
  },

  // return previous TP
  getPreviousTurnpoint: function() {
    return this.current.getPrevious()?this.current.getPrevious():false;
  },
  
  // return length of task
  getLength: function() {
    return this.taskLength;
  },

  // goto first TP
  first: function() {
    if (!this.current) return false;
    while (this.current.getPrevious()) {
      var previous = this.current.getPrevious();
      this.current = previous;
    }
    return true;
  },

  // goto last TP
  last: function() {
    if (!this.current) return false;
    while (this.current.getNext()) {
      var next = this.current.getNext();
      this.current = next;
    }
    return true;
  },

  // goto next TP
  next: function() {
    if (this.current == null) return false;

    var next = this.current.getNext();
    if (next) {
      this.current = next;
      return true;
    } else 
      return false;
  },

  // goto previous TP
  previous: function() {
    if (this.current == null) return false;

    var previous = this.current.getPrevious();
    if (previous) {
      this.current = previous;
      return true;
    } else
      return false;
  },

  // get current position in task
  getPosition: function() {
    if (this.current) return this.current.getPosition();
    return 0;
  },

  // goto TP
  gotoTurnpoint: function(number) {
    if (number == this.getPosition()) return true;
    else if (number < this.getPosition()) {
      while (this.previous())
        if (this.getPosition() == number) return true;
    } else if (number > this.getPosition()) {
      while (this.next())
        if (this.getPosition() == number) return true;
    }

    return false;
  },

  // delete current TP
  deleteCurrent: function() {
    if (this.current == null) return;

    var next = this.current.getNext();
    var previous = this.current.getPrevious();
    var current = null;
    var position = this.current.getPosition();

    this.fai.removeTurnpoint(position);
    
    if (next && previous) {
      next.setPrevious(previous);
      previous.setNext(next);
      previous.updateNextLeg();

      previous.updateBearing();
      next.updateBearing();

      current = next;
    } else if (next && !previous) {
      next.setPrevious(null);
      next.updateBearing();

      current = next;
    } else if (!next && previous) {
      previous.setNext(null);
      previous.updateNextLeg();
      previous.updateBearing();

      current = previous;
      position--;
    }

    delete this.current;
    this.current = current;


    this.current.setPosition(position);
    while(this.next()) {
      position++;
      this.current.setPosition(position);
    }

    this.taskLength--;
  },

  // set lonlat of current turnpoint
  setCurrentLonLat: function(lon, lat) {
    this.current.setLonLat(lon, lat);
    var position = this.getPosition();
    this.fai.updateDistances(position);
    this.gotoTurnpoint(position);
  },

  // get type of task
  getType: function() {
    return this.options.type;
  },

  // set type of task
  setType: function(type) {
    this.options.type = type;
  },

  getFaiTriangle: function() {
    return this.fai.isFAI();
  },

  // return the total distance around all task turnpoints
  getTotalDistance: function() {
    if (!this.first()) return 0;

    var taskDistance = 0;

    do {
      taskDistance += this.getCurrentTurnpoint().getNextLegDistance();
    } while (this.next());

    return Math.round(taskDistance/100)/10;
  },

  getTaskBounds: function() {
    this.first();
    
    var lat_min = this.current.getLat();
    var lat_max = this.current.getLat();
    var lon_min = this.current.getLon();
    var lon_max = this.current.getLon();

    
    while (this.next()) {
      if (this.current.getLon() < lon_min)
        lon_min = this.current.getLon();
      else if (this.current.getLon() > lon_max)
        lon_max = this.current.getLon();

      if (this.current.getLat() < lat_min)
        lat_min = this.current.getLat();
      else if (this.current.getLat() > lat_max)
        lat_max = this.current.getLat();
    }

    var add_lon = (lon_max-lon_min)/10;
    var add_lat = (lat_max-lat_min)/10;

    return [lon_min-add_lon, lat_min-add_lat, lon_max+add_lon, lat_max+add_lat];
  },

});



