"use client";

import { useState } from "react";
import { Check, ChevronRight, Languages, Loader2, Sparkles } from "lucide-react";
import { upscaleStatus } from "@/lib/upscale";
import type {
  PlayerSettings,
  SubtitleStyle,
  SubtitleTrack,
  UpscaleMode,
} from "./types";
import SubtitleLine from "./SubtitleLine";
import styles from "./player.module.css";

const SAMPLE_PRIMARY = "This is how the primary subtitle track looks.";
const SAMPLE_SECONDARY = "Kore ga nibanme no jimaku desu.";
const PREVIEW_BASIS = 760; // px — keeps preview sizes close to a real screen

type Pane = "root" | "subs" | "primaryStyle" | "secondaryStyle" | "quality" | "speed" | "upscale";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const UPSCALES: { mode: UpscaleMode; label: string }[] = [
  { mode: "off", label: "Off" },
  { mode: "sharp", label: "Sharpen" },
  { mode: "ai-2x", label: "AI ×2" },
  { mode: "ai-4k", label: "AI 4K" },
];

export default function SettingsMenu({
  tracks,
  settings,
  onUpdate,
  onUpdatePrimaryStyle,
  onUpdateSecondaryStyle,
  onReset,
  qualities,
  canTranslate = false,
  translatingLang = null,
  onRequestLanguage,
}: {
  tracks: SubtitleTrack[];
  settings: PlayerSettings;
  onUpdate: (patch: Partial<PlayerSettings>) => void;
  onUpdatePrimaryStyle: (patch: Partial<SubtitleStyle>) => void;
  onUpdateSecondaryStyle: (patch: Partial<SubtitleStyle>) => void;
  onReset: () => void;
  qualities: string[];
  /** Whether on-demand LLM translation is available for this source. */
  canTranslate?: boolean;
  /** Language currently being translated (shows a spinner), or null. */
  translatingLang?: string | null;
  onRequestLanguage?: (lang: string) => void;
}) {
  const [pane, setPane] = useState<Pane>("root");

  const trackLabel = (id: string | null) =>
    id ? tracks.find((t) => t.id === id)?.label ?? "—" : "Off";

  const activeTracks = [settings.selection.primary, settings.selection.secondary]
    .filter((id) => id && tracks.some((t) => t.id === id)).length;
  const subsValue =
    tracks.length === 0
      ? "None"
      : activeTracks === 0
        ? "Off"
        : `${activeTracks} ${activeTracks === 1 ? "track" : "tracks"}`;

  return (
    <div className={styles.menu} role="menu" onClick={(e) => e.stopPropagation()}>
      {pane === "root" && (
        <ul className={styles.menuList}>
          <MenuRow label="Subtitles" value={subsValue} onClick={() => setPane("subs")} />
          <MenuRow label="Quality" value={settings.quality} onClick={() => setPane("quality")} />
          <MenuRow
            label="Speed"
            value={settings.playbackRate === 1 ? "Normal" : `${settings.playbackRate}×`}
            onClick={() => setPane("speed")}
          />
          <MenuRow
            label={
              <span className={styles.menuAi}>
                <Sparkles size={14} /> Upscale
              </span>
            }
            value={UPSCALES.find((u) => u.mode === settings.upscale)?.label ?? "Off"}
            onClick={() => setPane("upscale")}
          />
          <li className={styles.menuFooter}>
            <button type="button" className={styles.menuReset} onClick={onReset}>
              Reset settings
            </button>
          </li>
        </ul>
      )}

      {pane === "subs" && (
        <Pane title="Subtitles" onBack={() => setPane("root")}>
          <SubtitlePreview
            primary={settings.selection.primary ? settings.primaryStyle : null}
            secondary={settings.selection.secondary ? settings.secondaryStyle : null}
          />
          <p className={styles.menuHint}>You can show two tracks at once.</p>
          <SelectRow
            label="Primary (bottom)"
            value={trackLabel(settings.selection.primary)}
            options={[{ id: null, label: "Off" }, ...tracks]}
            selected={settings.selection.primary}
            onSelect={(id) =>
              onUpdate({ selection: { ...settings.selection, primary: id } })
            }
          />
          <SelectRow
            label="Secondary (top)"
            value={trackLabel(settings.selection.secondary)}
            options={[{ id: null, label: "Off" }, ...tracks]}
            selected={settings.selection.secondary}
            onSelect={(id) =>
              onUpdate({ selection: { ...settings.selection, secondary: id } })
            }
          />
          {canTranslate && onRequestLanguage ? (
            <TranslateBox
              tracks={tracks}
              translatingLang={translatingLang}
              onRequest={onRequestLanguage}
            />
          ) : null}
          <MenuRow label="Primary style" value="" onClick={() => setPane("primaryStyle")} />
          <MenuRow label="Secondary style" value="" onClick={() => setPane("secondaryStyle")} />
          <SliderRow
            label="Vertical position"
            min={0}
            max={40}
            step={1}
            value={settings.subtitlePosition}
            suffix="%"
            onChange={(v) => onUpdate({ subtitlePosition: v })}
          />
        </Pane>
      )}

      {pane === "primaryStyle" && (
        <StyleEditor
          title="Primary style"
          style={settings.primaryStyle}
          onChange={onUpdatePrimaryStyle}
          onBack={() => setPane("subs")}
        />
      )}
      {pane === "secondaryStyle" && (
        <StyleEditor
          title="Secondary style"
          style={settings.secondaryStyle}
          onChange={onUpdateSecondaryStyle}
          onBack={() => setPane("subs")}
        />
      )}

      {pane === "quality" && (
        <Pane title="Quality" onBack={() => setPane("root")}>
          {qualities.map((q) => (
            <CheckRow
              key={q}
              label={q}
              checked={settings.quality === q}
              onClick={() => onUpdate({ quality: q })}
            />
          ))}
        </Pane>
      )}

      {pane === "speed" && (
        <Pane title="Speed" onBack={() => setPane("root")}>
          {SPEEDS.map((s) => (
            <CheckRow
              key={s}
              label={s === 1 ? "Normal" : `${s}×`}
              checked={settings.playbackRate === s}
              onClick={() => onUpdate({ playbackRate: s })}
            />
          ))}
        </Pane>
      )}

      {pane === "upscale" && (
        <Pane title="Upscale" onBack={() => setPane("root")}>
          <p className={styles.menuHint}>
            Client-side sharpening. AI modes are experimental.
          </p>
          {UPSCALES.map((u) => {
            const status = upscaleStatus(u.mode);
            return (
              <button
                key={u.mode}
                type="button"
                className={styles.menuItem}
                onClick={() => onUpdate({ upscale: u.mode })}
              >
                <span className={styles.menuCheck}>
                  {settings.upscale === u.mode ? <Check size={15} /> : null}
                </span>
                <span className={styles.menuItemBody}>
                  <span className={styles.menuItemLabel}>
                    {u.label}
                    {!status.available && u.mode.startsWith("ai") ? (
                      <span className={styles.soon}>soon</span>
                    ) : null}
                  </span>
                  <span className={styles.menuItemNote}>{status.note}</span>
                </span>
              </button>
            );
          })}
        </Pane>
      )}
    </div>
  );
}

