import express from "express";

const app = express();

// accept JSON + plain text
app.use(express.json({ limit: "64kb" }));
app.use(express.text({ type: "*/*", limit: "64kb" }));

app.get("/", (req, res) => {
  res.status(200).send("OK: SIM900 receiver is running");
});

app.post("/ingest", (req, res) => {
  const ts = new Date().toISOString();

  // Print everything (this shows up in Render logs)
  console.log("----- INCOMING /ingest -----");
  console.log("time:", ts);
  console.log(
    "ip:",
    req.headers["x-forwarded-for"] || req.socket.remoteAddress
  );
  console.log("content-type:", req.headers["content-type"]);
  console.log("headers:", req.headers);
  console.log("body:", req.body);
  console.log("----------------------------");

  res.status(200).send("RECEIVED");
});

// Render sets PORT (default 10000)
const port = process.env.PORT || 10000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Listening on ${port}`);
});
