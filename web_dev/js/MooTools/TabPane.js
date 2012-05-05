/*
---
description: TabPane Class 

license: MIT-style

authors: akaIDIOT

version: 0.4

requires:
  core/1.4:
  - Class
  - Class.Extras 
  - Event
  - Element 
  - Element.Event
  - Element.Delegation

provides: TabPane
...
*/

(function() {

var typeOf = this.typeOf;

if (!typeOf) {
	typeOf = $type;
}

var TabPane = this.TabPane = new Class({
    
    Implements: [Events, Options],

    options: {
        tabSelector: '.tab',
        contentSelector: '.content',
        activeClass: 'active'
    },

    container: null,

    initialize: function(container, options, showNow) {
        this.setOptions(options);

        this.container = document.id(container);
        this.container.getElements(this.options.contentSelector).setStyle('display', 'none');

        this.container.addEvent('click:relay(' + this.options.tabSelector + ')', function(event, tab) {
            this.showTab(this.container.getElements(this.options.tabSelector).indexOf(tab), tab);
        }.bind(this));

        if (typeOf(showNow) == 'function') {
            showNow = showNow();
        } else {
            showNow = showNow || 0;
        }

        this.showTab(showNow);
    },

    showTab: function(index, tab) {
        var content = this.container.getElements(this.options.contentSelector)[index];
        if (!tab) {
            tab = this.container.getElements(this.options.tabSelector)[index];
        }

        if (content) {
            this.container.getElements(this.options.tabSelector).removeClass(this.options.activeClass);
            this.container.getElements(this.options.contentSelector).setStyle('display', 'none');
            tab.addClass(this.options.activeClass);
            content.setStyle('display', 'block');
            this.fireEvent('change', index);
        } 
    },

    closeTab: function(index) {
        var tabs     = this.container.getElements(this.options.tabSelector);
        var selected = tabs.indexOf(this.container.getElement('.' + this.options.activeClass)); // is always equals to index 
        
        tabs[index].destroy();
        this.container.getElements(this.options.contentSelector)[index].destroy();
        this.fireEvent('close', index);

        // 'intelligently' selecting a tab is sadly not possible, the tab has already been switched before this method is called 
        this.showTab(index == tabs.length - 1 ? selected - 1 : selected);
    }

});

})();
