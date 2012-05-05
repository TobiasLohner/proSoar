/*
---
description: Stylish and functional dialogs.
license: MIT
copyright: Copyright (c) 2011 by Max Lavrov (lavmax).
authors: Max Lavrov (lavmax)
requires: core/1.3: '*'
provides: [MUX.Dialog, MUX.Button]
...
*/

MUX = window.MUX || {};

MUX.Dialog = new Class({
	
    Implements: [Options, Events],

	options: {
		title: '',
		modal: true,
		resizable: false,
		closable: true,
		autoOpen: true,
		showHeader: true,
		showFooter: 'auto',
		size: {},
		position: {
			left: 'center',
			top: 'auto'
		},
		loader: 'auto',
		buttons: [],
		defaultButton: undefined
	},
	
	zIndex: 10001,
	
	initialize: function(options) {
		
        this.setOptions(options);
		
		// Initialize self variable to be available in scope for event handlers
		var self = this;
		
		// Property to manage opening when content is loaded
		this.openOnContentLoad = false;
		
		// Initialize modal overlay element
		if (this.options.modal)
		{
			this.modalOverlay = new Element('div', {
				'class': 'mux-modal-overlay'
			});
		}
		
		// Initialize window box element
		this.box = new Element('div', {
			'class': 'mux-dialog-box',
			tabIndex: -1
		});
		this.box.innerHTML = '<div class="mux-dialog-header"><span class="mux-dialog-header-dummy-title">&nbsp;</span><span class="mux-dialog-header-title"></span><span class="mux-dialog-header-close"></span></div><div class="mux-dialog-dummy-header"></div><div class="mux-dialog-content"></div><div class="mux-dialog-footer"><div class="mux-dialog-footer-border"></div><div class="mux-dialog-footer-buttons"></div></div><div class="mux-dialog-resize-icon mux-hidden"></div>';
		
		// Define instance properties
		this.header = this.box.getElement('.mux-dialog-header');
		this.content = this.box.getElement('.mux-dialog-content');
		this.footer = this.box.getElement('.mux-dialog-footer');
		
		// Set close button click heandler and ESC handler if closable
		if (this.options.closable)
		{
			this.header.getElement('.mux-dialog-header-close').addEvents({
				click: function(event) {
					event.stop();
					self.close();
				},
				mousedown: function(event) {
					event.stopPropagation();
				}
			});
			
			// Esc handler
			this.box.addEvent('keydown', function(event) {
				if (event.key === 'esc')
				{
					event.stop();
					self.close();
				}
			});
		}
		else // Remove close button from the header
		{
			this.header.getElement('.mux-dialog-header-close').destroy();
		}
		
		// Set handler when focused and lost focus.
		// This third parameter is important but Mootools can't get it,
		// so use vanilla javascript addEventListener
		if (this.box.addEventListener) // For normal browsers
		{
			this.box.addEventListener('focus', function(event) {
				this.addClass('mux-dialog-focused');
				self.moveToTop();
			}, true);
			this.box.addEventListener('blur', function(event) {
				// Mac OS cheating. If button is pressed don't remove 
				// focused class to avoid bliking window's header.
				//if (!Browser.Platform.mac || !self.buttonIsPressed)
					this.removeClass('mux-dialog-focused');
			}, true);
		}
		else // For IE (browsers without addEventListener support) always looks "focused"
		{
			this.box.addEvent('mousedown', function(event) {
				this.addClass('mux-dialog-focused');
				self.moveToTop();
			});
		}
		
		// Show/hide header
		if (this.options.showHeader === true)
			; // Do nothing, header is visible by default.
		else if (this.options.showHeader === 'invisible')
		{
			this.header.addClass('mux-dialog-header-invisible');
			this.content.addClass('mux-dialog-header-invisible');
		}
		else // False or not defined.
			this.header.addClass('mux-hidden');
			
		// Add header events to handle window drag and to prevent selecting text in header
		// This need for drag to avoid cursor changing and to for nice behavior.
		this.header.addEvents({
			mousedown: this._dragStart.bind(this),
			selectstart: function (event) {event.preventDefault()}
		});
		
		// Set title
		this.header.getElement('.mux-dialog-header-title').set('text', this.options.title);
		
		// Set content size for resizable window
		if (this.options.resizable)
		{
			if (this.options.size.x)
				this.content.setStyle('width', this.options.size.x);
	
			if (this.options.size.y)
				this.content.setStyle('height', this.options.size.y);
		}
		
		// Handle loader animation
		var buttonsContainer = this.footer.getElement('.mux-dialog-footer-buttons');
		if (MUX.Loader && (this.options.loader === 'auto' || this.options.loader === 'manual'))
		{
			var LoaderClass = MUX.Loader.Circles || MUX.Loader.Well || MUX.Loader.Radar || MUX.Loader.Bar;
			this.loader = new LoaderClass({
				delay: 70, mode: 'in'
			});
			$(this.loader).inject(new Element('li.mux-dialog-loader').inject(buttonsContainer));
		}
		
		// Show/hide footer
		if (this.options.showFooter === 'auto')
		{
			if (!this.options.buttons.length && !this.options.footer)
				this.footer.addClass('mux-hidden');
		}
		else if (this.options.showFooter !== true)
			this.footer.addClass('mux-hidden');
/*			
		// Set buttons or footer content
		this.buttons = [];
		if (this.options.buttons.length)
		{
			for (var i = 0; i < this.options.buttons.length; i++)
			{
				if (this.options.buttons[i].click === 'close')
					var buttonClick = this.close.bind(this, 0);
				else if (this.options.buttons[i].click === 'submit')
					var buttonClick = function(event)
					{
						if (self.loader && self.options.loader === 'auto')
							self.loader.start();
						
						self.fireEvent('submit');
					};
				else
					var buttonClick = this.options.buttons[i].click;
				
				var button = new MUX.Button({
					title: this.options.buttons[i].title,
					style: this.options.buttons[i].style ? this.options.buttons[i].style : 'auto',
					click: buttonClick,
					context: this.options.buttons[i].context?this.options.buttons[i].context:this
				});
				
				// Safari hack. Remember button pressed state.
				if (Browser.safari)
				{
					button.elem.addEvents({
						mousedown: function() {
								self.buttonIsPressed = true
							},
						// Set focus on the window when click a button, so ESC will work
						click: function() {
								self.buttonIsPressed = false;
								self.box.focus();
							},
						// To control the situation when user press mouse button and leave button without finishing click.
						mouseleave: function(event) {
							if (self.buttonIsPressed) {
								self.buttonIsPressed = false;
								self.box.focus();
							}
						}
					});
				}
				
				// Add button to the window
				button.elem.inject(buttonsContainer);
				this.buttons[i] = button;
			}
		} else */if (this.options.footer) {
                  buttonsContainer.grab(this.options.footer);
                }
		
		if (typeof this.options.defaultButton === 'number' || typeof this.options.defaultButton === 'string')
		{
			this.content.addEvent('keydown', function(event)
			{
				if (event.key === 'enter')
				{
					event.returnValue = false;
					self.buttons[self.options.defaultButton].fireEvent('click');
				}
			});
		}
		
		// Show resize triangle
		if (this.options.resizable)
		{
			this.box.getElement('.mux-dialog-resize-icon')
				.removeClass('mux-hidden')
				.addEvent('mousedown', function(event){self._resizeStart(event)});
			this.content.setStyle('overflow', 'auto');
		}
		
		this.firstOpen = true;
		if (this.options.autoOpen)
			this.open();
			
		return this;
	},
	
	toElement: function()
	{
		return this.box;
	},
	
	open: function()
	{
		// Wait for content loading if necessary
		if (typeof this.options.content === 'string')
		{
			this.openOnContentLoad = true;
			return;
		}
		
		// Show overlay if modal
		if (this.options.modal && this.modalOverlay)
			this.modalOverlay.inject(document.body);
		
		// Make window invisible to avoid blinking when positioning and styling.
		this.box.addClass('mux-invisible');
		this.box.inject(document.body);

		if (this.firstOpen)
		{
			this.content.adopt(this.options.content);
		
			// Set top/bottom margins depends on header and footer
			this.content.setStyles({
				'margin-top': this.header.getSize().y,
				'margin-bottom': this.footer.getSize().y
			});
			
			// Fix box width and height for resizable dialog
			if (this.options.resizable)
			{
				this.content.setStyles({
					width: this.content.getStyle('width'),
					height: this.content.getStyle('height')
				});
			
				this.box.setStyles({
					width: this.box.getStyle('width'),
					height: this.box.getStyle('height')
				});
			}
		}
		
		// Fire onOpen event after content is injected but before positioning and making visible
		var event = {
			preventDefault: function(){this.doNotOpen = true}
		}
		this.fireEvent('open', event);
		if (event.doNotOpen)
		{
			this.close();
			return;
		}
		
		this.firstOpen = false;
		
		this.moveToTop().position();
		
		this.box.removeClass('mux-invisible').fireEvent('mousedown');
		
		// Focus first editable element or window box itself
		var editable = this.content.getElement('textarea:not([disabled]), input:not([disabled]), select:not([disabled])');
		if (editable)
			editable.focus();
		else
			this.box.focus();

		return this;
	},
	
	close: function(delay)
	{
		if (delay) // Smoothly close the window
		{
			var self = this;
			this.box.set('tween', {onComplete: function() {self.close()}});			
			(function(){self.box.fade('out')}).delay(delay);
			return;
		}
		
		if (this.loader)
			this.loader.stop();
		
		this.box.dispose();
		
		if (this.options.modal && this.modalOverlay)
			this.modalOverlay.dispose();
		
		// If we have other open windows set focus to the last active one.
		var topWindow = null, topZ = 0;
		var allWindows = $(document.body).getElements('.mux-dialog-box');
		for (var i = 0; i < allWindows.length; i++)
		{
			var curZ = allWindows[i].getStyle('z-index');
			if (curZ > topZ)
			{
				topZ = curZ;
				topWindow = allWindows[i];
			}
		}
		if (topWindow)
			topWindow.focus();
		
		this.fireEvent('close');
	},
	
	position: function()
	{
		var top = 0, left = 0;
		var windowSize = this.box.getSize();
		var browserWindowSize = $(window).getSize();
	
		// Calculate top window position
		var centerTop = browserWindowSize.y / 2 - windowSize.y / 2;
		if (this.options.position.top === 'auto')
			top = Math.min(100, centerTop); // We believe that 100px top position looks better than centered vertical window
		else if (this.options.position.top === 'center')
			top = centerTop;
		else
			top = options.position.top;
			
		// Calculate left window position
		if (this.options.position.left === 'center')
			left = browserWindowSize.x / 2 - windowSize.x / 2;
		else
			left = options.position.top;
		
		// Eliminate negative values
		top = Math.max(0, Math.round(top));
		left = Math.max(0, Math.round(left));

		// Set window position and show
		this.box.setPosition({x: left, y: top});

		return this;
	},
	
	moveToTop: function()
	{
		if (this.box.getStyle('z-index') < MUX.Dialog.prototype.zIndex)
		{
			MUX.Dialog.prototype.zIndex += 1;
			this.box.setStyle('z-index', MUX.Dialog.prototype.zIndex);
			
			if (this.options.modal && this.modalOverlay)
				this.modalOverlay.setStyle('z-index', MUX.Dialog.prototype.zIndex);
		}
		return this;
	},
	
	_resizeStart: function(event)
	{
		if (event.rightClick) return;

		event.preventDefault();
		var self = this;
		
		var position = this.box.getPosition();
		var browser = $(window).getSize();

		MUX.Dialog.currentDialogParams = {
			box: this.box,
			content: this.content,
			mouse: {
				x: event.client.x,
				y: event.client.y
			},
			sizeLimits: {
				minX: this.box.getStyle('min-width').toInt() + 1,// this.box.getStyle('border-width').toInt() * 2,
				minY: this.box.getStyle('min-height').toInt() + 1,// - this.box.getStyle('border-width').toInt() * 2,
				maxX: browser.x - position.x - this.box.getStyle('border-width').toInt() * 2,
				maxY: browser.y - position.y - this.box.getStyle('border-width').toInt() * 2
			},
			contentDiff: {
				x: this.box.getStyle('width').toInt() - this.content.getStyle('width').toInt(),
				y: this.box.getStyle('height').toInt() - this.content.getStyle('height').toInt()
			}
		};
		
		// Special hack for a lovely IE. We detect min dimensions like a size of an empty window.
		if (Browser.ie) 
		{
			new MUX.Dialog({
				modal: false,
				showHeader: this.options.showHeader,
				showFooter: this.options.showFooter === true || (this.options.showFooter === 'auto' && this.buttons.length),
				onOpen: function(event){
					event.preventDefault();
					MUX.Dialog.currentDialogParams.sizeLimits.minX = this.box.getSize().x;
					MUX.Dialog.currentDialogParams.sizeLimits.minY = this.box.getSize().y;
				}
			});
		}
		
		$(document).addEvents({
			mousemove: MUX.Dialog._resizing,
			mouseup: MUX.Dialog._resizeEnd
		});
	},
	
	_dragStart: function (event)
	{
		if (event.rightClick) return;
		
		MUX.Dialog.currentDialogParams = {
			box: this.box,
			mouse: {
				x: event.client.x,
				y: event.client.y
			},
			browser: $(window).getSize()
		}
	
		$(document).addEvents({
			mousemove: MUX.Dialog._dragMoving,
			mouseup: MUX.Dialog._dragEnd
		});
		
	}
});
	
