'use strict'
module.exports = (pod = {})=>{
  return { cmd: 'k8-pod-status', namespace: pod.metadata?.namespace, name: pod.metadata?.name, phase: pod.status?.phase, condition: pod.status?.conditions, containers: pod.status?.containerStatuses, type: 'pod' }
}
