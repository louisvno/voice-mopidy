const Mopidy = require ('mopidy');
const record = require('node-record-lpcm16');
const Detector = require('snowboy').Detector;
const Models = require('snowboy').Models;
const fs = require('fs');
const wav = require('wav');
const portAudio = require('node-portaudio');

var reader = new wav.Reader();

var mopidy = new Mopidy({
    webSocketUrl: "ws://localhost:6680/mopidy/ws/",
    callingConvention: "by-position-or-by-name"
});
console.log(portAudio.getDevices())
//snowboy
const models = new Models();

   //sampleFormat: portAudio.SampleFormat16Bit,
 // Create a stream to pipe into the AudioOutput
// Note that this does not strip the WAV header so a click will be heard at the beginning
const readStream = fs.createReadStream('resources/snowboy.wav');
 // setup to close the output stream at the end of the read stream

//ao.on('error', err => console.error);
 
// the "format" event gets emitted at the end of the WAVE header
reader.on('format', function (format) {
    console.log("format"+format)
    Object.keys(format).forEach(k=> console.log(k + ":" + format[k]))
    console.log("hola" +reader.audioFormat)
    var ao = new portAudio.AudioOutput({
        channelCount: format.channels,
        sampleFormat: format.bitDepth,
        sampleRate: format.sampleRate,
        deviceId : -1 // Use -1 or omit the deviceId to select the default device
       });
  // the WAVE header is stripped from the output of the reader
  ao.start();
  readStream.on('end', () => ao.end());
  reader.pipe(ao);
  
});
readStream.pipe(reader)
// pipe the WAVE file to the Reader instance
//readStream.pipe(ao);


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
    mopidy.tracklist.add({uris:["yt:http://www.youtube.com/watch?v=bk6Xst6euQk"]})
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