/* On-demand AI translation: pick a preset or type any language. */
const PRESET_LANGS: { code: string; label: string }[] = [
  { code: "pl", label: "Polski" },
  { code: "en", label: "English" },
  { code: "ru", label: "Русский" },
  { code: "ar", label: "العربية" },
  { code: "he", label: "עברית" },
];

function TranslateBox({
  tracks,
  translatingLang,
  onRequest,
}: {
  tracks: SubtitleTrack[];
  translatingLang: string | null;
  onRequest: (lang: string) => void;
}) {
  const [custom, setCustom] = useState("");
  const have = new Set(tracks.map((t) => t.lang));
  const busy = (code: string) =>
    translatingLang != null &&
    translatingLang.toLowerCase() === code.toLowerCase();
  const anyBusy = translatingLang != null;

  const submitCustom = () => {
    const v = custom.trim();
    if (v && !anyBusy) {
      onRequest(v);
      setCustom("");
    }
  };

  return (
    <div className={styles.translateBox}>
      <span className={styles.translateHead}>
        <Languages size={14} /> AI translation (local)
      </span>
      <p className={styles.menuHint}>
        Generate a track in any language. First time takes a minute or two, then
        it&apos;s instant.
      </p>
      <div className={styles.langChips}>
        {PRESET_LANGS.map((l) => {
          const ready = have.has(l.code);
          return (
            <button
              key={l.code}
              type="button"
              className={`${styles.langChip} ${ready ? styles.langChipOn : ""}`}
              disabled={anyBusy || ready}
              onClick={() => onRequest(l.code)}
            >
              {busy(l.code) ? (
                <Loader2 size={13} className={styles.spin} />
              ) : ready ? (
                <Check size={13} />
              ) : null}
              {l.label}
            </button>
          );
        })}
      </div>
      <div className={styles.langCustom}>
        <input
          className={styles.langInput}
          placeholder="Custom language (e.g. Tagalog)…"
          value={custom}
          disabled={anyBusy}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitCustom()}
        />
        <button
          type="button"
          className={styles.langAdd}
          disabled={anyBusy || !custom.trim()}
          onClick={submitCustom}
        >
          {anyBusy ? <Loader2 size={14} className={styles.spin} /> : "Translate"}
        </button>
      </div>
      {anyBusy ? (
        <p className={styles.menuHint}>Translating: {translatingLang}…</p>
      ) : null}
    </div>
  );
}

/* ───────────────────────── primitives ───────────────────────── */

function Pane({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.menuPane}>
      <button type="button" className={styles.menuHeader} onClick={onBack}>
        <ChevronRight size={16} className={styles.menuBack} />
        {title}
      </button>
      <div className={styles.menuScroll}>{children}</div>
    </div>
  );
}

