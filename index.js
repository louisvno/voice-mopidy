
const record = require('node-record-lpcm16');
const Detector = require('snowboy').Detector;
const Models = require('snowboy').Models;
const speechResolveService = require('./service/speechResolve')
const { fromEvent,merge ,of} = require('rxjs');
const { map,take,switchMap,mapTo,filter ,tap,throttleTime, takeUntil, bufferToggle, bufferCount,delay} = require('rxjs/operators');

const Mopidy = require ('mopidy');
let mopidy = new Mopidy({
    webSocketUrl: "ws://localhost:6680/mopidy/ws/",
    callingConvention: "by-position-or-by-name"
});
const utteranceSilenceLimit = 3; //externalize
const utteranceTimeLimit = 5000;
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
utterance.subscribe(audio => speechResolveService.sendToSpeechApi(audio));

//mopidy event streams
const playBackStateChanged = fromEvent(mopidy, 'event:playbackStateChanged').pipe(
    tap(state => console.log("mopidy new state: " + state.new_state))
);
const playBackStoppedOrPaused = playBackStateChanged
    .pipe(
        filter(state => state.new_state === "stopped" || state.new_state === "paused"),
    );



