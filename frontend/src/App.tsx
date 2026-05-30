import React, { useState, useEffect } from 'react';
import { 
  Dna, 
  Search, 
  Download, 
  Network, 
  BarChart3, 
  ShieldAlert,
  ChevronRight,
  TrendingUp,
  Columns,
  BookOpen,
  X,
  PlusCircle,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import GraphExplorer from './components/GraphExplorer';
import AnalyticsPanel from './components/AnalyticsPanel';

interface Disease {
  id: string;
  name: string;
}

interface ConfidenceBreakdown {
  network_similarity: number;
  pathway_overlap: number;
  target_similarity: number;
  literature_evidence: number;
  network_contribution: number;
  pathway_contribution: number;
  target_contribution: number;
  literature_contribution: number;
}

interface DrugPrediction {
  drug_id: string;
  drug_name: string;
  probability: number;
  confidence_score: number;
  confidence_tier: 'High' | 'Medium' | 'Borderline' | 'Low';
  confidence_breakdown: ConfidenceBreakdown;
  is_approved: boolean;
  features: {
    min_shortest_path: number;
    mean_shortest_path: number;
    jaccard_coefficient: number;
    common_neighbors: number;
    drug_degree: number;
    disease_degree: number;
  };
  evidence_count: number;
}

interface PubMedCitation {
  pmid: string;
  title: string;
  journal: string;
  year: string;
  type: string;
}

interface ExplanationData {
  explanations: any[];
  text_summary: string;
  citations: PubMedCitation[];
  moa: string;
  side_effects: string[];
  targets: string[];
}

interface PathwayDetails {
  id: string;
  name: string;
  desc: string;
  importance: number;
  genes: string[];
  diseases: string[];
  drugs: string[];
}

interface ComparisonData {
  drug_a: {
    id: string;
    name: string;
    confidence_score: number;
    confidence_breakdown: ConfidenceBreakdown;
    moa: string;
    side_effects: string[];
    targets: string[];
    pathways: string[];
    citations_count: number;
  };
  drug_b: {
    id: string;
    name: string;
    confidence_score: number;
    confidence_breakdown: ConfidenceBreakdown;
    moa: string;
    side_effects: string[];
    targets: string[];
    pathways: string[];
    citations_count: number;
  };
}

function App() {
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [selectedDiseaseId, setSelectedDiseaseId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [predictions, setPredictions] = useState<DrugPrediction[]>([]);
  const [selectedDrug, setSelectedDrug] = useState<DrugPrediction | null>(null);
  
  // Tabs & Details states
  const [activeTab, setActiveTab] = useState<'graph' | 'xai' | 'compare'>('graph');
  const [explanation, setExplanation] = useState<ExplanationData | null>(null);
  const [graphData, setGraphData] = useState<any>({ nodes: [], edges: [] });
  
  // Biological Pathway Explorer State
  const [selectedPathway, setSelectedPathway] = useState<PathwayDetails | null>(null);
  const [loadingPathway, setLoadingPathway] = useState<boolean>(false);
  
  // Drug Comparison Module State
  const [compareDrugAId, setCompareDrugAId] = useState<string>('');
  const [compareDrugBId, setCompareDrugBId] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<ComparisonData | null>(null);
  const [loadingComparison, setLoadingComparison] = useState<boolean>(false);

  // Loading & UI States
  const [approvedExpanded, setApprovedExpanded] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<'all' | 'high' | 'short_path' | 'has_lit' | 'safe'>('all');
  const [loadingDiseases, setLoadingDiseases] = useState<boolean>(true);
  const [loadingPredictions, setLoadingPredictions] = useState<boolean>(false);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch available diseases
  useEffect(() => {
    fetch('/api/diseases')
      .then(res => {
        if (!res.ok) throw new Error('Failed to retrieve diseases list');
        return res.json();
      })
      .then((data: Disease[]) => {
        setDiseases(data);
        if (data.length > 0) {
          const alz = data.find(d => d.id === 'D_ALZ');
          setSelectedDiseaseId(alz ? alz.id : data[0].id);
        }
        setLoadingDiseases(false);
      })
      .catch(err => {
        console.error(err);
        setError('Connection to FastAPI backend failed. Please run run.sh to launch servers.');
        setLoadingDiseases(false);
      });
  }, []);

  // 2. Fetch predictions
  useEffect(() => {
    if (!selectedDiseaseId) return;

    setLoadingPredictions(true);
    setPredictions([]);
    setSelectedDrug(null);
    setExplanation(null);
    setSelectedPathway(null);
    setComparisonResult(null);
    setCompareDrugAId('');
    setCompareDrugBId('');
    
    fetch(`/api/predict/${selectedDiseaseId}`)
      .then(res => {
        if (!res.ok) throw new Error('Prediction model execution failed');
        return res.json();
      })
      .then((data: DrugPrediction[]) => {
        setPredictions(data);
        
        // Auto-select the first predicted candidate
        const topRepurposed = data.find(p => !p.is_approved);
        if (topRepurposed) {
          setSelectedDrug(topRepurposed);
          setCompareDrugAId(topRepurposed.drug_id);
          const secondRepurposed = data.find(p => !p.is_approved && p.drug_id !== topRepurposed.drug_id);
          if (secondRepurposed) {
            setCompareDrugBId(secondRepurposed.drug_id);
          } else if (data.length > 1) {
            setCompareDrugBId(data[1].drug_id);
          }
        } else if (data.length > 0) {
          setSelectedDrug(data[0]);
        }
        setLoadingPredictions(false);
      })
      .catch(err => {
        console.error(err);
        setError('Error fetching drug repurposing candidates.');
        setLoadingPredictions(false);
      });
  }, [selectedDiseaseId]);

  // 3. Fetch details
  useEffect(() => {
    if (!selectedDiseaseId || !selectedDrug) return;

    setLoadingDetails(true);
    
    const explainPromise = fetch(`/api/explain/${selectedDrug.drug_id}/${selectedDiseaseId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to compute SHAP values');
        return res.json();
      });

    const graphPromise = fetch(`/api/graph/${selectedDiseaseId}/${selectedDrug.drug_id}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to retrieve subnetwork structures');
        return res.json();
      });

    Promise.all([explainPromise, graphPromise])
      .then(([exp, graph]) => {
        setExplanation(exp);
        setGraphData(graph);
        setLoadingDetails(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingDetails(false);
      });
  }, [selectedDiseaseId, selectedDrug]);

  // Fetch Pathway Details
  const handlePathwaySelect = (pathwayId: string) => {
    setLoadingPathway(true);
    fetch(`/api/pathway/${pathwayId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch pathway details');
        return res.json();
      })
      .then((data: PathwayDetails) => {
        setSelectedPathway(data);
        setLoadingPathway(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingPathway(false);
      });
  };

  // Compare Drugs
  const handleCompareClick = () => {
    if (!compareDrugAId || !compareDrugBId || !selectedDiseaseId) return;

    setLoadingComparison(true);
    fetch(`/api/compare/${compareDrugAId}/${compareDrugBId}/${selectedDiseaseId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to compare drugs');
        return res.json();
      })
      .then((data: ComparisonData) => {
        setComparisonResult(data);
        setLoadingComparison(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingComparison(false);
      });
  };

  useEffect(() => {
    if (activeTab === 'compare') {
      handleCompareClick();
    }
  }, [activeTab, compareDrugAId, compareDrugBId]);

  const filteredPredictions = predictions.filter(p => {
    const matchesSearch = p.drug_name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    
    if (filterType === 'high') {
      return p.confidence_score >= 50.0;
    }
    if (filterType === 'short_path') {
      return p.features.min_shortest_path <= 2;
    }
    if (filterType === 'has_lit') {
      return p.evidence_count > 0;
    }
    if (filterType === 'safe') {
      return p.confidence_breakdown.target_similarity >= 30.0;
    }
    return true;
  });

  const repurposedCandidates = filteredPredictions.filter(p => !p.is_approved);
  const approvedCandidates = filteredPredictions.filter(p => p.is_approved);

  const selectedDiseaseName = diseases.find(d => d.id === selectedDiseaseId)?.name || '';

  // PubMed Citations Sorter (Clinical Trial > Clinical Study > Review > Target/Preclinical)
  const getSortedCitations = () => {
    if (!explanation || !explanation.citations) return [];
    
    return [...explanation.citations].sort((a, b) => {
      const getStrength = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes('clinical trial')) return 4;
        if (t.includes('clinical study')) return 3;
        if (t.includes('review')) return 2;
        return 1; // target / preclinical / disease-mechanism
      };
      return getStrength(b.type) - getStrength(a.type);
    });
  };

  const getCitationBadgeClass = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('clinical trial')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
    if (t.includes('clinical study')) {
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
    if (t.includes('review')) {
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    }
    return 'bg-amber-500/10 text-amber-450 border-amber-500/20'; // preclinical/target
  };

  // Loading state checks for download protection
  const isDownloadDisabled = loadingDiseases || !selectedDiseaseId;

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-50 glass border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-indigo-500 to-cyan-500 rounded-xl shadow-lg shadow-indigo-500/20">
            <Dna className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-300">
              Nebula Platform
            </h1>
            <p className="text-xs text-cyan-400 font-semibold tracking-wider uppercase">
              AI-Guided Drug Repurposing (Upgraded)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-grow md:flex-grow-0">
            <select
              value={selectedDiseaseId}
              onChange={(e) => setSelectedDiseaseId(e.target.value)}
              className="w-full md:w-64 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 appearance-none font-display font-medium cursor-pointer"
            >
              {loadingDiseases ? (
                <option>Loading target indications...</option>
              ) : (
                diseases.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))
              )}
            </select>
            <div className="absolute right-3 top-3.5 pointer-events-none w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-slate-400" />
          </div>

          {/* Loading state download button guard */}
          <a
            href={isDownloadDisabled ? "#" : `/api/report/${selectedDiseaseId}`}
            download
            onClick={(e) => isDownloadDisabled && e.preventDefault()}
            aria-label="Download research PDF report"
            title="Download research PDF report"
            className={`flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-lg shadow-cyan-500/10 transition-all cursor-pointer ${isDownloadDisabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export Upgraded Report</span>
          </a>
        </div>
      </header>

      {error && (
        <div className="m-6 bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-center gap-3 text-rose-300 text-sm">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <div>
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="flex-grow p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:h-[calc(100vh-80px)] lg:overflow-hidden overflow-y-auto">
        {/* SIDEBAR: Candidate Listings & Disclaimer */}
        <section className="lg:col-span-3 flex flex-col gap-4 h-full overflow-hidden">
          {/* Candidates Card */}
          <div className="flex-grow flex flex-col glass rounded-xl border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 space-y-3 flex-shrink-0">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-350">
                Candidates
              </h2>
              <span className="text-xs bg-slate-800 text-slate-350 px-2 py-0.5 rounded-full font-semibold">
                {repurposedCandidates.length} predicted
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search compounds..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-550 focus:outline-none"
              />
            </div>
            
            {/* Filter pills */}
            <div className="flex flex-wrap gap-1 mt-2.5">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all border ${
                  filterType === 'all'
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800/80 hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('high')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all border ${
                  filterType === 'high'
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800/80 hover:text-slate-200'
                }`}
              >
                High Conf
              </button>
              <button
                onClick={() => setFilterType('short_path')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all border ${
                  filterType === 'short_path'
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800/80 hover:text-slate-200'
                }`}
              >
                Short Path
              </button>
              <button
                onClick={() => setFilterType('has_lit')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all border ${
                  filterType === 'has_lit'
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800/80 hover:text-slate-200'
                }`}
              >
                Has Lit
              </button>
              <button
                onClick={() => setFilterType('safe')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all border ${
                  filterType === 'safe'
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800/80 hover:text-slate-200'
                }`}
                title="Low Risk: Target specificity score >= 30%"
              >
                Low Risk
              </button>
            </div>
          </div>

          {/* Denser List with explicit separation & Mobile Max-Height Limit */}
          <div className="flex-grow overflow-y-auto max-h-[320px] lg:max-h-none divide-y divide-slate-800/40">
            {loadingPredictions ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-400">Running inference model...</p>
              </div>
            ) : filteredPredictions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-350 space-y-3">
                <p>No compounds found matching <br/><strong>"{searchQuery}"</strong></p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3 py-1.5 rounded hover:bg-cyan-500/20 transition-colors font-semibold"
                >
                  Clear Search Filter
                </button>
              </div>
            ) : (
              <div className="space-y-4 py-3">
                {/* 1. Predicted Candidates Section (Dense Padding) */}
                {repurposedCandidates.length > 0 && (
                  <div className="space-y-1">
                    <span className="px-4 text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">
                      Predicted Repurposing Candidates
                    </span>
                    <div className="divide-y divide-slate-800/20">
                      {repurposedCandidates.map((cand) => {
                        const isSelected = selectedDrug?.drug_id === cand.drug_id;
                        return (
                          <button
                            key={cand.drug_id}
                            onClick={() => setSelectedDrug(cand)}
                            aria-describedby={`tooltip-${cand.drug_id}`}
                            className={`w-full text-left px-4 py-2.5 transition-all flex justify-between items-center group border-l-4 ${
                              isSelected 
                                ? 'bg-indigo-600/15 border-cyan-500' 
                                : 'hover:bg-slate-900/35 border-transparent'
                            }`}
                          >
                            <div className="space-y-0.5 pr-2 text-left">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-sm text-slate-200 group-hover:text-cyan-400 transition-colors">
                                  {cand.drug_name}
                                </span>
                                <span className={`text-[8px] px-1.5 py-0.2 rounded border font-semibold uppercase tracking-wider ${
                                  cand.confidence_tier === 'High' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                  cand.confidence_tier === 'Medium' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                                  cand.confidence_tier === 'Borderline' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                  'bg-slate-500/10 text-slate-400 border-slate-750/20'
                                }`}>
                                  {cand.confidence_tier}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-350 flex items-center gap-1 flex-wrap">
                                <span>Shortest KG Path:</span>
                                <span className="font-semibold text-slate-200">{cand.features.min_shortest_path} {cand.features.min_shortest_path === 1 ? 'hop' : 'hops'}</span>
                              </div>
                              <div className="text-[9px] text-slate-450 flex items-center gap-1.5">
                                <span>{cand.features.common_neighbors} targets</span>
                                <span>•</span>
                                <span>{cand.evidence_count} pub(s)</span>
                              </div>
                              
                              {/* Accessible Tooltip description for screen readers */}
                              <span id={`tooltip-${cand.drug_id}`} className="sr-only">
                                Confidence breakdown: network similarity {cand.confidence_breakdown.network_similarity} percent, pathway overlap {cand.confidence_breakdown.pathway_overlap} percent, target similarity {cand.confidence_breakdown.target_similarity} percent, literature evidence {cand.confidence_breakdown.literature_evidence} percent.
                              </span>
                            </div>
                            
                            <div className="text-right flex items-center gap-2">
                              <div 
                                className="cursor-help text-right"
                                title={`Confidence Score Breakdown:\n- Network Similarity: ${cand.confidence_breakdown.network_similarity}%\n- Pathway Overlap: ${cand.confidence_breakdown.pathway_overlap}%\n- Target Similarity: ${cand.confidence_breakdown.target_similarity}%\n- Literature Evidence: ${cand.confidence_breakdown.literature_evidence}%`}
                              >
                                <span className="block text-xs font-bold text-slate-200 border-b border-dashed border-slate-700/60 hover:border-slate-550 transition-colors">
                                  {cand.confidence_score}%
                                </span>
                                <span className="block text-[8px] text-slate-400 uppercase tracking-wider">
                                  Confidence
                                </span>
                              </div>
                              <ChevronRight className={`w-3.5 h-3.5 text-slate-650 group-hover:text-slate-450 transition-transform ${isSelected ? 'translate-x-0.5 text-cyan-500' : ''}`} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Known / Approved Treatments Section (Collapsible Accordion) */}
                {approvedCandidates.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-slate-800/40">
                    <button
                      onClick={() => setApprovedExpanded(!approvedExpanded)}
                      className="w-full px-4 py-2 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-200 transition-colors"
                    >
                      <span>Known / Approved Treatments ({approvedCandidates.length})</span>
                      <ChevronRight className={`w-3.5 h-3.5 transform transition-transform ${approvedExpanded ? 'rotate-90 text-emerald-500' : ''}`} />
                    </button>
                    {approvedExpanded && (
                      <div className="divide-y divide-slate-800/20 opacity-80">
                        {approvedCandidates.map((cand) => {
                          const isSelected = selectedDrug?.drug_id === cand.drug_id;
                          return (
                            <button
                              key={cand.drug_id}
                              onClick={() => setSelectedDrug(cand)}
                              aria-describedby={`tooltip-${cand.drug_id}`}
                              className={`w-full text-left px-4 py-2.5 transition-all flex justify-between items-center group border-l-4 ${
                                isSelected 
                                  ? 'bg-indigo-600/10 border-emerald-500' 
                                  : 'hover:bg-slate-900/35 border-transparent'
                              }`}
                            >
                              <div className="space-y-0.5 pr-2 text-left">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-medium text-sm text-slate-350 group-hover:text-emerald-400 transition-colors">
                                    {cand.drug_name}
                                  </span>
                                  <span className={`text-[8px] px-1.5 py-0.2 rounded border font-semibold uppercase tracking-wider ${
                                    cand.confidence_tier === 'High' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    cand.confidence_tier === 'Medium' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                                    cand.confidence_tier === 'Borderline' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                    'bg-slate-500/10 text-slate-400 border-slate-750/20'
                                  }`}>
                                    {cand.confidence_tier}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  Approved Indication
                                </div>
                                <div className="text-[9px] text-slate-505 flex items-center gap-1.5">
                                  <span>{cand.features.common_neighbors} targets</span>
                                  <span>•</span>
                                  <span>{cand.evidence_count} pub(s)</span>
                                </div>
                                
                                {/* Accessible Tooltip description for screen readers */}
                                <span id={`tooltip-${cand.drug_id}`} className="sr-only">
                                  Confidence breakdown: network similarity {cand.confidence_breakdown.network_similarity} percent, pathway overlap {cand.confidence_breakdown.pathway_overlap} percent, target similarity {cand.confidence_breakdown.target_similarity} percent, literature evidence {cand.confidence_breakdown.literature_evidence} percent.
                                </span>
                              </div>
                              <div className="text-right flex items-center gap-2">
                                <div 
                                  className="cursor-help text-right"
                                  title={`Confidence Score Breakdown:\n- Network Similarity: ${cand.confidence_breakdown.network_similarity}%\n- Pathway Overlap: ${cand.confidence_breakdown.pathway_overlap}%\n- Target Similarity: ${cand.confidence_breakdown.target_similarity}%\n- Literature Evidence: ${cand.confidence_breakdown.literature_evidence}%`}
                                >
                                  <span className="block text-xs font-bold text-slate-350 border-b border-dashed border-slate-700/60 hover:border-slate-550 transition-colors">
                                    {cand.confidence_score}%
                                  </span>
                                  <span className="block text-[8px] text-slate-505 uppercase tracking-wider">
                                    Confidence
                                  </span>
                                </div>
                                <ChevronRight className={`w-3.5 h-3.5 text-slate-650 group-hover:text-slate-450 transition-transform ${isSelected ? 'translate-x-0.5 text-emerald-500' : ''}`} />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          </div>

          {/* Sticky Medical Disclaimer (Separate Notice Band Card) */}
          <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 text-[10px] text-slate-350 leading-relaxed flex gap-2 flex-shrink-0 shadow-lg">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Clinical Disclaimer:</strong> For research support only. Not for clinical guidance or medical advice.
            </p>
          </div>
        </section>

        {/* MIDDLE VIEWER: Primary Tabs */}
        <section className={`flex flex-col h-full overflow-hidden ${selectedPathway ? 'lg:col-span-6' : 'lg:col-span-9'}`}>
          {selectedDrug ? (
            <div className="flex flex-col h-full space-y-4">
              {/* Tab navigation headers with Mobile select dropdown switch */}
              <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                {/* Mobile Segmented Controller */}
                <div className="block md:hidden w-full bg-slate-950 p-1 rounded-lg border border-slate-805">
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() => setActiveTab('graph')}
                      className={`px-1 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-md text-center transition-all ${
                        activeTab === 'graph'
                          ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700/40'
                          : 'text-slate-400 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      Network
                    </button>
                    <button
                      onClick={() => setActiveTab('xai')}
                      className={`px-1 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-md text-center transition-all ${
                        activeTab === 'xai'
                          ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700/40'
                          : 'text-slate-400 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      SHAP (XAI)
                    </button>
                    <button
                      onClick={() => setActiveTab('compare')}
                      className={`px-1 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-md text-center transition-all ${
                        activeTab === 'compare'
                          ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700/40'
                          : 'text-slate-400 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      Compare
                    </button>
                  </div>
                </div>

                {/* Desktop Tabs */}
                <div className="hidden md:flex gap-2">
                  <button
                    onClick={() => setActiveTab('graph')}
                    className={`flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border ${
                      activeTab === 'graph'
                        ? 'bg-slate-900 border-slate-700 text-cyan-400 shadow-inner'
                        : 'border-transparent text-slate-450 hover:text-slate-200'
                    }`}
                  >
                    <Network className="w-4 h-4" />
                    Knowledge Graph Explorer
                  </button>
                  <button
                    onClick={() => setActiveTab('xai')}
                    className={`flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border ${
                      activeTab === 'xai'
                        ? 'bg-slate-900 border-slate-700 text-cyan-400 shadow-inner'
                        : 'border-transparent text-slate-450 hover:text-slate-200'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    Explainable AI (SHAP)
                  </button>
                  <button
                    onClick={() => setActiveTab('compare')}
                    className={`flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border ${
                      activeTab === 'compare'
                        ? 'bg-slate-900 border-slate-700 text-cyan-400 shadow-inner'
                        : 'border-transparent text-slate-450 hover:text-slate-200'
                    }`}
                  >
                    <Columns className="w-4 h-4" />
                    Drug Comparison Module
                  </button>
                </div>

                <div className="hidden xl:flex items-center gap-2 text-xs bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-lg">
                  <span className="text-slate-400">Target Drug:</span>
                  <span className="font-semibold text-cyan-400">{selectedDrug.drug_name}</span>
                </div>
              </div>

              {/* Viewer panels */}
              <div className="flex-grow relative overflow-y-auto pr-1">
                {loadingDetails ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-brand-bg/85 z-20 gap-3">
                    <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-slate-400">Loading details...</p>
                  </div>
                ) : null}

                {activeTab === 'graph' && (
                  <div className="w-full h-[480px] md:h-full min-h-[480px] md:min-h-[500px]">
                    <GraphExplorer
                      elements={graphData}
                      selectedNodeId={selectedDrug.drug_id}
                      drugName={selectedDrug.drug_name}
                      diseaseName={selectedDiseaseName}
                      onPathwaySelect={handlePathwaySelect}
                    />
                  </div>
                )}

                {activeTab === 'xai' && explanation && (() => {
                  const sortedCitations = getSortedCitations();
                  const hasClinicalTrial = sortedCitations.some(c => c.type.toLowerCase().includes('clinical trial'));
                  const hasClinicalStudy = sortedCitations.some(c => c.type.toLowerCase().includes('clinical study'));
                  const hasReview = sortedCitations.some(c => c.type.toLowerCase().includes('review'));
                  
                  let evidenceRollupLabel = "Preclinical / Mechanistic";
                  let evidenceRollupColor = "bg-amber-500/10 text-amber-450 border-amber-500/20";
                  
                  if (hasClinicalTrial) {
                    evidenceRollupLabel = "Clinical Trial (Phase I-IV)";
                    evidenceRollupColor = "bg-emerald-500/10 text-emerald-450 border-emerald-500/20";
                  } else if (hasClinicalStudy) {
                    evidenceRollupLabel = "Clinical Study";
                    evidenceRollupColor = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                  } else if (hasReview) {
                    evidenceRollupLabel = "Review Paper";
                    evidenceRollupColor = "bg-purple-500/10 text-purple-400 border-purple-500/20";
                  }

                  return (
                    <div className="grid grid-cols-1 gap-6">
                      <AnalyticsPanel
                        explanations={explanation.explanations}
                        textSummary={explanation.text_summary}
                        probability={selectedDrug.probability}
                        confidenceScore={selectedDrug.confidence_score}
                        breakdown={selectedDrug.confidence_breakdown}
                      />
                      
                      {/* UPGRADED EVIDENCE PANEL */}
                      <div className="glass p-5 rounded-xl border border-slate-800 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-rose-400" />
                            Upgraded Evidence Panel
                          </h3>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wide max-w-fit ${evidenceRollupColor}`}>
                            Evidence Strength: {evidenceRollupLabel}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div className="space-y-2">
                            <span className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                              Mechanism of Action
                            </span>
                            <p className="text-slate-350 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
                              {explanation.moa}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <span className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                              Side-effect Profile
                            </span>
                            <div className="flex flex-wrap gap-1.5 p-3 bg-slate-950/40 rounded-lg border border-slate-800/80">
                              {explanation.side_effects.map((se, i) => (
                                <span key={i} className="bg-rose-950/30 text-rose-455 border border-rose-900/40 px-2 py-0.5 rounded text-[10px]">
                                  {se}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* PubMed bibliography publications sorted by Clinical Strength badge */}
                        <div className="space-y-2.5 pt-2">
                          <span className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                            PubMed References & Citations (Sorted by Evidence Strength)
                          </span>
                          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                            {sortedCitations.map((cit, i) => (
                              <div key={i} className="p-3 bg-slate-950/50 rounded-lg border border-slate-800/60 flex items-start gap-3">
                                <a
                                  href={`https://pubmed.ncbi.nlm.nih.gov/${cit.pmid}/`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-indigo-950/30 text-indigo-400 font-bold border border-indigo-900/40 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider flex-shrink-0 hover:bg-indigo-900/40 transition-colors"
                                  title="Open PubMed article (External source)"
                                >
                                  PMID: {cit.pmid} ↗
                                </a>
                                <div className="text-xs space-y-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-slate-200 font-medium">{cit.title}</p>
                                    <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded border uppercase flex-shrink-0 ${getCitationBadgeClass(cit.type)}`}>
                                      {cit.type}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500">
                                    {cit.journal} ({cit.year})
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {activeTab === 'compare' && (
                  <div className="glass p-5 rounded-xl border border-slate-800 space-y-5">
                    {/* Setup selectors */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 justify-between bg-slate-950/35 p-3 rounded-lg border border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <select
                          value={compareDrugAId}
                          onChange={(e) => setCompareDrugAId(e.target.value)}
                          className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded px-2 py-1 focus:outline-none"
                        >
                          {predictions.map(p => (
                            <option key={p.drug_id} value={p.drug_id}>{p.drug_name}</option>
                          ))}
                        </select>
                        <span className="text-slate-500 text-xs">VS</span>
                        <select
                          value={compareDrugBId}
                          onChange={(e) => setCompareDrugBId(e.target.value)}
                          className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded px-2 py-1 focus:outline-none"
                        >
                          {predictions.map(p => (
                            <option key={p.drug_id} value={p.drug_id}>{p.drug_name}</option>
                          ))}
                        </select>
                      </div>
                      <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                        Comparison Matrix
                      </h4>
                    </div>

                    {loadingComparison ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-slate-400">Loading side-by-side comparison...</p>
                      </div>
                    ) : (
                      comparisonResult && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-slate-350 border-collapse">
                            <thead>
                              <tr className="border-b border-slate-850 text-slate-400 uppercase tracking-wider text-[9px]">
                                <th className="p-3 text-left w-1/4">Metric Section</th>
                                <th className="p-3 text-left w-3/8 text-cyan-400 font-semibold bg-cyan-950/10">
                                  {comparisonResult.drug_a.name}
                                </th>
                                <th className="p-3 text-left w-3/8 text-indigo-400 font-semibold bg-indigo-950/10">
                                  {comparisonResult.drug_b.name}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                              {/* GROUP 1: Scores & Metrics */}
                              <tr className="bg-slate-900/60 border-y border-slate-800/80">
                                <td colSpan={3} className="p-2 font-bold text-slate-200 text-[10px] uppercase tracking-wider">
                                  1. Scores & Computational Metrics
                                </td>
                              </tr>
                              <tr>
                                <td className="p-3 font-semibold text-slate-400 pl-6">Confidence Score</td>
                                <td className="p-3 font-extrabold text-cyan-400 bg-cyan-950/10">
                                  {comparisonResult.drug_a.confidence_score}%
                                </td>
                                <td className="p-3 font-extrabold text-indigo-400 bg-indigo-950/10">
                                  {comparisonResult.drug_b.confidence_score}%
                                </td>
                              </tr>
                              <tr>
                                <td className="p-3 font-semibold text-slate-400 pl-6">Network Proximity Breakdown</td>
                                <td className="p-3 bg-cyan-950/10 leading-normal space-y-1">
                                  <div>Network Similarity: <strong>{comparisonResult.drug_a.confidence_breakdown.network_similarity}%</strong></div>
                                  <div>Pathway Overlap: <strong>{comparisonResult.drug_a.confidence_breakdown.pathway_overlap}%</strong></div>
                                </td>
                                <td className="p-3 bg-indigo-950/10 leading-normal space-y-1">
                                  <div>Network Similarity: <strong>{comparisonResult.drug_b.confidence_breakdown.network_similarity}%</strong></div>
                                  <div>Pathway Overlap: <strong>{comparisonResult.drug_b.confidence_breakdown.pathway_overlap}%</strong></div>
                                </td>
                              </tr>

                              {/* GROUP 2: Mechanisms of Action */}
                              <tr className="bg-slate-900/60 border-y border-slate-800/80">
                                <td colSpan={3} className="p-2 font-bold text-slate-200 text-[10px] uppercase tracking-wider">
                                  2. Mechanisms & Target Profile
                                </td>
                              </tr>
                              <tr>
                                <td className="p-3 font-semibold text-slate-400 pl-6">Mechanism of Action</td>
                                <td className="p-3 leading-relaxed bg-cyan-950/10">{comparisonResult.drug_a.moa}</td>
                                <td className="p-3 leading-relaxed bg-indigo-950/10">{comparisonResult.drug_b.moa}</td>
                              </tr>
                              <tr>
                                <td className="p-3 font-semibold text-slate-400 pl-6">Target Genes</td>
                                <td className="p-3 bg-cyan-950/10">
                                  <div className="flex flex-wrap gap-1">
                                    {comparisonResult.drug_a.targets.map((t, i) => (
                                      <span key={i} className="bg-slate-800 px-2 py-0.5 rounded text-[10px] font-semibold">{t}</span>
                                    ))}
                                  </div>
                                </td>
                                <td className="p-3 bg-indigo-950/10">
                                  <div className="flex flex-wrap gap-1">
                                    {comparisonResult.drug_b.targets.map((t, i) => (
                                      <span key={i} className="bg-slate-800 px-2 py-0.5 rounded text-[10px] font-semibold">{t}</span>
                                    ))}
                                  </div>
                                </td>
                              </tr>

                              {/* GROUP 3: Pathways & Signaling */}
                              <tr className="bg-slate-900/60 border-y border-slate-800/80">
                                <td colSpan={3} className="p-2 font-bold text-slate-200 text-[10px] uppercase tracking-wider">
                                  3. Pathways & Signaling Convergences
                                </td>
                              </tr>
                              <tr>
                                <td className="p-3 font-semibold text-slate-400 pl-6">Associated Pathways</td>
                                <td className="p-3 bg-cyan-950/10">
                                  <div className="flex flex-wrap gap-1">
                                    {comparisonResult.drug_a.pathways.map((p, i) => (
                                      <span key={i} className="bg-slate-800/80 px-2 py-0.5 rounded text-[10px] text-cyan-300 font-medium">{p}</span>
                                    ))}
                                  </div>
                                </td>
                                <td className="p-3 bg-indigo-950/10">
                                  <div className="flex flex-wrap gap-1">
                                    {comparisonResult.drug_b.pathways.map((p, i) => (
                                      <span key={i} className="bg-slate-800/80 px-2 py-0.5 rounded text-[10px] text-indigo-300 font-medium">{p}</span>
                                    ))}
                                  </div>
                                </td>
                              </tr>

                              {/* GROUP 4: Safety & Side Effects */}
                              <tr className="bg-slate-900/60 border-y border-slate-800/80">
                                <td colSpan={3} className="p-2 font-bold text-slate-200 text-[10px] uppercase tracking-wider">
                                  4. Safety & Side-effect Profiles
                                </td>
                              </tr>
                              <tr>
                                <td className="p-3 font-semibold text-slate-400 pl-6">Side-effects List</td>
                                <td className="p-3 bg-cyan-950/10">
                                  <div className="flex flex-wrap gap-1">
                                    {comparisonResult.drug_a.side_effects.map((se, i) => (
                                      <span key={i} className="bg-rose-950/20 text-rose-400 border border-rose-900/30 px-2 py-0.5 rounded text-[10px]">{se}</span>
                                    ))}
                                  </div>
                                </td>
                                <td className="p-3 bg-indigo-950/10">
                                  <div className="flex flex-wrap gap-1">
                                    {comparisonResult.drug_b.side_effects.map((se, i) => (
                                      <span key={i} className="bg-rose-950/20 text-rose-400 border border-rose-900/30 px-2 py-0.5 rounded text-[10px]">{se}</span>
                                    ))}
                                  </div>
                                </td>
                              </tr>

                              {/* GROUP 5: PubMed Literature Support */}
                              <tr className="bg-slate-900/60 border-y border-slate-800/80">
                                <td colSpan={3} className="p-2 font-bold text-slate-200 text-[10px] uppercase tracking-wider">
                                  5. Literature Bibliography Evidence
                                </td>
                              </tr>
                              <tr>
                                <td className="p-3 font-semibold text-slate-400 pl-6">Publications Count</td>
                                <td className="p-3 bg-cyan-950/10 font-bold text-cyan-300">
                                  {comparisonResult.drug_a.citations_count} publication(s)
                                </td>
                                <td className="p-3 bg-indigo-950/10 font-bold text-indigo-300">
                                  {comparisonResult.drug_b.citations_count} publication(s)
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-950/20 p-8">
              <Dna className="w-12 h-12 text-slate-650 mb-3 animate-spin" />
              <p className="text-sm font-semibold text-slate-350">
                Initializing drug repurposing predictions for {selectedDiseaseName}...
              </p>
            </div>
          )}
        </section>

        {/* RIGHT PANEL: Biological Pathway Explorer */}
        {selectedPathway && (
          <section className="lg:col-span-3 flex flex-col glass rounded-xl border border-rose-500/20 p-4 h-full relative overflow-y-auto animate-fade-in space-y-4">
            <button 
              onClick={() => setSelectedPathway(null)}
              className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 border border-slate-800 hover:border-slate-700 bg-slate-950/50 p-1 rounded-lg"
              title="Close Pathway Details"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1 pt-2">
              <span className="text-[9px] font-bold bg-emerald-950/30 text-emerald-450 border border-emerald-900/40 px-2 py-0.5 rounded uppercase tracking-wider">
                Pathway details
              </span>
              <h3 className="text-sm font-bold text-slate-100 font-display">
                {selectedPathway.name}
              </h3>
            </div>

            <div className="text-xs space-y-3 divide-y divide-slate-800/80">
              <div className="space-y-1 py-1">
                <span className="block text-slate-405 text-[9px] uppercase font-bold tracking-wider">
                  Pathway Importance Score
                </span>
                <span className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 font-display">
                  {selectedPathway.importance}/10
                </span>
              </div>

              <div className="space-y-1.5 pt-3">
                <span className="block text-slate-405 text-[9px] uppercase font-bold tracking-wider">
                  Functional Description
                </span>
                <p className="text-slate-300 leading-relaxed">
                  {selectedPathway.desc}
                </p>
              </div>

              <div className="space-y-1.5 pt-3">
                <span className="block text-slate-405 text-[9px] uppercase font-bold tracking-wider">
                  Related Genes (interactome)
                </span>
                <div className="flex flex-wrap gap-1">
                  {selectedPathway.genes.map((g, idx) => (
                    <span key={idx} className="bg-indigo-950/20 text-indigo-400 border border-indigo-900/30 px-2 py-0.5 rounded text-[10px] font-medium">
                      {g}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 pt-3">
                <span className="block text-slate-405 text-[9px] uppercase font-bold tracking-wider">
                  Associated Diseases
                </span>
                <div className="flex flex-wrap gap-1">
                  {selectedPathway.diseases.map((d, idx) => (
                    <span key={idx} className="bg-rose-950/20 text-rose-400 border border-rose-900/30 px-2 py-0.5 rounded text-[10px] font-medium">
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 pt-3">
                <span className="block text-slate-405 text-[9px] uppercase font-bold tracking-wider">
                  Connected Drugs in Network
                </span>
                <div className="flex flex-wrap gap-1">
                  {selectedPathway.drugs.map((dr, idx) => (
                    <span key={idx} className="bg-cyan-950/20 text-cyan-400 border border-cyan-900/30 px-2 py-0.5 rounded text-[10px] font-medium">
                      {dr}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
