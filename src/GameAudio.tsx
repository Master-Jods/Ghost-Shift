import { dangerIncident } from "./incidentAlarm";
import { useEffect, useState } from "react";
import { facilityAudio } from "./audio";
import {
  loadPresentation,
  savePresentation,
  type PresentationSettings,
} from "./presentation";
import { network } from "./transport";
export default function GameAudio() {
  const [settings, setSettings] = useState(loadPresentation);
  useEffect(() => {
    let current = loadPresentation();
    const sync = (e: Event) => {
      current = (e as CustomEvent<PresentationSettings>).detail;
      setSettings(current);
      savePresentation(current);
      void facilityAudio.unlock(current);
      facilityAudio.configure(current, !document.hidden && true);
    };
    const preview = (e: Event) => {
      const kind = (e as CustomEvent<string>).detail;
      if (kind === "attack" || kind === "hit")
        void facilityAudio.previewBattle(kind);
    };
    const unlock = () => {
      void facilityAudio.unlock(current);
    };
    const click = (e: Event) => {
      const el = (e.target as Element)?.closest?.('button,a,[role="button"]');
      if (!el || el.matches(':disabled,[aria-disabled="true"]')) return;
      void facilityAudio.ui("click", current).then(() =>
        requestAnimationFrame(() => {
          document.documentElement.dataset.gameAudio = JSON.stringify(
            facilityAudio.diagnostics,
          );
        }),
      );
    };
    const typing = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (
        target?.matches(
          "input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]),textarea,[contenteditable=true]",
        )
      )
        facilityAudio.typing();
    };
    const change = (e: Event) => {
      if (
        (e.target as Element)?.matches(
          'select,input[type="checkbox"],input[type="range"]',
        )
      )
        void facilityAudio.ui("change", current);
    };
    const battleSeen = new Set<string>();
    let session = "";
    const update = () => {
      const s = network.getSnapshot(),
        player = !location.pathname.startsWith("/operator");
      facilityAudio.setMusicMode(
        !player
          ? "menu"
          : s.phase === "playing"
            ? s.emergencies.some((e) => e.status === "active")
              ? "danger"
              : Object.values(s.players).some((p) => p.encounter)
                ? "battle"
                : "explore"
            : "menu",
      );
      facilityAudio.configure(current, !document.hidden);
      if (s.id !== session) {
        session = s.id;
        battleSeen.clear();
      }
      const incident = player && !document.hidden ? dangerIncident(s) : undefined;
      facilityAudio.reconcileDanger(new Set(incident?[incident.id]:[]),!!incident);
      if(incident)facilityAudio.danger(incident.kind,incident.id);
      if (player && s.phase === "playing" && !s.paused) {
        const role = network.getNetSnapshot().role;
        for (const t of s.threats) {
          const battle = t.battle;
          if (
            !battle ||
            battle.owner !== role ||
            (t.status === "active" &&
              s.players[battle.owner].encounterId !== t.instanceId)
          )
            continue;
          for (const mon of [battle.active, battle.opponent]) {
            facilityAudio.preloadCry(mon.id);
            const cryKey = t.instanceId + ":entry-cry:" + mon.id;
            if (!battleSeen.has(cryKey) && facilityAudio.cry(mon.id))
              battleSeen.add(cryKey);
          }
          for (const cue of battle.cues) {
            const key =
              t.instanceId +
              ":" +
              battle.requestId +
              ":" +
              cue.side +
              ":" +
              cue.kind +
              ":" +
              cue.at;
            if (
              s.worldTime < cue.at ||
              s.worldTime >= cue.until ||
              battleSeen.has(key)
            )
              continue;
            battleSeen.add(key);
            facilityAudio.battle(cue.kind, cue.type || "normal", cue.side);
          }
        }
        if (battleSeen.size > 256) {
          const keep = [...battleSeen].slice(-128);
          battleSeen.clear();
          for (const key of keep) battleSeen.add(key);
        }
      }
      document.documentElement.dataset.gameAudio = JSON.stringify(
        facilityAudio.diagnostics,
      );
    };
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);
    document.addEventListener("click", click, true);
    document.addEventListener("change", change, true);
    document.addEventListener("input", typing, true);
    window.addEventListener("ghost-audio-unlock", sync);
    window.addEventListener("ghost-battle-preview", preview);
    window.addEventListener("blur", update);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    const timer = setInterval(update, 150);
    update();
    return () => {
      clearInterval(timer);
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", unlock, true);
      document.removeEventListener("click", click, true);
      document.removeEventListener("change", change, true);
      document.removeEventListener("input", typing, true);
      window.removeEventListener("ghost-audio-unlock", sync);
      window.removeEventListener("ghost-battle-preview", preview);
      window.removeEventListener("blur", update);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
      facilityAudio.dispose();
    };
  }, []);
  return (
    <button
      className="game-audio-toggle"
      aria-label={
        settings.muted ? "Enable music and sound" : "Mute music and sound"
      }
      aria-pressed={!settings.muted}
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent("ghost-audio-unlock", {
            detail: {
              ...settings,
              muted: !settings.muted,
              master: settings.master || 0.8,
              music: settings.music || 0.65,
              effects: settings.effects || 0.8,
            },
          }),
        )
      }
    >
      {settings.muted ? "Sound off / Enable" : "Sound on"}
    </button>
  );
}
