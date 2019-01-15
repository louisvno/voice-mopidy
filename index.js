
const record = require('node-record-lpcm16');
const Detector = require('snowboy').Detector;
const Models = require('snowboy').Models;
const speechResolveService = require('./service/speechResolve');
const intentResolveService = require('./service/intentResolve')
const { from, fromEvent,merge ,of} = require('rxjs');
const { map,take,switchMap,filter ,tap, bufferToggle, bufferCount,delay} = require('rxjs/operators');

//settings
const utteranceSilenceLimit = 3; //externalize
const utteranceTimeLimit = 5000;

//init mopidy
const Mopidy = require ('mopidy');
let mopidy = new Mopidy({
    webSocketUrl: "ws://localhost:6680/mopidy/ws/",
    callingConvention: "by-position-or-by-name"
});

//init snowboy hotword model
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

function startMicListening() {
  const mic = record.start({
                      threshold: 0,
                      verbose: false
                    });    
        mic.pipe(detector);
}

mopidy.on("state:online", function () {
  startMicListening();
  console.log("Mic listening")
}); 

//snowboy event streams
const silenceDetected = fromEvent(detector, 'silence');
const hotwordDetected = fromEvent(detector, 'hotword');
const soundDetected = fromEvent(detector,'sound');
const allSounds = merge(hotwordDetected.pipe(map(([_,__,buffer])=> buffer)),soundDetected);

hotwordDetected.subscribe(_ =>
  {
    console.log("hotword");
    mopidy.playback.pause()
  }
);
silenceDetected.subscribe(_=>console.log("silence"));
soundDetected.subscribe(_=>console.log("sound"));

const utteranceTimeout = 
    merge(
          of("timeout").pipe(delay(utteranceTimeLimit)), 
          silenceDetected.pipe(bufferCount(utteranceSilenceLimit))
        )
        .pipe(take(1));
      
//todo throttle or sth
const utterance = allSounds.pipe(
    bufferToggle(hotwordDetected,_=> utteranceTimeout)
);

//send to google
const response = utterance.pipe(
  switchMap(bufferArr => 
    from(speechResolveService.sendToSpeechApi((Buffer.concat(bufferArr)).toString('base64'))))
);

//get response
response.subscribe(data => {
  const response = data[0];
  let cmdLine = response.results.map(res=>res.alternatives[0].transcript).join('\n');
  console.log("result: " + cmdLine);
  intentResolveService.resolveCommand(cmdLine,mopidy);
});



