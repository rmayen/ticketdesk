import { openDb } from "./db.js";
import { ticketRepo } from "./tickets.js";

/** Populate a fresh database with realistic sample tickets for local development. */
const db = openDb();
const repo = ticketRepo(db);
if (repo.stats().total > 0) {
  console.log("Database already has tickets; skipping seed.");
} else {
  const samples = [
    { title: "Projector in room 214 shows no signal", priority: "high", category: "hardware", requester: "Prof. Alvarez", description: "HDMI input detected but screen stays black. Class starts at 10am." },
    { title: "Cannot connect to campus Wi-Fi on new laptop", priority: "medium", category: "network", requester: "J. Park", description: "Gets 'authentication failed' on eduroam after password reset." },
    { title: "Lab PC 07 stuck on Windows update loop", priority: "urgent", category: "software", requester: "Lab Monitor", description: "Reboots to 'Undoing changes' every time. Lab section at 2pm." },
    { title: "Request: install MATLAB on lab workstations", priority: "low", category: "software", requester: "Dr. Chen", description: "Needed for ENES 101 next semester. 24 machines in room 120." },
    { title: "Printer in library lobby jams on every job", priority: "medium", category: "hardware", requester: "Front Desk", description: "Jams at tray 2. Already cleared the paper path twice." },
  ] as const;
  for (const s of samples) repo.create({ ...s, description: s.description, assignee: null });
  const t = repo.list({ limit: 1, offset: 0 }).items[0]!;
  repo.update(t.id, { status: "in_progress", assignee: "Rene" });
  repo.addComment(t.id, { author: "Rene", body: "Booted into safe mode; rolling back the failed update now." });
  console.log(`Seeded ${samples.length} tickets.`);
}