MUX.Dialog._resizing = function(event)
{
	event.preventDefault();

	var params = MUX.Dialog.currentDialogParams;

	var size = {
		x: params.box.clientWidth,
		y: params.box.clientHeight
	}
	
	var offset = {
		x: event.client.x - params.mouse.x,
		y: event.client.y - params.mouse.y
	}
	
	var newSize = {
		x: size.x + offset.x,
		y: size.y + offset.y
	}
	
	params.mouse = {
		x: event.client.x,
		y: event.client.y
	}
	
	// Eliminates resizing out of limits
	if (newSize.x <= params.sizeLimits.minX)
	{
		params.mouse.x -= newSize.x - params.sizeLimits.minX;
		newSize.x = params.sizeLimits.minX; 
	}
	if (newSize.y <= params.sizeLimits.minY)
	{
		params.mouse.y -= newSize.y - params.sizeLimits.minY;
		newSize.y = params.sizeLimits.minY;
	}
	if (newSize.x > params.sizeLimits.maxX)
	{
		params.mouse.x -= newSize.x - params.sizeLimits.maxX;
		newSize.x = params.sizeLimits.maxX;
	}
	if (newSize.y > params.sizeLimits.maxY)
	{
		params.mouse.y -= newSize.y - params.sizeLimits.maxY;
		newSize.y = params.sizeLimits.maxY;
	}
	
	params.box.setStyles({
		width: newSize.x,
		height: newSize.y
	});
	params.content.setStyles({
		width: newSize.x - params.contentDiff.x,
		height: newSize.y - params.contentDiff.y
	});
}
	
