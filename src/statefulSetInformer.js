const log = require('./logger')
const k8s = require('@kubernetes/client-node');
const { appsApi, kc } = require('./k8Api');
const rabbitmq = require('./rabbitmq')
const IGNORE_LABEL = process.env.IGNORE_LABEL || 'monitor-ignore'
const POD_NAME = process.env.POD_NAME || 'node-monitor'

const setFn = () => appsApi.listStatefulSetForAllNamespaces()
const informer = k8s.makeInformer(kc, '/apis/apps/v1/statefulsets', setFn);

informer.on('error', (err) => {
    log.error(err);
    // Restart informer after 5sec
    setTimeout(() => {
        startInformer();
    }, 5000);
});
informer.on('add', (set = {})=>{
  rabbitmq.send({ name: set?.metadata?.name, namespace: set?.metadata.namespace, replicas: set?.spec.replicas, type: 'statefulset', timestamp: Date.now() })

})
informer.on('update', (set = {})=>{
  rabbitmq.send({ name: set?.metadata?.name, namespace: set?.metadata.namespace, replicas: set?.spec.replicas, type: 'statefulset', timestamp: Date.now() })
  //rabbitmq.send(`statefulset.${data.namespace}.${data.name}`, data)
})
const startInformer = async()=>{
  try{
    await informer.start()
    log.info(`StatefulSet informer started...`)
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
