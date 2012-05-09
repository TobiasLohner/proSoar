var dlgEditTurnpoints = new Class({

  Implements: Events,

  initialize: function(proSoar, sectorId) {
    this.proSoar = proSoar;

    if (this.proSoar.dialogOverlay || this.proSoar.map.taskDrawLine.active) return;

    var position = 0;

    this.proSoar.task.first();
    do {
      if (this.proSoar.task.getCurrentTurnpoint().getSector().getId() == sectorId)
        position = this.proSoar.task.getPosition();
    } while (this.proSoar.task.next());


    this.dialog = new MUX.Dialog({
      modal: false,
      title: 'Task',
      content: this.prepareContent(position), //new Element('p', { html: 'sadf ' + sectorId }),
      footer: this.prepareTpEditButtons(),
      autoOpen: false,
      onClose: function() { this.close(); }.bind(this)
    });

    this.proSoar.map.selectTurnpointSector(sectorId);
    this.dialog.open();
    this.dialog.moveToTop();

    this.proSoar.map.deactivateKeyboardControls();
    this.proSoar.dialogOverlay = true;
  },

  close: function() {
    this.proSoar.map.unselectTurnpointSector();
    this.proSoar.map.activateKeyboardControls();
    this.proSoar.dialogOverlay = false;
  },

  cancel: function() {
    this.dialog.close();
  },

  prepareContent: function(position) {
    var tpTabContainer = new Element('ul');

    tpTabContainer.appendChild(new Element('li', {
      html: _('General')
    }) );

    var tpForm = new Element('div');
    tpForm.setAttribute('class', 'dialog-tabs');

    tpForm.appendChild(this.prepareTaskOptionsTab(_('General Task Options')));

    this.proSoar.task.first();

    do {
      var turnpoint = this.proSoar.task.getCurrentTurnpoint();

      {
        var tpName;
        switch (turnpoint.getPosition()) {
          case 1:
            tpName = _("Start"); break;
          case this.proSoar.task.getLength():
            tpName = _("Finish"); break;
          default:
            tpName = _("TP") + "&nbsp;" + (turnpoint.getPosition()-1);
        }

        tpTabContainer.appendChild(new Element('li', {
         html: tpName
        }) );
      }

      tpForm.appendChild(this.prepareTpEditTab(turnpoint));

    } while (this.proSoar.task.next());

    tpTabContainer.appendChild(document.createElement('hr'));
    tpForm.insertBefore(tpTabContainer, tpForm.firstChild);

    var tabPane = new TabPane(tpForm, {
      tabSelector: 'li',
      contentSelector: 'p'
      }, position);

    tabPane.addEvent('change', function(e) {
      if (e == 0) return;

      if ($('task-turnpoint-edit-' + e + '-type').value != $('task-options-tab-fields-type').value) {
        this.proSoar.task.gotoTurnpoint(e);
        this.prepareTpEditTab(this.proSoar.task.getCurrentTurnpoint()).replaces($("task-turnpoint-edit-" + e));
      }
    }.bind(this));

    return tpForm;

  },

  prepareTaskOptionsTab: function(title) {
    var tab = new Element('p', {
      id: "task-options-tab",
      'class': "tp-edit",
      html: "<span class='title'>"+title+"</span><br />"
    });

    var taskOptionsFields = new Element('fieldset', {
      id: "task-options-tab-fields",
      'class': "fields"
    });

    var taskOptionsFieldsLine = new Element('div', {
      html: "<label for='task-options-tab-fields-type'>" + _("Task type") + ":</label>"
    });

    var taskOptionsFieldsType = new Element('select', {
      id: "task-options-tab-fields-type"
//      'class': "sector",
    });

    for (var prop in Task.prototype.types) {
      var taskTypeOption = document.createElement('option');
      if (this.proSoar.task.getType() == prop)
        taskTypeOption.setAttribute('selected', 'selected');

      taskTypeOption.setAttribute('value', prop);
      taskTypeOption.innerHTML = Task.prototype.types[prop].name;
      taskOptionsFieldsType.appendChild(taskTypeOption);
    }

    taskOptionsFieldsLine.appendChild(taskOptionsFieldsType);
    taskOptionsFields.appendChild(taskOptionsFieldsLine);

    tab.appendChild(taskOptionsFields);

    return tab;
  },

  prepareTpEditTab: function(turnpoint) {
    var tpName = turnpoint.getWaypointName(); //turnpoint.getWaypointId()?
//      this.waypoints.getById(turnpoint.getWaypointId()).getName():"Free turnpoint";

    var tab = new Element('p', {
      id: "task-turnpoint-edit-" + turnpoint.getPosition(),
      'class': "tp-edit",
      html: "<span class='title'>" + tpName + "</span><br />"
    });

    var tpCoordinates = OpenLayers.Util.getFormattedLonLat(turnpoint.getLat(), "lat", "dms") + "&nbsp;" +
      OpenLayers.Util.getFormattedLonLat(turnpoint.getLon(), "lon", "dms");

    tab.innerHTML += "<span class='coordinates'>" + tpCoordinates + "</span><br />";

    var tpSectorFields = new Element('fieldset', {
      id: "task-turnpoint-sector-edit-" + turnpoint.getPosition(),
      'class': "fields"
    });

    var tpSectorFieldsLine = new Element('div', {
      html: "<label for='task-turnpoint-edit-" + turnpoint.getPosition()+ "-sector'>" + _("Sector type") + ":</label>"
    });

    var tempTaskType = $('task-options-tab-fields-type')?$('task-options-tab-fields-type').value:this.proSoar.task.getType();

    var tpSectorTaskType = new Element('input', {
      id: "task-turnpoint-edit-" + turnpoint.getPosition()+ "-type",
      'type': 'hidden',
      'value': tempTaskType
    });


    var tpSectorSelect = new Element('select', {
      id: "task-turnpoint-edit-" + turnpoint.getPosition()+ "-sector",
      'class': "sector"
    });

    for (var prop in Sector.prototype.types) {
      var tpSectorSelectOption = document.createElement('option');
      switch (turnpoint.getPosition()) {
        case 1:
          if (Task.prototype.types[tempTaskType].start[prop]) {
            if (turnpoint.getSector().getType() == prop)
              tpSectorSelectOption.setAttribute('selected', 'selected');

            tpSectorSelectOption.setAttribute('value', prop);
            tpSectorSelectOption.innerHTML = Sector.prototype.types[prop].name;
            tpSectorSelect.appendChild(tpSectorSelectOption);
          }
          break;

        case this.proSoar.task.getLength():
          if (Task.prototype.types[tempTaskType].finish[prop]) {
            if (turnpoint.getSector().getType() == prop)
              tpSectorSelectOption.setAttribute('selected', 'selected');

            tpSectorSelectOption.setAttribute('value', prop);
            tpSectorSelectOption.innerHTML = Sector.prototype.types[prop].name;
            tpSectorSelect.appendChild(tpSectorSelectOption);
          }
          break;

        default:
          if (Task.prototype.types[tempTaskType].sectors[prop]) {
            if (turnpoint.getSector().getType() == prop)
              tpSectorSelectOption.setAttribute('selected', 'selected');

            tpSectorSelectOption.setAttribute('value', prop);
            tpSectorSelectOption.innerHTML = Sector.prototype.types[prop].name;
            tpSectorSelect.appendChild(tpSectorSelectOption);
          }
          break;
      }
    }

    tpSectorFieldsLine.appendChild(tpSectorTaskType);
    tpSectorFieldsLine.appendChild(tpSectorSelect);
    tpSectorFields.appendChild(tpSectorFieldsLine);

    tpSectorFieldsLine = new Element('div', {
      id: "task-turnpoint-edit-line-" + turnpoint.getPosition()+ "-radius",
      html: "<label for='task-turnpoint-edit-" + turnpoint.getPosition()+ "-radius'>" + _("Radius") + ":</label>",
      styles: {
        visibility: Sector.prototype.types[turnpoint.getSector().getType()].radius?'visible':'hidden'
      }
    });

    var tpSectorRadius = new Element('input', {
      id: "task-turnpoint-edit-" + turnpoint.getPosition()+ "-radius",
      'class': "radius"
    });
    tpSectorRadius.setAttribute('value', turnpoint.getSector().getRadius());

    tpSectorFieldsLine.appendChild(tpSectorRadius);
    tpSectorFieldsLine.innerHTML += _("&nbsp;km");
    tpSectorFields.appendChild(tpSectorFieldsLine);


    tpSectorFieldsLine = new Element('div', {
      id: "task-turnpoint-edit-line-" + turnpoint.getPosition()+ "-innerradius",
      html: "<label for='task-turnpoint-edit-" + turnpoint.getPosition()+ "-innerradius'>" + _("Inner Radius") + ":</label>",
      styles: {
        visibility: Sector.prototype.types[turnpoint.getSector().getType()].inner_radius?'visible':'hidden'
      }
    });

    var tpSectorInnerRadius = new Element('input', {
      id: "task-turnpoint-edit-" + turnpoint.getPosition()+ "-innerradius",
      'class': "radius"
    });
    tpSectorInnerRadius.setAttribute('value', turnpoint.getSector().getInnerRadius());

    tpSectorFieldsLine.appendChild(tpSectorInnerRadius);
    tpSectorFieldsLine.innerHTML += _("&nbsp;km");
    tpSectorFields.appendChild(tpSectorFieldsLine);


    tpSectorFieldsLine = new Element('div', {
      id: "task-turnpoint-edit-line-" + turnpoint.getPosition()+ "-startradial",
      html: "<label for='task-turnpoint-edit-" + turnpoint.getPosition()+ "-startradial'>" + _("Start Radial") + ":</label>",
      styles: {
        visibility: Sector.prototype.types[turnpoint.getSector().getType()].start_radial?'visible':'hidden'
      }
    });

    var tpSectorStartRadial = new Element('input', {
      id: "task-turnpoint-edit-" + turnpoint.getPosition()+ "-startradial",
      'class': "radius"
    });
    tpSectorStartRadial.setAttribute('value', turnpoint.getSector().getStartRadial());

    tpSectorFieldsLine.appendChild(tpSectorStartRadial);
    tpSectorFieldsLine.innerHTML += _("&nbsp;&deg;");
    tpSectorFields.appendChild(tpSectorFieldsLine);


    tpSectorFieldsLine = new Element('div', {
      id: "task-turnpoint-edit-line-" + turnpoint.getPosition()+ "-endradial",
      html: "<label for='task-turnpoint-edit-" + turnpoint.getPosition()+ "-endradial'>" + _("End Radial") + ":</label>",
      styles: {
        visibility: Sector.prototype.types[turnpoint.getSector().getType()].end_radial?'visible':'hidden'
      }
    });

    var tpSectorEndRadial = new Element('input', {
      id: "task-turnpoint-edit-" + turnpoint.getPosition()+ "-endradial",
      'class': "radius"
    });
    tpSectorEndRadial.setAttribute('value', turnpoint.getSector().getEndRadial());

    tpSectorFieldsLine.appendChild(tpSectorEndRadial);
    tpSectorFieldsLine.innerHTML += _("&nbsp;&deg;");
    tpSectorFields.appendChild(tpSectorFieldsLine);

    tpSectorSelect.addEvent('change', function(e) {
      if (Sector.prototype.types[e.target.value].radius)
        $("task-turnpoint-edit-line-" + turnpoint.getPosition()+ "-radius").setStyle('visibility', 'visible');
      else
        $("task-turnpoint-edit-line-" + turnpoint.getPosition()+ "-radius").setStyle('visibility', 'hidden');

      if (Sector.prototype.types[e.target.value].inner_radius)
        $("task-turnpoint-edit-line-" + turnpoint.getPosition()+ "-innerradius").setStyle('visibility', 'visible');
      else
        $("task-turnpoint-edit-line-" + turnpoint.getPosition()+ "-innerradius").setStyle('visibility', 'hidden');

      if (Sector.prototype.types[e.target.value].start_radial)
        $("task-turnpoint-edit-line-" + turnpoint.getPosition()+ "-startradial").setStyle('visibility', 'visible');
      else
        $("task-turnpoint-edit-line-" + turnpoint.getPosition()+ "-startradial").setStyle('visibility', 'hidden');

      if (Sector.prototype.types[e.target.value].end_radial)
        $("task-turnpoint-edit-line-" + turnpoint.getPosition()+ "-endradial").setStyle('visibility', 'visible');
      else
        $("task-turnpoint-edit-line-" + turnpoint.getPosition()+ "-endradial").setStyle('visibility', 'hidden');

    }.bind(this));


    tab.appendChild(tpSectorFields);
//    tab.appendChild(tpSectorButtons);


    return tab;

  },


  prepareTpEditButtons: function() {
    var tpSectorButtons = new Element('div', {
      'class': 'buttons'
    });

    var tpSectorAccept = new Element('button', {
      'class': 'button',
      'html': _('Accept'),
      events: {
        click: function() { return this.accept(); }.bind(this)
      }
    });
//    tpSectorAccept.setAttribute('onclick', 'javascript:proSoar.editTurnpointAccept()');
    tpSectorButtons.appendChild(tpSectorAccept);

    var tpSectorCancel = new Element('button', {
      'class': 'button',
      'html': _('Cancel'),
      events: {
        click: function() { return this.cancel(); }.bind(this)
      }
    });
//    tpSectorCancel.setAttribute('onclick', 'javascript:proSoar.editTurnpointCancel()');
    tpSectorButtons.appendChild(tpSectorCancel);
//    tab.appendChild(tpSectorButtons);

    return tpSectorButtons;
  },

  saveTaskOptions: function() {
    if (Task.prototype.types[$('task-options-tab-fields-type').value])
      this.proSoar.task.setType($('task-options-tab-fields-type').value);
  },


  accept: function() {
    this.saveTaskOptions();
    this.proSoar.task.first();

    do {
      var position = this.proSoar.task.getCurrentTurnpoint().getPosition();
      var redraw = false;
      var radius = $('task-turnpoint-edit-' + position + '-radius').value.replace(/,/, '.');
      var inner_radius = $('task-turnpoint-edit-' + position + '-innerradius').value.replace(/,/, '.');
      var start_radial = $('task-turnpoint-edit-' + position + '-startradial').value.replace(/,/, '.');
      var end_radial = $('task-turnpoint-edit-' + position + '-endradial').value.replace(/,/, '.');
      var type = $('task-turnpoint-edit-' + position + '-sector').value;

      radius = isFinite(radius)?
        Math.round(radius*10)/10:
        this.proSoar.task.getCurrentTurnpoint().getSector().getRadius();

      if (radius > 50) radius = 50;
      else if (radius < 0.1) radius = 0.1;

      inner_radius = isFinite(inner_radius)?
        Math.round(inner_radius*10)/10:
        this.proSoar.task.getCurrentTurnpoint().getSector().getInnerRadius();

      if (inner_radius > 50) inner_radius = 50;

      start_radial = isFinite(start_radial)?
        (Math.round(start_radial*10)/10)%360:
        this.proSoar.task.getCurrentTurnpoint().getSector().getStartRadial();

      end_radial = isFinite(end_radial)?
        (Math.round(end_radial*10)/10)%360:
        this.proSoar.task.getCurrentTurnpoint().getSector().getEndRadial();


      switch (position) {
        case 1:
          if (!Task.prototype.types[this.proSoar.task.getType()].start[type])
            type = Task.prototype.types[this.proSoar.task.getType()].defaults.start;
          break;

        case this.proSoar.task.getLength():
          if (!Task.prototype.types[this.proSoar.task.getType()].finish[type])
            type = Task.prototype.types[this.proSoar.task.getType()].defaults.finish;
          break;

        default:
          if (!Task.prototype.types[this.proSoar.task.getType()].sectors[type])
            type = Task.prototype.types[this.proSoar.task.getType()].defaults.sector;
      }


      if (radius != this.proSoar.task.getCurrentTurnpoint().getSector().getRadius()) {
        this.proSoar.task.getCurrentTurnpoint().getSector().setRadius(radius);
        redraw = true;
      }

      if (inner_radius != this.proSoar.task.getCurrentTurnpoint().getSector().getInnerRadius()) {
        this.proSoar.task.getCurrentTurnpoint().getSector().setInnerRadius(inner_radius);
        redraw = true;
      }

      if (start_radial != this.proSoar.task.getCurrentTurnpoint().getSector().getStartRadial()) {
        this.proSoar.task.getCurrentTurnpoint().getSector().setStartRadial(start_radial);
        redraw = true;
      }

      if (end_radial != this.proSoar.task.getCurrentTurnpoint().getSector().getEndRadial()) {
        this.proSoar.task.getCurrentTurnpoint().getSector().setEndRadial(end_radial);
        redraw = true;
      }

      if (type != this.proSoar.task.getCurrentTurnpoint().getSector().getType()) {
        this.proSoar.task.getCurrentTurnpoint().getSector().setType(type);
        redraw = true;
      }

      if (redraw) {
        this.proSoar.map.changeTurnpointSector(this.proSoar.task.getCurrentTurnpoint().getSector());
        this.proSoar.adjustTaskTPSectorOrientation(position);
        this.proSoar.updateTaskListDisplay('modify', position);
      }

    } while (this.proSoar.task.next());

    this.dialog.close();
  }

});




