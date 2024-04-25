'use strict'
const log = require('./logger');
const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');
const { getSet } = require('./k8Api')
const PORT = process.env.PORT || 3000
const app = express();
app.use(bodyParser.json({
  limit: '1000MB',
  verify: (req, res, buf)=>{
    req.rawBody = buf.toString()
  }
}))
app.use(compression())
app.get('/get/:type/:nameSpace/:setName', (req, res)=>{
  handleGetSetRequest(req, res)
})
app.get('/replicas/:type/:nameSpace/:setName', (req, res)=>{
  handleGetReplicasRequest(req, res)
})
const handleGetSetRequest = async(req, res)=>{
  try{
    if(!req?.params) throw(`no payload provided`)
    let data = await getSet(req.params)
    if(!data) data = {}
    res.json(data)
  }catch(e){
    log.error(e)
    let statusCode = 400, msg = e
    res.status(e?.statusCode || statusCode).json( { code: e?.statusCode || statusCode, message: e?.message || e } )
  }
}
const handleGetReplicasRequest = async(req, res)=>{
  try{
    if(!req?.params) throw(`no payload provided`)
    let replicas = 0
    let data = await getSet(req.params)
    if(data?.spec.replicas) replicas = data.spec.replicas
    res.json({ replicas: replicas })
  }catch(e){
    log.error(e)
    let statusCode = 400, msg = e
    res.status(e?.statusCode || statusCode).json( { code: e?.statusCode || statusCode, message: e?.message || e } )
  }
}
const server = app.listen(PORT, ()=>{
  log.info(`node-monitor Server listening on port ${server?.address()?.port}`)
})
