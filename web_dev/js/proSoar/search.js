var SearchBox = new Class({

  initialize: function(proSoar) {
    this.proSoar = proSoar;

    if ($(document.body).getElementById('search-box') != null) {
      if ($(document.body).getElementById('search-box-error') == null)
        return;
      else
        $(document.body).getElementById('search-box').destroy();
    }

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
          this.timer = this.close.delay(5000, this);
        }.bind(this),
        'mouseout': function(e) {
          clearTimeout(this.timer);
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
      placeholder: _("Press ENTER to search"),
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
//          this.proSoar.map.activateKeyboardControls();
        }.bind(this)
      }
    });

    this.searchDiv.grab(searchBox);
    this.searchDiv.inject(document.body);
/*
    this.searchDiv.position({
        relativeTo: 'buttonbar-search',
        position: 'centerLeft',
        edge: 'centerRight',
        offset: { x: -20, y: 0 }
    });
*/
    searchBox.focus();
  },

  close: function() {
    this.searchDiv.destroy();
    this.proSoar.map.activateKeyboardControls();
  },

  search: function() {
    var searchString = this.searchDiv.getElementById('search-box-input').value;
    var bbox = this.proSoar.map.getExtent();

    this.searchDiv.empty();
    this.searchDiv.grab(new Element('p', {
      id: 'search-box-searching',
      html: '<b>' + _("Searching") + '...</b>'
    }));

    var jsonRequest = new Request.JSON({
      url: 'search/' + bbox + '/' + encodeURIComponent(searchString),
      async: true,
      secure: true,
      method: 'get',
      onSuccess: function(data) {
        if (data[0]) {
          this.proSoar.map.panTo(data[0].lon, data[0].lat, data[0].boundingbox);
          this.close();
        } else {
          this.displayError();
        }
      }.bind(this),
      onError: function(data) {
        this.displayError();
      }.bind(this),
    });

    var result = jsonRequest.send();
  },

  displayError: function() {
    this.searchDiv.empty();
    this.searchDiv.grab(new Element('p', {
      id: 'search-box-error',
      html: '<b>' + _("Nothing found") + '</b>'
    }));
    this.close.delay(3000, this);
  }

});
