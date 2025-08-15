/* Fade & Stop Media - v1.4.0
   TO DO LIST:
   1. add option to change color of icon.
   2. add settings toggle to enable auto fade on file end.
   3. add similar toggle for file start.
   4. clean up this trainwreck once i get more experience. 
*/
const { Plugin, PluginSettingTab, Setting, Notice } = require("obsidian");

const DEFAULT_SETTINGS = {
  fadeSeconds: 2.5,
  applyToVideo: false, 
  showInlineIfOverlayFails: true,
  universalSelector: true, 
  extraLeftOffsetPx: 0, 
  buttonLayout: "pill", 
};

module.exports = class FadeStopPlugin extends Plugin {
  async onload() {
    const persisted = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, persisted || {});

    // Normalize types
    if (typeof this.settings.extraLeftOffsetPx !== "number") {
      this.settings.extraLeftOffsetPx = Number(this.settings.extraLeftOffsetPx) || 0;
    }
    if (!["pill", "icon"].includes(this.settings.buttonLayout)) {
      this.settings.buttonLayout = "pill";
    }

    this.observer = null;
    this.lastActiveMedia = null;
    this.fadingSet = new WeakSet(); // is animating
    this.stateMap = new WeakMap(); // per-media: { faded: bool, lastVolume: number }

    this.addSettingTab(new FadeStopSettingTab(this.app, this));

    this.addCommand({
      id: "fade-toggle-current-media",
      name: "Fade toggle (out/in) current media",
      callback: () => {
        const target = this.pickTargetMedia();
        if (target) this.fadeToggle(target, this.settings.fadeSeconds);
        else new Notice("No media element found.");
      },
    });

    this.observeMedia();
    this.scanAndAttach();
  }

  onunload() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    document.querySelectorAll(".fade-stop-btn").forEach((btn) => btn.remove());
  }

  observeMedia() {
    if (this.observer) this.observer.disconnect();
    this.observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.addedNodes.length || m.removedNodes.length) {
          requestAnimationFrame(() => this.scanAndAttach());
          break;
        }
      }
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  _selector() {
    const a = this.settings.universalSelector ? "audio" : "audio[controls]";
    const v = this.settings.applyToVideo
      ? this.settings.universalSelector ? ", video" : ", video[controls]"
      : "";
    return a + v;
  }

  scanAndAttach() {
    const mediaEls = Array.from(document.querySelectorAll(this._selector()));
    mediaEls.forEach((el) => this.attachButton(el));
    mediaEls.forEach((el) => {
      if (!el.dataset.fadeStopTracked) {
        el.addEventListener("play", () => (this.lastActiveMedia = el), { passive: true });
        el.addEventListener("click", () => (this.lastActiveMedia = el), { passive: true });
        el.addEventListener("volumechange", () => (this.lastActiveMedia = el), { passive: true });
        el.dataset.fadeStopTracked = "1";
      }
    });
  }

  attachButton(media) {
    if (media.dataset.fadeStopAttached === "1") return;
    const parent = media.parentElement;
    if (!parent) return;
    parent.classList.add("fade-stop-host");

    const btn = document.createElement("button");
    btn.className = "fade-stop-btn";
    if (this.settings.buttonLayout === "icon") btn.classList.add("icon-only");
    btn.type = "button";
    btn.ariaLabel = "Fade";
    btn.title = "Fade";

    btn.innerHTML = `${this._iconSVG()}${
      this.settings.buttonLayout === "pill" ? '<span class="label">Fade</span>' : ''
    }`;

    const rect = media.getBoundingClientRect();
    if (rect.width < 240 || rect.height < 40) btn.classList.add("compact");

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.fadeToggle(media, this.settings.fadeSeconds);
    });

    parent.appendChild(btn);
    media.dataset.fadeStopAttached = "1";

    requestAnimationFrame(() => this._positionButton(btn));
  }

  _iconSVG() { /* pain in the butt gradient. */
    return `<span class="fade-pill-ico" aria-hidden="true">
      <svg viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="fadeDotGrad" cx="0.35" cy="0.35" r="0.9">
            <stop offset="0%" stop-color="var(--background-secondary)"/>
            <stop offset="60%" stop-color="var(--interactive-accent)"/>
            <stop offset="100%" stop-color="var(--interactive-accent)"/>
          </radialGradient>
          <filter id="fadeDotShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0.5" stdDeviation="0.6" flood-color="black" flood-opacity="0.25"/>
          </filter>
        </defs>
        <circle cx="7" cy="7" r="6" fill="url(#fadeDotGrad)"
          stroke="var(--background-modifier-border)" stroke-width="1.2" filter="url(#fadeDotShadow)"/>
        <path d="M4 7h6" stroke="var(--background-secondary)" stroke-opacity="0.9" stroke-width="0.9" stroke-linecap="round"/>
        <path d="M5 5.2l4 0" stroke="var(--background-secondary)" stroke-opacity="0.55" stroke-width="0.7" stroke-linecap="round"/>
        <path d="M5 8.8l3.2 0" stroke="var(--background-secondary)" stroke-opacity="0.4" stroke-width="0.7" stroke-linecap="round"/>
      </svg>
    </span>`;
  }

  _positionButton(btn) {
    const basePad = 8;
    const extra = Number(this.settings.extraLeftOffsetPx) || 0;
    btn.style.right = `${basePad + extra}px`;
  }

  pickTargetMedia() {
    if (this.lastActiveMedia && !this.lastActiveMedia.paused) return this.lastActiveMedia;
    const all = Array.from(document.querySelectorAll(this._selector()));
    const playing = all.find((el) => !el.paused);
    return playing ?? all[0] ?? null;
  }

  fadeToggle(media, seconds) {
    const st = this._getState(media);
    if (this.fadingSet.has(media)) return;

    if (st.faded) {
      const targetVol = st.lastVolume ?? 1;
      media.volume = 0;
      try { media.play(); } catch {}
      this._ramp(media, 0, targetVol, seconds, { keepPlaying: true }, () => {
        st.faded = false;
        this.stateMap.set(media, st);
      });
    } else {
      const currentVol = media.volume || 1;
      st.lastVolume = currentVol;
      this.stateMap.set(media, st);
      try { media.play(); } catch {}
      this._ramp(media, currentVol, 0, seconds, { keepPlaying: true }, () => {
        try { media.pause(); } finally {
          media.volume = st.lastVolume ?? 1;
          st.faded = true;
          this.stateMap.set(media, st);
        }
      });
    }
  }

  _getState(media) {
    let st = this.stateMap.get(media);
    if (!st) {
      st = { faded: false, lastVolume: media.volume || 1 };
      this.stateMap.set(media, st);
    }
    return st;
  }

  _ramp(media, from, to, seconds, opts, done) {
    this.fadingSet.add(media);
    const duration = Math.max(0.05, Number(seconds) || 0.05);
    const start = performance.now();
    const delta = to - from;
    const keepPlaying = opts && opts.keepPlaying;

    const step = (now) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      const vol = Math.max(0, Math.min(1, from + delta * t));
      media.volume = vol;
      if (keepPlaying && t < 1 && media.paused) {
        try { media.play(); } catch {}
      }
      if (t < 1) requestAnimationFrame(step);
      else {
        this.fadingSet.delete(media);
        done && done();
      }
    };
    requestAnimationFrame(step);
  }

  async saveSettings() {
    await this.saveData(this.settings);
    // Reposition + restyle existing buttons when layout/offset changes
    document.querySelectorAll(".fade-stop-btn").forEach((btn) => {
      btn.classList.toggle("icon-only", this.settings.buttonLayout === "icon");
      this._positionButton(btn);
      const label = btn.querySelector(".label");
      if (this.settings.buttonLayout === "icon") {
        if (label) label.remove();
      } else {
        if (!label) {
          const span = document.createElement("span");
          span.className = "label";
          span.textContent = "Fade";
          btn.appendChild(span);
        }
      }
    });
    // Rescan in case toggles changed target
    this.scanAndAttach();
  }
};

class FadeStopSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Fade & Stop Media" });

    new Setting(containerEl)
      .setName("Fade duration (seconds)")
      .setDesc("Supports decimals like 0.5, 1.2, etc.")
      .addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.step = "0.1";
        text.setValue(String(this.plugin.settings.fadeSeconds));
        text.onChange(async (v) => {
          const n = Number(v);
          if (!isNaN(n) && n > 0) {
            this.plugin.settings.fadeSeconds = n;
            await this.plugin.saveSettings();
          }
        });
      });

    new Setting(containerEl)
      .setName("Button layout")
      .setDesc("Choose between Pill (icon + Fade) or Icon only")
      .addDropdown((drop) => {
        drop.addOption("pill", "Pill (icon + Fade)");
        drop.addOption("icon", "Icon only");
        drop.setValue(this.plugin.settings.buttonLayout || "pill");
        drop.onChange(async (val) => {
          this.plugin.settings.buttonLayout = val;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Also show on video elements")
      .setDesc("Adds the Fade button to <video> players.")
      .addToggle((tog) => {
        tog.setValue(this.plugin.settings.applyToVideo).onChange(async (val) => {
          this.plugin.settings.applyToVideo = val;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Universal selector (advanced)")
      .setDesc("Attach to any <audio>/<video>, even if 'controls' is missing (custom players).")
      .addToggle((tog) => {
        tog.setValue(this.plugin.settings.universalSelector).onChange(async (val) => {
          this.plugin.settings.universalSelector = val;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Button extra left offset (px)")
      .setDesc("Default '0'. Recommended for 'Media Extended' or 'Second Window' plugin is '84'.")
      .addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.step = "1";
        text.setValue(String(this.plugin.settings.extraLeftOffsetPx));
        text.onChange(async (v) => {
          const n = Number(v);
          if (!isNaN(n)) {
            this.plugin.settings.extraLeftOffsetPx = n;
            await this.plugin.saveSettings();
          }
        });
      });

    new Setting(containerEl)
      .setName("Fallback to inline button")
      .setDesc("If overlay isn't visible, also places a small inline button next to the player.")
      .addToggle((tog) => {
        tog.setValue(this.plugin.settings.showInlineIfOverlayFails).onChange(async (val) => {
          this.plugin.settings.showInlineIfOverlayFails = val;
          await this.plugin.saveSettings();
        });
      });
  }
}