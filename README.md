# Obsidian Fade Stop

[![Buy me a coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-%E2%98%95-f7e600)](https://buymeacoffee.com/ragetrip)

A lightweight Obsidian plugin that adds a **"Fade & Stop"** button to media elements (audio/video) so you can gracefully fade them out and stop playback without hunting for controls.

---

## ✨ What's New in v1.4.0  
**Label Adjustments**  
- Slightly smaller so it fits cleanly in the pill button.  

**New Shaded Icon**  
- Subtle gradient + tiny highlights for a less generic look.  
- Falls back to a solid dot if SVG rendering fails.  

**Settings Improvements**  
- Added clearer notes for each setting.  
- Offset section now includes recommended values for use with community plugins like **Second Window** or **Media Extended**.  

**Icon Options**  
- You can now toggle between **Icon + Label** or **Icon Only** to save space.  

---

## 📸 Screenshots / Demo  
| Pill with Label | Icon Only |  
| --- | --- |  
| ![Pill Layout](docs/pill-layout.png) | ![Icon Only Layout](docs/icon-only-layout.png) |  

🎥 **GIF Demo:**  
![Fade & Stop Demo](docs/demo.gif)  

---

## ⚙️ Installation  
1. Download or clone this repo.  
2. Unzip into:  
   ```
   .obsidian/plugins/fade-stop-media/
   ```
3. In Obsidian:  
   - Open **Settings → Community Plugins**  
   - Enable **Fade & Stop Media**  
4. Adjust offsets or display mode in the plugin’s settings.  

---

## 🛠 Settings Overview  
- **Extra Left Offset (px)** → Move the button horizontally if it overlaps something.  
- **Universal Selector (Advanced)** → Forces the plugin to try on all media (**default: ON**).  
- **Also Show on Video Elements** → Works on `<video>` tags (**default: ON**).  
- **Fallback to Inline Button** → If floating positioning fails, use inline placement.  
- **Button Layout** → Choose **Pill with Label** or **Icon Only**.  

---

## 💡 Tips  
- If you use **Media Extended** or **Second Window**, you might need to tweak the offset.  
- Works with both audio and video, but you can limit it to audio only if you want cleaner layouts.  

---

## 📜 License  
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support the Developer
If you like this plugin and want to support development, you can [buy me a coffee here](https://buymeacoffee.com/ragetrip) ☕.
