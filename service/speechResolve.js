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
  return speech.recognize(request);
}
