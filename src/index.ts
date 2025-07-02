import WebSocket, { WebSocketServer } from "ws";
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
    socket: WebSocket;
    room: string;
    name: string;
}

let allUsers: User[] = [];
let userCount = 0;

wss.on("connection", (socket: WebSocket) => {
    userCount += 1;
    console.log(`User Connected to the Server: ${userCount}`);

    socket.on("message", (message: string | Buffer) => {
        try {
            const parsedMessage = JSON.parse(message.toString());

            if (parsedMessage.type === "join") {
                const { roomId, username } = parsedMessage.payload;
                const existingUser = allUsers.find(
                    (user) => user.socket === socket && user.room === roomId
                );

                if (!existingUser) {
                    const newUser = {
                        socket,
                        room: roomId,
                        name: username
                    };
                    allUsers.push(newUser);

                    // Send welcome message to the new user
                    socket.send(JSON.stringify({
                        type: "system",
                        message: `Welcome to room ${roomId}!`,
                        room: roomId
                    }));

                    // Notify other users in the room
                    broadcastToRoom(roomId, {
                        type: "system",
                        message: `${username} joined the room`,
                        room: roomId
                    }, socket); // Exclude the new user from this notification

                    console.log(`${username} joined room: ${roomId}`);
                }
            }

            if (parsedMessage.type === "chat") {
                const user = allUsers.find((u) => u.socket === socket);
                if (user) {
                    broadcastToRoom(user.room, {
                        type: "chat",
                        message: parsedMessage.payload.textMessage,
                        name: user.name,
                        room: user.room,
                        timestamp: new Date().toISOString()
                    }, socket); // Exclude sender from broadcast (they'll get optimistic update)
                }
            }

            if (parsedMessage.type === "leave") {
                const userIndex = allUsers.findIndex((u) => u.socket === socket);
                if (userIndex !== -1) {
                    const leavingUser = allUsers[userIndex];
                    allUsers.splice(userIndex, 1);

                    broadcastToRoom(leavingUser.room, {
                        type: "system",
                        message: `${leavingUser.name} left the room`,
                        room: leavingUser.room
                    });

                    console.log(`${leavingUser.name} left room: ${leavingUser.room}`);
                }
            }

        } catch (error) {
            console.error("Error processing message:", error);
        }
    });

    socket.on("close", () => {
        userCount -= 1;
        const disconnectedUser = allUsers.find((user) => user.socket === socket);

        if (disconnectedUser) {
            allUsers = allUsers.filter((user) => user.socket !== socket);
            broadcastToRoom(disconnectedUser.room, {
                type: "system",
                message: `${disconnectedUser.name} disconnected`,
                room: disconnectedUser.room
            });
            console.log(`${disconnectedUser.name} disconnected from room: ${disconnectedUser.room}`);
        }
        console.log(`User disconnected. Users remaining: ${userCount}`);
    });
});

function broadcastToRoom(roomId: string, message: any, excludeSocket?: WebSocket) {
    const usersInRoom = allUsers.filter((user) =>
        user.room === roomId &&
        user.socket !== excludeSocket &&
        user.socket.readyState === WebSocket.OPEN
    );

    usersInRoom.forEach((user) => {
        user.socket.send(JSON.stringify(message));
    });
}