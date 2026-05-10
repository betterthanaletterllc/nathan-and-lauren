"use client";

import { useState, useMemo } from "react";

interface MemberInfo {
  id: number;
  firstName: string;
  lastName: string;
  householdName: string;
  isChild: boolean;
  tableNumber: number | null;
  seatNumber: number | null;
}

interface Guest {
  id: number;
  name: string;
  members: {
    id: number;
    firstName: string;
    lastName: string;
    isChild: boolean;
    tableNumber?: number | null;
    seatNumber?: number | null;
    rsvpStatus?: string | null;
  }[];
}

interface SeatAssignment {
  tableNum: number;
  seatNum: number;
  memberId: number;
  name: string;
  householdName: string;
  isChild: boolean;
}

interface Props {
  guests: Guest[];
  onSave: (assignments: SeatAssignment[]) => void;
}

export default function SeatingChart({ guests, onSave }: Props) {
  const [numTables, setNumTables] = useState(5);
  const [seatsPerTable, setSeatsPerTable] = useState(8);
  const [selectedSeat, setSelectedSeat] = useState<{ table: number; seat: number } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  // Flatten all members from all households
  const allMembers: MemberInfo[] = useMemo(() => {
    const members: MemberInfo[] = [];
    for (const g of guests) {
      for (const m of (g.members || [])) {
        // Only include confirmed guests (coming or no RSVP yet)
        if (m.rsvpStatus === "not_coming") continue;
        members.push({
          id: m.id!,
          firstName: m.firstName,
          lastName: m.lastName,
          householdName: g.name,
          isChild: m.isChild,
          tableNumber: m.tableNumber ?? null,
          seatNumber: m.seatNumber ?? null,
        });
      }
    }
    return members;
  }, [guests]);

  const [assignments, setAssignments] = useState<SeatAssignment[]>(() => {
    return allMembers
      .filter((m) => m.tableNumber)
      .map((m) => ({
        tableNum: m.tableNumber!,
        seatNum: m.seatNumber ?? 0,
        memberId: m.id,
        name: `${m.firstName} ${m.lastName}`.trim(),
        householdName: m.householdName,
        isChild: m.isChild,
      }));
  });

  const assignedIds = useMemo(() => new Set(assignments.map((a) => a.memberId)), [assignments]);

  const unseated = useMemo(() => {
    return allMembers.filter((m) => !assignedIds.has(m.id));
  }, [allMembers, assignedIds]);

  const filteredUnseated = useMemo(() => {
    if (!searchFilter) return unseated;
    const q = searchFilter.toLowerCase();
    return unseated.filter(
      (m) =>
        m.firstName.toLowerCase().includes(q) ||
        m.lastName.toLowerCase().includes(q) ||
        m.householdName.toLowerCase().includes(q)
    );
  }, [unseated, searchFilter]);

  function getAssignment(tableNum: number, seatNum: number) {
    return assignments.find((a) => a.tableNum === tableNum && a.seatNum === seatNum);
  }

  function assignSeat(tableNum: number, seatNum: number, member: MemberInfo) {
    const filtered = assignments.filter((a) => a.memberId !== member.id);
    const cleaned = filtered.filter((a) => !(a.tableNum === tableNum && a.seatNum === seatNum));
    setAssignments([
      ...cleaned,
      {
        tableNum,
        seatNum,
        memberId: member.id,
        name: `${member.firstName} ${member.lastName}`.trim(),
        householdName: member.householdName,
        isChild: member.isChild,
      },
    ]);
    setSelectedSeat(null);
    setDirty(true);
  }

  function removeSeat(tableNum: number, seatNum: number) {
    setAssignments(assignments.filter((a) => !(a.tableNum === tableNum && a.seatNum === seatNum)));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    await onSave(assignments);
    setDirty(false);
    setSaving(false);
  }

  // Group unseated by household for display
  const unseatedByHousehold = useMemo(() => {
    const groups: Record<string, MemberInfo[]> = {};
    for (const m of unseated) {
      if (!groups[m.householdName]) groups[m.householdName] = [];
      groups[m.householdName].push(m);
    }
    return Object.entries(groups);
  }, [unseated]);

  const tableSize = 160;
  const seatSize = 52;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-[#FFFDF9] border border-gold-pale/40 p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint block mb-1">Tables</label>
          <input type="number" min="1" max="30" value={numTables} onChange={(e) => setNumTables(parseInt(e.target.value) || 1)} className="w-20 px-3 py-2 border border-gold-pale text-sm font-body text-ink focus:outline-none focus:border-gold" />
        </div>
        <div>
          <label className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint block mb-1">Seats/table</label>
          <input type="number" min="2" max="16" value={seatsPerTable} onChange={(e) => setSeatsPerTable(parseInt(e.target.value) || 8)} className="w-20 px-3 py-2 border border-gold-pale text-sm font-body text-ink focus:outline-none focus:border-gold" />
        </div>
        <div className="flex-1" />
        <p className="font-body text-xs text-ink-faint">
          {assignments.length} of {allMembers.length} people seated
        </p>
        {dirty && (
          <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-gold text-white font-body text-[11px] tracking-[2px] uppercase hover:bg-gold-light transition-colors disabled:opacity-50">
            {saving ? "Saving..." : "Save Seating"}
          </button>
        )}
      </div>

      {/* Unseated people */}
      {unseated.length > 0 && (
        <div className="bg-[#FFFDF9] border border-gold-pale/40 p-4">
          <p className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint mb-3">
            Unseated ({unseated.length})
          </p>
          <div className="space-y-2">
            {unseatedByHousehold.map(([household, members]) => (
              <div key={household} className="flex flex-wrap items-center gap-2">
                <span className="font-body text-xs text-ink-soft min-w-[120px]">{household}:</span>
                {members.map((m) => (
                  <span key={m.id} className={`px-2.5 py-1 text-[11px] font-body border border-gold-pale/40 ${m.isChild ? "bg-blue-50 text-blue-700" : "bg-sand text-ink-soft"}`}>
                    {m.firstName} {m.lastName}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tables */}
      <div className="flex flex-wrap gap-10 justify-center py-4">
        {Array.from({ length: numTables }, (_, tableIdx) => {
          const tableNum = tableIdx + 1;
          const tableAssignments = assignments.filter((a) => a.tableNum === tableNum);

          return (
            <div key={tableNum} className="relative" style={{ width: tableSize + seatSize + 24, height: tableSize + seatSize + 48 }}>
              <p className="text-center font-display text-sm text-ink mb-0.5">Table {tableNum}</p>
              <p className="text-center font-body text-[9px] text-ink-faint mb-2">{tableAssignments.length}/{seatsPerTable}</p>

              <div className="relative" style={{ width: tableSize + seatSize + 24, height: tableSize + seatSize + 24 }}>
                {/* Table */}
                <div className="absolute rounded-full bg-sand-dark border border-gold-pale/60" style={{
                  width: tableSize, height: tableSize,
                  left: (seatSize + 24) / 2, top: (seatSize + 24) / 2,
                }} />

                {/* Seats */}
                {Array.from({ length: seatsPerTable }, (_, seatIdx) => {
                  const angle = (seatIdx / seatsPerTable) * 2 * Math.PI - Math.PI / 2;
                  const radius = (tableSize + seatSize) / 2 + 4;
                  const cx = (tableSize + seatSize + 24) / 2;
                  const cy = (tableSize + seatSize + 24) / 2;
                  const x = cx + Math.cos(angle) * radius - seatSize / 2;
                  const y = cy + Math.sin(angle) * radius - seatSize / 2;
                  const assignment = getAssignment(tableNum, seatIdx);
                  const isSelected = selectedSeat?.table === tableNum && selectedSeat?.seat === seatIdx;

                  return (
                    <div key={seatIdx} className="absolute" style={{ left: x, top: y, width: seatSize, height: seatSize }}>
                      {assignment ? (
                        <button
                          onClick={() => removeSeat(tableNum, seatIdx)}
                          className={`w-full h-full rounded-full flex items-center justify-center text-[7px] font-body leading-tight text-center p-0.5 transition-colors ${
                            assignment.isChild ? "bg-blue-400 text-white hover:bg-blue-500" : "bg-gold text-white hover:bg-gold-light"
                          }`}
                          title={`${assignment.name} (${assignment.householdName}) — click to remove`}
                        >
                          <span className="truncate block w-full px-0.5">
                            {assignment.name.length > 12 ? assignment.name.split(" ")[0] : assignment.name}
                          </span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedSeat(isSelected ? null : { table: tableNum, seat: seatIdx })}
                          className={`w-full h-full rounded-full border-2 border-dashed flex items-center justify-center text-sm transition-colors ${
                            isSelected ? "border-gold bg-gold/10 text-gold" : "border-gold-pale/50 text-ink-faint hover:border-gold hover:text-gold"
                          }`}
                        >
                          +
                        </button>
                      )}

                      {/* Picker */}
                      {isSelected && unseated.length > 0 && (
                        <div className="absolute z-50 top-full mt-1 left-1/2 -translate-x-1/2 bg-[#FFFDF9] border border-gold-pale shadow-lg w-56" style={{ maxHeight: 240, overflowY: "auto" }}>
                          <div className="sticky top-0 bg-[#FFFDF9] p-2 border-b border-sand-dark">
                            <input
                              type="text"
                              value={searchFilter}
                              onChange={(e) => setSearchFilter(e.target.value)}
                              placeholder="Search..."
                              autoFocus
                              className="w-full px-2 py-1.5 border border-gold-pale text-xs font-body text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold"
                            />
                          </div>
                          {filteredUnseated.map((m) => (
                            <button
                              key={m.id}
                              onClick={() => { assignSeat(tableNum, seatIdx, m); setSearchFilter(""); }}
                              className="w-full text-left px-3 py-2 text-xs font-body text-ink hover:bg-sand transition-colors border-b border-sand-dark last:border-0"
                            >
                              <span className="font-medium">{m.firstName} {m.lastName}</span>
                              <span className="text-ink-faint ml-1.5">{m.householdName}</span>
                              {m.isChild && <span className="text-blue-500 ml-1">(child)</span>}
                            </button>
                          ))}
                          {filteredUnseated.length === 0 && (
                            <p className="px-3 py-2 text-xs text-ink-faint">No matches</p>
                          )}
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
