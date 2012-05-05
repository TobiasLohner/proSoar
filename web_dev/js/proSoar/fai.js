var FAI = new Class({

  initialize: function(task) {
    this.distances = Array();
    this.taskLegs = 0;
    this.task = task;
  },

  // enlarge distances matrix for another turnpoint
  addTurnpoint: function(position) {
    if (position <= 1) return;
    for (var i = position-2; i < this.taskLegs; i++)
      this.distances[i].splice(position-1, 0, 0);

    this.distances.splice(position-2, 0, Array(position-1));
//console.log("fai: addTurnpoint:" + position);
//console.log(this.distances);
    this.taskLegs++;
    
    this.updateDistances(position);
  },

  // remove one turnpoint from distances matrix
  removeTurnpoint: function(position) {
//console.log("fai: removeTurnpoint:" + position);
//console.log(this.distances);

//console.log(this.distances);
    
    for (var i = position-1; i < this.taskLegs; i++)
      this.distances[i].splice(position-1, 1);
//console.log(this.distances);
  
    if (position-2 >= 0)
      this.distances.splice(position-2, 1);
    else
      this.distances.splice(0, 1);
//console.log(this.distances);
//console.log(position-1);
    this.taskLegs--;

//    this.updateDistances(position);
  },

  // update distances in distances matrix
  updateDistances: function(position) {
    // we assume the matrix already has the right dimensions
    // update every line at 'position'-1
    // update every row at 'position'-2
//console.log("updateDistances:");
//console.log(this.task.taskLength);

    if (this.taskLegs == 0) return;

    this.task.gotoTurnpoint(position);
    var outer = this.task.getCurrentTurnpoint().getLonLat();

    var line = position-1;
//console.log("at line " + line);
    if (line >= 0)
    for (var col = position-1; col < this.taskLegs; col++) {
      this.task.next();
//console.log("update this.distances[col][line]: " + col + " " + line);
      this.distances[col][line] =  Util_distVincenty(outer, this.task.getCurrentTurnpoint().getLonLat());
    }

    this.task.first();
    var col = position-2;
//console.log("at col " + col);
    for (var line = 0; line < position-1; line++) {
//console.log("update this.distances[col][line]: " + col + " " + line);
      this.distances[col][line] = Util_distVincenty(outer, this.task.getCurrentTurnpoint().getLonLat());
      this.task.next();
    }
  },

  // returns true if task contains a fai triangle
  isFAI: function() {
    // check if task is large enougth but not too large...
    if (this.task.getLength() < 4 || this.task.getLength() > 10) return false;
/*
    // first check if task contains the same amount of turnpoints we actually have in our matrix
    if (this.task.getLength()-1 != this.taskLegs) {
      // we need to enlager our distances matrix...
      var enlarge = (this.task.getLength()-1) - this.taskLegs;

//      for (var i = 0; i < enlarge; i++) {
//        this.distances.push(Array());
//      }

      for (var i = this.taskLegs; i < this.taskLegs+enlarge; i++) {
        this.distances.push(Array());
        for (var j = 0; j < this.taskLegs; j++) {
          this.distances[i][j] = 0;
        }
      }

      for (var i = 0; i < this.distances.length; i++) {
        for (var j = 0; j < enlarge; j++) {
          this.distances[i].push(0);
        }
      }
      this.taskLegs = this.task.getLength()-1;
    }
*/
    // do a rough check if all distances are still the same
    // and update the distance matrix if not...
//    this.checkDistances();

    var largest = {
      distance: 0,
      isFAI: false,
      i: 0,
      j: 0,
      k: 0,
      l: 0,
    };

//    console.log(this.taskLegs);
    // now check for every turnpoint configuration if it is a fai triangle
    for (var i = 0; i <= this.taskLegs-3; i++) {
      for (var j = i+1; j <= this.taskLegs-2; j++) {
        for (var k = j+1; k <= this.taskLegs-1; k++) {
          for (var l = k+1; l <= this.taskLegs + i; l++) {
            // every triangle consists of i-j-k-l (where i and l should be at the same position).
            // calculate total distance of this triangle
            // and check for FAI

            var closed = false;
            var l_jump;

            if (l > this.taskLegs) {
              // allow jumping over task borders only if task is closed
              for (x = k+1; x <= this.taskLegs; x++) {
                for (y = 0; y <= l - this.taskLegs; y++) {
//console.log("x: " + x + " y: " + y + " distance:" + this.getDistance(y,x)); 
                  if (this.getDistance(y,x) < 1000) closed = true;
                }
              }
//console.log("closed: " + closed);
              if (closed) l_jump = l - this.taskLegs;// - 1;
            } else {
              closed = true;
              l_jump = l;
            }

//            console.log("this.distances["+i+"]["+l_jump+"]: " + this.getDistance(i,l_jump) + "  closed: " + closed);
            if (this.getDistance(i,l_jump) > 1000 || !closed) {
//              console.log("distances too large");
              continue;
            }
//            console.log("distance small enough...");
            var distance = this.calculateTotalDistance(i, j, k, l_jump);
//            console.log(i + "->" + j + ": " + this.getDistance(i,j) + " " + 
//                        j + "->" + k + ": " + this.getDistance(j,k) + " " +
//                        k + "->" + l_jump + ": " + this.getDistance(k,l_jump) + " " +
//                        "total: " + distance);
            var fai = this.checkIfFAI(i, j, k, l_jump, distance);
            if (largest.distance < distance && fai) {
              largest.distance = distance;
              largest.isFAI = true;
              largest.i = i;
              largest.j = j;
              largest.k = k;
              largest.l = l_jump;
            }
          }
        }
      }
    }

//console.log(largest);
    // we found our fai triangle when largest.fai is true.
    return largest;
  },

  // at first, we do not check anything. just calculate all distances...
  // it's silly, but way easier than checking for differences :-)
  checkDistances: function() {
    var outer;
    var position = this.task.getPosition();

    for (var i = 0; i < this.taskLegs; i++) {
      this.task.gotoTurnpoint(i+1);
      outer = this.task.getCurrentTurnpoint().getLonLat();

      var j = i;
      while (this.task.next()) {
        this.distances[i][j] = Util_distVincenty(outer, this.task.getCurrentTurnpoint().getLonLat());
        j++;
      }
    }
    // reset task position
    this.task.gotoTurnpoint(position);
//console.log(this.distances);
  },

  getDistance: function(x, y) {
//    console.log("getDistance: " + x + "  " + y);
    if (x == y) return 0;
    else return (x > y)?this.distances[x-1][y]:this.distances[y-1][x];
  //  return (x > y)?this.distances[y][x-1]:this.distances[x][y-1];
  },

  calculateTotalDistance: function(i, j, k, l) {
    return this.getDistance(i,j) + this.getDistance(j,k) + this.getDistance(k,l);
  },

  checkIfFAI: function(i, j, k, l, distance) {

    var distance_28 = distance * 0.28;
    
    // check for small fai
    if (distance < 750000 &&
        this.getDistance(i,j) >= distance_28 &&
        this.getDistance(j,k) >= distance_28 &&
        this.getDistance(l,k) >= distance_28)
      return true;

    var distance_25 = distance * 0.25;
    var distance_45 = distance * 0.45;

    // check for large fai
    if (distance >= 750000 &&
        this.getDistance(i,j) > distance_25 &&
        this.getDistance(j,k) > distance_25 &&
        this.getDistance(k,l) > distance_25 &&
        this.getDistance(i,j) <= distance_45 &&
        this.getDistance(j,k) <= distance_45 &&
        this.getDistance(k,l) <= distance_45)
      return true;

    // no fai
    return false;
  },



});
