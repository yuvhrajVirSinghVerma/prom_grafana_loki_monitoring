"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prom_client_1 = __importStar(require("prom-client"));
const winston_1 = require("winston");
const winston_loki_1 = __importDefault(require("winston-loki"));
const app = (0, express_1.default)();
const options = {
    transports: [
        new winston_loki_1.default({
            host: "http://loki:3100"
        })
    ]
};
const logger = (0, winston_1.createLogger)(options);
let counter = new prom_client_1.Counter({
    name: "Total_Request",
    help: "total request",
    labelNames: ['method', 'route', 'status_code'] //adding dimension to our metrics , it helps in analysing requests mor granuarly
});
let gauge = new prom_client_1.Gauge({
    name: "CPU_USAGE",
    help: "TOTAL CPU USAGE",
    labelNames: ['type']
});
const counterMiddleware = (req, res, next) => {
    res.on("finish", () => {
        counter.inc({
            method: req.method,
            route: req.route ? req.route.path : req.path,
            status_code: res.statusCode //on res finish we will get the status code
        });
    });
    next();
};
const gaugeMiddleware = (req, res, next) => {
    const memoryUsage = process.memoryUsage();
    gauge.set({ type: 'heapTotal' }, memoryUsage.heapTotal / (1024 * 1024)); // Total heap memory
    gauge.set({ type: 'heapUsed' }, memoryUsage.heapUsed / (1024 * 1024)); // Used heap memory
    gauge.set({ type: 'external' }, memoryUsage.external / (1024 * 1024)); // External memory
    next();
};
app.use(express_1.default.json());
app.use(counterMiddleware, gaugeMiddleware);
app.get("/user", (req, res) => {
    try {
        logger.info("/user called");
        let n = parseInt((Math.random() * 10).toString());
        console.log("Math.random()*10 ", (Math.random() * 10).toString());
        if (n == 5)
            throw new Error("Internal server error");
        res.status(202).send({
            name: "name",
            age: 23,
            n
        });
    }
    catch (e) {
        logger.error(`error : ${e.message}`);
        res.status(500).send({
            error: "Internal Server Error",
        });
    }
});
app.post("/user", (req, res) => {
    const user = req.body;
    res.send(Object.assign(Object.assign({}, user), { id: 1 }));
});
app.get('/metrics', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const metrics = yield prom_client_1.default.register.metrics();
    console.log("client ", prom_client_1.default.register, " => ", metrics);
    res.set('Content-Type', prom_client_1.default.register.contentType);
    res.end(metrics);
}));
app.listen(3000);
