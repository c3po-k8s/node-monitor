const log = require('./logger')
const k8s = require('@kubernetes/client-node');
const { appsApi, kc } = require('./k8Api');
const rabbitmq = require('./rabbitmq')
const IGNORE_LABEL = process.env.IGNORE_LABEL || 'monitor-ignore'
let mqttStatus

const setFn = () => appsApi.listDeploymentForAllNamespaces()
const informer = k8s.makeInformer(kc, '/apis/apps/v1/deployments', setFn);

informer.on('error', (err) => {
    log.error(err);
    // Restart informer after 5sec
    setTimeout(() => {
        startInformer();
    }, 5000);
});
informer.on('add', (set = {})=>{
  rabbitmq.send({ name: set?.metadata?.name, namespace: set?.metadata.namespace, replicas: set?.spec.replicas, type: 'deployment', timestamp: Date.now() })
})
informer.on('update', (set = {})=>{
  rabbitmq.send({ name: set?.metadata?.name, namespace: set?.metadata.namespace, replicas: set?.spec.replicas, type: 'deployment', timestamp: Date.now() })
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
