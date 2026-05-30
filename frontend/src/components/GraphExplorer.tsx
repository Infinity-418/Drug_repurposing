import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';

interface GraphElement {
  data: {
    id: string;
    label?: string;
    type?: string;
    source?: string;
    target?: string;
    relation?: string;
  };
}

interface GraphExplorerProps {
  elements: {
    nodes: GraphElement[];
    edges: GraphElement[];
  };
  selectedNodeId?: string | null;
  drugName?: string;
  diseaseName?: string;
  onNodeSelect?: (nodeId: string, nodeType: string) => void;
  onPathwaySelect?: (pathwayId: string) => void;
}

const GraphExplorer: React.FC<GraphExplorerProps> = ({
  elements,
  selectedNodeId,
  drugName = 'Compound',
  diseaseName = 'Disease',
  onNodeSelect,
  onPathwaySelect
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const cyElements = [
      ...elements.nodes,
      ...elements.edges
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements: cyElements,
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'color': '#ffffff',
            'font-size': '12px',
            'font-family': 'Inter, sans-serif',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 6,
            'text-background-color': '#0f172a',
            'text-background-opacity': 0.75,
            'text-background-shape': 'roundrectangle',
            'text-background-padding': '3px',
            'background-color': '#475569',
            'width': '32px',
            'height': '32px',
            'transition-property': 'background-color, border-color, border-width, width, height',
            'transition-duration': 0.3,
            'border-width': '2px',
            'border-color': 'rgba(255, 255, 255, 0.1)'
          }
        },
        {
          selector: 'node[type="Disease"]',
          style: {
            'background-color': '#f43f5e',
            'border-color': '#fda4af',
            'border-width': '3px',
            'width': '42px',
            'height': '42px',
            'shape': 'hexagon',
            'font-size': '13px',
            'font-weight': 'bold',
            'text-background-opacity': 0.85
          }
        },
        {
          selector: 'node[type="Drug"]',
          style: {
            'background-color': '#06b6d4',
            'border-color': '#67e8f9',
            'border-width': '3px',
            'width': '40px',
            'height': '40px',
            'shape': 'round-rectangle',
            'font-size': '13px',
            'font-weight': 'bold',
            'text-background-opacity': 0.85
          }
        },
        {
          selector: 'node[type="Gene"]',
          style: {
            'background-color': '#6366f1',
            'border-color': '#a5b4fc',
            'width': '30px',
            'height': '30px',
            'shape': 'ellipse'
          }
        },
        {
          selector: 'node[type="Pathway"]',
          style: {
            'background-color': '#10b981',
            'border-color': '#6ee7b7',
            'width': '32px',
            'height': '32px',
            'shape': 'diamond'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#475569',
            'target-arrow-color': '#475569',
            'target-arrow-shape': 'none',
            'curve-style': 'bezier',
            'opacity': 0.6
          }
        },
        {
          selector: 'edge[relation="targets"]',
          style: {
            'line-color': '#06b6d4',
            'target-arrow-color': '#06b6d4',
            'target-arrow-shape': 'triangle',
            'width': 2.5
          }
        },
        {
          selector: 'edge[relation="associates"]',
          style: {
            'line-color': '#f43f5e',
            'width': 2
          }
        },
        {
          selector: 'edge[relation="participates"]',
          style: {
            'line-color': '#10b981',
            'width': 1.5,
            'line-style': 'dashed'
          }
        },
        {
          selector: 'edge[relation="interacts"]',
          style: {
            'line-color': '#818cf8',
            'width': 1.5
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': '4px',
            'border-color': '#e11d48',
            'background-color': '#e11d48',
            'font-size': '14px',
            'font-weight': 'bold',
            'text-background-color': '#1e293b',
            'text-background-opacity': 0.9,
            'z-index': 9999
          }
        }
      ],
      layout: {
        name: 'cose',
        idealEdgeLength: () => 80,
        nodeOverlap: 20,
        refresh: 20,
        fit: true,
        padding: 40,
        randomize: false,
        componentSpacing: 100,
        nodeRepulsion: () => 400000,
        edgeElasticity: () => 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0
      }
    });

    cyRef.current = cy;

    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const type = node.data('type');
      if (type === 'Pathway' && onPathwaySelect) {
        onPathwaySelect(node.id());
      } else if (onNodeSelect) {
        onNodeSelect(node.id(), type);
      }
    });

    cy.on('layoutstop', () => {
      cy.fit();
      if (selectedNodeId) {
        const sel = cy.$(`#${selectedNodeId}`);
        if (sel.length > 0) {
          cy.animate({
            center: { eles: sel },
            zoom: 1.3
          }, { duration: 500 });
        }
      }
    });

    if (selectedNodeId) {
      cy.$(`#${selectedNodeId}`).select();
    }

  }, [elements, onNodeSelect, onPathwaySelect]);

  useEffect(() => {
    if (cyRef.current) {
      cyRef.current.$('node').unselect();
      if (selectedNodeId) {
        const sel = cyRef.current.$(`#${selectedNodeId}`);
        sel.select();
        cyRef.current.animate({
          center: { eles: sel },
          zoom: 1.5
        }, { duration: 500 });
      }
    }
  }, [selectedNodeId]);

  // Toolbar Handlers
  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.2);
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() / 1.2);
    }
  };

  const handleFit = () => {
    if (cyRef.current) {
      cyRef.current.fit();
    }
  };

  const handleResetLayout = () => {
    if (cyRef.current) {
      cyRef.current.layout({ name: 'cose' }).run();
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-950/60 rounded-xl overflow-hidden border border-slate-800 flex flex-col">
      {/* Top Banner containing dynamic Title and Controls */}
      <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 z-10">
        <h4 className="text-xs font-semibold text-slate-200">
          🧬 {drugName} to {diseaseName} Association Network
        </h4>
        
        {/* Graph Control Buttons */}
        <div className="flex items-center gap-1 bg-slate-950/50 p-0.5 rounded border border-slate-800 max-w-fit">
          <button 
            onClick={handleZoomIn}
            className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-900 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={handleZoomOut}
            className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-900 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={handleFit}
            className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-900 rounded transition-colors"
            title="Fit to Window"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={handleResetLayout}
            className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-900 rounded transition-colors"
            title="Reset Network Layout"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Cytoscape Container */}
      <div className="flex-grow relative">
        <div ref={containerRef} className="w-full h-full" style={{ minHeight: '400px' }} />
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 text-xs bg-slate-900/90 border border-slate-700/80 px-3 py-2 rounded-lg glass pointer-events-none">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm inline-block"></span>
            <span>Disease</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-cyan-500 rounded-sm inline-block"></span>
            <span>Drug</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full inline-block"></span>
            <span>Gene</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm transform rotate-45 inline-block"></span>
            <span className="ml-0.5">Pathway</span>
          </div>
        </div>
        <div className="absolute top-3 right-3 text-[10px] text-slate-400 bg-slate-900/85 border border-slate-800/80 px-2 py-1 rounded pointer-events-none">
          💡 Tap a Pathway node to inspect details
        </div>
      </div>
    </div>
  );
};

export default GraphExplorer;
