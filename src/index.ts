import http from "http";
import https from "https";
import WebSocket, { WebSocketServer } from "ws";

const PORT = 3001;
const SERVER_URL = "https://convoroom-api.onrender.com";

const server = http.createServer((req, res) => {
    if (req.url === "/ping") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("pong");
        return;
    }
    res.writeHead(404);
    res.end();
});

const wss = new WebSocketServer({ server });

// Keep-alive logic: Ping the server every 10 minutes to prevent Render's free tier from scaling down
setInterval(() => {
    https.get(`${SERVER_URL}/ping`, (res) => {
        console.log(`Keep-alive ping status: ${res.statusCode}`);
    }).on("error", (err) => {
        console.error("Keep-alive ping error:", err.message);
    });
}, 600000); // 10 minutes!

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

                    // Broadcast updated user list to everyone in the room
                    broadcastUserList(roomId);

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

                    // Broadcast updated user list
                    broadcastUserList(leavingUser.room);

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
            const roomId = disconnectedUser.room;
            allUsers = allUsers.filter((user) => user.socket !== socket);
            broadcastToRoom(roomId, {
                type: "system",
                message: `${disconnectedUser.name} disconnected`,
                room: roomId
            });
            // Broadcast updated user list
            broadcastUserList(roomId);
            console.log(`${disconnectedUser.name} disconnected from room: ${roomId}`);
        }
        console.log(`User disconnected. Users remaining: ${userCount}`);
    });
});

function broadcastUserList(roomId: string) {
    const usersInRoom = allUsers
        .filter((user) => user.room === roomId)
        .map((user) => user.name);

    broadcastToRoom(roomId, {
        type: "userList",
        users: usersInRoom,
        room: roomId
    });
}

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

server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
