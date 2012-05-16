var TaskList = new Class({

  initialize: function(proSoar) {
    this.proSoar = proSoar;
  },

  update: function(action, position) {
    if (position < 1) return;

    var pos_restore = this.proSoar.task.getPosition();

    var previousNumTP = 0;
    var currentNumTP = this.proSoar.task.getLength();

    if (action == 'add')
      previousNumTP = currentNumTP - 1;
    else if (action == 'delete')
      previousNumTP = currentNumTP + 1;
    else if (action == 'modify' || action == 'move')
      previousNumTP = currentNumTP;

    if ((currentNumTP > previousNumTP && position == currentNumTP)
        || action == 'fill') {
      // add at end of list
      this.proSoar.task.gotoTurnpoint(position);
      $('task-turnpoints').grab( this.prepareTPInfo(this.proSoar.task.getCurrentTurnpoint()) );

    } else if (currentNumTP > previousNumTP && position < currentNumTP) {
      // add in the middle of list

      this.proSoar.task.last();
      do {
        this.prepareTPInfo(this.proSoar.task.getCurrentTurnpoint()).replaces(
          $('task-turnpoint-' + (this.proSoar.task.getPosition()-1)) );
      } while (this.proSoar.task.previous() && this.proSoar.task.getPosition() != position);

      $('task-turnpoint-' + (position+1)).grab(
        this.prepareTPInfo(this.proSoar.task.getCurrentTurnpoint()), 'before' );

    } else if (currentNumTP < previousNumTP) {
      // delete from the list

      $('task-turnpoint-' + position).destroy();

      if (position == previousNumTP) {
        this.proSoar.task.last();
        this.prepareTPInfo(this.proSoar.task.getCurrentTurnpoint()).replaces(
          $('task-turnpoint-' + (this.proSoar.task.getPosition())) );
      } else {
        this.proSoar.task.gotoTurnpoint(position);

        do {
        this.prepareTPInfo(this.proSoar.task.getCurrentTurnpoint()).replaces(
          $('task-turnpoint-' + (this.proSoar.task.getPosition()+1)) );
        } while (this.proSoar.task.next());
      }

    } else {
      // only TP change
      this.proSoar.task.gotoTurnpoint(position);

      if (action == 'modify') {
        this.prepareTPInfo(this.proSoar.task.getCurrentTurnpoint()).replaces(
          $('task-turnpoint-' + position) );

      } else if (action == 'move') {
        this.prepareTPName(this.proSoar.task.getCurrentTurnpoint()).replaces(
          $('task-turnpoint-name-' + position) );
      }
    }

    if (this.proSoar.task.getLength() > 1) {
      this.displayTaskDistance();
    }

    this.proSoar.task.gotoTurnpoint(pos_restore);
  },

  clear: function() {
    $('task-turnpoints').empty();
  },

  prepareTPName: function(turnpoint) {
    var tpNameString;

    switch (turnpoint.getPosition()) {
      case 1:
        tpNameString = _("Start") + ":&nbsp;"; break;
      case this.proSoar.task.getLength():
        tpNameString = _("Finish") + ":&nbsp;"; break;
      default:
        tpNameString = _("TP") + "&nbsp;" + (turnpoint.getPosition()-1) + ":&nbsp;";
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
      html: "<img class='turnpoint-img' src='images/sector_" + turnpoint.getSector().getType() + ".png' width='40' height='40' />",
      events: {
        mouseover: function(e) {
          this.proSoar.sectorHoverIn(turnpoint.getSector().getId());
          $("task-turnpoint-" + turnpoint.getPosition()).getElement('.turnpoint-img').setStyle('opacity', '0.2');
          $("task-turnpoint-modifier-" + turnpoint.getPosition()).setStyle('visibility', 'visible');
        }.bind(this),
        mouseout: function(e) {
          this.proSoar.sectorHoverOut(turnpoint.getSector().getId());
          $("task-turnpoint-modifier-" + turnpoint.getPosition()).setStyle('visibility', 'hidden');
          $("task-turnpoint-" + turnpoint.getPosition()).getElement('.turnpoint-img').setStyle('opacity', '1');
        }.bind(this),
        click: function() { return this.proSoar.editTurnpoint(turnpoint.getSector().getId()); }.bind(this)
      }
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

    tpInfo.grab(this.createTPModifier(turnpoint));

    return tpInfo;
  },

  createTPModifier: function(turnpoint) {

    var tpModifier = new Element('div', {
      id: "task-turnpoint-modifier-" + turnpoint.getPosition(),
      'class': "turnpoint-modifier",
      styles: {
        'visibility': 'hidden'
      }
    });

    if (turnpoint.getPosition() != 1) {
      tpModifier.grab(new Element('img', {
        id: "task-turnpoint-modifier-up-" + turnpoint.getPosition(),
        'class': "turnpoint-modifier-up",
        src: "images/turnpoint_up.png",
        events: {
          click: function(e) {
            this.proSoar.moveTurnpointUp(turnpoint.getPosition());
            return false;
          }.bind(this)
        }
      }) );
    }

    if (turnpoint.getPosition() != this.proSoar.task.getLength()) {
      tpModifier.grab(new Element('img', {
        id: "task-turnpoint-modifier-down-" + turnpoint.getPosition(),
        'class': "turnpoint-modifier-down",
        src: "images/turnpoint_down.png",
        events: {
          click: function(e) {
            this.proSoar.moveTurnpointDown(turnpoint.getPosition());
            return false;
          }.bind(this)
        }
      }) );
    }

    tpModifier.grab(new Element('img', {
      id: "task-turnpoint-modifier-delete-" + turnpoint.getPosition(),
      'class': "turnpoint-modifier-delete",
      src: 'images/turnpoint_remove.png',
      events: {
        click: function(e) {
          this.proSoar.removeTaskTurnpoint(turnpoint.getPosition());
          return false;
        }.bind(this)
      }
    }) );

    return tpModifier;
  },

  displayTaskDistance: function() {
    var distance = this.proSoar.task.getTotalDistance();

    $('task-total-distance').set('text', distance + " km");

    var faiDistance = this.proSoar.task.getFaiTriangle().isFAI?this.proSoar.task.getFaiTriangle().distance:0;
    faiDistance = Math.round(faiDistance/100)/10;

    $('task-is-fai').set('text', faiDistance?_('FAI triangle') + ' ('+faiDistance+' km)':'');
  }

});
