import express, { NextFunction,Request,Response } from "express";
import client,{Counter, Gauge} from "prom-client";
import { createLogger, transports } from "winston";
import LokiTransport from "winston-loki";
const app = express();

const options = {
    transports: [
      new LokiTransport({
        host: "http://loki:3100"
      })
    ]
  }

  const logger = createLogger(options);
let counter=new Counter({
    name:"Total_Request",
    help:"total request",
    labelNames:['method', 'route', 'status_code']//adding dimension to our metrics , it helps in analysing requests mor granuarly
})
let gauge=new Gauge({
    name:"CPU_USAGE",
    help:"TOTAL CPU USAGE",
    labelNames: ['type'] 
})
const counterMiddleware=(req:Request,res:Response,next:NextFunction)=>{
   res.on("finish",()=>{
    counter.inc({
        method: req.method,
        route: req.route ? req.route.path : req.path,
        status_code: res.statusCode//on res finish we will get the status code
    })
   })
   next()

}
const gaugeMiddleware=(req:Request,res:Response,next:NextFunction)=>{
    const memoryUsage = process.memoryUsage();
    gauge.set({ type: 'heapTotal' }, memoryUsage.heapTotal / (1024 * 1024)); // Total heap memory
    gauge.set({ type: 'heapUsed' }, memoryUsage.heapUsed / (1024 * 1024));   // Used heap memory
    gauge.set({ type: 'external' }, memoryUsage.external / (1024 * 1024));   // External memory
    next()
 
 }
app.use(express.json());
app.use(counterMiddleware,gaugeMiddleware)
app.get("/user", (req, res) => {
    try{
        logger.info("/user called")
        let n=parseInt((Math.random()*10).toString())
        console.log("Math.random()*10 ",(Math.random()*10).toString())
        if(n==5)throw new Error("Internal server error")
        res.status(202).send({
            name: "name",
            age: 23,
            n
        });
    }catch(e:any){
        logger.error(`error : ${e.message}`)
        res.status(500).send({
            error: "Internal Server Error",
        });
    }
});

app.post("/user", (req, res) => {
    const user = req.body;
    res.send({
        ...user,
        id: 1,
    });
});
app.get('/metrics',async(req,res)=>{
    const metrics = await client.register.metrics();
    console.log("client ",client.register, " => ",metrics)
    res.set('Content-Type', client.register.contentType);
    res.end(metrics);
})
app.listen(3000);