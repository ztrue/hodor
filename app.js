var http = require('http');
var tessel = require('tessel');
var accel = require('accel-mma84').use(tessel.port['A']);
var led1 = tessel.led[0];
var led2 = tessel.led[1];
var wifi = require('wifi-cc3000');

var logEnable = true;

var network = 'Hackathon';
var wifiPassword = 'h@ckCUT16';
var security = 'wpa2';
var wifiTimeout = 30;

var url = 'http://10.231.15.31:8080';
var accuracyX = 0.03;
var accuracyY = 0.03;
var accuracyZ = 0.03;
var hodorInterval = 4 * 1000;

var lastX = 0;
var lastY = 0;
var lastZ = 1;
var lastHodor = 0;
var timeoutsNumber = 0;

log('run');

wifi.on('connect', function (data) {
  log('wifi connected', data);
});
wifi.on('disconnect', function(data) {
  log('wifi disconnected', data);
  connect();
});
wifi.on('timeout', function(err) {
  log('wifi connection timeout, isConnected =', wifi.isConnected());

  if (!wifi.isConnected()) {
    log('when not connected');
    timeoutsNumber++;
    if (timeoutsNumber > 2) {
      powerCycle();
    } else {
      connect();
    }
  }
});
wifi.on('error', function (err) {
  log('error', err);
});

led1.output(0);
led2.output(0);

// Initialize the accelerometer.
accel.on('ready', function () {
  led1.toggle();
    // Stream accelerometer data
  accel.on('data', function (xyz) {
    var diffX = parseFloat(Math.abs(xyz[0] - lastX).toFixed(2));
    var diffY = parseFloat(Math.abs(xyz[1] - lastY).toFixed(2));
    var diffZ = parseFloat(Math.abs(xyz[2] - lastZ).toFixed(2));

    var moveX = diffX > accuracyX;
    var moveY = diffY > accuracyY;
    var moveZ = diffZ > accuracyZ;

    var move = moveX || moveY || moveZ;

    var output = '';
    if (moveX) {
      output += 'x ' + diffX + '; ';
    }
    if (moveY) {
      output += 'y ' + diffY + '; ';
    }
    if (moveZ) {
      output += 'z ' + diffZ + '; ';
    }

    if (move) {
      hodor();
      // log(output);
    }

    lastX = xyz[0];
    lastY = xyz[1];
    lastZ = xyz[2];
  });

});

accel.on('error', function(err){
  log('Error:', err);
});

function hodor() {
  led2.toggle();
  led2.toggle();
  led2.toggle();
  led2.toggle();

  var time = Date.now();

  if (time - lastHodor > hodorInterval) {
    log('Hodor');
    lastHodor = time;
    if (wifi.isConnected()) {
      http.get(url, function (response) {
        log('response', response.statusCode);
        response.resume();
      }).on('error', function (err) {
       log('http error', err.message);
      });
    } else {
      log('wifi not connected');
    }
  }
}

// reset the wifi chip progammatically
function powerCycle() {
  // when the wifi chip resets, it will automatically try to reconnect
  // to the last saved network
  wifi.reset(function() {
    timeoutsNumber = 0;
    log('done power cycling');
    // give it some time to auto reconnect
    setTimeout(function() {
      if (!wifi.isConnected()) {
        // try to reconnect
        connect();
      }
    }, 20 * 1000); // 20 second wait
  });
}

function connect() {
  log('connecting...');
  wifi.connect({
    security: security,
    ssid: network,
    password: wifiPassword,
    timeout: wifiTimeout
  });
}

// connect wifi now, if not already connected
if (!wifi.isConnected()) {
  connect();
}

function log() {
  if (logEnable) {
    console.log.apply(console, arguments)
  }
}
