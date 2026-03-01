"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type UserMini = { id: number; email: string };

type TicketDTO = {
  id: number;
  title: string;
  status: "open" | "in_progress" | "closed";
  priority: "low" | "medium" | "high";
  createdAt: string;
  assignedTo: UserMini | null;
  createdBy: UserMini;
};

type TicketEventDTO = {
  id: number;
  eventType: string;
  createdAt: string;
  actor: UserMini;
  oldValue: string | null;
  newValue: string | null;
};

export default function DashboardPage() {
  const [tickets, setTickets] = useState<TicketDTO[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [events, setEvents] = useState<TicketEventDTO[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [status, setStatus] = useState<string>(""); // "" means all
  const [priority, setPriority] = useState<string>(""); // "" means all

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    params.set("limit", "50");
    return params.toString();
  }, [status, priority]);

  const loadTickets = useCallback(async () => {
    setLoadingTickets(true);
    setError(null);

    try {
      const res = await fetch(`/api/tickets?${queryString}`);
      if (!res.ok) throw new Error(`Failed to load tickets (${res.status})`);

      const data = (await res.json()) as TicketDTO[];
      setTickets(data);

      // auto select first ticket if none selected
      if (data.length > 0 && selectedId === null) {
        setSelectedId(data[0].id);
      }

      if (data.length === 0) {
        setSelectedId(null);
        setEvents([]);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load tickets";
      setError(message);
    } finally {
      setLoadingTickets(false);
    }
  }, [queryString, selectedId]);

  const loadEvents = useCallback(async (ticketId: number) => {
    setLoadingEvents(true);
    setError(null);

    try {
      const res = await fetch(`/api/tickets/${ticketId}/events`);
      if (!res.ok) throw new Error(`Failed to load events (${res.status})`);

      const data = (await res.json()) as TicketEventDTO[];
      setEvents(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load events";
      setError(message);
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  // load tickets whenever filters change (queryString changes)
  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // load events whenever selected ticket changes
  useEffect(() => {
    if (selectedId !== null) {
      loadEvents(selectedId);
    }
  }, [selectedId, loadEvents]);

  return (
    <div style={{ padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Team Ops Dashboard</h1>

      <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
        <label>
          Status:{" "}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="open">open</option>
            <option value="in_progress">in_progress</option>
            <option value="closed">closed</option>
          </select>
        </label>

        <label>
          Priority:{" "}
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">All</option>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </label>

        <button onClick={loadTickets} disabled={loadingTickets}>
          {loadingTickets ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 12, color: "crimson" }}>
          <b>Error:</b> {error}
        </div>
      )}

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Tickets list */}
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <h2 style={{ marginTop: 0 }}>Tickets</h2>

          {tickets.length === 0 && !loadingTickets && <div>No tickets found.</div>}

          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {tickets.map((t) => {
              const active = t.id === selectedId;
              return (
                <li
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  style={{
                    padding: 10,
                    borderRadius: 6,
                    cursor: "pointer",
                    marginBottom: 8,
                    border: "1px solid #eee",
                    background: active ? "#f5f5f5" : "white",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{t.title}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    #{t.id} • {t.status} • {t.priority}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    Assigned: {t.assignedTo ? t.assignedTo.email : "—"}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Events timeline */}
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <h2 style={{ marginTop: 0 }}>Events</h2>

          {selectedId === null && <div>Select a ticket to see events.</div>}
          {selectedId !== null && loadingEvents && <div>Loading events...</div>}

          {selectedId !== null && !loadingEvents && events.length === 0 && (
            <div>No events found.</div>
          )}

          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {events.map((e) => (
              <li
                key={e.id}
                style={{ padding: 10, borderRadius: 6, marginBottom: 8, border: "1px solid #eee" }}
              >
                <div style={{ fontWeight: 700 }}>{e.eventType}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  {new Date(e.createdAt).toLocaleString()} • {e.actor.email}
                </div>
                <div style={{ fontSize: 12, marginTop: 6 }}>
                  <b>old:</b> {e.oldValue ?? "—"} <br />
                  <b>new:</b> {e.newValue ?? "—"}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 12, opacity: 0.8 }}>
        Open this page: <code>/dashboard</code>
      </div>
    </div>
  );
}
