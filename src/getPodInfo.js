'use strict'
module.exports = (pod = {})=>{
  return { namespace: pod.metadata?.namespace, name: pod.metadata?.name, phase: pod.status?.phase, condition: pod.status?.conditions, containers: pod.status?.containerStatuses, type: 'pod' }
}
