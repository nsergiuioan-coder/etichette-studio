# Etichette Studio

[**Download the Windows installer (.exe)**](https://github.com/nsergiuioan-coder/etichette-studio/releases/latest/download/Etichette_Studio_Setup_1.0.0_Windows_x64.exe)

Windows 10/11, 64-bit. Install it and start making labels. Rust, Node.js and Tauri are not needed to run the app. The app works offline; the installer may download Microsoft WebView2 if it is missing.

Etichette Studio is a small desktop app for designing barcode labels and preparing print files. Set the size, add your text or artwork, and generate individual labels, rolls or sheets.

- Sequential numbers, repeated values and CSV/TXT lists.
- Common linear and 2D barcodes, with format-specific options.
- Click a name or number in the preview to edit it.
- Borders, spacing, logo, colours, text positions and roll markers.
- Project files, PDF, SVG and image imports.
- 14 interface languages, including right-to-left layouts.
- Printing through Windows and 18 export formats.

## Export formats

SVG, PDF, PNG, JPG, WebP, TIFF, BMP, GIF, AVIF, EPS, PS, DXF, ZPL, EPL, TSPL, CSV, TXT and JSON.

Use SVG or PDF for long rolls. Images have size limits, so use sheets, individual labels or fewer labels per file for raster exports. CSV, TXT and JSON export data rather than a print layout.

## A few practical details

Windows printing uses installed printer drivers, without a fixed list of supported brands. ZPL, EPL and TSPL files require a printer that understands the selected language.

PDF, SVG and image imports become a single high-quality graphic. Native JSON projects keep the editable settings. Proprietary formats such as AI and CDR need to be exported to a supported format first. DXF exports do not embed bitmap artwork.

Layout warnings can be overridden. If the selected barcode format cannot encode a value, the app explains it and lets you continue without that barcode. It does not invent a valid-looking code.

## Build from source

Install Node.js, pnpm, stable Rust and the Microsoft C++ Build Tools, then run:

```sh
pnpm install --frozen-lockfile
pnpm test
node build-frontend.cjs
pnpm exec tauri build --bundles nsis
```

The installer is generated in `src-tauri/target/release/bundle/nsis/`.

## Ownership, license and official downloads

Project owner and maintainer: [@nsergiuioan-coder](https://github.com/nsergiuioan-coder). Copyright (c) 2026 nsergiuioan-coder. Original project contributions are released under the [MIT license](LICENSE). Third-party code, fonts and other components retain their own copyrights and licenses; see [the attribution file](assets/ATTRIBUZIONI.txt).

Download official installers only from [this repository's Releases page](https://github.com/nsergiuioan-coder/etichette-studio/releases). Copies hosted elsewhere are not official releases from this project. This recommendation does not restrict redistribution permitted by the MIT license. Forks and modified builds must not imply endorsement by the project owner.

---

Vibe coded.
