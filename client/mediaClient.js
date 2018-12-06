const http = require('http');

exports.getMediaByListPos= async (number)=>{
    return new Promise ((resolve, reject)=>{
        http.get({
            hostname: process.env.media_hostname,
            port: 3000,
            path: '/media-by-list-pos?number='+number,
            method : 'GET'
        }, (res) => {
            res.setEncoding('utf8');
            let rawData = '';
            res.on('data', (chunk)=> rawData+= chunk);
            res.on('end',() =>{
                try{
                    let parsedData = JSON.parse(rawData);
                    resolve(parsedData)
                }catch(e){
                    console.error(e.message)
                }
            })
        },)
    })
   
}