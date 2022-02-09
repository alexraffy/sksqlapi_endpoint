import {closeSocket, setupSocket} from "./socket";
import {Logger} from "./Logger";
import {SKSQL, TAuthSession, TWSRON, WSRON} from "sksql";
import {WebSocket} from 'ws';

function reconnect() {
    closeSocket();
    SKSQL.instance.connectToServer("ws://127.0.0.1:30000", {
        connectionError(databaseHashId: string, error: string): any {
            Logger.instance.write("ERROR: " + error);
        },
        on(databaseHashId: string, message: string, payload: any) {
            console.log(message);
            if (message === WSRON) {
                console.log((payload as TWSRON).name + " has connected.");
            }
        },
        connectionLost(databaseHashId: string) {

        },
        authRequired(databaseHashId: string): TAuthSession {
            return {name: "Server", id: 1, token: "", valid: true} as TAuthSession
        },
        ready(databaseHashId: string): any {
            setupSocket(30100);
        }
    });
}

//@ts-ignore
global["WebSocket"] = WebSocket;

function setup() {
    const logPath = process.env["SKSQLAPI_ENDPOINT_LOGPATH"];

    let log = new Logger(logPath);
    let db = new SKSQL();


/*
    const ws = new WebSocket('ws://127.0.0.1:30000', {
        perMessageDeflate: false
    });

    ws.on('open', function open() {
        ws.send('something');
    });

    ws.on('message', function message(data) {
        console.log('received: %s', data);
    });

 */


    reconnect();



}


setup();

