const log = require('./logger');
const k8s = require('@kubernetes/client-node');
const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const coreApi = kc.makeApiClient(k8s.CoreV1Api);
const appsApi = kc.makeApiClient(k8s.AppsV1Api);
const Cmds = {}
module.exports.coreApi = coreApi
module.exports.appsApi = appsApi
module.exports.kc = kc
Cmds.stateful = async(obj = {})=>{
  try{
    if(!obj.nameSpace || !obj.setName) throw(`statefulset setname or namespace not provided`)
    let data = await appsApi.readNamespacedStatefulSet(obj.setName, obj.nameSpace)
    return data?.body
  }catch(e){
    if(e?.response?.body?.message) throw({ statusCode: e.response?.statusCode, message: e?.response?.body?.message})
    throw(e)
  }
}
Cmds.deployment = async(obj = {})=>{
  try{
    if(!obj.nameSpace || !obj.setName) throw(`deployment setname or namespace not provided`)
    let data = await appsApi.readNamespacedDeployment(obj.setName, obj.nameSpace)
    return data?.body
  }catch(e){
    if(e?.response?.body?.message) throw({ statusCode: e.response?.statusCode, message: e?.response?.body?.message})
    throw(e)
  }
}
Cmds.replica = async(obj = {})=>{
  try{
    if(!obj.nameSpace || !obj.setName) throw(`deployment setname or namespace not provided`)
    let data = await appsApi.listNamespacedReplicaSet(obj.nameSpace, undefined, undefined, undefined, undefined, `app=${obj.setName}`)
    return data?.body?.items
  }catch(e){
    if(e?.response?.body?.message) throw({ statusCode: e.response?.statusCode, message: e?.response?.body?.message})
    throw(e)
  }
}
module.exports.getSet = async(obj = {})=>{
  try{
    log.info(obj?.type)
    if(!obj.type || !Cmds[obj.type]) throw(`set type not provided`)
    return await Cmds[obj.type](obj)
  }catch(e){
    throw(e)
  }
}
