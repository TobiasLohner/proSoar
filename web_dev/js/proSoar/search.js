var SearchBox = new Class({

  initialize: function(proSoar) {
    this.proSoar = proSoar;

    if (document.body.getElementById('search-box')) return;

    this.show();

    $('buttonbar-search').addEvent('mouseout', function(e) {
      this.timer = this.close.delay(5000, this);
    }.bind(this));
  },

  show: function() {
    this.searchDiv = new Element('div', {
      id: 'search-box',
      'class': 'search-box',
      styles: {
        'z-index': 9999
      },
      events: {
        'mouseover': function(e) {
          clearTimeout(this.timer);
        }.bind(this),
        'mouseout': function(e) {
          this.timer = this.close.delay(5000, this);
        }.bind(this),
        'keydown': function(e) {
          if (e.key == 'esc') this.close();
          else {
            clearTimeout(this.timer);
            this.timer = this.close.delay(5000, this);
          }
        }.bind(this)
      }
    });

    var searchBox = new Element('input', {
      id: 'search-box-input',
      placeholder: "Press ENTER to search",
      type: 'text',
      events: {
        'keydown': function(e) {
          if (e.key == 'enter') this.search();
          else {
            clearTimeout(this.timer);
            this.timer = this.close.delay(5000, this);
          }
        }.bind(this),
        'focus': function(e) {
          this.proSoar.map.deactivateKeyboardControls();
        }.bind(this),
        'blur': function(e) {
          this.proSoar.map.activateKeyboardControls();
        }.bind(this)
      }
    });

    this.searchDiv.grab(searchBox);
    this.searchDiv.inject(document.body);
    
    this.searchDiv.position({
        relativeTo: 'buttonbar-search',
        position: 'centerLeft',
        edge: 'centerRight',
        offset: { x: -20, y: 0 }
    });

    searchBox.focus();
  },

  close: function() {
    this.searchDiv.dispose();
    this.proSoar.map.activateKeyboardControls();
  },

  search: function() {
    var searchString = this.searchDiv.getElementById('search-box-input').value;
    var bbox = this.proSoar.map.getExtent();

    var jsonRequest = new Request.JSON({
      url: 'search/' + bbox + '/' + encodeURIComponent(searchString),
      async: false,
      secure: true,
      method: 'get'
    });
    
    var result = jsonRequest.send();

    if (result.status == 200 && result.response.json[0]) {
      var res = result.response.json[0];
      this.proSoar.map.panTo(res.lon, res.lat);
    }

    this.close();
  }

});
