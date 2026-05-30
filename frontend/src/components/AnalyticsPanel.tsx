import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { HelpCircle } from 'lucide-react';

interface SHAPExplanation {
  feature: string;
  label: string;
  value: number;
  shap_value: number;
  impact: 'Positive' | 'Negative' | 'Neutral';
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

interface AnalyticsPanelProps {
  explanations: SHAPExplanation[];
  textSummary: string;
  probability: number;
  confidenceScore: number;
  breakdown?: ConfidenceBreakdown;
}

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({
  explanations,
  textSummary,
  probability,
  confidenceScore,
  breakdown
}) => {
  const chartData = explanations.map(exp => ({
    name: exp.label,
    rawName: exp.feature,
    value: exp.shap_value,
    featVal: exp.value
  }));

  const formatTooltip = (value: number, name: string, props: any) => {
    const featVal = props.payload.featVal;
    return [
      `SHAP: ${value.toFixed(4)} (Feature Value: ${featVal.toFixed(4)})`,
      'Contribution'
    ];
  };

  return (
    <div className="space-y-6">
      {/* Top Cards for Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Probability Meter */}
        <div className="glass p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Model Repurposing Probability
            </h4>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500 font-display">
                {(probability * 100).toFixed(1)}%
              </span>
              <span className="text-xs text-slate-400">ML Likelihood</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 mt-4 overflow-hidden border border-slate-850">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full rounded-full transition-all duration-1000"
                style={{ width: `${probability * 100}%` }}
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-4 border-t border-slate-800/60 pt-2.5">
            ℹ️ <strong>Model Likelihood:</strong> Represents the statistical prediction probability calculated by the XGBoost classifier based on the mathematical path lengths in the interactome.
          </p>
        </div>

        {/* Aggregate Confidence */}
        <div className="glass p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Aggregated Confidence Score
              </h4>
              <div className="relative group inline-block">
                <HelpCircle className="w-3.5 h-3.5 text-slate-550 hover:text-cyan-400 transition-colors cursor-help" />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-slate-950 border border-slate-805 text-[10px] text-slate-350 p-2.5 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none normal-case font-normal leading-relaxed">
                  Confidence score is computed from: <strong>40% Network proximity</strong>, <strong>25% Pathway signaling</strong> overlap, <strong>20% shared target</strong> proteins, and <strong>15% Literature volume</strong>.
                </div>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 font-display">
                {confidenceScore}%
              </span>
              <span className="text-xs text-slate-400">Evidence Strength</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 mt-4 overflow-hidden border border-slate-850">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full rounded-full transition-all duration-1000"
                style={{ width: `${confidenceScore}%` }}
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-4 border-t border-slate-800/60 pt-2.5">
            ℹ️ <strong>Evidence Strength:</strong> An integrated score aggregating topological shortest paths, pathway overlap convergence, target similarities, and publication volume.
          </p>
        </div>
      </div>

      {/* Upgraded Confidence Breakdown Segmented Meter */}
      {breakdown && (
        <div className="glass p-5 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
              Confidence Weight Factors
            </h3>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              Evidence-based metric segmentation
            </span>
          </div>
          
          {/* Segmented Progress Bar */}
          <div className="h-4 w-full bg-slate-900 rounded-lg overflow-hidden flex border border-slate-800">
            <div 
              style={{ width: `${breakdown.network_contribution}%` }} 
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full cursor-help transition-all" 
              title={`Network Similarity: ${breakdown.network_similarity}% (Weight: 40%)`}
            />
            <div 
              style={{ width: `${breakdown.pathway_contribution}%` }} 
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full cursor-help transition-all" 
              title={`Pathway Overlap: ${breakdown.pathway_overlap}% (Weight: 25%)`}
            />
            <div 
              style={{ width: `${breakdown.target_contribution}%` }} 
              className="bg-gradient-to-r from-cyan-500 to-cyan-600 h-full cursor-help transition-all" 
              title={`Target Similarity: ${breakdown.target_similarity}% (Weight: 20%)`}
            />
            <div 
              style={{ width: `${breakdown.literature_contribution}%` }} 
              className="bg-gradient-to-r from-rose-500 to-rose-600 h-full cursor-help transition-all" 
              title={`Literature Evidence: ${breakdown.literature_evidence}% (Weight: 15%)`}
            />
          </div>

          {/* Explanation Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
            <div className="p-3 bg-indigo-950/20 border border-indigo-900/35 rounded-lg">
              <span className="block text-slate-350 font-medium">Network Similarity</span>
              <span className="block text-base font-bold text-indigo-400 mt-1">{breakdown.network_similarity}%</span>
              <span className="block text-[9px] text-slate-400">Weight: 40% (Contr: {breakdown.network_contribution}%)</span>
            </div>
            <div className="p-3 bg-emerald-950/20 border border-emerald-900/35 rounded-lg">
              <span className="block text-slate-355 font-medium">Pathway Overlap</span>
              <span className="block text-base font-bold text-emerald-400 mt-1">{breakdown.pathway_overlap}%</span>
              <span className="block text-[9px] text-slate-400">Weight: 25% (Contr: {breakdown.pathway_contribution}%)</span>
            </div>
            <div className="p-3 bg-cyan-950/20 border border-cyan-900/35 rounded-lg">
              <span className="block text-slate-350 font-medium">Target Similarity</span>
              <span className="block text-base font-bold text-cyan-400 mt-1">{breakdown.target_similarity}%</span>
              <span className="block text-[9px] text-slate-400">Weight: 20% (Contr: {breakdown.target_contribution}%)</span>
            </div>
            <div className="p-3 bg-rose-950/20 border border-rose-900/35 rounded-lg">
              <span className="block text-slate-350 font-medium">Literature Evidence</span>
              <span className="block text-base font-bold text-rose-400 mt-1">{breakdown.literature_evidence}%</span>
              <span className="block text-[9px] text-slate-400">Weight: 15% (Contr: {breakdown.literature_contribution}%)</span>
            </div>
          </div>
        </div>
      )}

      {/* Rationale Text */}
      <div className="glass p-5 rounded-xl border border-slate-800 space-y-2">
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
          Biological Rationale (Explanation Agent)
        </h3>
        <p 
          className="text-sm leading-relaxed text-slate-300"
          dangerouslySetInnerHTML={{ __html: textSummary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
        />
      </div>

      {/* SHAP Chart */}
      <div className="glass p-5 rounded-xl border border-slate-800 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
            Explainable AI (SHAP Plot)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Indicates how individual biological features shifted the model prediction.
          </p>
        </div>

        <div className="w-full h-[280px]">
          <ResponsiveContainer width="100%" h="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis 
                dataKey="name" 
                type="category" 
                stroke="#64748b" 
                fontSize={10}
                tickLine={false}
                width={120}
              />
              <Tooltip
                formatter={formatTooltip}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#1e293b',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '11px'
                }}
              />
              <ReferenceLine x={0} stroke="#475569" strokeWidth={1} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => {
                  const isPositive = entry.value >= 0;
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={isPositive ? 'url(#cyanGradient)' : 'url(#roseGradient)'} 
                    />
                  );
                })}
              </Bar>
              <defs>
                <linearGradient id="cyanGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="roseGradient" x1="1" y1="0" x2="0" y2="0">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity={0.9} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;
