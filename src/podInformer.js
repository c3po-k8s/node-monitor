const log = require('./logger')
const k8s = require('@kubernetes/client-node');
const { coreApi, kc } = require('./k8Api');
const rabbitmq = require('./rabbitmq')
const getPodInfo = require('./getPodInfo')
const IGNORE_LABEL = process.env.IGNORE_LABEL || 'monitor-ignore'
let mqttStatus

const setFn = () => coreApi.listPodForAllNamespaces()
const informer = k8s.makeInformer(kc, '/api/v1/pods', setFn);

informer.on('error', (err) => {
    log.error(err);
    // Restart informer after 5sec
    setTimeout(() => {
        startInformer();
    }, 5000);
});
informer.on('add', (pod = {})=>{
  rabbitmq.send(getPodInfo(pod))
})
informer.on('update', (pod = {})=>{
  rabbitmq.send(getPodInfo(pod))
})
const startInformer = async()=>{
  try{
    await informer.start()
    log.info(`pod informer started...`)
  }catch(err){
    if(err?.body?.message){
      log.error(`Code: ${err.body.code}, Msg: ${err.body.message}`)
    }else{
      log.error(err)
    }
    setTimeout(startInformer, 5000)
  }
}
startInformer()
