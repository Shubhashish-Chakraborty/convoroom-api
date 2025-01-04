import { WebSocketServer , WebSocket } from "ws";
const wss = new WebSocketServer({port:3000});


interface User {
    socket: WebSocket,
    room: string
}

let allSocket: User[] = [];


wss.on("connection" , (socket) => {

    console.log("SOMEONE CONNECTED TO THE SERVER");
    
    socket.on("message" , (message) => {
        const parsedMessage = JSON.parse(message as unknown as string); // or tsignore as your wish

        
        if (parsedMessage.type === "join") { // if the person wants to join the room then you'll push to the allSocket
            console.log(`${parsedMessage.payload.name} Joined the room: ${parsedMessage.payload.roomId}`);
            
            allSocket.push({
                socket,
                room: parsedMessage.payload.roomId
            })
        }
        if (parsedMessage.type === "chat") {
            console.log(`${parsedMessage.payload.name} Messaged: ${parsedMessage.payload.textMessage}`);

            const currentUserRoom = allSocket.find((x) => x.socket == socket)?.room;

            allSocket.forEach((userObj) => {
                if (userObj.room == currentUserRoom) {
                    userObj.socket.send(parsedMessage.payload.textMessage)
                }
            })            
        }

    })

            
})