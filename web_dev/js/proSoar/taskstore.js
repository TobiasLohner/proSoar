/**
 * TaskStore: save and load a task from/to json
**/

var TaskStore = new Class({
  Implements: Events,


/**
 * A task JSON should have the following syntax:
 *
 * {
 *  "0": TP_OBJ,
 *  ...
 *  "n": TP_OBJ,
 *  "type": 'TASK_TYPE,
 *  "distance": TASK_DISTANCE,
 * }
 *
 * Start is TP 0, finish is TP n.
 * TP_OBJ is a object with the following syntax:
 * 
 * {
 *  "lon": LON,
 *  "lat": LAT,
 *  "name": NAME,
 *  "type": SECTOR_TYPE,
 *  "radius": SECTOR_RADIUS
 * }
*/

// save a task temporarily to JSON
toTempJSON: function(task) {
  if (task.getLength() < 2) return;

  var jsonRequest = new Request.JSON({
//    url: 'dynamic/bin/save_temp_task.py',
    url: 'tasks/save_temp',
    async: false,
    secure: true,
    method: 'post',
    data: 'task=' + this.encodeTask(task),
    //onSuccess: this.getSettingsFromJSON.bind(this),
    //onSuccess: this.taskSaved.bind(this),
    onSuccess: function(data) {
      if (data.success) {
        this.fireEvent("setSettings", data.settings);
      }
    }.bind(this)
  });
//  jsonRequest.get('task=' + TaskStore.encodeTask(task));
  return jsonRequest.send();
},

// save a task to JSON
toJSON: function(task_name, task) {
//  console.log("Convert task to JSON");
  if (task.getLength() < 2) return;

  var jsonRequest = new Request.JSON({
//    url: 'dynamic/bin/save_task.py?task_name='+task_name,
    url: 'tasks/save/'+encodeURIComponent(task_name),
    async: false,
    secure: true,
    method: 'post',
    data: 'task=' + this.encodeTask(task),
    //onSuccess: this.getSettingsFromJSON.bind(this),
 //   onSuccess: this.taskSaved.bind(this),
  });
//  jsonRequest.get('task=' + TaskStore.encodeTask(task));
  return jsonRequest.send();
},

// delete a task
deleteTask: function(task_name) {
  var jsonRequest = new Request.JSON({
    url: 'tasks/delete/'+encodeURIComponent(task_name),
    async: false,
    secure: true,
    method: 'get',
    onSuccess: function(data) {
      if (data.success) {
        this.fireEvent("setSettings", data.settings);
      }
    }.bind(this)
    //onSuccess: this.getSettingsFromJSON.bind(this),
 //   onSuccess: this.taskSaved.bind(this),
  });
//  jsonRequest.get('task=' + TaskStore.encodeTask(task));
  return jsonRequest.send();
},

encodeTask: function(task) {
  var taskObj = new Object();
  task.first();
 
  var i = 0;
  do {
    taskObj[i++] = this.createTPObj(task.getCurrentTurnpoint());
  } while (task.next());

  var taskOptions = task.getOptions();

  taskObj['type'] = taskOptions.type;
  taskObj['aat_min_time'] = taskOptions.aat_min_time;
  taskObj['start_max_speed'] = taskOptions.start_max_speed;
  taskObj['start_max_height'] = taskOptions.start_max_height;
  taskObj['start_max_height_ref'] = taskOptions.start_max_height_ref;
  taskObj['finish_min_height'] = taskOptions.finish_min_height;
  taskObj['finish_min_height_ref'] = taskOptions.finish_min_height_ref;
  taskObj['fai_finish'] = taskOptions.fai_finish?1:0;

  taskObj["distance"] = task.getTotalDistance();

  return JSON.encode(taskObj);
},

createTPObj: function(turnpoint) {
  var tpObj = new Object();

  tpObj["lon"] = turnpoint.getLon();
  tpObj["lat"] = turnpoint.getLat();
  tpObj["name"] = turnpoint.getWaypointName();
  tpObj["altitude"] = turnpoint.getWaypointAltitude();
  tpObj["comment"] = turnpoint.getWaypointComment();
  tpObj["type"] = turnpoint.getSector().getType();
  tpObj["radius"] = turnpoint.getSector().getRadius();
  tpObj["inner_radius"] = turnpoint.getSector().getInnerRadius();
  tpObj["start_radial"] = turnpoint.getSector().getStartRadial();
  tpObj["end_radial"] = turnpoint.getSector().getEndRadial();

  return tpObj;
},

taskSaved: function(data) {
//  console.log("Task saved");
//  console.log(data.settings);
  if (data.success) {
    this.fireEvent("setSettings", data.settings);
  }

  this.fireEvent("saveTask", {'success': data.success,
                              'reason': (typeof(data.reason)!='undefined')?data.reason:''});
},

// load a task from JSON
fromJSON: function(task_name) {
//  console.log("Loading task: " + task_name);

  var jsonRequest = new Request.JSON({
//    url: 'dynamic/bin/get_task.py?task_name='+task_name,
    url: 'tasks/load/'+task_name,
    async: true,
    secure: true,
    //onSuccess: this.getSettingsFromJSON.bind(this),
    onSuccess: this.decodeTask.bind(this),
/*    onSuccess: function(data) {
      var task = this.decodeTask(data);
      console.log("decoded Task");
      this.fireEvent("loadTask", task);
    }.bind(this), */
//    onComplete: function(e) { console.log(e) },
//    onError: function(e) { console.log(e) },
  });
  jsonRequest.get();
},

decodeTask: function(taskObj) {
//  var taskObj = JSON.decode(taskJSON, true);

  var task = new Task();

  var type = Task.prototype.types[String(taskObj["type"])]?String(taskObj["type"]):null;
  if (type) task.setType(type);

  task.setOptions({
    aat_min_time: isFinite(taskObj["aat_min_time"])?taskObj["aat_min_time"]:3*3600,
    start_max_speed: isFinite(taskObj["start_max_speed"])?taskObj["start_max_speed"]:60,
    start_max_height: isFinite(taskObj["start_max_height"])?taskObj["start_max_height"]:3000,
    start_max_height_ref: String(taskObj["start_max_height_ref"]),
    finish_min_height: isFinite(taskObj["finish_min_height"])?taskObj["finish_min_height"]:0,
    finish_min_height_ref: String(taskObj["finish_min_height_ref"]),
    fai_finish: taskObj["fai_finish"],
  });

  var i = 0;
  while (taskObj[i]) {
    var lon = isFinite(taskObj[i].lon)?taskObj[i].lon%360:null;
    var lat = isFinite(taskObj[i].lat)?taskObj[i].lat%360:null;
    var name = String(taskObj[i].name);
    var altitude = isFinite(taskObj[i].altitude)?taskObj[i].altitude:0;
    var comment = String(taskObj[i].comment);
    var type = Sector.prototype.types[String(taskObj[i].type)]?String(taskObj[i].type):null;
    var radius = isFinite(taskObj[i].radius)?Math.max(Math.min(50, taskObj[i].radius), 0.1):null;
    var inner_radius = isFinite(taskObj[i].inner_radius)?
      Math.min(50, taskObj[i].inner_radius):0;
    var start_radial =  isFinite(taskObj[i].start_radial)?taskObj[i].start_radial%360:0;
    var end_radial = isFinite(taskObj[i].end_radial)?taskObj[i].end_radial%360:0;
    
    if (!lon || !lat || !type || !radius) continue;

    task.addAfterCurrent(
      {"lon": lon, "lat": lat},
      type, -1,
      {id: -1, name: name, comment: comment, altitude: altitude}
    );

    task.getCurrentTurnpoint().getSector().setRadius(radius);
    task.getCurrentTurnpoint().getSector().setInnerRadius(inner_radius);
    task.getCurrentTurnpoint().getSector().setStartRadial(start_radial);
    task.getCurrentTurnpoint().getSector().setEndRadial(end_radial);

    i++;
  }

  
  this.fireEvent("loadTask", task);
//  return task;
},

});
