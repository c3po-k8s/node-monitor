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
