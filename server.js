const args = process.argv.slice(2);
var categories = args.slice(1);
import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "socket.io";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: args[0] });

// open the database file
const db = await open({
  filename: "items.db",
  driver: sqlite3.Database,
});

await db.exec(`
  CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      done BOOLEAN,
      FOREIGN KEY (name) REFERENCES tags(name)
  );
  CREATE TABLE IF NOT EXISTS tags (
    name TEXT PRIMARY KEY,
    tag TEXT
  );
`);

const app = express();
const server = createServer(app);
const io = new Server(server, { connectionStateRecovery: {} });

const __dirname = dirname(fileURLToPath(import.meta.url));

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

io.on("connection", (socket) => {
  console.log("New client connected");
  // Fetch DB on new connect
  if (!socket.recovered) {
    db.each(
      "SELECT * FROM items i JOIN tags t ON UPPER(i.name) = UPPER(t.name)",
      (err, row) => {
        if (!row.done) {
          socket.emit("item", row.id, row.name, row.tag);
        } else {
          socket.emit("shift", row.id, row.name, row.tag);
        }
      }
    );
  }

  // Add new item
  socket.on("item", async (msg) => {
    let res;
    let tag;
    try {
      res = await db.all(
        "SELECT tag FROM tags WHERE UPPER(name) = UPPER(?)",
        msg
      );
    } catch (e) {
      socket.emit("error", "Fetching Tag failed");
      return;
    }
    if (res[0]?.tag == null) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash-lite",
          contents: `Put ${msg} in one of the categories: "${categories.join(
            ", "
          )}". Answer with the category name only or "Other" if it doesn't fit.`,
        });
        tag = response.text.replace(/[\n\r]/g, "");
        if (!categories.includes(tag)) {
          tag = "Other";
        }
        await db.run("INSERT INTO tags (name, tag) VALUES (?, ?)", msg, tag);
      } catch (e) {
        socket.emit("error", "Fetching Tag with AI failed");
        return;
      }
    } else {
      tag = res[0]?.tag;
    }
    try {
      res = await db.run(
        "INSERT INTO items (name, done) VALUES (?, false)",
        msg
      );
    } catch (e) {
      socket.emit("error", "Adding item failed");
      return;
    }
    socket.emit("item", res.lastID, msg, tag);
  });

  // Set item to bought
  socket.on("shift", async (id) => {
    try {
      await db.run("UPDATE items SET done = true WHERE id = ?", id);
    } catch (e) {
      socket.emit("error", "Completing item failed");
      return;
    }
    socket.broadcast.emit("fs", id);
  });

  // Delete item
  socket.on("delete", async (id) => {
    try {
      await db.run("DELETE FROM items WHERE id = ?", id);
    } catch (e) {
      socket.emit("error", "Deleting item failed");
      return;
    }
    socket.broadcast.emit("fd", id);
  });
});

server.listen(3000);
