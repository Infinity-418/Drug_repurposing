# Nebula: AI-Guided Drug Repurposing Dashboard

A student-built full-stack dashboard for exploring **drug repurposing candidates** with a small biomedical knowledge graph, confidence scoring, explainable AI views, and PDF report generation.

> This project is for academic / research demonstration only. It is **not** intended for clinical decision-making or medical advice.

![Nebula dashboard](docs/screenshots/nebula-current-dashboard.png)

## Why I Built This

Drug repurposing is the idea of finding new possible uses for existing medicines. I built Nebula as a small project to understand how knowledge graphs, model scores, and explainability panels can be combined into a practical biomedical dashboard.

The goal was not to make a hospital-ready product. The goal was to make a clear prototype that shows:

- how candidate drugs can be ranked for a selected disease
- how known treatments can be separated from repurposing predictions
- how graph distance and evidence signals can support interpretation
- how SHAP-style explanations and citations can make model output easier to inspect

## Main Features

- Disease selector for running candidate prediction
- Predicted repurposing candidate list with confidence scores
- Separate collapsed section for known / approved treatments
- Knowledge graph explorer with disease, drug, gene, and pathway nodes
- Explainable AI panel with confidence breakdown and biological rationale
- Drug comparison module for side-by-side candidate review
- PubMed-style citation panel
- Downloadable research PDF report
- Responsive UI for desktop and mobile demos

## Tech Stack

**Frontend**

- React
- TypeScript
- Vite
- Tailwind CSS
- Cytoscape.js
- Recharts
- Lucide icons

**Backend**

- FastAPI
- NetworkX
- scikit-learn / XGBoost style model layer
- SHAP-style explainability layer
- ReportLab for PDF reports

## Project Structure

```text
Nebulla project 3/
├── backend/              # FastAPI backend and model/graph logic
├── frontend/             # React + Vite frontend
├── docs/                 # Screenshots and presentation notes
├── run.sh                # Starts backend and frontend together
└── README.md
```

## How To Run Locally

Make sure Python 3 and Node.js are installed.

```bash
chmod +x run.sh
./run.sh
```

Then open:

```text
http://localhost:5173
```

The backend runs on:

```text
http://localhost:8000
```

## Useful API Endpoints

```text
GET /api/diseases
GET /api/predict/{disease_id}
GET /api/explain/{drug_id}/{disease_id}
GET /api/graph/{disease_id}/{drug_id}
GET /api/compare/{drug_a_id}/{drug_b_id}/{disease_id}
GET /api/report/{disease_id}
```

## Current Limitations

- The biomedical graph is small and curated for demonstration.
- Confidence scores are prototype scores, not clinically validated probabilities.
- Literature evidence is presented for exploration, not as a complete systematic review.
- The app currently runs best as a local full-stack demo.

## Future Improvements

- Add stronger evidence grading for citations
- Add filters for confidence tier, evidence count, and shortest graph path
- Improve graph label readability on mobile
- Add authentication if deployed publicly
- Connect to larger biomedical datasets
- Add exportable comparison reports

## Academic Note

This project should be understood as a student prototype for learning and demonstration. It combines software engineering, data visualization, graph-based reasoning, and explainable AI ideas in one small application.
