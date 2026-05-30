import shap
import pandas as pd
import numpy as np
from backend.knowledge_graph import BiologicalKnowledgeGraph
from backend.model import DrugRepurposingModel

class ExplainabilityLayer:
    def __init__(self, model_wrapper: DrugRepurposingModel):
        self.model_wrapper = model_wrapper
        self.explainer = None
        self._initialize_explainer()
        
    def _initialize_explainer(self):
        df = self.model_wrapper.build_dataset()
        X = df[self.model_wrapper.feature_names]
        self.explainer = shap.TreeExplainer(self.model_wrapper.model)

    def explain_prediction(self, drug_id, disease_id):
        features = self.model_wrapper.kg.calculate_network_features(drug_id, disease_id)
        feature_df = pd.DataFrame([features])[self.model_wrapper.feature_names]
        
        shap_values = self.explainer.shap_values(feature_df)
        if isinstance(shap_values, list):
            raw_shap = shap_values[1][0]
        else:
            if len(shap_values.shape) > 1 and shap_values.shape[0] == 1:
                raw_shap = shap_values[0]
            else:
                raw_shap = shap_values
                
        explanations = []
        feature_descriptions = {
            "min_shortest_path": "Minimum Shortest Path (Drug Target to Disease Gene)",
            "mean_shortest_path": "Average Shortest Path Distance",
            "jaccard_coefficient": "Jaccard Coeff of Shared Neighbors",
            "common_neighbors": "Number of Common Neighbors",
            "drug_degree": "Drug Node Degree Centrality",
            "disease_degree": "Disease Node Degree Centrality"
        }
        
        for idx, name in enumerate(self.model_wrapper.feature_names):
            val = float(feature_df.iloc[0][name])
            shap_val = float(raw_shap[idx])
            
            explanations.append({
                "feature": name,
                "label": feature_descriptions.get(name, name),
                "value": val,
                "shap_value": shap_val,
                "impact": "Positive" if shap_val > 0 else ("Negative" if shap_val < 0 else "Neutral")
            })
            
        explanations.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        summary = self._run_explanation_agent(drug_id, disease_id, explanations)
        
        return {
            "explanations": explanations,
            "text_summary": summary
        }

    def _run_explanation_agent(self, drug_id, disease_id, explanations):
        """
        Drug Discovery Explanation Agent: Generates natural-language mechanistic explanations
        following the upgraded blueprint specifications.
        """
        drug_name = self.model_wrapper.kg.graph.nodes[drug_id]["name"]
        disease_name = self.model_wrapper.kg.graph.nodes[disease_id]["name"]
        
        targets = self.model_wrapper.kg.get_drug_targets(drug_id)
        target_names = [self.model_wrapper.kg.graph.nodes[t]["name"] for t in targets]
        
        # Retrieve drug MoA
        drug_info = self.model_wrapper.kg.get_drug_info(drug_id)
        moa = drug_info["moa"].lower().rstrip(".")
        
        # Find related pathways in knowledge graph
        pathways = []
        for t in targets:
            for nbr in self.model_wrapper.kg.graph.neighbors(t):
                if self.model_wrapper.kg.graph.nodes[nbr]["type"] == "Pathway":
                    pathways.append(self.model_wrapper.kg.graph.nodes[nbr]["name"])
                    
        primary_pathway = pathways[0] if pathways else "biological interactome"
        
        # Format list of target proteins for template
        target_str = ", ".join(target_names)
        if len(target_names) > 1:
            target_str = f"{', '.join(target_names[:-1])} and {target_names[-1]}"
            
        # Structure the natural language explanation matching the Selegiline example in the blueprint
        explanation = (
            f"{drug_name} is predicted as a repurposing candidate because it operates as a {moa} "
            f"and affects {primary_pathway.lower()} signaling pathways that intersect with "
            f"{disease_name}-associated neurodegenerative mechanisms through {target_str}-mediated regulation. "
        )
        
        # Add supplementary structural network metrics detail
        top_positive = [e for e in explanations if e["shap_value"] > 0]
        if top_positive:
            prim = top_positive[0]
            if prim["feature"] == "min_shortest_path":
                explanation += (
                    f"The proximity analysis indicates a very close topological path of {int(prim['value'])} hop(s) "
                    f"between {drug_name}'s direct protein bindings and the active genetic drivers of {disease_name}."
                )
            elif prim["feature"] == "jaccard_coefficient":
                explanation += (
                    f"The model identified a high degree of common neighbors between {drug_name} and the targets of {disease_name}, "
                    f"indicating strong therapeutic potential through pathway convergence."
                )
                
        return explanation