var dlgNewTask = new Class({

  Implements: Events,

  initialize: function(proSoar) {
    this.proSoar = proSoar;

    if (this.proSoar.dialogOverlay) return;

    this.dialog = new MUX.Dialog({
      modal: true,
      title: _('New & Load Task'),
      content: this.prepareNewTaskContent(),
//        content: $('new-task-dialog').clone(),
      autoOpen: false,
      onClose: function() { this.close(); }.bind(this)
    });

    this.proSoar.map.deactivateKeyboardControls();

    this.dialog.open();
    this.dialog.moveToTop();

    this.proSoar.dialogOverlay = true;
  },

  newTask: function() {
    this.proSoar.map.newTask();
    this.proSoar.clearTaskListDisplay();

    delete this.proSoar.task;
    this.proSoar.task = new Task();

    this.saveTaskOptions();
    this.proSoar.displayTaskDistance();

    this.dialog.close();
  },

  loadTask: function() {
    if ($$('#task-table tr.table-tr-selected td.name')[0]) {
      var taskname = $$('#task-table tr.table-tr-selected td.name')[0].get('text')
//      if (taskname)
      this.proSoar.taskStore.fromJSON(taskname);
    }

    this.dialog.close();
  },

  cancel: function() {
    this.dialog.close();
  },

  close: function() {
    this.proSoar.map.activateKeyboardControls();
    this.proSoar.dialogOverlay = false;
  },

  prepareNewTaskContent: function() {
    var newTaskContent = new Element('div', {
      'class': 'dialog-tabs'
    });

    var tabContainer = document.createElement('ul');
    tabContainer.appendChild(new Element('li', {
      html: _('New')
    }) );

    tabContainer.appendChild(new Element('li', {
      html: _('Load')
    }) );

    tabContainer.appendChild(document.createElement('hr'));
    newTaskContent.insertBefore(tabContainer, newTaskContent.firstChild);

    var newTaskTab = this.prepareTaskOptionsTab(_('New Task'));
    var buttons = new Element('div', {
      'class': 'buttons'
    });

    buttons.grab(new Element('button', {
      'class': 'button',
      html: _("New Task"),
      events: {
        click: function() { return this.newTask(); }.bind(this)
      }
//      'onclick': "javascript:proSoar.newTask('new')",
    }) );

    buttons.grab(new Element('button', {
      'class': 'button',
      html: _("Cancel"),
      events: {
        click: function() { return this.cancel(); }.bind(this)
      }
//      'onclick': "javascript:proSoar.newTask('cancel')",
    }) );

    newTaskTab.grab(buttons);
    newTaskContent.grab(newTaskTab);

//    newTaskContent.grab($('new-task-dialog-content-load').clone());

    var loadTaskTab = this.prepareLoadTaskTab();
    var buttons = new Element('div', {
      'class': 'buttons'
    });

    buttons.grab(new Element('button', {
      'class': 'button',
      html: _("Load Task"),
      events: {
        click: function() { return this.loadTask(); }.bind(this)
      }
//      'onclick': "javascript:proSoar.newTask('load')",
    }) );

    buttons.grab(new Element('button', {
      'class': 'button',
      html: _("Cancel"),
      events: {
        click: function() { return this.cancel(); }.bind(this)
      }
//      'onclick': "javascript:proSoar.newTask('cancel')",
    }) );

    loadTaskTab.grab(buttons);
    newTaskContent.grab(loadTaskTab);

    var tabPane = new TabPane(newTaskContent, {
      tabSelector: 'li',
      contentSelector: 'p'
    });

    return newTaskContent;
  },


  prepareLoadTaskTab: function() {
    var taskLoadTab = new Element('p', {
      id: "task-load-tab",
      html: "<span class='title'>" + _("Select task to load") + "</span>"
    });

    var taskTableContainer = new Element('div', {
      id: 'task-table-container'
    });

    var taskTable = new HtmlTable({
      properties: {
        id: 'task-table'
      },
      headers: [_('Task Name'), _('Type'), _('Distance'), _('Turnpoints'), _('Last Modified'), ''],
      parsers: ['string', 'string', 'float', 'number', 'date', ''],
      zebra: true,
      sortable: true,
      sortIndex: 4,
      selectable: true,
      allowMultiSelect: false
    });

    Array.each(this.proSoar.settings.getTaskFiles(), function(item, key, object) {
      var task_type = '';
      switch (item.type) {
        case 'racing': task_type = _('Racing'); break;
        case 'aat': task_type = _('AAT'); break;
        case 'fai': task_type = _('FAI'); break;
      }

      var date = new Date().parse(item.date);

      taskTable.push([
        {content: item.name, properties: { 'class': 'name' } },
        task_type,
        {content: item.distance + _('&nbsp;km')},
        item.turnpoints,
        {content: date.format('%x %X')}, //properties: { 'value': date.format('%s') } },
        new Element('img', {
          'src': 'images/delete.png',
          events: {
            click: function(e) {
              e.stopPropagation();
              if (this.deleteTask(item.name))
                e.target.getParent('tr').destroy();
            }.bind(this)
          }
        })
      ]);
    }.bind(this) );

    taskTable.reSort();

    taskTableContainer.grab(taskTable);
    taskLoadTab.grab(taskTableContainer);

    return taskLoadTab;
  },

  deleteTask: function(taskname) {
    var delTask = this.proSoar.taskStore.deleteTask(taskname);
    
  if (delTask.status == 200) {
      if (delTask.response.json.success)
        return true;
    } else return false;
  },

  prepareTaskOptionsTab: function(title) {
    var tab = new Element('p', {
      id: "task-options-tab",
      'class': "tp-edit",
      html: "<span class='title'>"+title+"</span><br />"
    });

    var taskOptionsFields = new Element('fieldset', {
      id: "task-options-tab-fields",
      'class': "fields"
    });

    var taskOptionsFieldsLine = new Element('div', {
      html: "<label for='task-options-tab-fields-type'>" + _("Task type") + ":</label>"
    });

    var taskOptionsFieldsType = new Element('select', {
      id: "task-options-tab-fields-type"
//      'class': "sector",
    });

    for (var prop in Task.prototype.types) {
      var taskTypeOption = document.createElement('option');
      if (this.proSoar.task.getType() == prop)
        taskTypeOption.setAttribute('selected', 'selected');

      taskTypeOption.setAttribute('value', prop);
      taskTypeOption.innerHTML = Task.prototype.types[prop].name;
      taskOptionsFieldsType.appendChild(taskTypeOption);
    }

    taskOptionsFieldsLine.appendChild(taskOptionsFieldsType);
    taskOptionsFields.appendChild(taskOptionsFieldsLine);

    tab.appendChild(taskOptionsFields);

    return tab;
  },

  saveTaskOptions: function() {
    if (Task.prototype.types[$('task-options-tab-fields-type').value])
      this.proSoar.task.setType($('task-options-tab-fields-type').value);
  }
});




