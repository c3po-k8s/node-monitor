'use strict'
const log = require('./logger');
const que = require('./que');
const k8s = require('@kubernetes/client-node');
const { v4: uuidv4 } = require('uuid');

const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const coreApi = kc.makeApiClient(k8s.CoreV1Api);

const IGNORE_LABEL = process.env.IGNORE_LABEL || 'monitor-ignore'
const checkNode = async(node = {})=>{
  try{
    if(node?.metadata?.labels[IGNORE_LABEL]) return
    let nodeCondition = node.status?.conditions?.find(x=>x.type === 'Ready')
    let unschedulable = node?.spec?.unschedulable
    if(!node.metadata?.name) throw(`metadata not found for node check...`)
    if(nodeCondition?.status === 'True' && !unschedulable) return
    if(nodeCondition?.status === 'True' && unschedulable){
      await uncordonNode(node.metadata.name)
      return
    }
    if(!unschedulable) await cordonNode(node.metadata.name)
    let pods = await getPods(node)
    if(pods?.length > 0){
      log.info(`adding pod check job...`)
      let status = await que.add(uuidv4(), { type: 'checkPods', node: node })
      if(!status) throw(`Error adding pod check job for ${node.metadata.name} to bull que....`)
    }

    return
  }catch(e){
    throw(e)
  }
}
const cordonNode = async(nodeName)=>{
  try{
    log.info(`Attempting to cordon ${nodeName}...`)
    let res = await coreApi.patchNode(nodeName, { spec: { unschedulable: true } }, true, undefined, undefined, undefined, undefined, { headers: {'Content-Type': 'application/merge-patch+json'}})
    if(!res?.body?.spec?.unschedulable) throw(`Error cordoning node ${nodeName}...`)
    log.info(`Cordoned node ${nodeName}...`)
  }catch(e){
    throw(e)
  }
}
const uncordonNode = async(nodeName)=>{
  try{
    log.info(`Attempting to uncordon ${nodeName}...`)
    let res = await coreApi.patchNode(nodeName, { spec: { unschedulable: null } }, true, undefined, undefined, undefined, undefined, { headers: {'Content-Type': 'application/merge-patch+json'}})
    if(res?.body?.spec?.unschedulable) throw(`Error uncordoning node ${nodeName}`)
    log.info(`Uncordoned node ${nodeName}...`)
  }catch(e){
    throw(e)
  }
}
const checkPods = async(node = {})=>{
  try{
    let tempNode = await getNode(node?.metadata?.name)
    if(!tempNode?.spec?.unschedulable) return
    let pods = await getPods(node)
    if(!pods || pods.length === 0) return true
    log.info(`Attempting to delete ${pods.length} pods on node ${node.metadata?.name}...`)
    for(let i in pods) await deletePod(pods[i].name, pods[i].ns)
    if(pods.length > 0){
      let jobId = uuidv4()
      let status = await que.add(jobId, { type: 'checkPods', node: node })
      if(!status) throw(`Error adding pod check job for ${node.metadata.name} to bull que....`)
    }
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
const getNode = async(nodeName)=>{
  try{
    if(!nodeName) return
    let data = await coreApi.readNode(nodeName)
    return data?.body
  }catch(e){
    throw(e)
  }
}
module.exports = (job = {})=>{
  return new Promise(async(resolve, reject)=>{
    try{
      if(!job.data) reject(`Node info not provided..`)
      let data = job.data, res
      if(data.type === 'checkNode') res = await checkNode(data.node)
      if(data.type === 'checkPods') res = await checkPods(data.node)
      resolve()
    }catch(e){
      if(e?.body || e?.message){
        if(e.body){
          log.error(e.body)
        }else{
          log.error(e.message)
        }
      }else{
        log.error(e)
      }
      reject(e)
    }
  })
}