MUX.Dialog._resizeEnd = function(event)
{
	MUX.Dialog.currentDialogParams = {};
	
	$(document).removeEvents({
		mousemove: MUX.Dialog._resizing,
		mouseup: MUX.Dialog._resizeEnd
	});	
}

MUX.Dialog._dragMoving = function (event)
{
	event.preventDefault();

	var params = MUX.Dialog.currentDialogParams;

	params.box.addClass('mux-dialog-moving');
	
	var coord = params.box.getCoordinates();
	
	// Calculate new box's position
	var newBoxPosition = {
		x: coord.left + event.client.x - params.mouse.x,
		y: coord.top + event.client.y - params.mouse.y
	}
	
	params.mouse = {
		x: event.client.x,
		y: event.client.y
	}
	
	var boundaryCoord = {
		minX: 0,
		minY: 0,
		maxX: params.browser.x - coord.width,
		maxY: params.browser.y - coord.height
	}
	
	// Eliminate moving out of the top window's boundary
	if (newBoxPosition.y < boundaryCoord.minY)
	{
		params.mouse.y -= newBoxPosition.y - boundaryCoord.minY;
		newBoxPosition.y = boundaryCoord.minY;
	}
	
	// Eliminate moving out of the right window's boundary
	if (newBoxPosition.x > boundaryCoord.maxX)
	{
		params.mouse.x -= newBoxPosition.x - boundaryCoord.maxX;
		newBoxPosition.x = boundaryCoord.maxX;
	}
	
	params.box.setStyles({
		left: newBoxPosition.x,
		top: newBoxPosition.y
	});
}

