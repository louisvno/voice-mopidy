
const record = require('node-record-lpcm16');
const Detector = require('snowboy').Detector;
const Models = require('snowboy').Models;
const fs = require('fs');
const wav = require('wav');
const FileWriter = require('wav').FileWriter;
const portAudio = require('node-portaudio');
const googleSpeech = require('@google-cloud/speech')
const speechResolveService = require('./service/speechResolve')
//speechResolveService.resolveCommandLine("play track 1");
var speech = new googleSpeech.SpeechClient();
const Mopidy = require ('mopidy');
let mopidy = new Mopidy({
    webSocketUrl: "ws://localhost:6680/mopidy/ws/",
    callingConvention: "by-position-or-by-name"
});
const models = new Models();
const config = {
  encoding: 'LINEAR16',
  sampleRateHertz: 16000,
  languageCode: 'en-US'
}

let bufferArr =[];
let hotwordDetected = false;

function sendToSpeechApi(audioBytes){
  let request = {
    audio:{content: audioBytes},
    config:config
  }
  console.log(request)
  speech.recognize(request)
    .then(data => {
      const response = data[0];
      let cmdLine = response.results.map(res=>res.alternatives[0].transcript).join('\n');
      console.log(cmdLine);
      speechResolveService.resolveCommandLine(cmdLine,mopidy);
  })
}

mopidy.on("state:online", function () {
  startMicListening();
  console.log("yoooo")
}); 


// the "format" event gets emitted at the end of the WAVE header
const wavReader = new wav.Reader();
/*appFeedbackAudioOut("resources/ding.wav")
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
}*/

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
    console.log("you got snowboyed")
    bufferArr.push(buffer);
    hotwordDetected=true;
  });

detector.on('sound', function (buffer) {
  // <buffer> contains the last chunk of the audio that triggers the "sound"
  // event. It could be written to a wav stream.
  bufferArr.push(buffer);
  console.log('sound');
});

detector.on('silence', function () {
  if(hotwordDetected === true){
    sendToSpeechApi((Buffer.concat(bufferArr)).toString('base64'));
    bufferArr = [];    
  }
  hotwordDetected = false;
  console.log('silence');
});

detector.on('error', function () {
  console.log('error');
});

function startMicListening() {
    const mic = record.start({
        threshold: 0,
        verbose: false
      });
      
    mic.pipe(detector);
}

