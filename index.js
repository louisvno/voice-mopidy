const Mopidy = require ('mopidy');
const record = require('node-record-lpcm16');
const Detector = require('snowboy').Detector;
const Models = require('snowboy').Models;
const fs = require('fs');
const wav = require('wav');
const portAudio = require('node-portaudio');
const googleSpeech = require('@google-cloud/speech')
var speech = new googleSpeech.SpeechClient();
var mopidy = new Mopidy({
    webSocketUrl: "ws://localhost:6680/mopidy/ws/",
    callingConvention: "by-position-or-by-name"
});
console.log(portAudio.getDevices())
//snowboy
const models = new Models();
const file = fs.readFileSync("resources/hello.wav")
const audioBytes = file.toString('base64');
console.log(audioBytes)
const audio ={content:audioBytes}
const config = {
  encoding: 'LINEAR16',
  sampleRateHertz: 16000,
  languageCode: 'en-US'
}
const request = {
  audio:audio,
  config:config
}
speech.recognize(request)
.then(data => {
  const response = data[0];
  console.log(response.results.map(res=>res.alternatives[0].transcript).join('\n'))

})

// the "format" event gets emitted at the end of the WAVE header
const wavReader = new wav.Reader();
appFeedbackAudioOut("resources/ding.wav")
function appFeedbackAudioOut(filePath){
    const readStream = fs.createReadStream(filePath); 
    

    wavReader.on('format', function (format) {
        Object.keys(format).forEach(k=> console.log(k + ":" + format[k]))
    
        var ao = new portAudio.AudioOutput({
            channelCount: format.channels,
            sampleFormat: format.bitDepth,
            sampleRate: format.sampleRate,
            deviceId : -1 // Use -1 or omit the deviceId to select the default device
           });
        
      // the WAVE header is stripped from the output of the reader
        wavReader.pipe(ao); 
        ao.start(); 
        readStream.on('end', () => ao.end());
    });

    readStream.pipe(wavReader);  
}

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
    //startMicListening();
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

