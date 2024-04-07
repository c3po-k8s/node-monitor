'use strict'
const log = require('./logger');
const k8s = require('@kubernetes/client-node');
const { checkPods, getPods } = require('./checkPods')
const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const coreApi = kc.makeApiClient(k8s.CoreV1Api);

const IGNORE_LABEL = process.env.IGNORE_LABEL || 'monitor-ignore'
const checkNode = async(node = {}) =>{
  try{
    if(node?.metadata?.labels[IGNORE_LABEL]) return
    let nodeCondition = node.status?.conditions?.find(x=>x.type === 'Ready')
    let unschedulable = node?.spec?.unschedulable
    if(!node.metadata?.name){
      log.error(`metadata not found for node check...`)
      return
    }
    if(nodeCondition?.status === 'True' && !unschedulable) return
    if(nodeCondition?.status === 'True' && unschedulable){
      await uncordonNode(node.metadata.name)
      return
    }
    if(!unschedulable) await cordonNode(node.metadata.name)
    let pods = await getPods(node)
    if(pods?.length > 0){
      checkPods(node.metadata.name)
    }
  }catch(e){
    log.error(`Error with checkNode on ${node?.metadata?.name}...`)
    log.error(e)
    setTimeout(()=>checkNode(node), 5000)
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
    if(res?.body?.spec?.unschedulable) throw(`Error uncordoning node ${nodeName}...`)
    log.info(`Uncordoned node ${nodeName}...`)
  }catch(e){
    throw(e)
  }
}
module.exports = checkNode
