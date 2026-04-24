import type { ExtensionAPI, Theme } from "@mariozechner/pi-coding-agent";
import { matchesKey, truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

/**
 * file-browser.ts
 *
 * Ctrl+\  – Overlay togglen (Datei-Browser)
 * Im Overlay:
 *   ↑ / ↓ / Tab   – Navigation
 *   Enter         – Datei im eingebauten Editor öffnen
 *   Escape        – Overlay schließen
 */

interface FileEntry {
  label: string;
  fullPath: string;
  section: "turn" | "git";
}

const MAX_VISIBLE_SECTION_ITEMS = 8;

class FileBrowserOverlay {
  private selectedIndex = 0;

  constructor(
    private readonly theme: Theme,
    private readonly entries: FileEntry[],
    private readonly onSelect: (entry: FileEntry) => void,
    private readonly onClose: () => void,
  ) {}

  handleInput(data: string): void {
    if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c")) {
      this.onClose();
      return;
    }

    if (this.entries.length === 0) {
      return;
    }

    if (matchesKey(data, "up") || matchesKey(data, "shift+tab")) {
      this.selectedIndex =
        (this.selectedIndex - 1 + this.entries.length) % this.entries.length;
      return;
    }

    if (matchesKey(data, "down") || matchesKey(data, "tab")) {
      this.selectedIndex = (this.selectedIndex + 1) % this.entries.length;
      return;
    }

    if (matchesKey(data, "return") || matchesKey(data, "enter")) {
      this.onSelect(this.entries[this.selectedIndex]!);
    }
  }

  render(width: number): string[] {
    const th = this.theme;
    const innerW = Math.max(1, width - 2);
    const turnEntries = this.entries.filter((entry) => entry.section === "turn");
    const gitEntries = this.entries.filter((entry) => entry.section === "git");
    const selectedEntry = this.entries[this.selectedIndex];

    const lines: string[] = [
      ` ${th.fg("dim", "Turn:")} ${th.fg("accent", String(turnEntries.length))} ${th.fg("dim", "· Git:")} ${th.fg("accent", String(gitEntries.length))}`,
      "",
      ...this.renderSection("Dieser Turn", turnEntries, selectedEntry, innerW),
      "",
      ...this.renderSection("Git Diff", gitEntries, selectedEntry, innerW),
      "",
      selectedEntry
        ? ` ${th.fg("dim", "Auswahl:")} ${th.fg("accent", truncatePath(selectedEntry.label, 140))}`
        : ` ${th.fg("dim", "Keine geänderten Dateien verfügbar.")}`,
      ` ${th.fg("dim", "↑↓/Tab wählen • Enter öffnen • Esc schließen")}`,
    ];

    return this.box(lines, width, "Datei-Browser");
  }

  invalidate(): void {}

  private renderSection(
    title: string,
    entries: FileEntry[],
    selectedEntry: FileEntry | undefined,
    innerWidth: number,
  ): string[] {
    const th = this.theme;
    const lines: string[] = [` ${th.fg("accent", title)}`];

    if (entries.length === 0) {
      lines.push(` ${th.fg("dim", "(keine Einträge)")}`);
      return lines;
    }

    const { visibleEntries, hiddenBefore, hiddenAfter } = this.sliceSectionEntries(
      entries,
      selectedEntry,
    );

    if (hiddenBefore > 0) {
      lines.push(` ${th.fg("dim", `… ${hiddenBefore} weitere`)}`);
    }

    for (const entry of visibleEntries) {
      lines.push(this.renderEntryLine(entry, entry === selectedEntry, innerWidth));
    }

    if (hiddenAfter > 0) {
      lines.push(` ${th.fg("dim", `… ${hiddenAfter} weitere`)}`);
    }

    return lines;
  }

  private sliceSectionEntries(
    entries: FileEntry[],
    selectedEntry: FileEntry | undefined,
  ): {
    visibleEntries: FileEntry[];
    hiddenBefore: number;
    hiddenAfter: number;
  } {
    if (entries.length <= MAX_VISIBLE_SECTION_ITEMS) {
      return {
        visibleEntries: entries,
        hiddenBefore: 0,
        hiddenAfter: 0,
      };
    }

    const selectedLocalIndex =
      selectedEntry && entries.includes(selectedEntry)
        ? entries.indexOf(selectedEntry)
        : 0;

    const start = Math.max(
      0,
      Math.min(
        selectedLocalIndex - Math.floor(MAX_VISIBLE_SECTION_ITEMS / 2),
        entries.length - MAX_VISIBLE_SECTION_ITEMS,
      ),
    );
    const end = start + MAX_VISIBLE_SECTION_ITEMS;

    return {
      visibleEntries: entries.slice(start, end),
      hiddenBefore: start,
      hiddenAfter: Math.max(0, entries.length - end),
    };
  }

  private renderEntryLine(
    entry: FileEntry,
    selected: boolean,
    innerWidth: number,
  ): string {
    const th = this.theme;
    const prefix = selected ? th.fg("accent", "▶") : th.fg("dim", "•");
    const icon =
      entry.section === "turn"
        ? th.fg("success", "●")
        : th.fg("muted", "○");
    const labelColor = entry.section === "turn" ? "accent" : "text";
    const content = ` ${prefix} ${icon} ${th.fg(labelColor, truncatePath(entry.label, 160))}`;

    if (!selected) {
      return content;
    }

    return th.bg("selectedBg", this.padStyled(content, innerWidth));
  }

  private box(lines: string[], width: number, title?: string): string[] {
    return renderBorderBox(this.theme, width, lines, title);
  }

  private padStyled(text: string, width = 0): string {
    return padStyledLine(text, width);
  }
}

