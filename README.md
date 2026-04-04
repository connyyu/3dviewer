# 💮 Haku 3D Viewer [![Netlify Status](https://api.netlify.com/api/v1/badges/15df5e74-da5b-44b7-8d9f-be9b107fd26a/deploy-status)](https://app.netlify.com/sites/haku3dviewer/deploys)

A 3D protein structure viewer for exploring structure, disease variants, and molecular binders.

[![Visit Site](https://img.shields.io/badge/Visit%20Site-haku3dviewer-00C7B7?style=for-the-badge&logo=netlify)](https://haku3dviewer.netlify.app/)

## Features

- **Protein search** — Search by UniProt accession or protein name (e.g. `Q12834`, `cdc20`)
- **3D structure viewer** — Display structures from PDBe, AlphaFold Database and other 3D-Beacons providers
- **Structure browser** — Filter by providers and sorted by date of release
- **Sequence schematic** — Visual overview of sequence coverage and positions of disease variants
- **Disease variants** — Highlight disease variants on the structure
- **Binders panel** — Explore binders in the PDB structure, including proteins, ligands, DNA and RNA
- **Responsive layout** — Collapsible panels for use on mobile devices

## Data Source

All data is fetched live from public APIs.

| Source | Data |
|---|---|
| [UniProt REST API](https://rest.uniprot.org) | Protein search, accessions, metadata |
| [3D-Beacons API](https://www.ebi.ac.uk/pdbe/pdbe-kb/3dbeacons) | Structure models and URLs |
| [PDBe API](https://www.ebi.ac.uk/pdbe) | Ligands, molecules, UniProt mappings |
| [EBI Proteins API](https://www.ebi.ac.uk/proteins/api) | Disease variants |

## Tech Stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Mol*](https://molstar.org/) — 3D molecular visualisation
- [Tailwind CSS](https://tailwindcss.com/)
- Hosted on [Netlify](https://netlify.com)

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
   
## Author

- **Conny Yu** – [GitHub Profile](https://github.com/connyyu)  
  Haku 2.1 _March 2026_
- **vibe-coded with Google AI Studio**