var dlgSaveTask = new Class({

  initialize: function(proSoar) {
    this.proSoar = proSoar;

      if (this.proSoar.dialogOverlay) return;

      if (this.proSoar.task.getLength() < 2) {
        alert(_("Task must have at least start and finish"));
        return;
      }

      var tempTask = this.proSoar.taskStore.toTempJSON(this.proSoar.task);

      if (tempTask.status != 200) {
        alert(_("An unknown error occured. Please try again."));
        return;
      }

      this.dialog = new MUX.Dialog({
        modal: true,
        title: _('Save & Export Task'),
        content: this.prepareSaveTaskContent(tempTask.response.json),
//        content: $('new-task-dialog').clone(),
        autoOpen: false,
        onClose: function() { this.close(); }.bind(this)
      });
      this.proSoar.map.deactivateKeyboardControls();

      this.dialog.open();
      this.dialog.moveToTop();

      this.proSoar.dialogOverlay = true;
  },

  saveTask: function() {
      //var inputValidation = /^[^\s$&+,/:;=?@]*$/
      var inputValidation = /^[^&+/;<>]*$/
      if ($('task-save-name').value.search(inputValidation) == -1
          || $('task-save-name').value == '') {
        alert(_("Invalid task name"));
        return;
      }

      var taskname = $('task-save-name').value;

      var reply = this.proSoar.taskStore.toJSON(taskname, this.proSoar.task);
    
    if (reply.status == 200 && !reply.response.json.success) {
      alert(reply.response.json.reason);

    } else if (reply.status == 200 && reply.response.json.settings) {
      this.proSoar.settings.addSettingsFromJSON(reply.response.json.settings);
    }

    this.dialog.close();

  },

  cancel: function() {
    this.dialog.close();
  },

  close: function() {
    this.proSoar.map.activateKeyboardControls();
    this.proSoar.dialogOverlay = false;
  },

  prepareSaveTaskContent: function(tempTask) {
    var saveTaskContent = new Element('div', {
      'class': 'dialog-tabs'
    });

    var tabContainer = document.createElement('ul');
    tabContainer.appendChild(new Element('li', {
      html: _('Export')
    }) );

    tabContainer.appendChild(new Element('li', {
      html: _('Save')
    }) );

    tabContainer.appendChild(document.createElement('hr'));
    saveTaskContent.insertBefore(tabContainer, saveTaskContent.firstChild);


    var exportTaskTab = this.prepareTaskExportTab(tempTask);

    var buttons = new Element('div', {
      'class': 'buttons'
    });
/*
    buttons.grab(new Element('button', {
      'class': 'button',
      html: "Save Task",
      'onclick': "javascript:proSoar.saveTask('save')",
    }) );
*/
    buttons.grab(new Element('button', {
      'class': 'button',
      html: _("Close"),
      events: {
        click: function() { return this.cancel(); }.bind(this)
      }
//      'onclick': "javascript:proSoar.saveTask('cancel')",
    }) );

    exportTaskTab.grab(buttons);
    saveTaskContent.grab(exportTaskTab);



    var saveTaskTab = this.prepareTaskSaveTab();
    var buttons = new Element('div', {
      'class': 'buttons'
    });

    buttons.grab(new Element('button', {
      'class': 'button',
      html: _("Save Task"),
      events: {
        click: function() { return this.saveTask(); }.bind(this)
      }
//      'onclick': "javascript:proSoar.saveTask('save')",
    }) );

    buttons.grab(new Element('button', {
      'class': 'button',
      html: _("Cancel"),
      events: {
        click: function() { return this.cancel(); }.bind(this)
      }
//      'onclick': "javascript:proSoar.saveTask('cancel')",
    }) );

    saveTaskTab.grab(buttons);
    saveTaskContent.grab(saveTaskTab);

    var tabPane = new TabPane(saveTaskContent, {
      tabSelector: 'li',
      contentSelector: 'p'
    });

    return saveTaskContent;
  },

  prepareTaskExportTab: function(tempTask) {
    var taskExportTab = new Element('p', {
      id: "task-export-tab",
      html: "<span class='title'>" + _("Select your file format") + ":</span><br>",
      style: {
        position: 'relative'
      }
    });

    var taskExportTabLinks = new Element('div', {
      id: 'task-export-tab-div'
    });

    for (var filetype in tempTask.download) {
      var downloadLink = new Element('a', {
        id: 'task-export-tab-'+filetype,
        href: tempTask.download[filetype].url,
        target: "_blank",
        events: {
          'mouseover': function(ft) { return function() {
            var qrCode = new Element('img', {
              id: 'task-export-tab-qrcode-img',
              'src': tempTask.download[ft].qrcode
            });

            qrCode.replaces($('task-export-tab-qrcode-img'));
            $('task-export-tab-qrcode-text').set('text', tempTask.download[ft].name);
          } }(filetype)
        }
      });

      downloadLink.grab(new Element('img', {
        'src': 'images/software/'+filetype+'.png',
        'alt': tempTask.download[filetype].name
      }) );

      taskExportTabLinks.grab(downloadLink);
      taskExportTabLinks.grab(new Element('br'));
    }

    var qrCode = new Element('div', {
      id: 'task-export-tab-qrcode'
    });

    qrCode.grab(new Element('img', {
      id: 'task-export-tab-qrcode-img',
      src: 'images/qrcode.png',
      styles: {
        'float': 'right'
      }
    }) );

    qrCode.grab(new Element('div', {
      id: 'task-export-tab-qrcode-text',
      html: _('QR Code')
    }) );


    taskExportTabLinks.grab(qrCode);
    taskExportTab.grab(taskExportTabLinks);
    return taskExportTab;
  },


  prepareTaskSaveTab: function() {
    var taskSaveTab = new Element('p', {
      id: "task-save-tab"
    });

    var taskTableContainer = new Element('div', {
      id: 'task-table-container'
    });

    var taskTable = new HtmlTable({
      properties: {
        id: 'task-table'
      },
      headers: [_('Task Name'), _('Type'), _('Distance'), _('Turnpoints'), _('Last Modified'), ''],
      parsers: ['string', 'string', 'float', 'number', 'date', ''],
      zebra: true,
      sortable: true,
      sortIndex: 4,
      selectable: true,
      allowMultiSelect: false,
      onRowFocus: function(e, s) {
        var name = e.getElement('.name').get('text');
        $('task-save-name').set('value', name);
        $('task-save-name').removeClass('invalid');
      }
    });

    Array.each(this.proSoar.settings.getTaskFiles(), function(item, key, object) {
      var task_type = '';
      switch (item.type) {
        case 'racing': task_type = _('Racing'); break;
        case 'aat': task_type = _('AAT'); break;
        case 'fai': task_type = _('FAI'); break;
      }
      
      var date = new Date().parse(item.date);

      taskTable.push([
        {content: item.name, properties: { 'class': 'name' } },
        task_type,
        {content: item.distance + _('&nbsp;km'), properties: { 'value': item.distance } },
        item.turnpoints,
        {content: date.format('%x %X')}, //properties: { 'value': date.format('%s') } },
        new Element('img', {
          'src': 'images/delete.png',
          events: {
            click: function(e) {
              e.stopPropagation();
              if (this.deleteTask(item.name))
                e.target.getParent('tr').destroy();
            }.bind(this)
          }
        })
      ]);
    }.bind(this) );

    var task_type = '';
    switch (this.proSoar.task.getType()) {
      case 'racing': task_type = _('Racing'); break;
      case 'aat': task_type = _('AAT'); break;
      case 'fai': task_type = _('FAI'); break;
    }

    taskTable.reSort();
    taskTableContainer.grab(taskTable);
    taskSaveTab.grab(taskTableContainer);

    var taskSaveInput = new Element('div', {
      html: "<br><label for='task-save-name'>" + _("Save as") + ":</label>"
    });

    taskSaveInput.grab(new Element('input', {
      id: 'task-save-name',
      'class': 'name',
      events: {
        change: function(e) {
          $('task-table').retrieve('HtmlTable').selectNone();
          $$('#task-table tbody tr').each( function(tr, i) {
            if (tr.getElement('.name').get('text') == e.target.value)
              $('task-table').retrieve('HtmlTable').selectRow(tr);
          });
        },
        keyup: function(e) {
          var inputValidation = /^[^&+/;<>]*$/
          if (e.target.value.search(inputValidation) == -1)
            e.target.addClass('invalid');
          else
            e.target.removeClass('invalid');
        }
      }
    }) );

    taskSaveTab.grab(taskSaveInput);

    return taskSaveTab;
  },

  deleteTask: function(taskname) {
    var delTask = this.proSoar.taskStore.deleteTask(taskname);

  if (delTask.status == 200) {
      if (delTask.response.json.success)
        return true;
    } else return false;
  }



});


