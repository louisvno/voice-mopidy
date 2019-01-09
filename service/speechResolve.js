const mediaClient = require('../client/mediaClient');

exports.resolveCommandLine= async (commandLine,mopidy)=>{

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


