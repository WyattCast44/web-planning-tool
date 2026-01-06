import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAppStore } from "../store";
import { useShallow } from "zustand/react/shallow";

// Tool definitions for navigation
const TOOLS = [
  { id: "sixpack", name: "Six Pack", selector: "#altKft", keywords: ["6pack", "flight", "inputs", "msl", "hdg"] },
  { id: "satcom", name: "Satcom Assessor", selector: "#acLatitude", keywords: ["satellite", "antenna", "pointing", "lat", "lon"] },
  { id: "winded", name: "Winded Turn Vector", selector: "#angleOfBank", keywords: ["turn", "wind", "vector", "bank", "aob"] },
  { id: "sensor", name: "EO/IR Footprint", selector: "#groundRange", keywords: ["camera", "footprint", "eo", "ir", "niirs", "sensor"] },
  { id: "decon", name: "Air Deconfliction", selector: "#ownDistanceInput", keywords: ["decon", "traffic", "eta", "separation", "cpa"] },
  { id: "range", name: "Range Conversion", selector: "#groundRangeInput", keywords: ["slant", "ground", "depression", "range"] },
  { id: "length", name: "Length Conversion", selector: "#ft", keywords: ["feet", "meter", "distance", "nm", "km"] },
  { id: "speed", name: "Speed Conversion", selector: "#mph", keywords: ["mph", "knots", "velocity", "fpm"] },
] as const;

// Six-pack value commands
const SIXPACK_COMMANDS = [
  { key: "msl", label: "MSL", stateKey: "altKft", unit: "kft", min: 0, max: 100 },
  { key: "hdg", label: "HDG", stateKey: "hdgDegCardinal", unit: "°", min: 1, max: 360 },
  { key: "keas", label: "KEAS", stateKey: "keas", unit: "kts", min: 0, max: 2000 },
  { key: "tgt", label: "TGT ELV", stateKey: "tgtElevKft", unit: "kft", min: 0, max: 100 },
  { key: "wdir", label: "W-DIR", stateKey: "windDegCardinal", unit: "°", min: 1, max: 360 },
  { key: "wspd", label: "W-SPD", stateKey: "windKts", unit: "kts", min: 0, max: 1000 },
] as const;

