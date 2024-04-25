const log = require('./logger')
const k8s = require('@kubernetes/client-node');
const { appsApi, kc } = require('./k8Api');
const mqtt = require('./mqtt')
const IGNORE_LABEL = process.env.IGNORE_LABEL || 'monitor-ignore'
let mqttStatus

const setFn = () => appsApi.listDeploymentForAllNamespaces()
const informer = k8s.makeInformer(kc, '/apis/apps/v1/deployments', setFn);

const updateSet = async(set = {})=>{
  try{
    let status
    if(!mqttStatus) mqttStatus = mqtt.status()
    if(mqttStatus) status = await mqtt.send(set)
    if(status) return
    setTimeout(()=>updateSet(set), 5000)
  }catch(e){
    log.error(e)
    setTimeout(()=>updateSet(set), 5000)
  }
  //log.info(set)
}
informer.on('error', (err) => {
    log.error(err);
    // Restart informer after 5sec
    setTimeout(() => {
        startInformer();
    }, 5000);
});
informer.on('add', (set = {})=>{
  updateSet({ name: set?.metadata?.name, namespace: set?.metadata.namespace, replicas: set?.spec.replicas, type: 'deployment' })
})
informer.on('update', (set = {})=>{
  updateSet({ name: set?.metadata?.name, namespace: set?.metadata.namespace, replicas: set?.spec.replicas, type: 'deployment'})
})
const startInformer = async()=>{
  try{
    await informer.start()
    log.info(`Deployment informer started...`)
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
