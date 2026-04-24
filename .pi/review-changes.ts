import type { ExtensionAPI, Theme } from "@mariozechner/pi-coding-agent";
import { matchesKey, truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

/**
 * review-changes.ts
 *
 * Intercepts write and edit tool calls, shows an overlay preview, and asks for confirmation.
 * Options:
 *   ✅ Bestätigen      – Änderung wird ausgeführt
 *   ❌ Ablehnen        – Änderung wird blockiert, Grund wird an Agenten zurückgegeben
 *   ✏️ Eigene Antwort  – Freitext-Eingabe, die als Block-Reason an den Agenten zurückgeht
 */

type EditReplacement = {
  oldText: string;
  newText: string;
};

type ReviewChoice = "confirm" | "reject" | "custom" | "cancel";

type ReviewAction = {
  label: string;
  value: Exclude<ReviewChoice, "cancel">;
};

const CONFIRM = "✅ Bestätigen";
const REJECT = "❌ Ablehnen";
const CUSTOM_REPLY = "✏️ Eigene Antwort eingeben";

const REVIEW_ACTIONS: ReviewAction[] = [
  { label: CONFIRM, value: "confirm" },
  { label: REJECT, value: "reject" },
  { label: CUSTOM_REPLY, value: "custom" },
];

const MAX_WRITE_PREVIEW_LINES = 10;
const MAX_EDIT_PREVIEW_LINES = 4;
const MAX_EDIT_BLOCKS = 2;

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    const { toolName, input } = event;

    // Nur write und edit abfangen
    if (toolName !== "write" && toolName !== "edit") return;

    // In nicht-interaktiven Modi keine Dialoge erzwingen
    if (!ctx.hasUI) return;

    const filePath = readPath(input);
    const previewText =
      toolName === "write"
        ? buildWritePreview(readWriteContent(input))
        : buildEditPreview(readEditReplacements(input));

    const choice = await showReviewOverlay(ctx, {
      toolName,
      filePath,
      previewText,
    });

    if (choice === "confirm") {
      return;
    }

    if (choice === "reject") {
      return {
        block: true,
        reason:
          "Vom Nutzer abgelehnt. Bitte keine weiteren Änderungen an dieser Stelle vornehmen, außer der Nutzer gibt explizit eine neue Anweisung.",
      };
    }

    if (choice === "custom") {
      const userInput = await ctx.ui.editor(
        "Deine Antwort an den Agenten:",
        `Bezüglich der Änderung an ${filePath}:\n`,
      );

      if (userInput === undefined || userInput === null) {
        return {
          block: true,
          reason: "Nutzer hat die Rückmeldung abgebrochen. Änderung nicht anwenden.",
        };
      }

      if (userInput.trim() === "") {
        return {
          block: true,
          reason: "Nutzer hat keine Antwort eingegeben. Änderung abgebrochen.",
        };
      }

      // Änderung blockieren und Nutzer-Text direkt als Reason zurückgeben.
      // sendUserMessage wäre hier unpraktisch, da wir uns mitten in tool_call befinden.
      return {
        block: true,
        reason: userInput.trim(),
      };
    }

    // Escape / Abbruch => sicherheitshalber blockieren
    return {
      block: true,
      reason: "Änderung wurde nicht bestätigt. Bitte warte auf eine explizite Nutzeranweisung.",
    };
  });
}

async function showReviewOverlay(
  ctx: any,
  options: { toolName: "write" | "edit"; filePath: string; previewText: string },
): Promise<ReviewChoice> {
  try {
    const result = await ctx.ui.custom<ReviewChoice | undefined>(
      (_tui: any, theme: Theme, _keybindings: any, done: (value: ReviewChoice) => void) =>
        new ReviewOverlay(theme, options.toolName, options.filePath, options.previewText, done),
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
    );

    return result ?? "cancel";
  } catch {
    // Fallback auf einfache Auswahl, falls Overlay nicht verfügbar ist.
    ctx.ui.notify(options.previewText, "info");

    const fallbackChoice = await ctx.ui.select("Änderung anwenden?", [
      CONFIRM,
      REJECT,
      CUSTOM_REPLY,
    ]);

    if (fallbackChoice === CONFIRM) return "confirm";
    if (fallbackChoice === REJECT) return "reject";
    if (fallbackChoice === CUSTOM_REPLY) return "custom";
    return "cancel";
  }
}

