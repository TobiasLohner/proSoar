var Sector = new Class({

  types: {
    daec: {
      name: "DAeC keyhole",
      radius: false,
      radius_def: 10,
    },
    fai: {
      name: "FAI quadrant", 
      radius: false, 
      radius_def: 10,
    },
    faistart: {
      name: "FAI start quadrant",
      radius: false,
      radius_def: 1,
    },
    faifinish: {
      name: "FAI finish quadrant",
      radius: false,
      radius_def: 1,
    },
    circle: { 
      name: "Circle", 
      radius: true,
      radius_def: 10,
    },
    startline: { 
      name: "Start line",
      radius: true,
      radius_def: 10,
    },
    finishline: { 
      name: "Finish line", 
      radius: true,
      radius_def: 0.5,
    },
    sector: {
      name: "Sector",
      radius: true,
      radius_def: 10,
      inner_radius: true,
      inner_radius_def: 3,
      start_radial: true,
      start_radial_def: 40,
      end_radial: true,
      end_radial_def: 300,
      norotate: true,
    },
    bgafixedcourse: {
      name: "BGA Fixed Course",
      radius: false,
      radius_def: 10
    },
    bgaenhancedoption: {
      name: "BGA Enh. Opt. Fixed Course",
      radius: false,
      radius_def: 10,
    },
    bgastartsector: {
      name: "BGA Start Sector",
      radius: false,
      radius_def: 5,
    },
  },

  initialize: function(a) {
    // sector Id on map
    this.setId(a.sectorId);

    // sector type
    this.setType(a.type?a.type:'fai');

    // sector radius [km]
    this.setRadius(a.radius?a.radius:this.types[this.getType()].radius_def);
    
    if (this.types[this.getType()].inner_radius)
      this.inner_radius = this.types[this.getType()].inner_radius_def;
    else
      this.inner_radius = 0; 

    if (this.types[this.getType()].start_radial)
      this.start_radial = this.types[this.getType()].start_radial_def;
    else
      this.start_radial = 0;

    if (this.types[this.getType()].end_radial)
      this.end_radial = this.types[this.getType()].end_radial_def;
    else
      this.end_radial = 0;
  },

  // return type of sector
  getType: function() {
    return this.type;
  },

  // set type of sector
  setType: function(type) {
    this.type = type;
  },

  // get radius of sector
  getRadius: function() {
    return this.radius;
  },

  // set radius of sector
  setRadius: function(radius) {
    this.radius = radius;
  },

  // get inner radius
  getInnerRadius: function() {
    return this.inner_radius;
  },

  // set inner radius of sector
  setInnerRadius: function(inner_radius) {
    this.inner_radius = inner_radius;
  },

  // get start radial
  getStartRadial: function() {
    return this.start_radial;
  },

  // set start radial of sector
  setStartRadial: function(start_radial) {
    this.start_radial = start_radial;
  },

  // get end radial
  getEndRadial: function() {
    return this.end_radial;
  },

  // set end radial of sector
  setEndRadial: function(end_radial) {
    this.end_radial = end_radial;
  },

  // get id of sector on map
  getId: function() {
    return this.sectorId;
  },

  // set id of sector on map
  setId: function(sectorId) {
    this.sectorId = sectorId;
  },

  // get the name of the sector type
  getName: function() {
    return this.types[this.type].name;
  },
});
