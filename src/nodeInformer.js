'use strict'
const log = require('./logger');
const k8s = require('@kubernetes/client-node');
const { coreApi, kc } = require('./k8Api');
const checkNode = require('./checkNode');

const IGNORE_LABEL = process.env.IGNORE_LABEL || 'monitor-ignore'

const nodeFn = () => coreApi.listNode(true);
const informer = k8s.makeInformer(kc, '/api/v1/nodes', nodeFn);

const checkNodeStatus = (node = {})=>{
  if(!node.metadata?.name || node.metadata?.labels['monitor-ignore']) return
  let nodeCondition = node.status?.conditions?.find(x=>x.type === 'Ready')
  if(nodeCondition?.status !== 'True') checkNode(node)
  if(node?.spec?.unschedulable) checkNode(node)
}
informer.on('error', (err) => {
  log.error(err);
  setTimeout(() => {
      startInformer();
  }, 5000);
})
informer.on('add', (node = {})=>{
  checkNodeStatus(node)
})
informer.on('update', (node = {})=>{
  checkNodeStatus(node)
})

const startInformer = async()=>{
  try{
    await informer.start()
    log.info(`Node informer started...`)
    return true
  }catch(e){
    log.error(e)
    setTimeout(startInformer, 5000)
  }
}
startInformer()
