'use strict'
const log = require('./logger');
const k8s = require('@kubernetes/client-node');

const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const coreApi = kc.makeApiClient(k8s.CoreV1Api);
const getNode = async(nodeName)=>{
  try{
    if(!nodeName) return
    let data = await coreApi.readNode(nodeName)
    return data?.body
  }catch(e){
    throw(e)
  }
}
const getPods = async(node = {})=>{
  try{
    let pods = await coreApi.listPodForAllNamespaces(undefined, undefined, `spec.nodeName=${node.metadata?.name}`, undefined, undefined, true)
    if(pods?.body?.items){
      pods = pods.body.items
      let array = []
      for(let i in pods){
        let podTypes = pods[i].metadata?.ownerReferences?.map(x=>x.kind)
        if(podTypes?.filter(x=>x === 'DaemonSet').length > 0) continue;
        array.push({
          name: pods[i].metadata?.name,
          ns: pods[i].metadata?.namespace
        })
      }
      return array
    }
  }catch(e){
    throw(e)
  }
}
const getPod = async(podName, namespace)=>{
  try{
    let pod = await coreApi.readNamespacedPod(podName, namespace)
    if(pod?.body) return pod.body
  }catch(e){
    log.error(`Pod ${podName} in ${namespace} not found ...`)
  }
}
const deletePod = async(podName, namespace)=>{
  try{
    if(!podName || !namespace) return
    let pod = await getPod(podName, namespace)
    if(!pod?.metadata) return
    await coreApi.deleteNamespacedPod(pod.metadata?.name, pod.metadata.namespace, true, undefined, 0, undefined, 'Background')
    log.info(`Deleted ${podName} in ns ${namespace}...`)
  }catch(e){
    log.error(`Error deleting ${podName} in ns ${namespace}...`)
  }
}
const checkPods = async(nodeName)=>{
  try{
    let node = await getNode(nodeName)
    if(!node?.spec?.unschedulable) return
    let pods = await getPods(node)
    if(!pods || pods.length === 0) return
    log.info(`Attempting to delete ${pods.length} pods on node ${node.metadata?.name}...`)
    for(let i in pods) await deletePod(pods[i].name, pods[i].ns)
    if(pods.length > 0) setTimeout(()=>checkPods(nodeName), 5000)
  }catch(e){
    log.error(`Error checking pods for ${nodeName}...`)
    log.error(e)
    setTimeout(()=>checkPods(nodeName), 5000)
  }
}
module.exports.getPods = getPods
module.exports.checkPods = checkPods