function renderBorderBox(
  theme: Theme,
  width: number,
  lines: string[],
  title?: string,
): string[] {
  const innerW = Math.max(1, width - 2);
  const result: string[] = [];

  const titleStr = title ? truncateToWidth(` ${title} `, innerW) : "";
  const titleW = visibleWidth(titleStr);
  const left = "─".repeat(Math.floor((innerW - titleW) / 2));
  const right = "─".repeat(Math.max(0, innerW - titleW - left.length));

  result.push(
    theme.fg("border", `╭${left}`) +
      theme.fg("accent", titleStr) +
      theme.fg("border", `${right}╮`),
  );

  for (const line of lines) {
    result.push(
      theme.fg("border", "│") +
        padStyledLine(line, innerW) +
        theme.fg("border", "│"),
    );
  }

  result.push(theme.fg("border", `╰${"─".repeat(innerW)}╯`));
  return result;
}

function padStyledLine(text: string, width = 0): string {
  const paddedWidth = Math.max(1, width);
  const truncated = truncateToWidth(text, paddedWidth, "...", true);
  return truncated + " ".repeat(Math.max(0, paddedWidth - visibleWidth(truncated)));
}

export default function (pi: ExtensionAPI) {
  const turnChangedFiles = new Set<string>();
  let overlayVisible = false;
  let overlayDoneCallback: (() => void) | null = null;
  let currentCtx: any = null;

  pi.on("tool_call", async (event, ctx) => {
    const { toolName, input } = event;

    if (toolName !== "write" && toolName !== "edit") return;

    const filePath = (input as any).path;
    if (typeof filePath !== "string" || filePath.trim() === "") return;

    turnChangedFiles.add(normalizeToAbsolutePath(ctx.cwd ?? process.cwd(), filePath));
    currentCtx = ctx;
    updateWidget(ctx);
  });

  pi.on("agent_end", async (_event, ctx) => {
    currentCtx = ctx;
    updateWidget(ctx);
  });

  pi.on("session_start", async (_event, ctx) => {
    currentCtx = ctx;
    updateWidget(ctx);
  });

  pi.on("before_agent_start", async () => {
    turnChangedFiles.clear();
    updateWidget(currentCtx);
  });

  pi.registerShortcut("ctrl+\\", {
    description: "Datei-Browser öffnen/schließen",
    handler: async (ctx) => {
      currentCtx = ctx;

      if (overlayVisible) {
        closeOverlay();
        return;
      }

      openOverlay(ctx);
    },
  });

  function getGitChangedFiles(cwd: string): string[] {
    try {
      const output = execSync("git diff --name-only", {
        cwd,
        encoding: "utf-8",
        timeout: 3000,
      }).trim();

      if (!output) return [];
      return output.split("\n").filter(Boolean);
    } catch {
      return [];
    }
  }

  function buildEntries(cwd: string): FileEntry[] {
    const turnEntries = [...turnChangedFiles]
      .sort((a, b) => a.localeCompare(b))
      .map((fullPath) => ({
        label: toDisplayPath(cwd, fullPath),
        fullPath,
        section: "turn" as const,
      }));

    const turnPaths = new Set(turnEntries.map((entry) => entry.fullPath));

    const gitEntries = getGitChangedFiles(cwd)
      .map((relativePath) => normalizeToAbsolutePath(cwd, relativePath))
      .filter((fullPath) => !turnPaths.has(fullPath))
      .sort((a, b) => a.localeCompare(b))
      .map((fullPath) => ({
        label: toDisplayPath(cwd, fullPath),
        fullPath,
        section: "git" as const,
      }));

    return [...turnEntries, ...gitEntries];
  }

  function updateWidget(ctx: any) {
    if (!ctx?.ui) return;

    try {
      const cwd = ctx.cwd ?? process.cwd();
      const gitFiles = getGitChangedFiles(cwd);
      const turnCount = turnChangedFiles.size;
      const gitCount = gitFiles.length;

      ctx.ui.setWidget("file-browser", (_tui: any, theme: Theme) => ({
        render: (width: number) => {
          const widgetLines = [
            ` ${theme.fg("success", "●")} ${theme.fg("dim", "Turn")} ${theme.fg(turnCount > 0 ? "accent" : "muted", String(turnCount))} ${theme.fg("dim", "·")} ${theme.fg("muted", "○")} ${theme.fg("dim", "Git")} ${theme.fg(gitCount > 0 ? "accent" : "muted", String(gitCount))}`,
            ` ${theme.fg("dim", "Ctrl+\\ öffnet den Datei-Browser")}`,
          ];

          return renderBorderBox(theme, width, widgetLines, "Datei-Browser");
        },
        invalidate: () => {},
      }));
    } catch {
      // Widget-Fehler ignorieren
    }
  }

  function openOverlay(ctx: any) {
    if (!ctx?.ui) return;

    overlayVisible = true;
    const cwd = ctx.cwd ?? process.cwd();
    const entries = buildEntries(cwd);

    ctx.ui
      .custom<void>(
        (_tui: any, theme: Theme, _keybindings: any, done: () => void) => {
          overlayDoneCallback = () => done();

          return new FileBrowserOverlay(
            theme,
            entries,
            (entry) => {
              closeOverlay();
              void openFileEditor(ctx, entry.fullPath);
            },
            () => closeOverlay(),
          );
        },
        {
          overlay: true,
          overlayOptions: {
            anchor: "center",
            width: "75%",
            minWidth: 60,
            maxHeight: "90%",
            margin: 1,
          },
        },
      )
      .finally(() => {
        overlayVisible = false;
        overlayDoneCallback = null;
      });
  }

  function closeOverlay() {
    if (overlayDoneCallback) {
      overlayDoneCallback();
      overlayDoneCallback = null;
    }
    overlayVisible = false;
  }

  async function openFileEditor(ctx: any, filePath: string) {
    let content = "";

    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch {
      ctx.ui.notify(`Datei nicht lesbar: ${filePath}`, "error");
      return;
    }

    const edited = await ctx.ui.editor(`${path.basename(filePath)} bearbeiten:`, content);

    if (edited === undefined || edited === null) {
      ctx.ui.notify("Bearbeiten abgebrochen.", "info");
      return;
    }

    if (edited === content) {
      ctx.ui.notify("Keine Änderungen.", "info");
      return;
    }

    try {
      fs.writeFileSync(filePath, edited, "utf-8");
      turnChangedFiles.add(normalizeToAbsolutePath(ctx.cwd ?? process.cwd(), filePath));
      updateWidget(ctx);
      ctx.ui.notify(`✅ Gespeichert: ${path.basename(filePath)}`, "info");

      const message = `Ich habe die Datei "${filePath}" manuell bearbeitet und gespeichert.`;
      if (ctx.isIdle()) {
        pi.sendUserMessage(message);
      } else {
        pi.sendUserMessage(message, { deliverAs: "followUp" });
      }
    } catch (err: any) {
      ctx.ui.notify(`❌ Fehler beim Speichern: ${err.message}`, "error");
    }
  }
}

function normalizeToAbsolutePath(cwd: string, filePath: string): string {
  return path.normalize(path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath));
}

function toDisplayPath(cwd: string, fullPath: string): string {
  const normalizedCwd = path.normalize(cwd);
  const normalizedPath = path.normalize(fullPath);

  const relativePath = path.relative(normalizedCwd, normalizedPath);
  if (relativePath && !relativePath.startsWith("..") && !path.isAbsolute(relativePath)) {
    return relativePath;
  }

  return normalizedPath;
}

function truncatePath(filePath: string, maxLen: number): string {
  if (filePath.length <= maxLen) return filePath;
  return "…" + filePath.slice(-(maxLen - 1));
}
