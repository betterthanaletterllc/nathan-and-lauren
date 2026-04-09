"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { signOut } from "next-auth/react";
import Papa from "papaparse";

// Types
interface Guest {
  id: number;
  slug: string;
  name: string;
  partySize: number;
  partyNames: string[] | null;
  tableNumber: number | null;
  note: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  linkSentAt: string | null;
  firstOpenedAt: string | null;
  openCount: number;
  addressSubmittedAt: string | null;
  calendarSavedAt: string | null;
  createdAt: string;
}

interface Activity {
  id: number;
  action: string;
  metadata: any;
  createdAt: string;
  guestName: string | null;
  guestSlug: string | null;
}

type Tab = "overview" | "guests" | "nudge" | "activity" | "settings";

export default function DashboardClient() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://nathanandlauren.com";

  // Fetch data
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [gRes, aRes, sRes] = await Promise.all([
        fetch("/api/guests"),
        fetch("/api/activity"),
        fetch("/api/settings"),
      ]);
      const gData = gRes.ok ? await gRes.json() : [];
      const aData = aRes.ok ? await aRes.json() : [];
      const sData = sRes.ok ? await sRes.json() : {};
      setGuests(Array.isArray(gData) ? gData : []);
      setActivities(Array.isArray(aData) ? aData : []);
      setSettings(typeof sData === "object" && !Array.isArray(sData) ? sData : {});
    } catch (err) {
      console.error("fetchAll error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Summary stats
  const stats = useMemo(() => {
    const total = guests.length;
    const opened = guests.filter((g) => g.firstOpenedAt).length;
    const submitted = guests.filter((g) => g.addressSubmittedAt).length;
    const outstanding = total - submitted;
    const headcount = guests.reduce((s, g) => s + g.partySize, 0);
    return { total, opened, submitted, outstanding, headcount };
  }, [guests]);

  // Nudge list
  const threshold = parseInt(settings["reminder_threshold_days"] || "7");
  const nudgeGuests = useMemo(() => {
    const now = Date.now();
    return guests
      .filter((g) => !g.addressSubmittedAt)
      .map((g) => {
        const sent = g.linkSentAt || g.createdAt;
        const daysSince = Math.floor(
          (now - new Date(sent).getTime()) / 86400000
        );
        return { ...g, daysSince };
      })
      .sort((a, b) => b.daysSince - a.daysSince);
  }, [guests, threshold]);

  // Sorted & filtered guest list
  const filteredGuests = useMemo(() => {
    let list = [...guests];
    if (filter) {
      const q = filter.toLowerCase();
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.slug.toLowerCase().includes(q) ||
          (g.city || "").toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let av: any, bv: any;
      switch (sortKey) {
        case "name":
          av = a.name;
          bv = b.name;
          break;
        case "partySize":
          av = a.partySize;
          bv = b.partySize;
          break;
        case "tableNumber":
          av = a.tableNumber || 999;
          bv = b.tableNumber || 999;
          break;
        case "opened":
          av = a.firstOpenedAt || "";
          bv = b.firstOpenedAt || "";
          break;
        case "submitted":
          av = a.addressSubmittedAt || "";
          bv = b.addressSubmittedAt || "";
          break;
        default:
          av = a.name;
          bv = b.name;
      }
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [guests, filter, sortKey, sortAsc]);

  // Actions
  async function addGuest(name: string, partySize: number, partyNames: string[]) {
    const res = await fetch("/api/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, partySize, partyNames: partyNames.filter(Boolean) }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert("Error adding guest: " + (err.error || "Unknown error"));
      return;
    }
    fetchAll();
  }

  async function deleteGuest(id: number) {
    if (!confirm("Delete this guest?")) return;
    await fetch("/api/guests", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchAll();
  }

  async function updateNote(id: number, note: string) {
    await fetch("/api/guests", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, note: note || null }),
    });
    fetchAll();
  }

  async function saveSetting(key: string, value: string) {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    setSettings((s) => ({ ...s, [key]: value }));
  }

  async function handleCSVImport(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const mapped = results.data.map((row: any) => ({
          name: row.Name || row.name || "",
          slug: row.Slug || row.slug || "",
          partySize: row["Party Size"] || row.partySize || row.party_size || 1,
          note: row.Note || row.note || "",
        }));
        const res = await fetch("/api/guests/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guests: mapped }),
        });
        const result = await res.json();
        alert(
          `Imported ${result.imported} guests. ${result.skipped} skipped.${result.errors.length ? "\n" + result.errors.join("\n") : ""}`
        );
        fetchAll();
      },
    });
  }

  function copyLink(slug: string) {
    navigator.clipboard.writeText(`${baseUrl}/guest/${slug}`);
  }

  function toggleSort(key: string) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function fmtDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function actionLabel(action: string) {
    switch (action) {
      case "opened": return "opened their link";
      case "address_submitted": return "submitted their address";
      case "calendar_saved": return "saved to calendar";
      case "guest_added": return "was added";
      case "guest_imported": return "was imported";
      default: return action;
    }
  }

  // Add guest form state
  const [newName, setNewName] = useState("");
  const [newSize, setNewSize] = useState("1");
  const [newPartyNames, setNewPartyNames] = useState<string[]>([""]);
  const [addError, setAddError] = useState("");

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-[11px] tracking-[2px] uppercase font-body transition-colors ${
      tab === t
        ? "text-gold border-b-2 border-gold"
        : "text-ink-faint hover:text-ink-soft"
    }`;

  const cardClass =
    "bg-[#FFFDF9] border border-gold-pale/40 p-5 text-center";

  if (loading) {
    return (
      <div className="min-h-dvh bg-sand flex items-center justify-center">
        <p className="font-body text-ink-faint text-sm tracking-widest uppercase">
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-sand">
      {/* Header */}
      <header className="bg-[#FFFDF9] border-b border-gold-pale/40 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-display font-light text-2xl text-ink">
            Nathan & Lauren
          </h1>
          <p className="font-body font-light text-[10px] tracking-[4px] uppercase text-ink-faint">
            Wedding Dashboard
          </p>
        </div>
        <button
          onClick={() => signOut()}
          className="font-body text-[11px] tracking-[2px] uppercase text-ink-faint hover:text-gold transition-colors"
        >
          Sign out
        </button>
      </header>

      {/* Tabs */}
      <nav className="bg-[#FFFDF9] border-b border-gold-pale/40 px-6 flex gap-2 overflow-x-auto">
        {(
          [
            ["overview", "Overview"],
            ["guests", "Guest List"],
            ["nudge", "Nudge List"],
            ["activity", "Activity"],
            ["settings", "Settings"],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} className={tabClass(t)}>
            {label}
            {t === "nudge" && nudgeGuests.filter((g) => g.daysSince >= threshold).length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-gold text-white text-[9px]">
                {nudgeGuests.filter((g) => g.daysSince >= threshold).length}
              </span>
            )}
          </button>
        ))}
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          <div className="space-y-8">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[
                ["Invited", stats.total],
                ["Opened", stats.opened],
                ["Addresses In", stats.submitted],
                ["Outstanding", stats.outstanding],
                ["Headcount", stats.headcount],
              ].map(([label, val]) => (
                <div key={label as string} className={cardClass}>
                  <p className="font-body font-light text-[10px] tracking-[3px] uppercase text-ink-faint mb-1">
                    {label}
                  </p>
                  <p className="font-display text-3xl text-ink">{val}</p>
                </div>
              ))}
            </div>

            {/* Quick progress */}
            <div className="bg-[#FFFDF9] border border-gold-pale/40 p-6">
              <p className="font-body font-light text-[10px] tracking-[3px] uppercase text-ink-faint mb-3">
                Address collection progress
              </p>
              <div className="w-full h-2 bg-sand-dark rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold transition-all duration-500"
                  style={{
                    width: `${stats.total ? (stats.submitted / stats.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="font-body text-xs text-ink-soft mt-2">
                {stats.submitted} of {stats.total} addresses collected (
                {stats.total
                  ? Math.round((stats.submitted / stats.total) * 100)
                  : 0}
                %)
              </p>
            </div>

            {/* Recent activity preview */}
            <div className="bg-[#FFFDF9] border border-gold-pale/40 p-6">
              <p className="font-body font-light text-[10px] tracking-[3px] uppercase text-ink-faint mb-4">
                Recent activity
              </p>
              {activities.slice(0, 8).map((a) => (
                <div
                  key={a.id}
                  className="flex items-baseline justify-between py-2 border-b border-sand-dark last:border-0"
                >
                  <p className="font-body text-sm text-ink">
                    <span className="font-medium">{a.guestName || "Unknown"}</span>{" "}
                    {actionLabel(a.action)}
                  </p>
                  <p className="font-body text-xs text-ink-faint whitespace-nowrap ml-4">
                    {fmtDate(a.createdAt)}
                  </p>
                </div>
              ))}
              {activities.length === 0 && (
                <p className="font-body text-sm text-ink-faint">
                  No activity yet. Add some guests and send their links!
                </p>
              )}
            </div>
          </div>
        )}

        {/* GUEST LIST TAB */}
        {tab === "guests" && (
          <div className="space-y-6">
            {/* Actions bar */}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Search guests..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#FFFDF9] border border-gold-pale text-sm font-body font-light text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold"
                />
              </div>
              <button
                onClick={() => (window.location.href = "/api/guests/export")}
                className="px-4 py-2.5 border border-gold-pale text-gold font-body text-[11px] tracking-[2px] uppercase hover:bg-[#FFFDF9] transition-colors"
              >
                Export CSV
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="px-4 py-2.5 border border-gold-pale text-gold font-body text-[11px] tracking-[2px] uppercase hover:bg-[#FFFDF9] transition-colors"
              >
                Import CSV
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleCSVImport(e.target.files[0]);
                  e.target.value = "";
                }}
              />
            </div>

            {/* Add guest form */}
            <div className="bg-[#FFFDF9] border border-gold-pale/40 p-4 space-y-3">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[180px]">
                  <label className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint block mb-1">
                    Household / display name
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="The Johnsons"
                    className="w-full px-3 py-2 border border-gold-pale text-sm font-body font-light text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold"
                  />
                </div>
                <div className="w-24">
                  <label className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint block mb-1">
                    Party size
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={newSize}
                    onChange={(e) => {
                      const size = parseInt(e.target.value) || 1;
                      setNewSize(e.target.value);
                      setNewPartyNames((prev) => {
                        const arr = [...prev];
                        while (arr.length < size) arr.push("");
                        return arr.slice(0, size);
                      });
                    }}
                    className="w-full px-3 py-2 border border-gold-pale text-sm font-body font-light text-ink focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              {/* Individual party member names */}
              {parseInt(newSize) >= 1 && (
                <div>
                  <label className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint block mb-2">
                    Party member names
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {newPartyNames.map((pn, i) => (
                      <input
                        key={i}
                        type="text"
                        value={pn}
                        onChange={(e) => {
                          const arr = [...newPartyNames];
                          arr[i] = e.target.value;
                          setNewPartyNames(arr);
                        }}
                        placeholder={`Person ${i + 1} full name`}
                        className="w-full px-3 py-2 border border-gold-pale text-sm font-body font-light text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold"
                      />
                    ))}
                  </div>
                </div>
              )}

              {addError && (
                <p className="font-body text-xs text-red-500">{addError}</p>
              )}

              <button
                onClick={() => {
                  if (newName.trim()) {
                    setAddError("");
                    addGuest(newName.trim(), parseInt(newSize) || 1, newPartyNames);
                    setNewName("");
                    setNewSize("1");
                    setNewPartyNames([""]);
                  } else {
                    setAddError("Enter a household name");
                  }
                }}
                className="px-6 py-2 bg-gold text-white font-body text-[11px] tracking-[2px] uppercase hover:bg-gold-light transition-colors"
              >
                Add Guest
              </button>
            </div>

            {/* Guest table */}
            <div className="bg-[#FFFDF9] border border-gold-pale/40 overflow-x-auto">
              <table className="w-full text-sm font-body">
                <thead>
                  <tr className="border-b border-gold-pale/40">
                    {[
                      ["name", "Name"],
                      ["partySize", "Party"],
                      ["tableNumber", "Table"],
                      ["opened", "Opened"],
                      ["submitted", "Address"],
                    ].map(([key, label]) => (
                      <th
                        key={key}
                        onClick={() => toggleSort(key)}
                        className="text-left px-4 py-3 font-normal text-[10px] tracking-[2px] uppercase text-ink-faint cursor-pointer hover:text-gold select-none"
                      >
                        {label}{" "}
                        {sortKey === key && (sortAsc ? "↑" : "↓")}
                      </th>
                    ))}
                    <th className="text-left px-4 py-3 font-normal text-[10px] tracking-[2px] uppercase text-ink-faint">
                      Link
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredGuests.map((g) => (
                    <tr
                      key={g.id}
                      className="border-b border-sand-dark last:border-0 hover:bg-sand/50"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{g.name}</p>
                        {g.partyNames && Array.isArray(g.partyNames) && g.partyNames.length > 0 && (
                          <p className="text-xs text-ink-soft">{(g.partyNames as string[]).filter(Boolean).join(", ")}</p>
                        )}
                        <p className="text-xs text-ink-faint">/{g.slug}</p>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{g.partySize}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="1"
                          defaultValue={g.tableNumber || ""}
                          placeholder="—"
                          onBlur={(e) => {
                            const val = parseInt(e.target.value) || null;
                            if (val !== g.tableNumber) {
                              fetch("/api/guests", {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ id: g.id, tableNumber: val }),
                              }).then(() => fetchAll());
                            }
                          }}
                          className="w-14 px-2 py-1 border border-gold-pale text-xs font-body text-ink text-center focus:outline-none focus:border-gold"
                        />
                      </td>
                      <td className="px-4 py-3">
                        {g.firstOpenedAt ? (
                          <span className="text-green-700 text-xs">
                            ✓ {fmtDate(g.firstOpenedAt)}
                          </span>
                        ) : (
                          <span className="text-ink-faint text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {g.addressSubmittedAt ? (
                          <span className="text-green-700 text-xs">
                            ✓ {g.city}, {g.state}
                          </span>
                        ) : (
                          <span className="text-ink-faint text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => copyLink(g.slug)}
                          className="text-gold text-xs hover:underline"
                        >
                          Copy link
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => deleteGuest(g.id)}
                          className="text-red-400 text-xs hover:text-red-600"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredGuests.length === 0 && (
                <p className="text-center py-8 text-ink-faint text-sm">
                  {filter ? "No guests match your search." : "No guests yet. Add one above or import a CSV."}
                </p>
              )}
            </div>
          </div>
        )}

        {/* NUDGE TAB */}
        {tab === "nudge" && (
          <div className="space-y-6">
            <div className="bg-[#FFFDF9] border border-gold-pale/40 p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="font-body font-light text-[10px] tracking-[3px] uppercase text-ink-faint">
                  Guests who haven&apos;t submitted their address
                </p>
                <p className="font-body text-xs text-ink-faint">
                  Flagged after {threshold} days
                </p>
              </div>
              {nudgeGuests.length === 0 ? (
                <p className="text-center py-8 text-ink-faint text-sm">
                  Everyone has submitted their address!
                </p>
              ) : (
                <div className="space-y-0">
                  {nudgeGuests.map((g) => (
                    <div
                      key={g.id}
                      className={`flex items-center justify-between py-3 border-b border-sand-dark last:border-0 ${
                        g.daysSince >= threshold ? "bg-red-50/50" : ""
                      }`}
                    >
                      <div className="flex-1">
                        <p className="font-body text-sm font-medium text-ink">
                          {g.name}
                        </p>
                        <p className="font-body text-xs text-ink-faint">
                          {g.firstOpenedAt
                            ? `Opened ${fmtDate(g.firstOpenedAt)}`
                            : "Has not opened link"}
                          {" · "}
                          {g.daysSince} days since added
                        </p>
                      </div>
                      <button
                        onClick={() => copyLink(g.slug)}
                        className="px-4 py-1.5 border border-gold-pale text-gold font-body text-[10px] tracking-[2px] uppercase hover:bg-sand transition-colors ml-4"
                      >
                        Copy link
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ACTIVITY TAB */}
        {tab === "activity" && (
          <div className="bg-[#FFFDF9] border border-gold-pale/40 p-6">
            <p className="font-body font-light text-[10px] tracking-[3px] uppercase text-ink-faint mb-4">
              Activity feed
            </p>
            {activities.length === 0 ? (
              <p className="text-center py-8 text-ink-faint text-sm">
                No activity yet.
              </p>
            ) : (
              <div className="space-y-0">
                {activities.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-baseline justify-between py-2.5 border-b border-sand-dark last:border-0"
                  >
                    <div>
                      <span className="font-body text-sm font-medium text-ink">
                        {a.guestName || "Unknown"}
                      </span>{" "}
                      <span className="font-body text-sm text-ink-soft">
                        {actionLabel(a.action)}
                      </span>
                    </div>
                    <p className="font-body text-xs text-ink-faint whitespace-nowrap ml-4">
                      {fmtDate(a.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === "settings" && (
          <div className="space-y-6 max-w-xl">
            {/* Global note */}
            <div className="bg-[#FFFDF9] border border-gold-pale/40 p-6">
              <label className="font-body text-[10px] tracking-[3px] uppercase text-ink-faint block mb-2">
                Global note from the couple
              </label>
              <p className="font-body text-xs text-ink-faint mb-3">
                Appears on every guest&apos;s page unless they have a per-guest
                note. Per-guest notes can be set in the guest list.
              </p>
              <textarea
                rows={3}
                defaultValue={settings["global_note"] || ""}
                onBlur={(e) => saveSetting("global_note", e.target.value)}
                placeholder="We can't wait to celebrate with you in paradise..."
                className="w-full px-4 py-3 bg-white border border-gold-pale text-sm font-body font-light text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold resize-none"
              />
            </div>

            {/* Reminder threshold */}
            <div className="bg-[#FFFDF9] border border-gold-pale/40 p-6">
              <label className="font-body text-[10px] tracking-[3px] uppercase text-ink-faint block mb-2">
                Show table numbers to guests
              </label>
              <p className="font-body text-xs text-ink-faint mb-3">
                When enabled, guests will see their assigned table number on
                their personal page. Keep this off until you&apos;ve finished
                assigning tables.
              </p>
              <button
                onClick={() => {
                  const current = settings["show_table_numbers"] === "true";
                  saveSetting("show_table_numbers", current ? "false" : "true");
                }}
                className={`px-5 py-2 font-body text-[11px] tracking-[2px] uppercase transition-colors ${
                  settings["show_table_numbers"] === "true"
                    ? "bg-gold text-white"
                    : "border border-gold-pale text-ink-soft"
                }`}
              >
                {settings["show_table_numbers"] === "true" ? "Visible to guests" : "Hidden from guests"}
              </button>
            </div>

            {/* Reminder threshold */}
            <div className="bg-[#FFFDF9] border border-gold-pale/40 p-6">
              <label className="font-body text-[10px] tracking-[3px] uppercase text-ink-faint block mb-2">
                Nudge reminder threshold (days)
              </label>
              <p className="font-body text-xs text-ink-faint mb-3">
                Guests who haven&apos;t responded after this many days get
                flagged in the Nudge List.
              </p>
              <input
                type="number"
                min="1"
                defaultValue={settings["reminder_threshold_days"] || "7"}
                onBlur={(e) =>
                  saveSetting("reminder_threshold_days", e.target.value)
                }
                className="w-24 px-4 py-2 border border-gold-pale text-sm font-body font-light text-ink focus:outline-none focus:border-gold"
              />
            </div>

            {/* Per-guest notes quick editor */}
            <div className="bg-[#FFFDF9] border border-gold-pale/40 p-6">
              <label className="font-body text-[10px] tracking-[3px] uppercase text-ink-faint block mb-3">
                Per-guest notes
              </label>
              {guests.map((g) => (
                <div key={g.id} className="flex gap-3 items-start mb-3">
                  <span className="font-body text-sm text-ink min-w-[140px] pt-2">
                    {g.name}
                  </span>
                  <textarea
                    rows={1}
                    defaultValue={g.note || ""}
                    onBlur={(e) => updateNote(g.id, e.target.value)}
                    placeholder="Uses global note"
                    className="flex-1 px-3 py-2 border border-gold-pale text-xs font-body font-light text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold resize-none"
                  />
                </div>
              ))}
              {guests.length === 0 && (
                <p className="text-ink-faint text-sm">
                  Add guests first to set per-guest notes.
                </p>
              )}
            </div>

            {/* CSV template */}
            <div className="bg-[#FFFDF9] border border-gold-pale/40 p-6">
              <label className="font-body text-[10px] tracking-[3px] uppercase text-ink-faint block mb-2">
                CSV import format
              </label>
              <p className="font-body text-xs text-ink-soft mb-2">
                Your CSV should have these columns (only Name is required):
              </p>
              <code className="font-mono text-xs text-ink-soft bg-sand p-3 block">
                Name, Slug, Party Size, Note
              </code>
              <p className="font-body text-xs text-ink-faint mt-2">
                If Slug is blank, it&apos;s auto-generated from the name. Party
                Size defaults to 1.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
