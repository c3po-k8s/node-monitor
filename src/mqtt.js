'use strict'
const mqtt = require('mqtt')
const log = require('./logger')
let connectMsg = false, clientReady
const MQTT_HOST = process.env.MQTT_HOST || 'mqtt-broker.datastore'
const MQTT_PORT = process.env.MQTT_PORT || '1883'
const MQTT_USER = process.env.MQTT_USER || 'leia'
const MQTT_PASS = process.env.MQTT_PASS || 'leia'
const DEVICE_NAME = process.env.POD_NAME || 'node-monitor'

const client = mqtt.connect(`mqtt://${MQTT_HOST}:${MQTT_PORT}`, {
  clientId: `mqtt_${DEVICE_NAME}`,
  clean: true,
  keepalive: 60,
  connectTimeout: 4000,
  username: MQTT_USER,
  password: MQTT_PASS,
  reconnectPeriod: 1000,
})
client.on('connect', ()=>{
  clientReady = true
  if(!connectMsg){
    connectMsg = true
    log.info('MQTT Connection successful...')
  }
})
module.exports.send = async(set = {})=>{
  try{
    await client.publish(`k8-status/${set.type}/${set.namespace}/${set.name}`, JSON.stringify(set), { qos: 1 })
    return true
  }catch(e){
    throw(e)
  }
}
module.exports.status = ()=>{
  return clientReady
}
