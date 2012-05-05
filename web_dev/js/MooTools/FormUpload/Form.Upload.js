/*
---

name: Form.Upload
description: Create a multiple file upload form
license: MIT-style license.
authors: Arian Stolwijk
requires: [Form.MultipleFileInput, Request.File]
provides: Form.Upload

...
*/

if (!this.Form) this.Form = {};

Form.Upload = new Class({

	Implements: [Options, Events],

	options: {
	},

	initialize: function(input, options){
		input = this.input = document.id(input);

		this.setOptions(options);

		// Our modern file upload requires FormData to upload
		if ('FormData' in window) this.modernUpload(input);
		else this.legacyUpload(input);
	},

	modernUpload: function(input){

		this.modern = true;
		
		var form = input.getParent('form');
		if (!form) return;

		var self = this,

			progress = new Element('div.progress')
				.setStyle('display', 'none').inject(input, 'after'),
			
                        uploadReq = new Request.File({
				url: form.get('action'),
				onRequest: progress.setStyles.pass({display: 'block', width: 0}, progress),
				onProgress: function(event){
					var loaded = event.loaded, total = event.total;
					progress.setStyle('width', parseInt(loaded / total * 100, 10).limit(0, 100) + '%');
				},
				onComplete: function(){
					progress.setStyle('width', '100%');
					self.fireEvent('complete', arguments);
					this.reset();
				}
			}),

			inputname = input.get('name');

		form.addEvent('submit', function(event){
			event.preventDefault();
			//uploadReq.append(inputname, $('waypoint-upload-file').files[0]);
			uploadReq.append(inputname, input.files[0]);
			if (self.options.data)
				Object.each(self.options.data, function(item, key, object) {
					uploadReq.append(key, item);
				});
			uploadReq.send();
		});

	},

	legacyUpload: function(input){

		var form = input.getParent('form');
		if (!form) return;

		var self = this;

		if (self.options.data)
			Object.each(self.options.data, function(item, key, object) {
				form.grab(new Element('input', {
					type: 'hidden',
					style: 'visibility: hidden',
					name: key,
					value: item,
				}) );
			});

		var iFrame = new iFrameFormRequest(form, {
                  onComplete: function(response) {
                    self.fireEvent('complete', response);
                  }
                });
	},

	isModern: function(){
		return !!this.modern;
	}

});
