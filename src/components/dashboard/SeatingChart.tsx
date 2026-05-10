"use client";

import { useState, useMemo } from "react";

interface Member {
  firstName: string;
  lastName: string;
}

interface Guest {
  id: number;
  name: string;
  slug: string;
  tableNumber: number | null;
  members: Member[];
  rsvpSubmittedAt: string | null;
}

interface SeatAssignment {
  tableNum: number;
  seatNum: number;
  guestId: number;
  guestName: string;
}

interface Props {
  guests: Guest[];
  onSave: (assignments: { id: number; tableNumber: number | null }[]) => void;
}

export default function SeatingChart({ guests, onSave }: Props) {
  const [numTables, setNumTables] = useState(5);
  const [seatsPerTable, setSeatsPerTable] = useState(8);
  const [assignments, setAssignments] = useState<SeatAssignment[]>(() => {
    // Initialize from existing tableNumber assignments
    const initial: SeatAssignment[] = [];
    const byTable: Record<number, Guest[]> = {};
    for (const g of guests) {
      if (g.tableNumber) {
        if (!byTable[g.tableNumber]) byTable[g.tableNumber] = [];
        byTable[g.tableNumber].push(g);
      }
    }
    for (const [table, tableGuests] of Object.entries(byTable)) {
      tableGuests.forEach((g, i) => {
        initial.push({
          tableNum: parseInt(table),
          seatNum: i,
          guestId: g.id,
          guestName: g.name,
        });
      });
    }
    return initial;
  });
  const [selectedSeat, setSelectedSeat] = useState<{ table: number; seat: number } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Confirmed guests (RSVP yes or no RSVP system yet)
  const availableGuests = useMemo(() => {
    const assignedIds = new Set(assignments.map((a) => a.guestId));
    return guests.filter((g) => !assignedIds.has(g.id));
  }, [guests, assignments]);

  function getAssignment(tableNum: number, seatNum: number) {
    return assignments.find((a) => a.tableNum === tableNum && a.seatNum === seatNum);
  }

  function assignSeat(tableNum: number, seatNum: number, guest: Guest) {
    // Remove any existing assignment for this guest
    const filtered = assignments.filter((a) => a.guestId !== guest.id);
    // Remove any existing assignment for this seat
    const cleaned = filtered.filter((a) => !(a.tableNum === tableNum && a.seatNum === seatNum));
    setAssignments([...cleaned, {
      tableNum,
      seatNum,
      guestId: guest.id,
      guestName: guest.name,
    }]);
    setSelectedSeat(null);
    setDirty(true);
  }

  function removeSeat(tableNum: number, seatNum: number) {
    setAssignments(assignments.filter((a) => !(a.tableNum === tableNum && a.seatNum === seatNum)));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    // Build table assignments: each guest gets their table number
    const updates: { id: number; tableNumber: number | null }[] = [];

    // Clear all existing assignments
    for (const g of guests) {
      updates.push({ id: g.id, tableNumber: null });
    }

    // Set new assignments
    for (const a of assignments) {
      const existing = updates.find((u) => u.id === a.guestId);
      if (existing) {
        existing.tableNumber = a.tableNum;
      }
    }

    await onSave(updates);
    setDirty(false);
    setSaving(false);
  }

  const tableSize = 180;
  const seatSize = 48;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-[#FFFDF9] border border-gold-pale/40 p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint block mb-1">
            Number of tables
          </label>
          <input
            type="number"
            min="1"
            max="30"
            value={numTables}
            onChange={(e) => setNumTables(parseInt(e.target.value) || 1)}
            className="w-20 px-3 py-2 border border-gold-pale text-sm font-body text-ink focus:outline-none focus:border-gold"
          />
        </div>
        <div>
          <label className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint block mb-1">
            Seats per table
          </label>
          <input
            type="number"
            min="2"
            max="16"
            value={seatsPerTable}
            onChange={(e) => setSeatsPerTable(parseInt(e.target.value) || 8)}
            className="w-20 px-3 py-2 border border-gold-pale text-sm font-body text-ink focus:outline-none focus:border-gold"
          />
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <p className="font-body text-xs text-ink-faint">
            {assignments.length} of {guests.length} households seated
          </p>
          {dirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-gold text-white font-body text-[11px] tracking-[2px] uppercase hover:bg-gold-light transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Seating"}
            </button>
          )}
        </div>
      </div>

      {/* Unassigned guests */}
      {availableGuests.length > 0 && (
        <div className="bg-[#FFFDF9] border border-gold-pale/40 p-4">
          <p className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint mb-3">
            Unseated households ({availableGuests.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {availableGuests.map((g) => (
              <span
                key={g.id}
                className="px-3 py-1.5 bg-sand text-xs font-body text-ink-soft border border-gold-pale/40"
              >
                {g.name}
                {g.members?.length > 0 && (
                  <span className="text-ink-faint ml-1">({g.members.length})</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tables */}
      <div className="flex flex-wrap gap-8 justify-center">
        {Array.from({ length: numTables }, (_, tableIdx) => {
          const tableNum = tableIdx + 1;
          const tableAssignments = assignments.filter((a) => a.tableNum === tableNum);

          return (
            <div key={tableNum} className="relative" style={{ width: tableSize + seatSize + 20, height: tableSize + seatSize + 40 }}>
              {/* Table label */}
              <p className="text-center font-body text-[10px] tracking-[2px] uppercase text-ink-faint mb-1">
                Table {tableNum}
              </p>
              <p className="text-center font-body text-[9px] text-ink-faint mb-2">
                {tableAssignments.length}/{seatsPerTable}
              </p>

              <div className="relative" style={{ width: tableSize + seatSize + 20, height: tableSize + seatSize + 20 }}>
                {/* Table circle */}
                <div
                  className="absolute rounded-full bg-sand-dark border border-gold-pale/60"
                  style={{
                    width: tableSize,
                    height: tableSize,
                    left: (seatSize + 20) / 2,
                    top: (seatSize + 20) / 2,
                  }}
                />

                {/* Seats */}
                {Array.from({ length: seatsPerTable }, (_, seatIdx) => {
                  const angle = (seatIdx / seatsPerTable) * 2 * Math.PI - Math.PI / 2;
                  const radius = (tableSize + seatSize) / 2 + 2;
                  const centerX = (tableSize + seatSize + 20) / 2;
                  const centerY = (tableSize + seatSize + 20) / 2;
                  const x = centerX + Math.cos(angle) * radius - seatSize / 2;
                  const y = centerY + Math.sin(angle) * radius - seatSize / 2;

                  const assignment = getAssignment(tableNum, seatIdx);
                  const isSelected = selectedSeat?.table === tableNum && selectedSeat?.seat === seatIdx;

                  return (
                    <div
                      key={seatIdx}
                      className="absolute"
                      style={{ left: x, top: y, width: seatSize, height: seatSize }}
                    >
                      {assignment ? (
                        <button
                          onClick={() => removeSeat(tableNum, seatIdx)}
                          className="w-full h-full rounded-full bg-gold text-white flex items-center justify-center text-[8px] font-body leading-tight text-center p-1 hover:bg-gold-light transition-colors"
                          title={`${assignment.guestName} — click to remove`}
                        >
                          {assignment.guestName.split(/\s+/).slice(0, 2).join(" ")}
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedSeat(isSelected ? null : { table: tableNum, seat: seatIdx })}
                          className={`w-full h-full rounded-full border-2 border-dashed flex items-center justify-center text-[10px] transition-colors ${
                            isSelected
                              ? "border-gold bg-gold/10 text-gold"
                              : "border-gold-pale/50 text-ink-faint hover:border-gold hover:text-gold"
                          }`}
                        >
                          +
                        </button>
                      )}

                      {/* Guest picker dropdown */}
                      {isSelected && availableGuests.length > 0 && (
                        <div className="absolute z-50 top-full mt-1 left-1/2 -translate-x-1/2 bg-[#FFFDF9] border border-gold-pale shadow-lg max-h-48 overflow-y-auto w-48">
                          {availableGuests.map((g) => (
                            <button
                              key={g.id}
                              onClick={() => assignSeat(tableNum, seatIdx, g)}
                              className="w-full text-left px-3 py-2 text-xs font-body text-ink hover:bg-sand transition-colors border-b border-sand-dark last:border-0"
                            >
                              {g.name}
                              {g.members?.length > 0 && (
                                <span className="text-ink-faint ml-1">
                                  ({g.members.map((m) => m.firstName).join(", ")})
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
