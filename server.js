const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("My chat server is online! 🎉");
});

io.on("connection", (socket) => {

  console.log("User connected:", socket.id);

  // Everyone starts in general
  socket.join("general");
  socket.currentChannel = "general";


  // Change channel
  socket.on("join channel", (channel) => {

    const allowedChannels = [
      "general",
      "gaming",
      "art",
      "memes"
    ];

    if (!allowedChannels.includes(channel)) {
      return;
    }

    // Leave previous channel
    if (socket.currentChannel) {
      socket.leave(socket.currentChannel);
    }

    // Join new channel
    socket.join(channel);

    socket.currentChannel = channel;

    console.log(
      `${socket.id} joined #${channel}`
    );

  });


  // Chat message
  socket.on("chat message", (message) => {

    if (!message || !message.text) {
      return;
    }

    const channel =
      message.channel || socket.currentChannel || "general";

    const allowedChannels = [
      "general",
      "gaming",
      "art",
      "memes"
    ];

    if (!allowedChannels.includes(channel)) {
      return;
    }

    // Only send the message to people
    // currently inside this channel
    io.to(channel).emit("chat message", {
      text: message.text,
      userId: message.userId,
      username: message.username,
      displayName: message.displayName,
      avatar: message.avatar,
      timestamp: message.timestamp,
      channel: channel
    });

  });


  socket.on("disconnect", () => {

    console.log(
      "User disconnected:",
      socket.id
    );

  });

});

server.listen(PORT, "0.0.0.0", () => {

  console.log(
    `Server running on port ${PORT}`
  );

});