class ReviewOverlay {
  private selectedIndex = 0;
  private readonly previewLines: string[];

  constructor(
    private readonly theme: Theme,
    private readonly toolName: "write" | "edit",
    private readonly filePath: string,
    previewText: string,
    private readonly done: (value: ReviewChoice) => void,
  ) {
    this.previewLines = previewText.split("\n");
  }

  handleInput(data: string): void {
    if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c")) {
      this.done("cancel");
      return;
    }

    if (matchesKey(data, "up") || matchesKey(data, "shift+tab")) {
      this.selectedIndex =
        (this.selectedIndex - 1 + REVIEW_ACTIONS.length) % REVIEW_ACTIONS.length;
      return;
    }

    if (matchesKey(data, "down") || matchesKey(data, "tab")) {
      this.selectedIndex = (this.selectedIndex + 1) % REVIEW_ACTIONS.length;
      return;
    }

    if (matchesKey(data, "return") || matchesKey(data, "enter")) {
      this.done(REVIEW_ACTIONS[this.selectedIndex]!.value);
    }
  }

  render(width: number): string[] {
    const th = this.theme;
    const innerW = Math.max(1, width - 2);
    const lines: string[] = [
      ` ${th.fg("dim", "Datei:")} ${th.fg("accent", truncatePath(this.filePath, 120))}`,
      ` ${th.fg("dim", "Tool:")} ${th.fg("toolTitle", th.bold(this.toolName))}`,
      ` ${th.fg("dim", "Vorschau:")}`,
      ...this.previewLines.map((line) => ` ${this.stylePreviewLine(line)}`),
      ` ${th.fg("dim", "Aktion:")}`,
      ...REVIEW_ACTIONS.map((action, index) =>
        this.renderActionLine(action, index === this.selectedIndex, innerW),
      ),
      ` ${th.fg("dim", "↑↓/Tab wählen • Enter bestätigen • Esc abbrechen")}`,
    ];

    return this.box(lines, width, `Änderung prüfen · ${this.toolName.toUpperCase()}`);
  }

  invalidate(): void {}

  private box(lines: string[], width: number, title?: string): string[] {
    const th = this.theme;
    const innerW = Math.max(1, width - 2);
    const result: string[] = [];

    const titleStr = title ? truncateToWidth(` ${title} `, innerW) : "";
    const titleW = visibleWidth(titleStr);
    const left = "─".repeat(Math.floor((innerW - titleW) / 2));
    const right = "─".repeat(Math.max(0, innerW - titleW - left.length));

    result.push(
      th.fg("border", `╭${left}`) +
        th.fg("accent", titleStr) +
        th.fg("border", `${right}╮`),
    );

    for (const line of lines) {
      result.push(
        th.fg("border", "│") +
          this.padStyled(line, innerW) +
          th.fg("border", "│"),
      );
    }

    result.push(th.fg("border", `╰${"─".repeat(innerW)}╯`));
    return result;
  }

  private renderActionLine(
    action: ReviewAction,
    selected: boolean,
    innerWidth: number,
  ): string {
    const label = ` ${selected ? "▶" : " "} ${action.label}`;

    if (!selected) {
      return this.theme.fg("text", label);
    }

    return this.theme.bg(
      "selectedBg",
      this.padStyled(this.theme.fg("accent", label), innerWidth),
    );
  }

  private stylePreviewLine(line: string): string {
    if (line === "+" || line.startsWith("+ ")) {
      return this.theme.fg("toolDiffAdded", line);
    }

    if (line === "-" || line.startsWith("- ")) {
      return this.theme.fg("toolDiffRemoved", line);
    }

    if (line.startsWith("Entfernt:")) {
      return this.theme.fg("toolDiffRemoved", line);
    }

    if (line.startsWith("Hinzugefügt:")) {
      return this.theme.fg("toolDiffAdded", line);
    }

    if (line.startsWith("── Block")) {
      return this.theme.fg("accent", line);
    }

    if (line.startsWith("…") || line.startsWith("  …") || line.startsWith("(")) {
      return this.theme.fg("dim", line);
    }

    return this.theme.fg("text", line);
  }

  private padStyled(text: string, width: number): string {
    const truncated = truncateToWidth(text, width, "...", true);
    return truncated + " ".repeat(Math.max(0, width - visibleWidth(truncated)));
  }
}