var dlgAbout = new Class({

  initialize: function(proSoar) {
    this.proSoar = proSoar;

      if (this.proSoar.dialogOverlay) return;

      this.dialog = new MUX.Dialog({
        modal: true,
        title: _('About'),
        content: this.prepareContent(),
//        content: $('new-task-dialog').clone(),
        autoOpen: false,
        onClose: function() { this.close(); }.bind(this)
      });

      this.dialog.open();
      this.dialog.moveToTop();

      this.proSoar.dialogOverlay = true;
  },

  close: function() {
    this.proSoar.dialogOverlay = false;
  },

  prepareContent: function() {
    var closeDialogContent = $('about-dialog').clone();

    var buttons = new Element('p', {
      'class': 'buttons'
    });
    
    buttons.grab(new Element('button', {
      'class': 'button',
      html: _("Close"),
      events: {
        click: function() { return this.dialog.close(); }.bind(this)
      }
    }) );

    closeDialogContent.grab(buttons);

    return closeDialogContent;
  }
});

var dlgWaypointUpload = new Class({

  initialize: function(proSoar) {
    this.proSoar = proSoar;

    if (this.proSoar.dialogOverlay) return;

    this.dialog = new MUX.Dialog({
      modal: true,
      title: _('Add Waypoint File...'),
      content: this.prepareContent(),
      autoOpen: false,
      onClose: function() { this.close(); }.bind(this)
    });

    this.dialog.open();

    var upload = new Form.Upload('waypoint-upload-file', {
      onComplete: function(response) {
//          console.log(response);
        this.addWaypointFileComplete(JSON.decode(response, true));
      }.bind(this),
      data: {
        'settings': JSON.encode(this.proSoar.settings.turnpointFiles)
      }
    });

    this.dialog.moveToTop();
    this.proSoar.dialogOverlay = true;
  },

  close: function() {
    this.proSoar.dialogOverlay = false;
  },

  prepareContent: function() {

    var content = new Element('div', {
      id: 'upload-waypoints-dialog'
    });

    var form = new Element('form', {
      id: 'upload-waypoints-dialog-form',
      method: 'post',
//      action: 'dynamic/bin/upload_waypoint_file.py',
      action: 'waypoints/upload',
      enctype: 'multipart/form-data'
    });

    var formRow = new Element('div', {
      'class': 'formRow'
    });

    formRow.grab(new Element('input', {
      type: 'file',
      id: 'waypoint-upload-file',
      name: 'waypoint-upload-file'
    }) );

    form.grab(formRow);

    formRow = new Element('div', {
      'class': 'formRow'
    });

    formRow.grab(new Element('input', {
      type: 'submit',
      id: 'waypoint-upload-submit',
      name: 'waypoint-upload-submit',
      value: _('Add')
    }) );

    form.grab(formRow);

    var fieldset = new Element('fieldset', {
      legend: 'Upload'
    });

    fieldset.grab(form);
    content.grab(fieldset);

    return content;
  },

  addWaypointFileComplete: function(response) {
    if (response.success)
      this.proSoar.settings.addSettingsFromJSON(response.settings);

    this.dialog.close();
  }

});

