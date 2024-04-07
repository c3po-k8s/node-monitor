'use strict'
const log = require('./logger')
const k8s = require('@kubernetes/client-node');
const que = require('./que')
const IGNORE_LABEL = process.env.IGNORE_LABEL || 'monitor-ignore'

const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const coreApi = kc.makeApiClient(k8s.CoreV1Api);

const nodeFn = () => coreApi.listNode(true);
const informer = k8s.makeInformer(kc, '/api/v1/nodes', nodeFn);

informer.on('error', (err) => {
  log.error(err);
  setTimeout(() => {
      startInformer();
  }, 5000);
})
informer.on('add', (node = {})=>{
  if(!node.metadata?.name || node.metadata?.labels['monitor-ignore']) return
  let nodeCondition = node.status?.conditions?.find(x=>x.type === 'Ready')
  if(nodeCondition?.status !== 'True') que.add(node.metadata?.name, { type: 'checkNode', node: node })
  if(node?.spec?.unschedulable) que.add(node.metadata?.name, { type: 'checkNode', node: node })
})
informer.on('update', (node = {})=>{
  if(!node.metadata?.name || node.metadata?.labels['monitor-ignore']) return
  let nodeCondition = node.status?.conditions?.find(x=>x.type === 'Ready')
  if(nodeCondition?.status !== 'True') que.add(node.metadata?.name, { type: 'checkNode', node: node })
  if(node?.spec?.unschedulable) que.add(node.metadata?.name, { type: 'checkNode', node: node })
})
const startInformer = async()=>{
  try{
    await informer.start()
    log.info(`Node informer started...`)
    return true
  }catch(e){
    throw(e)
  }
}
const stopInformer = async()=>{
  try{
    await informer.stop()
    log.info(`Node informer stopped...`)
    return true
  }catch(e){
    throw(e)
  }
}
module.exports.start = startInformer
module.exports.stop = stopInformer
