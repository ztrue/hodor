var http = require('http');
var fs = require('fs');
var tessel = require('tessel');
var accel = require('accel-mma84').use(tessel.port['A']);
var audio = require('audio-vs1053b').use(tessel.port['B']);
var led1 = tessel.led[0];
var led2 = tessel.led[1];
var wifi = require('wifi-cc3000');

var logEnable = true;

// var network = 'Hackathon';
// var wifiPassword = 'h@ckCUT16';
var network = 'allx iPhone';
var wifiPassword = '20022002';
var security = 'wpa2';
var wifiTimeout = 30;
var url = 'http://13.94.44.219:8088';
var audioPath = 'hodor3.mp3';

var audioPaths = [
  // 'hodor1.mp3',
  'hodor2.mp3',
  'hodor3.mp3',
  // 'hodor4.mp3',
  'hodor5.mp3',
  'hodor6.mp3',
];

var volume = .8;
var quietVolume = .8;
var loudVolume = 1;
var accuracyX = 0.1;
var accuracyY = 0.1;
var accuracyZ = 0.1;
var hodorInterval = 3 * 1000;

var lastX = 0;
var lastY = 0;
var lastZ = 1;
var lastHodor = 0;
var timeoutsNumber = 0;
var audioFile = null;
var audioFiles = [];
var currentAudio = 0;

led1.output(0);
led2.output(0);

log('run');

// wifi.on('connect', function (data) {
//   log('wifi connected', data);
// });
// wifi.on('disconnect', function(data) {
//   log('wifi disconnected', data);
//   connect();
// });
// wifi.on('timeout', function(err) {
//   log('wifi connection timeout, isConnected =', wifi.isConnected(), err);
//
//   if (!wifi.isConnected()) {
//     log('when not connected');
//     timeoutsNumber++;
//     if (timeoutsNumber > 2) {
//       powerCycle();
//     } else {
//       connect();
//     }
//   }
// });
// wifi.on('error', function (err) {
//   log('error', err);
// });

// connect wifi now, if not already connected
// if (!wifi.isConnected()) {
//   connect();
// }

led1.output(1);
led2.output(1);
led1.output(0);
led2.output(0);
led1.output(1);
led2.output(1);
led1.output(0);
led2.output(0);
led1.output(1);
led2.output(1);
led1.output(0);
led2.output(0);
led1.output(1);
led2.output(1);
led1.output(0);
led2.output(0);

// setInterval(function () {
//   led2.toggle();
// }, 300);

// Initialize the accelerometer.
accel.on('ready', function () {
  led1.output(1);
    // Stream accelerometer data
  accel.on('data', function (xyz) {
    led1.toggle();
    var diffX = parseFloat(Math.abs(xyz[0] - lastX).toFixed(2));
    var diffY = parseFloat(Math.abs(xyz[1] - lastY).toFixed(2));
    var diffZ = parseFloat(Math.abs(xyz[2] - lastZ).toFixed(2));

    var moveX = diffX > accuracyX;
    var moveY = diffY > accuracyY;
    var moveZ = diffZ > accuracyZ;

    var move = moveX || moveY || moveZ;

    if (move) {
      hodor();
    }

    lastX = xyz[0];
    lastY = xyz[1];
    lastZ = xyz[2];
  });

});

accel.on('error', function(err){
  log('Error:', err);
});

audio.on('ready', function() {
  log('audio ready');
  audio.setVolume(volume, function(err) {
    if (err) {
      return log('set volume err', err);
    }
    log('reading audio...');
    // audioFile = fs.readFileSync(audioPath);
    audioPaths.forEach(function (audioPath) {
      audioFiles.push(fs.readFileSync(audioPath));
    });
    log('audio read');
  });
});

audio.on('error', function(err) {
  log(err);
});

tessel.button.on('press', function () {
  audio.setVolume(newVolume(), function(err) {
    if (err) {
      log('set volume err', err);
    } else {
      log('volume set', volume);
    }
  });
});

function newVolume() {
  volume = volume === loudVolume
    ? quietVolume
    : loudVolume;

  // LOUD VOLUME, BE CAREFULL
  if (volume === loudVolume) {
    led2.toggle();
    led2.toggle();
    led2.toggle();
    led2.toggle();
    led2.toggle();
    led2.toggle();
  }

  return volume;
}

function hodor() {
  var time = Date.now();

  if (time - lastHodor > hodorInterval) {
    log('HODOR');
    lastHodor = time;

    if (audioFiles.length) {
      var audioFileIndex = Math.floor(Math.random() * audioFiles.length);
      var audioFile = audioFiles[audioFileIndex];
      log('play audio');
      audio.play(audioFile, function(err) {
        if (err) {
          log(err);
        } else {
          log('done playing', audioFileIndex);
        }
      });
    }

    if (wifi.isConnected()) {
      led2.output(1);

      log('api request...');
      http.get(url, function (response) {
        log('response', response.statusCode);
        response.resume();
      }).on('error', function (err) {
       log('http error', err.message);
      });

      led2.output(0);
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

function log() {
  if (logEnable) {
    console.log.apply(console, arguments)
  }
}
