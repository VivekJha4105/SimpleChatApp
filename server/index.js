import express from "express";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3500;
const ADMIN = "admin";

const app = express();

app.use(express.static(path.join(__dirname, "public")));

const expressServer = app.listen(PORT, () => {
  console.log(`Server listening at PORT: ${PORT}`);
});

//* We are passing the express server as argument.
const io = new Server(expressServer, {
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? false
        : ["http://localhost:5500", "http://127.0.0.1:5500"],
  },
});

//* Managing state of the Chat Room for now, will connect to database later on.
const UserState = {
  users: [],
  setUsers: function (newUsersArray) {
    this.users = newUsersArray;
  },
};

io.on("connection", (socket) => {
  //* Upon Connection -- Only to User
  socket.emit("message", buildMessage(ADMIN, "Welcome to Chat App!"));

  //* Upon Entering a Room
  socket.on("enterRoom", ({ name, room }) => {
    //* Leave a previous room if in any.
    const prevRoom = getUser(socket.id)?.room;
    if (prevRoom) {
      socket.leave(prevRoom);
      io.to(prevRoom).emit(
        "message",
        buildMessage(ADMIN, `${name} left the room`)
      );
    }
    const user = activateUser(socket.id, name, room);

    //* Cant update previous room user list in the frontend until user state is updated in the backend
    if (prevRoom) {
      io.to(prevRoom).emit("userList", { users: getUsersInRoom(prevRoom) });
    }

    //* Join User
    socket.join(user.room);

    //* To User Who Joined
    socket.emit(
      "message",
      buildMessage(ADMIN, `You have joined the ${user.room} chat room`)
    );

    //* To Everyone Else
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        buildMessage(ADMIN, `${user.name} has joined the chat.`)
      );

    //* Updating the User List of newly joined room
    io.to(user.room).emit("userList", { users: getUsersInRoom(user.room) });

    //* Update room list for all
    io.emit("roomList", {
      rooms: getAllActiveRooms(),
    });
  });

  //* When User Disconnects
  socket.on("disconnect", () => {
    const user = getUser(socket.id);

    //* Removing User from the state.
    userLeavesApp(socket.id);

    //* Broadcasting to all in room
    if (user) {
      io.to(user.room).emit(
        "message",
        buildMessage(ADMIN, `${user.name} has left the chat room`)
      );

      //* Update user list of last room user was in
      io.to(user.room).emit("userList", {
        users: getUsersInRoom(user.room),
      });

      //* Update room list for all as user may have been the last user in room
      io.emit("roomList", {
        rooms: getAllActiveRooms(user.room),
      });
    }
    console.log(`User ${socket.id} disconnected`);
  });

  //* Listening to messages
  socket.on("message", ({ name, text }) => {
    //* Getting the room
    const room = getUser(socket.id)?.room;

    if (room) {
      //* messaging to everyone else
      io.to(room).emit("message", buildMessage(name, text)); //! Changes may be needed here
    }
  });

  //* Listening for activity
  socket.on("activity", (name) => {
    const room = getUser(socket.id)?.room;
    if (room) {
      socket.broadcast.to(room).emit("activity", name);
    }
  });
});

function buildMessage(name, text) {
  return {
    name,
    text,
    time: new Intl.DateTimeFormat("default", {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    }).format(new Date()),
  };
}

// User Functions
function activateUser(id, name, room) {
  const user = { id, name, room };
  UserState.setUsers([
    ...UserState.users.filter((user) => user.id !== id),
    user,
  ]);
  return user;
}

function userLeavesApp(id) {
  UserState.setUsers(UserState.users.filter((user) => user.id !== id));
}

function getUser(id) {
  const user = UserState.users.find((user) => user.id === id);
  return user;
}

function getUsersInRoom(room) {
  return UserState.setUsers(UserState.users.filter(user.room === room));
}

function getAllActiveRooms() {
  return Array.from(new Set(UserState.users.map((user) => user.room)));
}