var dlgDeleteWaypointFile = new Class({

  initialize: function(proSoar, fileId) {
    this.proSoar = proSoar;

    if (this.proSoar.dialogOverlay) return;

    this.dialog = new MUX.Dialog({
      modal: true,
      title: _('Delete Waypoint File...'),
      content: this.prepareContent(fileId),
      autoOpen: false,
      onClose: function() { this.close(); }.bind(this)
    });

    this.dialog.open();

    this.dialog.moveToTop();
    this.proSoar.dialogOverlay = true;
  },

  close: function() {
    this.proSoar.dialogOverlay = false;
  },

  prepareContent: function(fileId) {
    var filename = '';
    Array.each(this.proSoar.settings.getTurnpointFiles(), function(item, key, object) {
      if (item.fileId == fileId) {
        filename = item.filename;
        return;
      }
    });

    var content = new Element('div', {
      id: 'delete-waypoint-file'
    });

    content.grab(new Element('p', {
      id: 'delete-waypoint-file-text',
      html: _('Are you sure you want to delete waypoint file') + '<br />' +
            '<div style="text-align:center; font-weight: bold;">"' + filename + '"?</div>'
    }) );

    var delWPButtons = new Element('div', {
      'class': 'buttons'
    });

    var delWPAccept = new Element('button', {
      'class': 'button',
      'html': _('Accept'),
      events: {
        click: function() { return this.deleteWaypointFileAccept(fileId); }.bind(this)
      }
    });
    delWPButtons.appendChild(delWPAccept);

    var delWPCancel = new Element('button', {
      'class': 'button',
      'html': _('Cancel'),
      events: {
        click: function() { return this.dialog.close(); }.bind(this)
      }
    });
    delWPButtons.appendChild(delWPCancel);

    content.grab(delWPButtons);

    return content;
  },

  deleteWaypointFileAccept: function(fileId) {
    this.dialog.close();
    this.proSoar.settings.removeTurnpointFile(fileId);
    this.proSoar.waypoints.removeWaypoints(fileId);
  }

});
