"use strict";

/*
 * MultiplayerAdapter — the interface every backend implementation
 * follows. game logic (index.html) only ever talks to this interface,
 * so the backend can be swapped without touching game code.
 */
class MultiplayerAdapter {
    connect(){ throw new Error("connect() not implemented"); }
    disconnect(){ throw new Error("disconnect() not implemented"); }
    findMatch(){ throw new Error("findMatch() not implemented"); }
    createRoom(){ throw new Error("createRoom() not implemented"); }
    joinRoom(){ throw new Error("joinRoom() not implemented"); }
    leaveRoom(){ throw new Error("leaveRoom() not implemented"); }
    sendMove(){ throw new Error("sendMove() not implemented"); }
    onOpponentMove(){}
    onGameStart(){}
    onGameEnd(){}
    onPlayerDisconnect(){}
    onStateUpdate(){}
}


/*
 * MockMultiplayerAdapter — LOCAL DEV/UI-TESTING ONLY.
 * Simulates a "match found" so you can click through the matchmaking
 * screens without a server running. It never actually plays moves for
 * an opponent — this is NOT real online multiplayer and must never be
 * presented to players as such.
 */
class MockMultiplayerAdapter extends MultiplayerAdapter {
    constructor(){
        super();
        this._handlers = {};
    }

    connect(){ return Promise.resolve(); }
    disconnect(){}

    findMatch(){
        setTimeout(() => {
            this._handlers.matchFound?.({
                matchId: "mock",
                you: { symbol: "X", name: "YOU" },
                opponent: { name: "MOCK_BOT" }
            });

            setTimeout(() => {
                this._handlers.gameStart?.({
                    board: Array(9).fill(null),
                    currentPlayer: "X",
                    turn: 1
                });
            }, 1700);
        }, 900);
    }

    cancelFindMatch(){}
    createRoom(){}
    joinRoom(){}
    leaveRoom(){}

    sendMove(){
        console.warn("MockMultiplayerAdapter: no real backend connected — move was not sent anywhere.");
    }

    onOpponentMove(cb){ this._handlers.opponentMove = cb; }
    onGameStart(cb){ this._handlers.gameStart = cb; }
    onGameEnd(cb){ this._handlers.gameEnd = cb; }
    onPlayerDisconnect(cb){ this._handlers.disconnect = cb; }
    onStateUpdate(cb){ this._handlers.stateUpdate = cb; }
    onMatchFound(cb){ this._handlers.matchFound = cb; }
    onQueued(cb){ this._handlers.queued = cb; }
    onMoveRejected(cb){ this._handlers.moveRejected = cb; }
    setMySymbol(){}
}


/*
 * WebSocketMultiplayerAdapter — real backend adapter.
 * Talks to server/server.js over a WebSocket. The server is
 * authoritative (runs the exact same rules.js logic); this adapter
 * just forwards intent and applies whatever state the server returns.
 */
class WebSocketMultiplayerAdapter extends MultiplayerAdapter {
    constructor(url){
        super();
        this.url = url;
        this.ws = null;
        this.matchId = null;
        this._mySymbol = null;
        this._handlers = {};
        this._pingInterval = null;
    }

    connect(){
        return new Promise((resolve, reject) => {
            let socket;

            try{
                socket = new WebSocket(this.url);
            }catch(error){
                reject(error);
                return;
            }

            this.ws = socket;

            socket.onopen = () => {
                this._pingInterval = setInterval(() => this._send({ type:"ping" }), 20000);
                resolve();
            };

            socket.onerror = (error) => reject(error);

            socket.onclose = () => {
                clearInterval(this._pingInterval);
            };

            socket.onmessage = (event) => {
                let msg;
                try{ msg = JSON.parse(event.data); }catch(error){ return; }
                this._handleMessage(msg);
            };
        });
    }

    disconnect(){
        clearInterval(this._pingInterval);
        if(this.ws) this.ws.close();
        this.ws = null;
        this.matchId = null;
    }

    _send(payload){
        if(this.ws && this.ws.readyState === WebSocket.OPEN){
            this.ws.send(JSON.stringify(payload));
        }
    }

    findMatch(){ this._send({ type:"find_match" }); }
    cancelFindMatch(){ this._send({ type:"cancel_find" }); }

    createRoom(){ console.warn("createRoom(): private rooms aren't implemented by this MVP server yet."); }
    joinRoom(){ console.warn("joinRoom(): private rooms aren't implemented by this MVP server yet."); }

    leaveRoom(){
        this._send({ type:"leave" });
        this.matchId = null;
    }

    sendMove(cell){
        this._send({ type:"move", matchId:this.matchId, cell, timestamp:Date.now() });
    }

    setMySymbol(symbol){ this._mySymbol = symbol; }

    onOpponentMove(cb){ this._handlers.opponentMove = cb; }
    onGameStart(cb){ this._handlers.gameStart = cb; }
    onGameEnd(cb){ this._handlers.gameEnd = cb; }
    onPlayerDisconnect(cb){ this._handlers.disconnect = cb; }
    onStateUpdate(cb){ this._handlers.stateUpdate = cb; }
    onMatchFound(cb){ this._handlers.matchFound = cb; }
    onQueued(cb){ this._handlers.queued = cb; }
    onMoveRejected(cb){ this._handlers.moveRejected = cb; }

    _handleMessage(msg){
        switch(msg.type){
            case "queued":
                this._handlers.queued?.();
                break;

            case "match_found":
                this.matchId = msg.matchId;
                this._handlers.matchFound?.(msg);
                break;

            case "game_start":
                this._handlers.gameStart?.(msg);
                break;

            case "state_update":
                this._handlers.stateUpdate?.(msg);
                if(msg.movedBy && msg.movedBy !== this._mySymbol){
                    this._handlers.opponentMove?.(msg);
                }
                break;

            case "game_end":
                this._handlers.gameEnd?.(msg);
                break;

            case "opponent_disconnected":
                this._handlers.disconnect?.();
                break;

            case "move_rejected":
                this._handlers.moveRejected?.(msg);
                break;

            case "queue_cancelled":
            case "pong":
                break;
        }
    }
}
