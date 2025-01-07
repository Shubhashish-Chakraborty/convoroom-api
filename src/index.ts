import { WebSocketServer, WebSocket } from "ws";
const wss = new WebSocketServer({ port: 3000 });

// Client Message Schemas:

// join the room:
// {
// 	type: "join", // Message type is join
// 	payload: {
// 		"roomId" : "123123",
// 		"username" : "shubh"	
// 	}
// }

// send a message:
// {
// 	type : "chat",
// 	payload: {
// 		"textMessage" : "Hii there, how's everyone doing!"
// 	}	
// }

// want to leave the room
// {
//     type : "leave",
//     payload: {

//     }
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

wss.on("connection", (socket: WebSocket) => {

    userCount += 1;
    console.log(`User Connected to the Server: ${userCount}`);

    socket.on("message", (message: string | Buffer) => {
        // or tsignore as your wish
        const parsedMessage = JSON.parse(message.toString()); // Message that came from the client "{...}"

        // if someone wants to join a room!
        if (parsedMessage.type === "join") {
            // Check if the user already exists in the room
            const existingUser = allSocket.find(
                (user) => user.socket === socket && user.room === parsedMessage.payload.roomId
            );

            if (!existingUser) {
                allSocket.push({
                    socket,
                    room: parsedMessage.payload.roomId,
                    name: parsedMessage.payload.username
                });

                // Notify all users in the same room
                allSocket.forEach((user) => {
                    if (user.room === parsedMessage.payload.roomId) {
                        user.socket.send(`${parsedMessage.payload.username} Joined room: ${parsedMessage.payload.roomId}`);
                    }
                });

                console.log(`${parsedMessage.payload.username} Joined room: ${parsedMessage.payload.roomId}`);
            } else {
                console.log(`${parsedMessage.payload.username} is already in room: ${parsedMessage.payload.roomId}`);
            }
        }


        // now the user has joined there room and they want to chat!, within there members:
        if (parsedMessage.type === "chat") {
            // console.log(`${parsedMessage.payload.username} Messaged: ${parsedMessage.payload.textMessage}`);

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

        // If the user wants to leave the room (this can be a new message type)
        if (parsedMessage.type === "leave") {
            const currentUserRoom = allSocket.find((x) => x.socket === socket)?.room;
            const currentUserName = allSocket.find((x) => x.socket === socket)?.name;

            // Remove user from the room
            allSocket = allSocket.filter(user => user.socket !== socket);

            // Notify other users in the same room that someone left
            allSocket.forEach((user) => {
                if (user.room === currentUserRoom) {
                    user.socket.send(`${currentUserName} left room: ${currentUserRoom}`);
                    console.log(`${currentUserName} left room: ${currentUserRoom}`);
                }
            });
        }

    })

    socket.on("close", () => {
        userCount -= 1;
        // Remove the user from the allSocket array on disconnect
        allSocket = allSocket.filter((user) => user.socket !== socket);
        console.log(`User disconnected. Users remaining: ${userCount}`);
    });


})