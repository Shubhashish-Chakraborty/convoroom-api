import { WebSocketServer , WebSocket } from "ws";
const wss = new WebSocketServer({port:3000});

// Client Message Schemas:

// join the room:
// {
// 	type: "join", // Message type is join
// 	payload: {
// 		"roomId" : "123123",
// 		"name" : "shubh"	
// 	}
// }

// send a message:
// {
// 	type : "chat",
// 	payload: {
// 		"textMessage" : "Hii there, how's everyone doing!"
// 	}	
// }



// Server Message Schemas:

// {
// 	type : "chat",
// 	payload: {
// 		"message" : "Hii there, how's everyone doing!",
// 		"sender" : "shubh"
// 	}
// }

interface User {
    socket: WebSocket,
    room: string,
    name: string
}

let allSocket: User[] = [];

let userCount = 0;

wss.on("connection" , (socket) => {

    userCount += 1;
    console.log(`User Present in the Server: ${userCount}`);
    
    socket.on("message" , (message) => {
        // or tsignore as your wish
        const parsedMessage = JSON.parse(message as unknown as string); // Message that came from the client "{...}"
        
        // if someone wants to join a room!
        if (parsedMessage.type === "join") { // if the person wants to join the room then you'll push to the allSocket
        
            allSocket.push({
                socket,
                room: parsedMessage.payload.roomId,
                name: parsedMessage.payload.name
            })
            
            // finding the room where the current user joined, and letting the members of THAT room know that someone joined!

            const currentUserRoom = allSocket.find((x) => x.socket == socket)?.room;
            allSocket.forEach((user) => {
                if (user.room == currentUserRoom) {
                    user.socket.send(`${parsedMessage.payload.name} Joined room: ${parsedMessage.payload.roomId}`);
                }
            })
        }
        
        // now the user has joined there room and they want to chat!, within there members:
        if (parsedMessage.type === "chat") {
            // console.log(`${parsedMessage.payload.name} Messaged: ${parsedMessage.payload.textMessage}`);

            const currentUserRoom = allSocket.find((x) => x.socket == socket)?.room;
            const currentUserName = allSocket.find((x) => x.socket == socket)?.name;

            allSocket.forEach((userObj) => {
                if (userObj.room == currentUserRoom) {
                    userObj.socket.send(JSON.stringify({
                        message: parsedMessage.payload.textMessage,
                        name: currentUserName
                    }))
                    // userObj.socket.send(`${currentUserName} messaged: ${parsedMessage.payload.textMessage}`)
                }
            })            
        }

    })

    socket.on("close" , () => {
        userCount -= 1
        console.log(`User disconnected. Users remaining: ${userCount}`);
    })

            
})