function MenuRow({
  label,
  value,
  onClick,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <li>
      <button type="button" className={styles.menuItem} onClick={onClick}>
        <span className={styles.menuItemLabel}>{label}</span>
        <span className={styles.menuItemValue}>
          {value}
          <ChevronRight size={15} />
        </span>
      </button>
    </li>
  );
}

function CheckRow({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={styles.menuItem} onClick={onClick}>
      <span className={styles.menuCheck}>{checked ? <Check size={15} /> : null}</span>
      <span className={styles.menuItemLabel}>{label}</span>
    </button>
  );
}

function SelectRow({
  label,
  value,
  options,
  selected,
  onSelect,
}: {
  label: string;
  value: string;
  options: { id: string | null; label: string }[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.selectRow}>
      <button type="button" className={styles.menuItem} onClick={() => setOpen((o) => !o)}>
        <span className={styles.menuItemLabel}>{label}</span>
        <span className={styles.menuItemValue}>
          {value}
          <ChevronRight
            size={15}
            style={{ transform: open ? "rotate(90deg)" : "none" }}
          />
        </span>
      </button>
      {open ? (
        <div className={styles.selectOptions}>
          {options.map((o) => (
            <button
              key={o.id ?? "none"}
              type="button"
              className={styles.menuItem}
              onClick={() => {
                onSelect(o.id);
                setOpen(false);
              }}
            >
              <span className={styles.menuCheck}>
                {selected === o.id ? <Check size={14} /> : null}
              </span>
              <span className={styles.menuItemLabel}>{o.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SliderRow({
  label,
  min,
  max,
  step,
  value,
  suffix,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className={styles.sliderRow}>
      <span className={styles.sliderHead}>
        <span>{label}</span>
        <span className={styles.sliderVal}>
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        className={styles.slider}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

const COLORS = ["#FFFFFF", "#FFD7A8", "#FFC2A0", "#FF8A95", "#9FE8C9", "#A8C7FF"];
const WEIGHTS: SubtitleStyle["weight"][] = [400, 500, 600, 700];

function SubtitlePreview({
  primary,
  secondary,
}: {
  primary: SubtitleStyle | null;
  secondary: SubtitleStyle | null;
}) {
  return (
    <div className={styles.subPreview}>
      <span className={styles.subPreviewTag}>Preview</span>
      {secondary ? (
        <SubtitleLine
          text={SAMPLE_SECONDARY}
          style={secondary}
          basisPx={PREVIEW_BASIS}
          maxPx={22}
        />
      ) : null}
      {primary ? (
        <SubtitleLine
          text={SAMPLE_PRIMARY}
          style={primary}
          basisPx={PREVIEW_BASIS}
          maxPx={26}
        />
      ) : null}
      {!primary && !secondary ? (
        <span className={styles.subPreviewEmpty}>Subtitles off</span>
      ) : null}
    </div>
  );
}

function StyleEditor({
  title,
  style,
  onChange,
  onBack,
}: {
  title: string;
  style: SubtitleStyle;
  onChange: (patch: Partial<SubtitleStyle>) => void;
  onBack: () => void;
}) {
  return (
    <Pane title={title} onBack={onBack}>
      <SubtitlePreview primary={style} secondary={null} />
      <SliderRow
        label="Size"
        min={16}
        max={56}
        step={1}
        value={style.fontSize}
        suffix="px"
        onChange={(v) => onChange({ fontSize: v })}
      />
      <SliderRow
        label="Text background"
        min={0}
        max={100}
        step={5}
        value={Math.round(style.background * 100)}
        suffix="%"
        onChange={(v) => onChange({ background: v / 100 })}
      />
      <div className={styles.swatchRow}>
        <span className={styles.sliderHead}>Color</span>
        <div className={styles.swatches}>
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              className={`${styles.swatch} ${style.color === c ? styles.swatchOn : ""}`}
              style={{ background: c }}
              onClick={() => onChange({ color: c })}
            />
          ))}
        </div>
      </div>
      <div className={styles.segRow}>
        <span className={styles.sliderHead}>Weight</span>
        <div className={styles.seg}>
          {WEIGHTS.map((w) => (
            <button
              key={w}
              type="button"
              className={`${styles.segBtn} ${style.weight === w ? styles.segOn : ""}`}
              onClick={() => onChange({ weight: w })}
            >
              {w}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.segRow}>
        <span className={styles.sliderHead}>Edge</span>
        <div className={styles.seg}>
          {(["none", "outline", "shadow"] as const).map((e) => (
            <button
              key={e}
              type="button"
              className={`${styles.segBtn} ${style.edge === e ? styles.segOn : ""}`}
              onClick={() => onChange({ edge: e })}
            >
              {e === "none" ? "None" : e === "outline" ? "Outline" : "Shadow"}
            </button>
          ))}
        </div>
      </div>
    </Pane>
  );
}
