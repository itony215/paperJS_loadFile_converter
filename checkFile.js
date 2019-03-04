const glob = require('glob')
const createLoadFile = require('./createLoadFile')
glob("*[0-9]?.json",(err,files)=>{
  files.map((file)=>{
    let filename = file.split(/\.(?=[^\.]+$)/)[0]
    glob(filename+'_LoadFile.json',(err,files)=>{
      if(files.length==0){
        console.log('creat ', filename + '_LoadFile.json')
        createLoadFile(filename)
      }      
    })
  })
})