type SixPackKey = typeof SIXPACK_COMMANDS[number]["stateKey"];

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Get current six-pack values for display
  const sixPackState = useAppStore(
    useShallow((state) => ({
      altKft: state.altKft,
      hdgDegCardinal: state.hdgDegCardinal,
      keas: state.keas,
      tgtElevKft: state.tgtElevKft,
      windDegCardinal: state.windDegCardinal,
      windKts: state.windKts,
    }))
  );

  // Parse the query to detect six-pack commands
  const parsedCommand = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const parts = trimmed.split(/\s+/);
    
    if (parts.length >= 1) {
      const cmd = SIXPACK_COMMANDS.find(
        (c) => c.key === parts[0] || c.label.toLowerCase() === parts[0]
      );
      if (cmd) {
        const valueStr = parts[1];
        const value = valueStr ? parseFloat(valueStr) : null;
        return { command: cmd, value, isComplete: value !== null && !isNaN(value) };
      }
    }
    return null;
  }, [query]);

  // Filter tools based on query
  const filteredTools = useMemo(() => {
    if (parsedCommand) return []; // Don't show tools when entering a command
    
    const q = query.toLowerCase().trim();
    if (!q) return TOOLS;
    
    return TOOLS.filter((tool) => {
      const nameMatch = tool.name.toLowerCase().includes(q);
      const keywordMatch = tool.keywords.some((k) => k.includes(q));
      return nameMatch || keywordMatch;
    });
  }, [query, parsedCommand]);

  // Combined items for navigation
  const items = useMemo(() => {
    if (parsedCommand) {
      return [{ type: "command" as const, data: parsedCommand }];
    }
    return filteredTools.map((tool) => ({ type: "tool" as const, data: tool }));
  }, [parsedCommand, filteredTools]);

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [items.length]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && items.length > 0) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
      selectedEl?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, items.length]);

  // Execute the selected item
  const executeItem = useCallback((index: number) => {
    const item = items[index];
    if (!item) return;

    if (item.type === "command" && item.data.isComplete) {
      // Apply six-pack value
      const { command, value } = item.data;
      const clampedValue = Math.max(command.min, Math.min(command.max, value!));
      useAppStore.setState({ [command.stateKey]: clampedValue } as Pick<typeof sixPackState, SixPackKey>);
      onClose();
    } else if (item.type === "tool") {
      // Navigate to tool
      const el = document.querySelector(item.data.selector) as HTMLElement;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => el.focus(), 150);
      }
      onClose();
    }
  }, [items, onClose, sixPackState]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        executeItem(selectedIndex);
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  }, [items.length, selectedIndex, executeItem, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-lg mx-4 bg-bezel-gradient rounded-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bezel rounded-lg m-2">
          {/* Input */}
          <div className="flex items-center border-b border-gray-600 px-3 py-2 gap-2">
            <span className="text-emerald-400 text-sm font-mono">❯</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Jump to tool or set value (e.g. hdg 180)"
              className="flex-1 bg-transparent border-none text-emerald-100 placeholder-gray-500 text-sm font-mono focus:outline-none focus:shadow-none"
              autoComplete="off"
              spellCheck={false}
            />
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-gray-500 bg-gray-800 rounded border border-gray-700">
              ESC
            </kbd>
          </div>

          {/* Six-pack quick reference when no query */}
          {!query && (
            <div className="px-3 py-2 border-b border-gray-600/50 bg-gray-900/30">
              <div className="text-[10px] text-gray-500 font-display uppercase tracking-wider mb-1.5">
                Quick Set Values
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono">
                {SIXPACK_COMMANDS.map((cmd) => (
                  <span key={cmd.key} className="text-gray-400">
                    <span className="text-emerald-400">{cmd.key}</span>{" "}
                    <span className="text-gray-600">{sixPackState[cmd.stateKey as SixPackKey]}{cmd.unit}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Command preview */}
          {parsedCommand && (
            <div className="px-3 py-3 border-b border-gray-600/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-display text-sm uppercase">
                    {parsedCommand.command.label}
                  </span>
                  {parsedCommand.isComplete ? (
                    <span className="text-emerald-200 font-mono text-lg">
                      {parsedCommand.value}{parsedCommand.command.unit}
                    </span>
                  ) : (
                    <span className="text-gray-500 font-mono text-sm">
                      Enter value...
                    </span>
                  )}
                </div>
                <div className="text-gray-500 text-xs font-mono">
                  Current: {sixPackState[parsedCommand.command.stateKey as SixPackKey]}{parsedCommand.command.unit}
                </div>
              </div>
              {parsedCommand.isComplete && (
                <div className="mt-2 text-xs text-gray-500">
                  Press <kbd className="px-1 py-0.5 bg-gray-800 rounded border border-gray-700 text-gray-400">Enter</kbd> to apply
                </div>
              )}
            </div>
          )}

          {/* Tool list */}
          {!parsedCommand && items.length > 0 && (
            <div ref={listRef} className="max-h-64 overflow-y-auto py-1">
              {items.map((item, index) => {
                if (item.type !== "tool") return null;
                const tool = item.data;
                const isSelected = index === selectedIndex;
                
                return (
                  <button
                    key={tool.id}
                    className={`w-full px-3 py-2 flex items-center gap-3 text-left transition-colors ${
                      isSelected
                        ? "bg-emerald-500/20 text-emerald-200"
                        : "text-gray-300 hover:bg-gray-800/50"
                    }`}
                    onClick={() => executeItem(index)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-emerald-400" : "bg-gray-600"}`} />
                    <span className="font-display text-sm uppercase tracking-wide">
                      {tool.name}
                    </span>
                    <span className="ml-auto text-xs text-gray-500 font-mono">
                      {tool.keywords[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* No results */}
          {!parsedCommand && query && items.length === 0 && (
            <div className="px-3 py-6 text-center text-gray-500 text-sm">
              No tools found for "{query}"
            </div>
          )}

          {/* Hint footer */}
          <div className="px-3 py-2 border-t border-gray-600/50 bg-gray-900/20 flex items-center justify-between text-[10px] text-gray-500 font-mono">
            <div className="flex items-center gap-3">
              <span>
                <kbd className="px-1 py-0.5 bg-gray-800 rounded border border-gray-700">↑↓</kbd> navigate
              </span>
              <span>
                <kbd className="px-1 py-0.5 bg-gray-800 rounded border border-gray-700">↵</kbd> select
              </span>
            </div>
            <span className="text-gray-600">
              Ctrl+K to open
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}