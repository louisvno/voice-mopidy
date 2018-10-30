var Mopidy = require ('mopidy');

var mopidy = new Mopidy({
    webSocketUrl: "ws://localhost:6680/mopidy/ws/",
    callingConvention: "by-position-or-by-name"
});
mopidy.on("state:online", function () {
    console.log("yolo")
    console.log(mopidy.library.search.params);
    console.log(mopidy.tracklist.add.params);
    mopidy.tracklist.add({uris:["yt:http://www.youtube.com/watch?v=Njpw2PVb1c0"]})
        .then(mopidy.tracklist.getTracks()[0])
        .then(mopidy.playback.play)
    //console.log(mopidy.library.search([{'artist':['solomun']},["yt:"]]));
}); 