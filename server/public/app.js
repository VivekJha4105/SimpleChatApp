const socket = io("ws://localhost:3500");

const messageInput = document.getElementById("messageInput");
const nameInput = document.getElementById("nameInput");
const roomInput = document.getElementById("roomInput");

const activityEl = document.querySelector(".activity");
const userList = document.querySelector(".user-list");
const roomList = document.querySelector(".room-list");
const chatDisplay = document.querySelector(".chat-display");

function sendMessage(e) {
  e.preventDefault();
  if (nameInput?.value && roomInput?.value && messageInput?.value) {
    socket.emit("message", {
      text: messageInput.value,
      name: nameInput.value,
    });
    messageInput.value = "";
  }
  messageInput.focus();
}

function enterRoom(e) {
  e.preventDefault();
  if (nameInput?.value && roomInput?.value) {
    socket.emit("enterRoom", {
      name: nameInput.value,
      room: roomInput.value,
    });
  }
}

document.querySelector(".form-join").addEventListener("submit", enterRoom);

document.querySelector(".form-message").addEventListener("submit", sendMessage);

messageInput.addEventListener("keypress", () => {
  socket.emit("activity", nameInput.name);
});

//! Listening To Server:

socket.on("message", (data) => {
  activityEl.textContent = "";
  const postElement = document.createElement("li");

  postElement.className = "post";

  //* Putting className according to data.name value, to position text bubble on UI.
  if (data.name === nameInput?.value) {
    postElement.className = "post post-right";
  }
  if (data.name !== nameInput?.value && data.name !== "admin") {
    postElement.className = "post post-left";
  }

  //* If not admin, adding text Bubble
  if (data.name !== "admin") {
    postElement.innerHTML = `<div class="post-header ${
      data.name === nameInput.value ? "user" : "reply"
    }>
      <span class="post-header--name">${data.name}</span>
      <span class="post-header--time">${data.time}</span>
    </div>
    <div class="post-text">${data.text}</div>`;
  } else {
    //* Admin text
    postElement.innerHTML = `<div class="post-text">${data.text}</div>`;
  }

  chatDisplay.appendChild(postElement);
  chatDisplay.scrollTop = chatDisplay.scrollHeight;

  console.log(data);
});

let activityTimer;

socket.on("activity", (name) => {
  activityEl.textContent = `${name} is typing...`;

  //* Clearing timer, if any.
  clearTimeout(activityTimer);
  activityTimer = setTimeout(() => {
    activityEl.textContent = "";
  }, 3000);
});

//* Update Users List
socket.on("userList", (data) => updateUserList(data.users));

//* Update Rooms List
socket.on("roomList", (data) => updateRoomList(data.rooms));

//* Helping funcitons to update roomList and usersList..

function updateUserList(users) {
  userList.value = "";
  if (users) {
    userList.innerHTML = ` <em>Users in ${roomInput.value}: </em>`;
    users.forEach((user, i) => {
      userList.textContent += ` ${user.name}`;
      if (users.length > 1 && i !== users.length - 1) {
        userList.textContent += `,`;
      }
    });
  }
}

function updateRoomList(rooms) {
  roomList.value = "";
  if (rooms) {
    roomList.innerHTML = `<em>Chat rooms available: </em>`;
    rooms.forEach((room, i) => {
      roomList.textContent += ` ${room}`;
      if (rooms.length > 1 && i !== rooms.length - 1) {
        roomList.textContent += `,`;
      }
    });
  }
}
