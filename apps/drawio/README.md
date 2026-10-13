# Draw.io for FynnCloud

Professional, open-source diagramming and whiteboarding directly inside FynnCloud.

---

## 🎨 Features

- **Full-featured Diagrams**: Create flowcharts, network architectures, AWS/Azure/GCP diagrams, UML, wireframes, and database ERDs.
- **Deep FynnCloud File Integration**:
  - Save diagrams directly to your personal FynnCloud files and folders.
  - Automatically open `.drawio`, `.drawio.xml`, `.drawio.svg`, and `.drawio.png` files from the File Explorer context menu.
- **Seamless Autosave**: All changes are automatically synchronized back to FynnCloud storage without losing progress.
- **Native Host Sidebar**: Quick access to your diagrams and new canvas creation directly from FynnCloud's native left sidebar.
- **Theme Awareness**: Automatically matches FynnCloud's light and dark appearance.

---

## 📂 Supported Formats

- `.drawio` (Standard diagram format)
- `.drawio.xml` / `.xml` (Raw XML diagram definition)
- `.drawio.svg` (SVG diagram with embedded diagram data)
- `.drawio.png` (PNG image with embedded diagram data)
- `.diagram` (Generic diagram files)

---

## 🔒 Security & Privacy

Draw.io operates inside FynnCloud's secure iframe sandbox with minimal requested scopes:
- `files:all:read` & `files:all:write`: Read and save your diagrams in FynnCloud storage.
- `user:read`: Display your author name and profile.
- `notifications:send`: Notify you when diagrams are saved or exported.
