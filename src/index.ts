import { WebSocketServer , WebSocket } from "ws";
const wss = new WebSocketServer({port:3000});

let userCount = 0;
let allSocket:WebSocket[] = [];


wss.on("connection" , (socket) => {
    allSocket.push(socket);

    userCount += 1;
    console.log(`User:${userCount} Connected to the WebSocket Server!`);

    socket.on("message" , (e) => {
        // console.log(`${e.toString()}: => message sent from the server!`);        
        // we've to send message to all the users/sockets
        allSocket.forEach((s) => {
            s.send(`${e.toString()}`)
        })
    })

    // whenever a user/socket disconnects remove that socket from the global arrray:
    socket.on("disconnect" , () => {
        allSocket = allSocket.filter(x => x != socket);
    })
            
})