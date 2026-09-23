```js
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

// Stores connected users.
// Each user can have multiple tabs/devices connected.
const connectedUsers = new Map();

const allowedChannels = [
  "general",
  "gaming",
  "art",
  "memes"
];

app.get("/", (req, res) => {
  res.send("My chat server is online! 🎉");
});

io.on("connection", (socket) => {

  console.log("User connected:", socket.id);

  // Everyone starts in general
  socket.join("general");
  socket.currentChannel = "general";


  // =========================
  // REGISTER USER
  // =========================

  socket.on("register user", (userId) => {

    if (!userId) {
      return;
    }

    socket.userId = userId;

    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }

    connectedUsers
      .get(userId)
      .add(socket.id);

    console.log(
      `Registered user ${userId} on ${socket.id}`
    );

  });


  // =========================
  // CHANGE CHANNEL
  // =========================

  socket.on("join channel", (channel) => {

    if (!allowedChannels.includes(channel)) {
      return;
    }

    if (socket.currentChannel) {
      socket.leave(socket.currentChannel);
    }

    socket.join(channel);
    socket.currentChannel = channel;

    console.log(
      `${socket.id} joined #${channel}`
    );

  });


  // =========================
  // CHAT MESSAGE
  // =========================

  socket.on("chat message", (message) => {

    if (!message) {
      return;
    }

    const rawText =
      String(message.text || "").trim();

    if (!rawText) {
      return;
    }

    const channel =
      message.channel ||
      socket.currentChannel ||
      "general";

    if (!allowedChannels.includes(channel)) {
      return;
    }


    // =========================
    // ANNOUNCEMENT COMMAND
    // =========================

    if (
      rawText
        .toLowerCase()
        .startsWith("/announcement ")
    ) {

      const announcementText =
        rawText
          .slice("/announcement ".length)
          .trim();

      if (!announcementText) {
        return;
      }

      io
        .to(channel)
        .emit(
          "announcement",
          {
            message:
              announcementText,

            fromUsername:
              message.username ||
              "user",

            fromDisplayName:
              message.displayName ||
              message.username ||
              "User",

            channel:
              channel,

            timestamp:
              message.timestamp ||
              new Date().toISOString()
          }
        );

      console.log(
        `Announcement in #${channel}: ${announcementText}`
      );

      // Don't send the /announcement command
      // as a normal chat message.
      return;
    }


    // =========================
    // NORMAL CHAT MESSAGE
    // =========================

    const chatMessage = {
      text: rawText,

      userId:
        message.userId,

      username:
        message.username,

      displayName:
        message.displayName,

      avatar:
        message.avatar,

      timestamp:
        message.timestamp ||
        new Date().toISOString(),

      channel:
        channel
    };

    io
      .to(channel)
      .emit(
        "chat message",
        chatMessage
      );


    // =========================
    // @MENTIONS
    // =========================

    const mentionedUserIds =
      Array.isArray(
        message.mentionedUserIds
      )
        ? message.mentionedUserIds
        : [];

    mentionedUserIds.forEach(
      (mentionedUserId) => {

        if (!mentionedUserId) {
          return;
        }

        // Don't notify yourself
        if (
          mentionedUserId ===
          message.userId
        ) {
          return;
        }

        const userSockets =
          connectedUsers.get(
            mentionedUserId
          );

        if (!userSockets) {
          return;
        }

        userSockets.forEach(
          (socketId) => {

            io
              .to(socketId)
              .emit(
                "mention notification",
                {
                  message:
                    rawText,

                  fromUsername:
                    message.username ||
                    "user",

                  fromDisplayName:
                    message.displayName ||
                    message.username ||
                    "User",

                  channel:
                    channel,

                  timestamp:
                    message.timestamp ||
                    new Date().toISOString()
                }
              );

          }
        );

      }
    );

  });


  // =========================
  // DISCONNECT
  // =========================

  socket.on("disconnect", () => {

    if (socket.userId) {

      const userSockets =
        connectedUsers.get(
          socket.userId
        );

      if (userSockets) {

        userSockets.delete(
          socket.id
        );

        if (
          userSockets.size === 0
        ) {
          connectedUsers.delete(
            socket.userId
          );
        }

      }

    }

    console.log(
      "User disconnected:",
      socket.id
    );

  });

});


// =========================
// START SERVER
// =========================

server.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `Server running on port ${PORT}`
    ); .
