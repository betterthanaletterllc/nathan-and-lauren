"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { signOut } from "next-auth/react";
import Papa from "papaparse";
import VideoRecorder from "./VideoRecorder";

// Types
interface Member {
  id?: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dietaryRestrictions: string;
  isChild: boolean;
  isPlusOne: boolean;
  rsvpStatus: string | null;
  foodChoice: string | null;
  foodAllergies: string | null;
  attendingWelcome: boolean | null;
  attendingCeremony: boolean | null;
  attendingReception: boolean | null;
  attendingBrunch: boolean | null;
}

interface Guest {
  id: number;
  slug: string;
  name: string;
  partySize: number;
  tableNumber: number | null;
  side: string | null;
  note: string | null;
  plusOneAllowed: boolean;
  videoUrl: string | null;
  members: Member[];
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  rsvpSubmittedAt: string | null;
  passportConfirmed: boolean;
  flightsBooked: boolean;
  flightDetails: string | null;
  hotelBooked: boolean;
  hotelInRoomBlock: boolean | null;
  transportNeeded: boolean | null;
  arrivalDate: string | null;
  departureDate: string | null;
  songRequest: string | null;
  messageToCouple: string | null;
  checklistSubmittedAt: string | null;
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

type Tab = "overview" | "guests" | "nudge" | "activity" | "map" | "settings";

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
    const headcount = guests.reduce((s, g) => s + (g.members?.length || g.partySize), 0);
    const kids = guests.reduce((s, g) => s + (g.members?.filter((m: Member) => m.isChild).length || 0), 0);
    const rsvpYes = guests.reduce((s, g) => s + (g.members?.filter((m: Member) => m.rsvpStatus === "coming").length || 0), 0);
    const rsvpNo = guests.reduce((s, g) => s + (g.members?.filter((m: Member) => m.rsvpStatus === "not_coming").length || 0), 0);
    const rsvpPending = headcount - rsvpYes - rsvpNo;
    const passports = guests.filter((g) => g.passportConfirmed).length;
    const flights = guests.filter((g) => g.flightsBooked).length;
    const hotels = guests.filter((g) => g.hotelBooked).length;
    return { total, opened, submitted, outstanding, headcount, kids, rsvpYes, rsvpNo, rsvpPending, passports, flights, hotels };
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
  async function addGuest(name: string, members: Member[], side: string) {
    const res = await fetch("/api/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, members, side: side || null }),
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

  // Settings page state - batch changes with explicit save
  const [pendingSettings, setPendingSettings] = useState<Record<string, string>>({});
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [showSettingsConfirm, setShowSettingsConfirm] = useState(false);
  const [pendingTab, setPendingTab] = useState<Tab | null>(null);

  function updatePending(key: string, value: string) {
    setPendingSettings((p) => ({ ...p, [key]: value }));
    setSettingsDirty(true);
  }

  function getSettingValue(key: string, fallback: string = "") {
    return key in pendingSettings ? pendingSettings[key] : (settings[key] || fallback);
  }

  async function saveAllSettings() {
    for (const [key, value] of Object.entries(pendingSettings)) {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
    }
    setSettings((s) => ({ ...s, ...pendingSettings }));
    setPendingSettings({});
    setSettingsDirty(false);
  }

  function discardSettings() {
    setPendingSettings({});
    setSettingsDirty(false);
  }

  function handleTabSwitch(t: Tab) {
    if (settingsDirty && tab === "settings" && t !== "settings") {
      setPendingTab(t);
      setShowSettingsConfirm(true);
    } else {
      setTab(t);
    }
  }

  // Warn before leaving with unsaved settings
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (settingsDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [settingsDirty]);

  async function handleCSVImport(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const res = await fetch("/api/guests/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: results.data }),
        });
        const result = await res.json();
        alert(
          `Imported ${result.imported} households, ${result.members} members. ${result.skipped} skipped.${result.errors?.length ? "\n" + result.errors.join("\n") : ""}`
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
  const [newSide, setNewSide] = useState("");
  const [newMembers, setNewMembers] = useState<Member[]>([
    { firstName: "", lastName: "", phone: "", email: "", dietaryRestrictions: "", isChild: false, isPlusOne: false, rsvpStatus: null, foodChoice: null, foodAllergies: null, attendingWelcome: null, attendingCeremony: null, attendingReception: null, attendingBrunch: null },
  ]);
  const [addError, setAddError] = useState("");

  // Household detail editor
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [editName, setEditName] = useState("");
  const [editSide, setEditSide] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editTable, setEditTable] = useState("");
  const [editPlusOne, setEditPlusOne] = useState(false);
  const [editVideo, setEditVideo] = useState("");
  const [editMembers, setEditMembers] = useState<Member[]>([]);
  const [editDirty, setEditDirty] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);

  function openHousehold(g: Guest) {
    setEditingGuest(g);
    setEditName(g.name);
    setEditSide(g.side || "");
    setEditNote(g.note || "");
    setEditTable(g.tableNumber?.toString() || "");
    setEditPlusOne(g.plusOneAllowed);
    setEditVideo(g.videoUrl || "");
    setEditMembers(g.members?.length > 0 ? g.members.map((m) => ({ ...m })) : [{ firstName: "", lastName: "", phone: "", email: "", dietaryRestrictions: "", isChild: false, isPlusOne: false, rsvpStatus: null, foodChoice: null, foodAllergies: null, attendingWelcome: null, attendingCeremony: null, attendingReception: null, attendingBrunch: null }]);
    setEditDirty(false);
    setShowConfirm(false);
    setPendingClose(false);
  }

  function tryCloseHousehold() {
    if (editDirty) {
      setPendingClose(true);
      setShowConfirm(true);
    } else {
      setEditingGuest(null);
    }
  }

  async function saveHousehold() {
    if (!editingGuest) return;
    const res = await fetch("/api/guests", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingGuest.id,
        name: editName,
        side: editSide || null,
        note: editNote || null,
        tableNumber: parseInt(editTable) || null,
        plusOneAllowed: editPlusOne,
        videoUrl: editVideo || null,
        members: editMembers.filter((m) => m.firstName || m.lastName),
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert("Error saving: " + (err.error || "Unknown error"));
      return;
    }
    setEditingGuest(null);
    setEditDirty(false);
    setShowConfirm(false);
    fetchAll();
  }

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-[11px] tracking-[2px] uppercase font-body transition-colors ${
      tab === t
        ? "text-gold border-b-2 border-gold"
        : "text-ink-faint hover:text-ink-soft"
    }`;

  const cardClass =
    "bg-[#FFFDF9] border border-gold-pale/40 p-5 text-center";

  const [drilldown, setDrilldown] = useState<string | null>(null);

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
            ["map", "Guest Map"],
            ["settings", "Settings"],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button key={t} onClick={() => handleTabSwitch(t)} className={tabClass(t)}>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                ["Households", stats.total],
                ["Headcount", stats.headcount],
                ["Kids", stats.kids],
                ["RSVP Yes", stats.rsvpYes],
                ["RSVP No", stats.rsvpNo],
                ["RSVP Pending", stats.rsvpPending],
              ].map(([label, val]) => (
                <button
                  key={label as string}
                  onClick={() => setDrilldown(drilldown === label ? null : label as string)}
                  className={`${cardClass} cursor-pointer transition-all hover:border-gold ${drilldown === label ? "border-gold ring-1 ring-gold/20" : ""}`}
                >
                  <p className="font-body font-light text-[10px] tracking-[3px] uppercase text-ink-faint mb-1">
                    {label}
                  </p>
                  <p className="font-display text-3xl text-ink">{val}</p>
                </button>
              ))}
            </div>

            {/* Travel progress */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                ["Addresses In", `${stats.submitted}/${stats.total}`],
                ["Passports", `${stats.passports}/${stats.total}`],
                ["Flights", `${stats.flights}/${stats.total}`],
                ["Hotels", `${stats.hotels}/${stats.total}`],
              ].map(([label, val]) => (
                <button
                  key={label as string}
                  onClick={() => setDrilldown(drilldown === label ? null : label as string)}
                  className={`${cardClass} cursor-pointer transition-all hover:border-gold ${drilldown === label ? "border-gold ring-1 ring-gold/20" : ""}`}
                >
                  <p className="font-body font-light text-[10px] tracking-[3px] uppercase text-ink-faint mb-1">
                    {label}
                  </p>
                  <p className="font-display text-2xl text-ink">{val}</p>
                </button>
              ))}
            </div>

            {/* Drilldown panel */}
            {drilldown && (
              <div className="bg-[#FFFDF9] border border-gold-pale/40 p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-body font-light text-[10px] tracking-[3px] uppercase text-ink-faint">
                    {drilldown}
                  </p>
                  <button onClick={() => setDrilldown(null)} className="text-ink-faint hover:text-ink text-sm">&times;</button>
                </div>
                <div className="space-y-0">
                  {(() => {
                    let filtered: { household: string; slug: string; names: string; detail?: string }[] = [];

                    switch (drilldown) {
                      case "Households":
                        filtered = guests.map((g) => ({ household: g.name, slug: g.slug, names: g.members?.map((m: Member) => `${m.firstName} ${m.lastName}`.trim()).join(", ") || "" }));
                        break;
                      case "Headcount":
                        filtered = guests.flatMap((g) => (g.members || []).map((m: Member) => ({ household: g.name, slug: g.slug, names: `${m.firstName} ${m.lastName}`.trim(), detail: m.isChild ? "Child" : "Adult" })));
                        break;
                      case "Kids":
                        filtered = guests.flatMap((g) => (g.members || []).filter((m: Member) => m.isChild).map((m: Member) => ({ household: g.name, slug: g.slug, names: `${m.firstName} ${m.lastName}`.trim() })));
                        break;
                      case "RSVP Yes":
                        filtered = guests.flatMap((g) => (g.members || []).filter((m: Member) => m.rsvpStatus === "coming").map((m: Member) => ({ household: g.name, slug: g.slug, names: `${m.firstName} ${m.lastName}`.trim(), detail: m.foodChoice || "No food selected" })));
                        break;
                      case "RSVP No":
                        filtered = guests.flatMap((g) => (g.members || []).filter((m: Member) => m.rsvpStatus === "not_coming").map((m: Member) => ({ household: g.name, slug: g.slug, names: `${m.firstName} ${m.lastName}`.trim() })));
                        break;
                      case "RSVP Pending":
                        filtered = guests.flatMap((g) => (g.members || []).filter((m: Member) => !m.rsvpStatus).map((m: Member) => ({ household: g.name, slug: g.slug, names: `${m.firstName} ${m.lastName}`.trim() })));
                        if (filtered.length === 0) {
                          filtered = guests.filter((g) => !g.rsvpSubmittedAt).map((g) => ({ household: g.name, slug: g.slug, names: g.members?.map((m: Member) => `${m.firstName} ${m.lastName}`.trim()).join(", ") || "No members" }));
                        }
                        break;
                      case "Addresses In":
                        filtered = guests.filter((g) => g.addressSubmittedAt).map((g) => ({ household: g.name, slug: g.slug, names: `${g.city}, ${g.state}` }));
                        break;
                      case "Passports":
                        filtered = guests.filter((g) => g.passportConfirmed).map((g) => ({ household: g.name, slug: g.slug, names: "Confirmed" }));
                        break;
                      case "Flights":
                        filtered = guests.filter((g) => g.flightsBooked).map((g) => ({ household: g.name, slug: g.slug, names: g.flightDetails || "Booked" }));
                        break;
                      case "Hotels":
                        filtered = guests.filter((g) => g.hotelBooked).map((g) => ({ household: g.name, slug: g.slug, names: g.hotelInRoomBlock === false ? "Outside room block" : "Room block" }));
                        break;
                    }

                    if (filtered.length === 0) {
                      return <p className="text-ink-faint text-sm text-center py-4">No results</p>;
                    }

                    return filtered.map((r, i) => (
                      <div key={i} className="flex items-center justify-between py-2.5 border-b border-sand-dark last:border-0">
                        <div>
                          <button onClick={() => { const g = guests.find((g) => g.slug === r.slug); if (g) openHousehold(g); }} className="font-body text-sm font-medium text-ink hover:text-gold transition-colors">
                            {r.names || r.household}
                          </button>
                          {r.names && r.names !== r.household && (
                            <p className="font-body text-xs text-ink-faint">{r.household}</p>
                          )}
                        </div>
                        {r.detail && (
                          <span className="font-body text-xs text-ink-faint">{r.detail}</span>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

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
                    Household name
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="The Johnsons"
                    className="w-full px-3 py-2 border border-gold-pale text-sm font-body font-light text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold"
                  />
                </div>
                <div className="w-32">
                  <label className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint block mb-1">
                    Side
                  </label>
                  <select
                    value={newSide}
                    onChange={(e) => setNewSide(e.target.value)}
                    className="w-full px-3 py-2 border border-gold-pale text-sm font-body font-light text-ink focus:outline-none focus:border-gold bg-white"
                  >
                    <option value="">—</option>
                    <option value="bride">Bride</option>
                    <option value="groom">Groom</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>

              {/* Members */}
              <div>
                <label className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint block mb-2">
                  Members ({newMembers.length})
                </label>
                <div className="space-y-2">
                  {newMembers.map((m, i) => (
                    <div key={i} className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-2 border-b border-sand-dark last:border-0">
                      <input type="text" value={m.firstName} onChange={(e) => { const arr = [...newMembers]; arr[i] = { ...arr[i], firstName: e.target.value }; setNewMembers(arr); }} placeholder="First name" className="px-3 py-2 border border-gold-pale text-sm font-body font-light text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold" />
                      <input type="text" value={m.lastName} onChange={(e) => { const arr = [...newMembers]; arr[i] = { ...arr[i], lastName: e.target.value }; setNewMembers(arr); }} placeholder="Last name" className="px-3 py-2 border border-gold-pale text-sm font-body font-light text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold" />
                      <input type="text" value={m.phone} onChange={(e) => { const arr = [...newMembers]; arr[i] = { ...arr[i], phone: e.target.value }; setNewMembers(arr); }} placeholder="Phone" className="px-3 py-2 border border-gold-pale text-sm font-body font-light text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold" />
                      <input type="text" value={m.email} onChange={(e) => { const arr = [...newMembers]; arr[i] = { ...arr[i], email: e.target.value }; setNewMembers(arr); }} placeholder="Email" className="px-3 py-2 border border-gold-pale text-sm font-body font-light text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold" />
                      <input type="text" value={m.dietaryRestrictions} onChange={(e) => { const arr = [...newMembers]; arr[i] = { ...arr[i], dietaryRestrictions: e.target.value }; setNewMembers(arr); }} placeholder="Dietary restrictions" className="px-3 py-2 border border-gold-pale text-sm font-body font-light text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold" />
                      <label className="flex items-center gap-2 px-3 py-2 text-sm font-body font-light text-ink-soft">
                        <input type="checkbox" checked={m.isChild} onChange={(e) => { const arr = [...newMembers]; arr[i] = { ...arr[i], isChild: e.target.checked }; setNewMembers(arr); }} />
                        Child
                      </label>
                      {newMembers.length > 1 && (
                        <button onClick={() => setNewMembers(newMembers.filter((_, j) => j !== i))} className="text-red-400 text-xs hover:text-red-600 px-3 py-2">Remove</button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setNewMembers([...newMembers, { firstName: "", lastName: "", phone: "", email: "", dietaryRestrictions: "", isChild: false, isPlusOne: false, rsvpStatus: null, foodChoice: null, foodAllergies: null, attendingWelcome: null, attendingCeremony: null, attendingReception: null, attendingBrunch: null }])}
                  className="mt-2 text-gold text-xs font-body tracking-[1px] uppercase hover:underline"
                >
                  + Add another member
                </button>
              </div>

              {addError && (
                <p className="font-body text-xs text-red-500">{addError}</p>
              )}

              <button
                onClick={() => {
                  if (newName.trim()) {
                    setAddError("");
                    addGuest(newName.trim(), newMembers.filter((m) => m.firstName || m.lastName), newSide);
                    setNewName("");
                    setNewSide("");
                    setNewMembers([{ firstName: "", lastName: "", phone: "", email: "", dietaryRestrictions: "", isChild: false, isPlusOne: false, rsvpStatus: null, foodChoice: null, foodAllergies: null, attendingWelcome: null, attendingCeremony: null, attendingReception: null, attendingBrunch: null }]);
                  } else {
                    setAddError("Enter a household name");
                  }
                }}
                className="px-6 py-2 bg-gold text-white font-body text-[11px] tracking-[2px] uppercase hover:bg-gold-light transition-colors"
              >
                Add Household
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
                        <button onClick={() => openHousehold(g)} className="text-left hover:text-gold transition-colors">
                          <p className="font-medium text-ink hover:text-gold">{g.name}</p>
                        </button>
                        {g.members && g.members.length > 0 && (
                          <p className="text-xs text-ink-soft">{g.members.map((m: Member) => `${m.firstName} ${m.lastName}`.trim()).filter(Boolean).join(", ")}</p>
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

        {/* GUEST MAP TAB */}
        {tab === "map" && (
          <div className="space-y-6">
            <div className="bg-[#FFFDF9] border border-gold-pale/40 p-6">
              <p className="font-body font-light text-[10px] tracking-[3px] uppercase text-ink-faint mb-4">
                Guest locations
              </p>
              {(() => {
                const withAddress = guests.filter((g) => g.city && g.state);
                if (withAddress.length === 0) {
                  return (
                    <p className="text-center py-8 text-ink-faint text-sm">
                      No addresses submitted yet. Locations will appear here as guests submit their addresses.
                    </p>
                  );
                }

                // Group by state, then city
                const byState: Record<string, { city: string; guests: typeof withAddress }[]> = {};
                for (const g of withAddress) {
                  const state = g.state || "Unknown";
                  const city = g.city || "Unknown";
                  if (!byState[state]) byState[state] = [];
                  const existing = byState[state].find((c) => c.city === city);
                  if (existing) {
                    existing.guests.push(g);
                  } else {
                    byState[state].push({ city, guests: [g] });
                  }
                }

                const sortedStates = Object.entries(byState).sort(
                  (a, b) => b[1].reduce((s, c) => s + c.guests.length, 0) - a[1].reduce((s, c) => s + c.guests.length, 0)
                );

                return (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-sand p-4 text-center">
                        <p className="font-display text-2xl text-ink">{withAddress.length}</p>
                        <p className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint">Addresses in</p>
                      </div>
                      <div className="bg-sand p-4 text-center">
                        <p className="font-display text-2xl text-ink">{Object.keys(byState).length}</p>
                        <p className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint">States</p>
                      </div>
                      <div className="bg-sand p-4 text-center">
                        <p className="font-display text-2xl text-ink">{sortedStates.reduce((s, [, cities]) => s + cities.length, 0)}</p>
                        <p className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint">Cities</p>
                      </div>
                    </div>

                    {/* By state */}
                    {sortedStates.map(([state, cities]) => {
                      const stateTotal = cities.reduce((s, c) => s + c.guests.length, 0);
                      return (
                        <div key={state} className="border-b border-sand-dark pb-3 last:border-0">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-body text-sm font-medium text-ink">{state}</p>
                            <span className="font-body text-xs text-ink-faint">
                              {stateTotal} household{stateTotal !== 1 ? "s" : ""}
                            </span>
                          </div>
                          {cities
                            .sort((a, b) => b.guests.length - a.guests.length)
                            .map(({ city, guests: cityGuests }) => (
                              <div key={city} className="ml-4 flex items-center justify-between py-1">
                                <p className="font-body text-sm text-ink-soft">{city}</p>
                                <div className="flex items-center gap-3">
                                  <span className="font-body text-xs text-ink-faint">
                                    {cityGuests.map((g) => g.name).join(", ")}
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === "settings" && (
          <div className="space-y-6 max-w-xl">
            {/* Guest page phase */}
            <div className="bg-[#FFFDF9] border border-gold-pale/40 p-6">
              <label className="font-body text-[10px] tracking-[3px] uppercase text-ink-faint block mb-2">
                Guest page phase
              </label>
              <p className="font-body text-xs text-ink-faint mb-3">
                Controls what guests see on their personal page. Each phase adds more content.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  ["save_the_date", "Save the Date"],
                  ["rsvp", "RSVP"],
                  ["checklist", "Travel Checklist"],
                  ["arrived", "Arrived / Live"],
                  ["final", "Final (All Info)"],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => updatePending("guest_page_phase", val)}
                    className={`px-4 py-2 font-body text-[11px] tracking-[2px] uppercase transition-colors ${
                      (getSettingValue("guest_page_phase", "save_the_date")) === val
                        ? "bg-gold text-white"
                        : "border border-gold-pale text-ink-soft hover:border-gold"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Global video URL */}
            <div className="bg-[#FFFDF9] border border-gold-pale/40 p-6">
              <label className="font-body text-[10px] tracking-[3px] uppercase text-ink-faint block mb-2">
                Global video URL (RSVP phase)
              </label>
              <p className="font-body text-xs text-ink-faint mb-3">
                YouTube or video URL shown on every guest&apos;s page during the RSVP phase.
                Per-household videos can override this in the household detail.
              </p>
              <input
                type="text"
                defaultValue={settings["global_video_url"] || ""}
                onBlur={(e) => updatePending("global_video_url", e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-4 py-3 bg-white border border-gold-pale text-sm font-body font-light text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold"
              />
            </div>

            {/* Room block link */}
            <div className="bg-[#FFFDF9] border border-gold-pale/40 p-6">
              <label className="font-body text-[10px] tracking-[3px] uppercase text-ink-faint block mb-2">
                Room block booking link
              </label>
              <input
                type="text"
                defaultValue={settings["room_block_link"] || ""}
                onBlur={(e) => updatePending("room_block_link", e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-3 bg-white border border-gold-pale text-sm font-body font-light text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold"
              />
            </div>

            {/* Travel settings */}
            <div className="bg-[#FFFDF9] border border-gold-pale/40 p-6 space-y-4">
              <label className="font-body text-[10px] tracking-[3px] uppercase text-ink-faint block">
                Travel settings
              </label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-body text-[10px] tracking-[1px] uppercase text-ink-faint block mb-1">Destination airport code</label>
                  <input
                    type="text"
                    defaultValue={settings["destination_airport"] || "CUN"}
                    onBlur={(e) => updatePending("destination_airport", e.target.value.toUpperCase())}
                    placeholder="CUN"
                    className="w-full px-3 py-2 bg-white border border-gold-pale text-sm font-body font-light text-ink focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="font-body text-[10px] tracking-[1px] uppercase text-ink-faint block mb-1">Travel start date</label>
                  <input
                    type="date"
                    defaultValue={settings["travel_date_start"] || "2027-02-25"}
                    onBlur={(e) => updatePending("travel_date_start", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gold-pale text-sm font-body font-light text-ink focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="font-body text-[10px] tracking-[1px] uppercase text-ink-faint block mb-1">Travel end date</label>
                  <input
                    type="date"
                    defaultValue={settings["travel_date_end"] || "2027-02-28"}
                    onBlur={(e) => updatePending("travel_date_end", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gold-pale text-sm font-body font-light text-ink focus:outline-none focus:border-gold"
                  />
                </div>
              </div>
            </div>

            {/* Food options */}
            <div className="bg-[#FFFDF9] border border-gold-pale/40 p-6">
              <label className="font-body text-[10px] tracking-[3px] uppercase text-ink-faint block mb-2">
                Dinner options (RSVP phase)
              </label>
              <p className="font-body text-xs text-ink-faint mb-3">
                Comma-separated list of food choices guests can pick from.
              </p>
              <input
                type="text"
                defaultValue={settings["food_options"] || "Salmon,Chicken Fettuccine"}
                onBlur={(e) => updatePending("food_options", e.target.value)}
                placeholder="Salmon,Chicken Fettuccine"
                className="w-full px-4 py-3 bg-white border border-gold-pale text-sm font-body font-light text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold"
              />
            </div>

            {/* Resort map URL */}
            <div className="bg-[#FFFDF9] border border-gold-pale/40 p-6">
              <label className="font-body text-[10px] tracking-[3px] uppercase text-ink-faint block mb-2">
                Resort map URL (arrived phase)
              </label>
              <input
                type="text"
                defaultValue={settings["resort_map_url"] || ""}
                onBlur={(e) => updatePending("resort_map_url", e.target.value)}
                placeholder="https://... (link to resort map PDF or image)"
                className="w-full px-4 py-3 bg-white border border-gold-pale text-sm font-body font-light text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold"
              />
            </div>

            {/* Event schedule */}
            <div className="bg-[#FFFDF9] border border-gold-pale/40 p-6">
              <label className="font-body text-[10px] tracking-[3px] uppercase text-ink-faint block mb-2">
                Event schedule (arrived phase)
              </label>
              <p className="font-body text-xs text-ink-faint mb-3">
                Events shown on guest pages during the arrived phase. Displayed in order.
              </p>
              {(() => {
                let events: any[] = [];
                try { events = JSON.parse(getSettingValue("event_schedule", "[]")); } catch {}
                return (
                  <div className="space-y-3">
                    {events.map((ev: any, i: number) => (
                      <div key={i} className="border border-gold-pale/40 p-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input type="text" defaultValue={ev.name} placeholder="Event name" onBlur={(e) => { const arr = [...events]; arr[i] = { ...arr[i], name: e.target.value }; updatePending("event_schedule", JSON.stringify(arr)); }} className="px-3 py-2 border border-gold-pale text-sm font-body font-light text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold" />
                          <input type="text" defaultValue={ev.location} placeholder="Location" onBlur={(e) => { const arr = [...events]; arr[i] = { ...arr[i], location: e.target.value }; updatePending("event_schedule", JSON.stringify(arr)); }} className="px-3 py-2 border border-gold-pale text-sm font-body font-light text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input type="text" defaultValue={ev.date} placeholder="Date (e.g. Thursday, Feb 25)" onBlur={(e) => { const arr = [...events]; arr[i] = { ...arr[i], date: e.target.value }; updatePending("event_schedule", JSON.stringify(arr)); }} className="px-3 py-2 border border-gold-pale text-sm font-body font-light text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold" />
                          <input type="text" defaultValue={ev.time} placeholder="Time (e.g. 6:00 PM)" onBlur={(e) => { const arr = [...events]; arr[i] = { ...arr[i], time: e.target.value }; updatePending("event_schedule", JSON.stringify(arr)); }} className="px-3 py-2 border border-gold-pale text-sm font-body font-light text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold" />
                        </div>
                        <div className="flex gap-2">
                          <input type="text" defaultValue={ev.notes} placeholder="Notes (dress code, etc.)" onBlur={(e) => { const arr = [...events]; arr[i] = { ...arr[i], notes: e.target.value }; updatePending("event_schedule", JSON.stringify(arr)); }} className="flex-1 px-3 py-2 border border-gold-pale text-sm font-body font-light text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold" />
                          <button onClick={() => { const arr = events.filter((_: any, j: number) => j !== i); updatePending("event_schedule", JSON.stringify(arr)); }} className="text-red-400 text-xs hover:text-red-600 px-2">Remove</button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const arr = [...events, { name: "", date: "", time: "", location: "", notes: "" }];
                        updatePending("event_schedule", JSON.stringify(arr));
                        fetchAll();
                      }}
                      className="text-gold text-xs font-body tracking-[1px] uppercase hover:underline"
                    >
                      + Add event
                    </button>
                  </div>
                );
              })()}
            </div>

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
                onBlur={(e) => updatePending("global_note", e.target.value)}
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
                  const current = getSettingValue("show_table_numbers") === "true";
                  updatePending("show_table_numbers", current ? "false" : "true");
                }}
                className={`px-5 py-2 font-body text-[11px] tracking-[2px] uppercase transition-colors ${
                  getSettingValue("show_table_numbers") === "true"
                    ? "bg-gold text-white"
                    : "border border-gold-pale text-ink-soft"
                }`}
              >
                {getSettingValue("show_table_numbers") === "true" ? "Visible to guests" : "Hidden from guests"}
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
                  updatePending("reminder_threshold_days", e.target.value)
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
                Household, Slug, Table, Note, Side, First Name, Last Name, Phone, Email, Dietary Restrictions, Is Child
              </code>
              <p className="font-body text-xs text-ink-faint mt-2">
                Each row is one person. Rows with the same Household name are grouped into one household. Slug is auto-generated if blank.
              </p>
            </div>

            {/* Save bar */}
            {settingsDirty && (
              <div className="sticky bottom-0 bg-[#FFFDF9] border-t border-gold-pale/40 p-4 flex items-center justify-between -mx-0">
                <p className="font-body text-xs text-ink-soft">You have unsaved changes</p>
                <div className="flex gap-2">
                  <button
                    onClick={discardSettings}
                    className="px-5 py-2 border border-gold-pale text-ink-soft font-body text-[11px] tracking-[2px] uppercase hover:bg-sand transition-colors"
                  >
                    Discard
                  </button>
                  <button
                    onClick={saveAllSettings}
                    className="px-5 py-2 bg-gold text-white font-body text-[11px] tracking-[2px] uppercase hover:bg-gold-light transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Household Detail Modal */}
      {editingGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/30" onClick={tryCloseHousehold} />
          <div className="relative bg-[#FFFDF9] border border-gold-pale/60 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-[#FFFDF9] border-b border-gold-pale/40 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="font-display font-light text-xl text-ink">{editingGuest.name}</h2>
              <button onClick={tryCloseHousehold} className="text-ink-faint hover:text-ink text-xl leading-none">&times;</button>
            </div>

            <div className="p-6 space-y-5">
              {/* Household info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint block mb-1">Household name</label>
                  <input type="text" value={editName} onChange={(e) => { setEditName(e.target.value); setEditDirty(true); }} className="w-full px-3 py-2 border border-gold-pale text-sm font-body font-light text-ink focus:outline-none focus:border-gold" />
                </div>
                <div>
                  <label className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint block mb-1">Side</label>
                  <select value={editSide} onChange={(e) => { setEditSide(e.target.value); setEditDirty(true); }} className="w-full px-3 py-2 border border-gold-pale text-sm font-body font-light text-ink focus:outline-none focus:border-gold bg-white">
                    <option value="">—</option>
                    <option value="bride">Bride</option>
                    <option value="groom">Groom</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div>
                  <label className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint block mb-1">Table</label>
                  <input type="number" min="1" value={editTable} onChange={(e) => { setEditTable(e.target.value); setEditDirty(true); }} placeholder="—" className="w-full px-3 py-2 border border-gold-pale text-sm font-body font-light text-ink focus:outline-none focus:border-gold" />
                </div>
                <div>
                  <label className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint block mb-1">Slug</label>
                  <p className="px-3 py-2 text-sm font-body font-light text-ink-faint">/{editingGuest.slug}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm font-body text-ink-soft cursor-pointer">
                  <input type="checkbox" checked={editPlusOne} onChange={(e) => { setEditPlusOne(e.target.checked); setEditDirty(true); }} />
                  Plus-one allowed
                </label>
              </div>

              <VideoRecorder
                slug={editingGuest.slug}
                currentUrl={editVideo}
                onVideoSaved={(url) => { setEditVideo(url); setEditDirty(true); }}
              />

              <div>
                <label className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint block mb-1">Personal note</label>
                <textarea rows={2} value={editNote} onChange={(e) => { setEditNote(e.target.value); setEditDirty(true); }} placeholder="Uses global note if blank" className="w-full px-3 py-2 border border-gold-pale text-sm font-body font-light text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold resize-none" />
              </div>

              {/* Status */}
              <div className="bg-sand p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint">Link opened</p>
                  <p className="font-body text-sm text-ink mt-1">{editingGuest.firstOpenedAt ? `Yes (${editingGuest.openCount}×)` : "No"}</p>
                </div>
                <div>
                  <p className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint">Address</p>
                  <p className="font-body text-sm text-ink mt-1">{editingGuest.addressSubmittedAt ? `${editingGuest.city}, ${editingGuest.state}` : "Not submitted"}</p>
                </div>
                <div>
                  <p className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint">RSVP</p>
                  <p className="font-body text-sm text-ink mt-1">{editingGuest.rsvpSubmittedAt ? "Submitted" : "Pending"}</p>
                </div>
                <div>
                  <p className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint">Guest link</p>
                  <button onClick={() => { navigator.clipboard.writeText(`${baseUrl}/guest/${editingGuest.slug}`); }} className="font-body text-sm text-gold hover:underline mt-1">Copy link</button>
                </div>
              </div>

              {/* Travel checklist status (read-only) */}
              {editingGuest.rsvpSubmittedAt && (
                <div className="bg-sand p-4">
                  <p className="font-body text-[10px] tracking-[3px] uppercase text-ink-faint mb-3">Travel checklist</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm font-body">
                    <div className="flex items-center gap-2">
                      <span className={editingGuest.passportConfirmed ? "text-green-600" : "text-ink-faint"}>{editingGuest.passportConfirmed ? "✓" : "○"}</span>
                      Passport
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={editingGuest.flightsBooked ? "text-green-600" : "text-ink-faint"}>{editingGuest.flightsBooked ? "✓" : "○"}</span>
                      Flights
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={editingGuest.hotelBooked ? "text-green-600" : "text-ink-faint"}>{editingGuest.hotelBooked ? "✓" : "○"}</span>
                      Hotel {editingGuest.hotelInRoomBlock === false && "(outside block)"}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={editingGuest.transportNeeded ? "text-blue-600" : "text-ink-faint"}>{editingGuest.transportNeeded ? "✓" : "○"}</span>
                      Transport needed
                    </div>
                  </div>
                  {editingGuest.flightDetails && (
                    <p className="text-xs text-ink-soft mt-2">Flight (legacy): {editingGuest.flightDetails}</p>
                  )}
                  {editingGuest.members?.filter((m: any) => m.flightsBooked).map((m: any, i: number) => (
                    <p key={i} className="text-xs text-ink-soft mt-1">
                      {m.firstName}: {m.departureFlight || "—"} ({m.departureDate || "—"}) → {m.returnFlight || "—"} ({m.returnDate || "—"})
                    </p>
                  ))}
                  {editingGuest.arrivalDate && (
                    <p className="text-xs text-ink-soft mt-1">Arrival: {editingGuest.arrivalDate} · Departure: {editingGuest.departureDate || "—"}</p>
                  )}
                  {editingGuest.songRequest && (
                    <p className="text-xs text-ink-soft mt-1">Song request: {editingGuest.songRequest}</p>
                  )}
                  {editingGuest.messageToCouple && (
                    <p className="text-xs text-ink-soft mt-1">Message: {editingGuest.messageToCouple}</p>
                  )}
                </div>
              )}

              {/* Members */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="font-body text-[10px] tracking-[3px] uppercase text-ink-faint">Members ({editMembers.length})</label>
                  <button
                    onClick={() => { setEditMembers([...editMembers, { firstName: "", lastName: "", phone: "", email: "", dietaryRestrictions: "", isChild: false, isPlusOne: false, rsvpStatus: null, foodChoice: null, foodAllergies: null, attendingWelcome: null, attendingCeremony: null, attendingReception: null, attendingBrunch: null }]); setEditDirty(true); }}
                    className="text-gold text-xs font-body tracking-[1px] uppercase hover:underline"
                  >
                    + Add member
                  </button>
                </div>

                <div className="space-y-3">
                  {editMembers.map((m, i) => (
                    <div key={i} className="border border-gold-pale/40 p-3 relative">
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <input type="text" value={m.firstName} onChange={(e) => { const arr = [...editMembers]; arr[i] = { ...arr[i], firstName: e.target.value }; setEditMembers(arr); setEditDirty(true); }} placeholder="First name" className="px-3 py-2 border border-gold-pale text-sm font-body font-light text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold" />
                        <input type="text" value={m.lastName} onChange={(e) => { const arr = [...editMembers]; arr[i] = { ...arr[i], lastName: e.target.value }; setEditMembers(arr); setEditDirty(true); }} placeholder="Last name" className="px-3 py-2 border border-gold-pale text-sm font-body font-light text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <input type="text" value={m.phone || ""} onChange={(e) => { const arr = [...editMembers]; arr[i] = { ...arr[i], phone: e.target.value }; setEditMembers(arr); setEditDirty(true); }} placeholder="Phone" className="px-3 py-2 border border-gold-pale text-sm font-body font-light text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold" />
                        <input type="text" value={m.email || ""} onChange={(e) => { const arr = [...editMembers]; arr[i] = { ...arr[i], email: e.target.value }; setEditMembers(arr); setEditDirty(true); }} placeholder="Email" className="px-3 py-2 border border-gold-pale text-sm font-body font-light text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold" />
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        <input type="text" value={m.dietaryRestrictions || ""} onChange={(e) => { const arr = [...editMembers]; arr[i] = { ...arr[i], dietaryRestrictions: e.target.value }; setEditMembers(arr); setEditDirty(true); }} placeholder="Dietary restrictions" className="flex-1 min-w-[150px] px-3 py-2 border border-gold-pale text-sm font-body font-light text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold" />
                        <label className="flex items-center gap-1.5 text-xs font-body text-ink-soft whitespace-nowrap">
                          <input type="checkbox" checked={m.isChild} onChange={(e) => { const arr = [...editMembers]; arr[i] = { ...arr[i], isChild: e.target.checked }; setEditMembers(arr); setEditDirty(true); }} />
                          Child
                        </label>
                        <label className="flex items-center gap-1.5 text-xs font-body text-ink-soft whitespace-nowrap">
                          <input type="checkbox" checked={m.isPlusOne} onChange={(e) => { const arr = [...editMembers]; arr[i] = { ...arr[i], isPlusOne: e.target.checked }; setEditMembers(arr); setEditDirty(true); }} />
                          Plus one
                        </label>
                        {m.rsvpStatus && (
                          <span className={`text-xs font-body px-2 py-0.5 ${m.rsvpStatus === "coming" ? "text-green-700 bg-green-50" : "text-red-600 bg-red-50"}`}>
                            {m.rsvpStatus === "coming" ? "Coming" : "Not coming"}
                            {m.foodChoice && ` · ${m.foodChoice === "salmon" ? "Salmon" : "Chicken"}`}
                          </span>
                        )}
                        {editMembers.length > 1 && (
                          <button onClick={() => { setEditMembers(editMembers.filter((_, j) => j !== i)); setEditDirty(true); }} className="text-red-400 text-xs hover:text-red-600 whitespace-nowrap">Remove</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gold-pale/40">
                <button onClick={tryCloseHousehold} className="font-body text-sm text-ink-faint hover:text-ink transition-colors">Cancel</button>
                <button
                  onClick={() => {
                    if (editDirty) {
                      setShowConfirm(true);
                      setPendingClose(false);
                    }
                  }}
                  disabled={!editDirty}
                  className={`px-6 py-2 font-body text-[11px] tracking-[2px] uppercase transition-colors ${editDirty ? "bg-gold text-white hover:bg-gold-light" : "bg-sand-dark text-ink-faint cursor-not-allowed"}`}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40" />
          <div className="relative bg-[#FFFDF9] border border-gold-pale/60 p-8 max-w-sm w-full text-center">
            <p className="font-display text-lg text-ink mb-2">
              {pendingClose ? "Unsaved changes" : "Save changes?"}
            </p>
            <p className="font-body text-sm text-ink-soft mb-6">
              {pendingClose
                ? "You have unsaved changes. Do you want to save before closing?"
                : "Are you sure you want to save these changes?"}
            </p>
            <div className="flex justify-center gap-3">
              {pendingClose && (
                <button
                  onClick={() => { setShowConfirm(false); setEditingGuest(null); setEditDirty(false); }}
                  className="px-5 py-2 border border-gold-pale text-ink-soft font-body text-[11px] tracking-[2px] uppercase hover:bg-sand transition-colors"
                >
                  Discard
                </button>
              )}
              <button
                onClick={() => { setShowConfirm(false); if (pendingClose) setEditingGuest(null); }}
                className="px-5 py-2 border border-gold-pale text-ink-soft font-body text-[11px] tracking-[2px] uppercase hover:bg-sand transition-colors"
              >
                {pendingClose ? "Keep editing" : "Cancel"}
              </button>
              <button
                onClick={() => { saveHousehold(); }}
                className="px-5 py-2 bg-gold text-white font-body text-[11px] tracking-[2px] uppercase hover:bg-gold-light transition-colors"
              >
                {pendingClose ? "Save & close" : "Yes, save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings unsaved changes confirm */}
      {showSettingsConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40" />
          <div className="relative bg-[#FFFDF9] border border-gold-pale/60 p-8 max-w-sm w-full text-center">
            <p className="font-display text-lg text-ink mb-2">Unsaved settings</p>
            <p className="font-body text-sm text-ink-soft mb-6">
              You have unsaved changes in Settings. Would you like to save them before leaving?
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => {
                  discardSettings();
                  setShowSettingsConfirm(false);
                  if (pendingTab) { setTab(pendingTab); setPendingTab(null); }
                }}
                className="px-5 py-2 border border-gold-pale text-ink-soft font-body text-[11px] tracking-[2px] uppercase hover:bg-sand transition-colors"
              >
                Discard
              </button>
              <button
                onClick={() => { setShowSettingsConfirm(false); setPendingTab(null); }}
                className="px-5 py-2 border border-gold-pale text-ink-soft font-body text-[11px] tracking-[2px] uppercase hover:bg-sand transition-colors"
              >
                Keep editing
              </button>
              <button
                onClick={async () => {
                  await saveAllSettings();
                  setShowSettingsConfirm(false);
                  if (pendingTab) { setTab(pendingTab); setPendingTab(null); }
                }}
                className="px-5 py-2 bg-gold text-white font-body text-[11px] tracking-[2px] uppercase hover:bg-gold-light transition-colors"
              >
                Save & leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
