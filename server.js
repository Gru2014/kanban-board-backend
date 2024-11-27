const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, methods: ["GET", "POST"] },
});

const users = {};
const tasks = {};

const getInitialUsers = () => Object.keys(users).map((id) => users[id]);
const getInitialTasks = () => Object.keys(tasks).map((id) => tasks[id]);

let initialUserTemp = [];
let initialTaskTemp = [];

const updateUsers = () => {
  initialUserTemp = getInitialUsers();
};

const updateTasks = () => {
  initialTaskTemp = getInitialTasks();
};

io.on("connection", (socket) => {
  users[socket.id] = { id: socket.id, status: "none", taskId: null };
  updateUsers();
  updateTasks();

  io.emit("users-updated", {
    type: "added",
    id: socket.id,
    user: users[socket.id],
  });

  socket.emit("first-message", {
    users: initialUserTemp,
    tasks: initialTaskTemp,
  });

  socket.on("focus-task", ({ status, taskId }) => {
    users[socket.id] = {
      id: socket.id,
      status: status,
      taskId: taskId,
    };
    io.emit("users-updated", {
      type: "updated",
      id: socket.id,
      user: users[socket.id],
    });
    updateUsers();
  });

  socket.on("delete-task", (id) => {
    delete tasks[id];
    io.emit("task-deleted", id);
    updateTasks();
  });

  socket.on("update-task", (task) => {
    tasks[task.id] = task;
    io.emit("task-updated", task);
    updateTasks();
  });

  socket.on("add-task", (task) => {
    tasks[task.id] = task;
    io.emit("task-added", task);
    updateTasks();
  });

  socket.on("move-task", (data) => {
    if (!data) return;
    const { id, newStatus } = data;
    if (id && newStatus) {
      tasks[id].status = newStatus;
      users[socket.id].taskId = null;
      users[socket.id].status = "none";
      io.emit("task-moved", { id, newStatus, user: users[socket.id] });
    }
    updateTasks();
    updateUsers();
  });

  socket.on("disconnect", () => {
    delete users[socket.id];
    io.emit("users-updated", {
      type: "removed",
      id: socket.id,
      user: users[socket.id],
    });
    updateUsers();
  });
});

server.listen(process.env.PORT, () =>
  console.log(`Server running on http://localhost:${process.env.PORT}`)
);
