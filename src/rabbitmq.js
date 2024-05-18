'use strict'
const log = require('./logger');
const rabbitmq = require('rabbitmq-client');

const POD_NAME = process.env.POD_NAME || 'node-monitor'
let clientReady, publisher, publisherReady, exchangeName = 'k8-status'
const connectOptions = {
  connectionName: POD_NAME,
  hostname: process.env.MESSAGE_BUS_HOST || 'rabbitmq-cluster.datastore',
  port: +process.env.MESSAGE_BUS_PORT || 5672,
  username: process.env.MESSAGE_BUS_USER,
  password: process.env.MESSAGE_BUS_PASS
}
const client = new rabbitmq.Connection(connectOptions)
client.on('error', (err)=>{
  log.error(`${POD_NAME} rabbitmq error`)
  log.error(err)
})
client.on('connection', ()=>{
  clientReady = true
  log.info(`${POD_NAME} rabbitmq client connection successfully (re)established`)
})
const createPublisher = async()=>{
  try{
    if(!client.ready) throw(`${POD_NAME} rabbitmq client is not ready`)
    publisher = client.createPublisher({ confirm: true, exchanges: [{ exchange: exchangeName, type: 'topic', durable: true, maxAttempts: 5 }]})
    publisherReady = true
    return
  }catch(e){
    log.error(e)
    setTimeout(createPublisher, 5000)
  }
}
createPublisher()
module.exports.client = client
module.exports.ready = ()=>{
  return publisherReady
}
module.exports.send = async(data = {})=>{
  if(!data?.type || !data?.namespace || !data?.name) return
  await publisher.send({ exchange: exchangeName, routingKey: `${data.type}.${data.namespace}.${data.name}` }, data)
  return true
}