function readPath(input: unknown): string {
  const value = (input as any)?.path;
  return typeof value === "string" && value.trim() !== ""
    ? value
    : "(unbekannter Pfad)";
}

function readWriteContent(input: unknown): string {
  const value = (input as any)?.content;
  return typeof value === "string" ? value : "";
}

function readEditReplacements(input: unknown): EditReplacement[] {
  const replacements: EditReplacement[] = [];
  const rawInput = (input ?? {}) as any;

  const pushReplacement = (oldText: string, newText: string) => {
    const exists = replacements.some(
      (replacement) =>
        replacement.oldText === oldText && replacement.newText === newText,
    );

    if (!exists) {
      replacements.push({ oldText, newText });
    }
  };

  let rawEdits = rawInput.edits;
  if (typeof rawEdits === "string") {
    try {
      rawEdits = JSON.parse(rawEdits);
    } catch {
      rawEdits = undefined;
    }
  }

  if (Array.isArray(rawEdits)) {
    for (const edit of rawEdits) {
      if (
        edit &&
        typeof edit.oldText === "string" &&
        typeof edit.newText === "string"
      ) {
        pushReplacement(edit.oldText, edit.newText);
      }
    }
  }

  if (
    typeof rawInput.oldText === "string" &&
    typeof rawInput.newText === "string"
  ) {
    pushReplacement(rawInput.oldText, rawInput.newText);
  }

  // Legacy/Custom-Fallback
  if (
    typeof rawInput.old_str === "string" &&
    typeof rawInput.new_str === "string"
  ) {
    pushReplacement(rawInput.old_str, rawInput.new_str);
  }

  return replacements;
}

function buildWritePreview(content: string): string {
  return formatChunk(content, "+ ", MAX_WRITE_PREVIEW_LINES);
}

function buildEditPreview(replacements: EditReplacement[]): string {
  const parts: string[] = [];

  if (replacements.length === 0) {
    parts.push("(keine gültigen Edit-Blöcke erkannt)");
    return parts.join("\n");
  }

  const visibleReplacements = replacements.slice(0, MAX_EDIT_BLOCKS);

  visibleReplacements.forEach((replacement, index) => {
    if (replacements.length > 1) {
      parts.push(`── Block ${index + 1}/${replacements.length} ──`);
    }

    parts.push("Entfernt:");
    parts.push(formatChunk(replacement.oldText, "- ", MAX_EDIT_PREVIEW_LINES));
    parts.push("Hinzugefügt:");
    parts.push(formatChunk(replacement.newText, "+ ", MAX_EDIT_PREVIEW_LINES));
  });

  if (replacements.length > visibleReplacements.length) {
    parts.push(`… ${replacements.length - visibleReplacements.length} weitere Edit-Blöcke`);
  }

  return parts.join("\n");
}

function formatChunk(text: string, prefix: string, maxLines: number): string {
  const lines = text.split("\n");
  const visibleLines = lines.slice(0, maxLines).map((line) => `${prefix}${line}`);

  if (visibleLines.length === 0) {
    visibleLines.push(prefix.trimEnd());
  }

  if (lines.length > maxLines) {
    visibleLines.push(`  … (${lines.length - maxLines} weitere Zeilen)`);
  }

  return visibleLines.join("\n");
}

function truncatePath(path: string, maxLen: number): string {
  if (path.length <= maxLen) return path;
  return "…" + path.slice(-(maxLen - 1));
}
