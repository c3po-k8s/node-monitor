'use strict'
const log = require('./logger')
const rabbitmq = require('./rabbitmq')
const start = ()=>{
  try{
    if(rabbitmq.ready()){
      require('./nodeInformer')
      require('./statefulSetInformer')
      require('./deploymentInformer')
      require('./podInformer')
      require('./express')
      return
    }
    setTimeout(start, 5000)
  }catch(e){
    log.error(e)
    setTimeout(start, 5000)
  }
}
start()