MUX.Dialog._dragEnd = function (event)
{
	MUX.Dialog.currentDialogParams.box.removeClass('mux-dialog-moving');
	MUX.Dialog.currentDialogParams = {};

	$(document).removeEvents({
		mousemove: MUX.Dialog._dragMoving,
		mouseup: MUX.Dialog._dragEnd
	});	
}

// In this function we create a new scope for button handler function
// and run click handler in a context of window object.
MUX.Dialog.getButtonHandler = function(winObj, i, handler)
{
	return function(event) {
		winObj['buttonClick' + i] = handler;
		winObj['buttonClick' + i](event);
	}
}


MUX.Button = new Class({
	
	Implements: Options,
	
	options: {
		title: '',
		click: null,
		context: null,
		style: 'auto' /*'link', 'ellipse', 'rectangle', 'native'*/
	},
	
	initialize: function(options) {
		
		this.setOptions(options);
		
		this.elem = new Element('button', {
			role: 'button',
			'class': 'mux-button'
		});
		
		var self = this;
		
		var icon = new Element('span', {'class': 'mux-button-icon'});
		var title = new Element('span', {'class': 'mux-button-title'});
		title.set('text', this.options.title);
		
		this.elem.adopt([icon, title]);
		
		if (this.options.style === 'ellipse')
			this.elem.addClass('mux-button-ellipse');
		else if (this.options.style === 'rectangle')
			this.elem.addClass('mux-button-rectangle');
		else if (this.options.style === 'link')
			this.elem.addClass('mux-button-link');
		else if (this.options.style === 'auto')
			if (Browser.Platform.mac)
				this.elem.addClass('mux-button-ellipse');
			else if (!Browser.ie || Browser.version > 8)
				this.elem.addClass('mux-button-rectangle');
		// Otherwise 'native' browser's button
		
		if (this.options.click)
		{
			if (this.options.context)
				this.options.click = this.options.click.bind(this.options.context);
			this.elem.addEvent('click', this.options.click);
		}
	},
	
	toElement: function()
	{
		return this.elem;
	}
});
