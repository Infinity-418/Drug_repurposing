import os
import tempfile
from backend.knowledge_graph import BiologicalKnowledgeGraph
from backend.model import DrugRepurposingModel
from backend.explainability import ExplainabilityLayer
from backend.report_generator import PDFReportGenerator

def test_knowledge_graph():
    kg = BiologicalKnowledgeGraph()
    diseases = kg.get_all_diseases()
    drugs = kg.get_all_drugs()
    
    assert len(diseases) > 0
    assert len(drugs) > 0
    
    # Check specific disease
    alz_nodes = [d for d in diseases if d["id"] == "D_ALZ"]
    assert len(alz_nodes) == 1
    assert alz_nodes[0]["name"] == "Alzheimer's Disease"
    
    # Check associated genes
    genes = kg.get_disease_associated_genes("D_ALZ")
    assert len(genes) > 0
    assert "G_ACHE" in genes
    
    # Check network feature calculation
    features = kg.calculate_network_features("DR_DONEPEZIL", "D_ALZ")
    assert "min_shortest_path" in features
    assert features["min_shortest_path"] < 10.0 # Donepezil targets ACHE which associates with D_ALZ (so min path should be 1 hop)

def test_model_training_and_prediction():
    kg = BiologicalKnowledgeGraph()
    model = DrugRepurposingModel(kg)
    
    # Verify dataset build
    df = model.build_dataset()
    assert len(df) > 0
    assert "min_shortest_path" in df.columns
    assert "label" in df.columns
    
    # Verify prediction outputs
    preds = model.predict_repurposing("D_ALZ")
    assert len(preds) > 0
    
    # Predictions should contain drug metadata and prob
    first_pred = preds[0]
    assert "drug_id" in first_pred
    assert "probability" in first_pred
    assert "confidence_score" in first_pred

def test_explainability():
    kg = BiologicalKnowledgeGraph()
    model = DrugRepurposingModel(kg)
    explainer = ExplainabilityLayer(model)
    
    explanation = explainer.explain_prediction("DR_DONEPEZIL", "D_ALZ")
    assert "explanations" in explanation
    assert "text_summary" in explanation
    
    exps = explanation["explanations"]
    assert len(exps) == len(model.feature_names)
    assert any(e["feature"] == "min_shortest_path" for e in exps)

def test_report_generation():
    kg = BiologicalKnowledgeGraph()
    model = DrugRepurposingModel(kg)
    explainer = ExplainabilityLayer(model)
    report_gen = PDFReportGenerator(kg, model, explainer)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        pdf_path = os.path.join(tmpdir, "test_report.pdf")
        report_gen.generate_report("D_ALZ", pdf_path)
        assert os.path.exists(pdf_path)
        assert os.path.getsize(pdf_path) > 0
