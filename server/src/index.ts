import { createApp } from "./app.js";
import { openDb } from "./db.js";

const port = Number(process.env.PORT ?? 3001);
const db = openDb();
const app = createApp(db);

app.listen(port, () => {
  console.log(`ticketdesk API listening on http://localhost:${port}`);
});
