import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "socket.io";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import OpenAI from "openai";

const openai = new OpenAI();

const categories = [
  "Obst",
  "Gemüse",
  "Backen",
  "Konserven",
  "Aufstrich",
  "Backware",
  "Cerealien",
  "Teigware",
  "Soße",
  "Getränke",
  "Fleischersatz",
  "Milchprodukte",
  "Tiefkühl",
  "Pflegeprodukte",
  "Haushalt",
  "Snacks",
  "Fertigprodukte",
];

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
  // Fetch DB on new connect
  if (!socket.recovered) {
    db.each(
      "SELECT * FROM items i JOIN tags t ON UPPER(i.name) = UPPER(t.name)",
      (err, row) => {
        console.log(row.tag);
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
      res = await db.all("SELECT tag FROM tags WHERE name = ?", msg);
    } catch (e) {
      io.emit("error", "Tag Abruf fehlgeschlagen");
      return;
    }
    if (res[0]?.tag == null) {
      try {
        console.log("Asking OpenAI");
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          prompt: `Weise ${msg} einer der Kateogrien "${categories.join(
            ", "
          )}" zu. Antworte nur mit dem Namen einer Kategorie.`,
        });
        tag = completion.choices[0].text.replace(/[\n\r]/g, "");
        if (!categories.includes(tag)) {
          tag = "Sonstiges";
        }
        await db.run("INSERT INTO tags (name, tag) VALUES (?, ?)", msg, tag);
      } catch (e) {
        io.emit("error", "Tag Zuweisung fehlgeschlagen");
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
      io.emit("error", "Hinzufügen fehlgeschlagen");
      return;
    }
    console.log(tag);
    io.emit("item", res.lastID, msg, tag);
  });

  // Set item to bought
  socket.on("shift", async (id) => {
    try {
      await db.run("UPDATE items SET done = true WHERE id = ?", id);
    } catch (e) {
      io.emit("error", "Abhaken fehlgeschlagen");
      return;
    }
    socket.broadcast.emit("fs", id);
  });

  // Delete item
  socket.on("delete", async (id) => {
    try {
      await db.run("DELETE FROM items WHERE id = ?", id);
    } catch (e) {
      io.emit("error", "Löschen fehlgeschlagen");
      return;
    }
    socket.broadcast.emit("fd", id);
  });
});

server.listen(3000);
