'use strict'
module.exports = (set = {}, type)=>{
  return { name: set?.metadata?.name, namespace: set?.metadata.namespace, replicas: set?.spec.replicas, ready: set?.status.currentReplicas || set?.status.availableReplicas, type: type, timestamp: Date.now() }
}
