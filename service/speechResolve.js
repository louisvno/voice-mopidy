const mediaClient = require('../client/mediaClient');

//google speech is used but different provider could be used here
const googleSpeech = require('@google-cloud/speech')
let speech = new googleSpeech.SpeechClient();

const config = {
  encoding: 'LINEAR16',
  sampleRateHertz: 16000,
  languageCode: 'en-US'
}

exports.sendToSpeechApi = (audioBytes) =>{
  let request = {
    audio:{content: audioBytes},
    config:config
  }
  speech.recognize(request)
    .then(data => {
      const response = data[0];
      let cmdLine = response.results.map(res=>res.alternatives[0].transcript).join('\n');
      console.log("result: " + cmdLine);
      resolveCommandLine(cmdLine,mopidy);
  })
}


const resolveCommandLine= async (commandLine,mopidy)=>{
    
    let trackNumber = extractFirstNum(commandLine);
    let pause = checkPause(commandLine);

    if(trackNumber){
        let res = await mediaClient.getMediaByListPos(trackNumber);
        playMedia(res.resourceId,mopidy)
        console.log(res)
    }else if(pause){
        mopidy.playback.pause();
    } else mopidy.playback.resume();
}

function checkPause(string){
    return string.indexOf("pause") > -1;
}

function extractFirstNum(string){
     let numberPattern = /\d+/g;
     let result = string.match(numberPattern);
     if(result) return result[0];
     else return false; 
}

function playMedia(id,mopidy){
    mopidy.tracklist.add({uris:["yt:http://www.youtube.com/watch?v="+id]})
        .then(mopidy.tracklist.getTracks()[0])
        .then(mopidy.playback.play)
}


