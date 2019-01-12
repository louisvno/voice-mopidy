
const record = require('node-record-lpcm16');
const Detector = require('snowboy').Detector;
const Models = require('snowboy').Models;
const fs = require('fs');
const wav = require('wav');
const FileWriter = require('wav').FileWriter;
const portAudio = require('node-portaudio');
const googleSpeech = require('@google-cloud/speech')
const speechResolveService = require('./service/speechResolve')
const { fromEvent, combineLatest,timer,zip,merge } = require('rxjs');
const { map, filter ,tap,throttleTime,exhaustMap, takeUntil, windowCount, bufferToggle, bufferCount,delay} = require('rxjs/operators');
//speechResolveService.resolveCommandLine("play track 1");
//var speech = new googleSpeech.SpeechClient();
const Mopidy = require ('mopidy');
let mopidy = new Mopidy({
    webSocketUrl: "ws://localhost:6680/mopidy/ws/",
    callingConvention: "by-position-or-by-name"
});
const silentBufferThreshold = 3; //externalize
const models = new Models();
const config = {
  encoding: 'LINEAR16',
  sampleRateHertz: 16000,
  languageCode: 'en-US'
}

/*function sendToSpeechApi(audioBytes){
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
}*/

mopidy.on("state:online", function () {
  startMicListening();
  console.log("Mic listening")
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

/*detector.on('hotword', function (index, hotword, buffer) {
    // <buffer> contains the last chunk of the audio that triggers the "hotword"
    // event. It could be written to a wav stream. You will have to use it
    // together with the <buffer> in the "sound" event if you want to get audio
    // data after the hotword.
    console.log("you got snowboyed")
    mopidy.playback.pause();
    bufferArr.push(buffer);
    hotwordDetected=true;
  });*/

//snowboy event streams
const silenceDetected = fromEvent(detector, 'silence');
const hotwordDetected = fromEvent(detector, 'hotword');
const soundDetected = fromEvent(detector,'sound');
const allSounds = merge(hotwordDetected,soundDetected);

hotwordDetected.subscribe(_ =>
  {
    console.log("hotword");
    mopidy.playback.pause()
  }
);
silenceDetected.subscribe(_=>console.log("silence"));
soundDetected.subscribe(_=>console.log("sound"));

//or x silence detected or x seconds
const nSilenceDetected = silenceDetected.pipe(bufferCount(silentBufferThreshold));
const utteranceTimeout = hotwordDetected.pipe(
                                          delay(500),
                                          tap(_=> console.log("timed out"))
                                        );
const stopRecordVoiceCmd = merge(nSilenceDetected,utteranceTimeout);

const utterance = allSounds.pipe(
    bufferToggle(hotwordDetected,_=> stopRecordVoiceCmd)
);

//send to google
utterance.subscribe(res => console.log(res));



//mopidy event streams
const playBackStateChanged = fromEvent(mopidy, 'event:playbackStateChanged').pipe(
    tap(state => console.log("mopidy new state: " + state.new_state))
);
const playBackStoppedOrPaused = playBackStateChanged
    .pipe(
        filter(state => state.new_state === "stopped" || state.new_state === "paused"),
    );




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

