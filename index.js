var Mopidy = require ('mopidy');
const record = require('node-record-lpcm16');
const Detector = require('snowboy').Detector;
const Models = require('snowboy').Models;

var mopidy = new Mopidy({
    webSocketUrl: "ws://localhost:6680/mopidy/ws/",
    callingConvention: "by-position-or-by-name"
});

//snowboy
const models = new Models();

models.add({
  file: 'resources/models/snowboy.umdl',
  sensitivity: '0.5',
  hotwords : 'snowboy'
});

const detector = new Detector({
  resource: "resources/common.res",
  models: models,
  audioGain: 2.0,
  applyFrontend: true
});

detector.on('hotword', function (index, hotword, buffer) {
    // <buffer> contains the last chunk of the audio that triggers the "hotword"
    // event. It could be written to a wav stream. You will have to use it
    // together with the <buffer> in the "sound" event if you want to get audio
    // data after the hotword.
    mopidy.tracklist.add({uris:["yt:http://www.youtube.com/watch?v=Njpw2PVb1c0"]})
    .then(mopidy.tracklist.getTracks()[0])
    .then(mopidy.playback.play)
    console.log(buffer);
    console.log('hotword', index, hotword);
  });
  

mopidy.on("state:online", function () {
    startMicListening();
    console.log("yolo")
    console.log(mopidy.library.search.params);
    console.log(mopidy.tracklist.add.params);
   
    //console.log(mopidy.library.search([{'artist':['solomun']},["yt:"]]));
}); 
/*
detector.on('sound', function (buffer) {
  // <buffer> contains the last chunk of the audio that triggers the "sound"
  // event. It could be written to a wav stream.
  console.log('sound');
});
detector.on('error', function () {
  console.log('error');
});*/
function startMicListening() {
    const mic = record.start({
        threshold: 0,
        verbose: true
      });
      
    mic.pipe(detector);
}

