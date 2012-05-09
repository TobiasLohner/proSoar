window.addEvent('domready', function() {
  var classes = ['ProSoar', 'Task', 'FAI', 'MapWindow', 'Sector', 'Settings', 
                 'TaskStore', 'Turnpoint', 'Waypoint', 'WaypointContainer',
                 'RTree', 'SearchBox'];

  this.timer = null;

  var checkLoadStatus = function() {
    ready = true;
    for (var i = 0; i < classes.length; i++) {
      if (typeof(window[classes[i]]) != 'function')
        ready = false;
    }

    if (this.timer && ready) {
      clearInterval(this.timer);
      init();
    }
  }.bind(this);

  this.timer = checkLoadStatus.periodical(50);

});

var proSoar;

function init() {

  collabsible();
  proSoar = new ProSoar();

  window.addEvent('resize', function() {

    if (timer)
      $clear(timer);

    var timer = ( function() {

      // determine maximum height
      var max_height = $$('#menu')[0].getSize().y;
      $$('#menu li h3').getSize().each( function(object, i) {
        max_height -= object.y;
      });

      max_height -= 12; // adjust for (3 times upper and lower) margin of h3

      $$('#menu li div.collapse').each( function(object, i) {
        object.setStyle('height', max_height);
      });
    }).delay(50);
  });


}

// collapsible menu
function collabsible() {

  // determine maximum height
  var max_height = $$('#menu')[0].getSize().y;
  $$('#menu li h3').getSize().each( function(object, i) {
    max_height -= object.y;
  });

  max_height -= 12; // adjust for (3 times upper and lower) margin of h3

  var list = $$('#menu li div.collapse');
  var headings = $$('#menu li h3.collapse');
  var collapsibles = new Array();
//console.log(max_height);

  list.each( function(object, i) {
    object.setStyle('height', max_height);
  });

  headings.each( function(heading, i) {
    var collapsible = new Fx.Slide(list[i], {
//      resetHeight: true,
      duration: 500,
      transition: Fx.Transitions.quadIn
    });

    collapsibles[i] = collapsible;
    heading.onclick = function() {
//      console.log("toggle");
      for(var j = 0; j < collapsibles.length; j++){
        if(j!=i) {
          collapsibles[j].slideOut();
        }
      }

      collapsible.toggle();
      return false;
    }

//    if (i != 0)
      collapsible.hide();

    if (i == 0) collapsible.toggle();
  });
}

