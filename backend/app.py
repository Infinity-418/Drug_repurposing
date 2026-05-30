import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from backend.knowledge_graph import BiologicalKnowledgeGraph
from backend.model import DrugRepurposingModel
from backend.explainability import ExplainabilityLayer
from backend.report_generator import PDFReportGenerator

app = FastAPI(
    title="Upgraded AI-Guided Drug Repurposing Platform API",
    description="Backend API supporting confidence breakdowns, drug-drug comparison, and biological pathway nodes exploration.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

kg = BiologicalKnowledgeGraph()
model = DrugRepurposingModel(kg)
explainability = ExplainabilityLayer(model)
report_gen = PDFReportGenerator(kg, model, explainability)

@app.get("/api/diseases")
async def get_diseases():
    try:
        return kg.get_all_diseases()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/drugs")
async def get_drugs():
    try:
        return kg.get_all_drugs()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/predict/{disease_id}")
async def predict_candidates(disease_id: str):
    try:
        if disease_id not in kg.graph:
            raise HTTPException(status_code=404, detail="Disease ID not found in knowledge graph.")
        return model.predict_repurposing(disease_id)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/explain/{drug_id}/{disease_id}")
async def explain_repurposing(drug_id: str, disease_id: str):
    try:
        if disease_id not in kg.graph:
            raise HTTPException(status_code=404, detail="Disease ID not found in knowledge graph.")
        if drug_id not in kg.graph:
            raise HTTPException(status_code=404, detail="Drug ID not found in knowledge graph.")
            
        citations = kg.get_pubmed_citations(drug_id, disease_id)
        drug_info = kg.get_drug_info(drug_id)
        exp_res = explainability.explain_prediction(drug_id, disease_id)
        
        return {
            **exp_res,
            "citations": citations,
            "moa": drug_info["moa"],
            "side_effects": drug_info["side_effects"],
            "targets": [kg.graph.nodes[t]["name"] for t in kg.get_drug_targets(drug_id)]
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/compare/{drug_a_id}/{drug_b_id}/{disease_id}")
async def compare_drugs(drug_a_id: str, drug_b_id: str, disease_id: str):
    """
    Drug Comparison Module: Compares two candidate drugs side-by-side.
    """
    try:
        if disease_id not in kg.graph:
            raise HTTPException(status_code=404, detail="Disease ID not found.")
        if drug_a_id not in kg.graph or drug_b_id not in kg.graph:
            raise HTTPException(status_code=404, detail="One or both Drug IDs not found.")
            
        # Get predictions for both
        preds = model.predict_repurposing(disease_id)
        pred_a = next((p for p in preds if p["drug_id"] == drug_a_id), None)
        pred_b = next((p for p in preds if p["drug_id"] == drug_b_id), None)
        
        if not pred_a or not pred_b:
            raise HTTPException(status_code=404, detail="Failed to get predictions.")
            
        # Get metadata
        info_a = kg.get_drug_info(drug_a_id)
        info_b = kg.get_drug_info(drug_b_id)
        
        # Get pathways
        paths_a = []
        for t in kg.get_drug_targets(drug_a_id):
            paths_a.extend([kg.graph.nodes[nbr]["name"] for nbr in kg.graph.neighbors(t) if kg.graph.nodes[nbr]["type"] == "Pathway"])
        paths_b = []
        for t in kg.get_drug_targets(drug_b_id):
            paths_b.extend([kg.graph.nodes[nbr]["name"] for nbr in kg.graph.neighbors(t) if kg.graph.nodes[nbr]["type"] == "Pathway"])
            
        return {
            "drug_a": {
                "id": drug_a_id,
                "name": pred_a["drug_name"],
                "confidence_score": pred_a["confidence_score"],
                "confidence_breakdown": pred_a["confidence_breakdown"],
                "moa": info_a["moa"],
                "side_effects": info_a["side_effects"],
                "targets": [kg.graph.nodes[t]["name"] for t in kg.get_drug_targets(drug_a_id)],
                "pathways": list(set(paths_a)),
                "citations_count": len(kg.get_pubmed_citations(drug_a_id, disease_id))
            },
            "drug_b": {
                "id": drug_b_id,
                "name": pred_b["drug_name"],
                "confidence_score": pred_b["confidence_score"],
                "confidence_breakdown": pred_b["confidence_breakdown"],
                "moa": info_b["moa"],
                "side_effects": info_b["side_effects"],
                "targets": [kg.graph.nodes[t]["name"] for t in kg.get_drug_targets(drug_b_id)],
                "pathways": list(set(paths_b)),
                "citations_count": len(kg.get_pubmed_citations(drug_b_id, disease_id))
            }
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/pathway/{pathway_id}")
async def get_pathway_details(pathway_id: str):
    """
    Biological Pathway Explorer: Clicking a pathway node reveals its related features.
    """
    try:
        if pathway_id not in kg.graph or kg.graph.nodes[pathway_id]["type"] != "Pathway":
            raise HTTPException(status_code=404, detail="Pathway ID not found in knowledge graph.")
        return kg.get_pathway_info(pathway_id)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/graph/{disease_id}/{drug_id}")
async def get_association_graph(disease_id: str, drug_id: str):
    try:
        dr = None if drug_id == "none" else drug_id
        ds = None if disease_id == "none" else disease_id
        return kg.get_subgraph_nodes_and_edges(drug_id=dr, disease_id=ds)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/report/{disease_id}")
async def download_pdf_report(disease_id: str):
    try:
        if disease_id not in kg.graph:
            raise HTTPException(status_code=404, detail="Disease ID not found.")
            
        disease_name = kg.graph.nodes[disease_id]["name"].replace(" ", "_").lower()
        temp_pdf = f"/tmp/{disease_id}_repurposing_report.pdf"
        report_gen.generate_report(disease_id, temp_pdf)
        
        return FileResponse(
            path=temp_pdf,
            media_type="application/pdf",
            filename=f"{disease_name}_repurposing_report.pdf"
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
