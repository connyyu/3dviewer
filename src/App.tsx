import React, { useState, useEffect } from 'react';
import { Search, Database, Box, Info, ExternalLink, ChevronRight, Loader2, Dna, Activity, PanelLeft, PanelRight } from 'lucide-react';
import { searchUniProt, getStructures, getVariants } from './services/proteinService';
import { ProteinSummary, StructureModel, Variant } from './types';
import { MolStarViewer } from './components/MolStarViewer';
import { SequenceSchematic } from './components/SequenceSchematic';
import { cn } from './lib/utils';

const ProteinIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={cn(className, "transform -rotate-90 drop-shadow-md")}
    fill="none"
  >
    <defs>
      <linearGradient id="helixGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
        <stop offset="50%" stopColor="currentColor" stopOpacity="0.8" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0.6" />
      </linearGradient>
      <linearGradient id="strandGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0.7" />
      </linearGradient>
    </defs>
    {/* Helix - 3D effect with layered paths and gradients */}
    <path 
      d="M6 4c0 2 4 2 4 4s-4 2-4 4 4 2 4 4-4 2-4 4" 
      stroke="black" 
      strokeWidth="4" 
      strokeLinecap="round"
      className="opacity-10"
      transform="translate(1, 1)"
    />
    <path 
      d="M6 4c0 2 4 2 4 4s-4 2-4 4 4 2 4 4-4 2-4 4" 
      stroke="url(#helixGradient)" 
      strokeWidth="3.5" 
      strokeLinecap="round"
    />
    <path 
      d="M6.5 4.5c0 1.5 3 1.5 3 3s-3 1.5-3 3 3 1.5 3 3-3 1.5-3 3" 
      stroke="white" 
      strokeWidth="0.8" 
      strokeLinecap="round"
      className="opacity-30"
    />
    
    {/* Beta Strand - 3D effect with thickness and highlight */}
    <path 
      d="M17 4v14l-3-3m3 3l3-3" 
      stroke="black" 
      strokeWidth="5" 
      strokeLinecap="round"
      strokeLinejoin="round"
      className="opacity-10"
      transform="translate(1, 1)"
    />
    <path 
      d="M17 4v14l-3-3m3 3l3-3" 
      stroke="url(#strandGradient)" 
      strokeWidth="4" 
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path 
      d="M17.5 4v14" 
      stroke="white" 
      strokeWidth="1" 
      strokeLinecap="round"
      className="opacity-20"
    />
  </svg>
);

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<ProteinSummary[]>([]);
  const [selectedProtein, setSelectedProtein] = useState<ProteinSummary | null>(null);
  const [structures, setStructures] = useState<StructureModel[]>([]);
  const [structureFilter, setStructureFilter] = useState<'all' | 'pdb' | 'alphafold' | 'others'>('all');
  const [selectedStructure, setSelectedStructure] = useState<StructureModel | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [diseaseFilter, setDiseaseFilter] = useState<string>('all');
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  // Sidebar visibility states
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // Handle initial responsive state
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) { // tablet/mobile
        setLeftPanelOpen(true);
        setRightPanelOpen(false);
      } else {
        setLeftPanelOpen(true);
        setRightPanelOpen(true);
      }
    };

    handleResize(); // Set initial state
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    const data = await searchUniProt(searchQuery);
    setResults(data);
    setSearching(false);
  };

  const selectProtein = async (protein: ProteinSummary) => {
    setSelectedProtein(protein);
    setLoading(true);
    setVariants([]);
    setDiseaseFilter('all');
    setSelectedVariant(null);
    
    const [structureData, variantData] = await Promise.all([
      getStructures(protein.uniprotId),
      getVariants(protein.uniprotId)
    ]);

    const getProviderPriority = (provider?: string) => {
      const p = provider?.toLowerCase() || '';
      if (p.includes('pdb')) return 1;
      if (p.includes('alphafold')) return 2;
      return 3;
    };

    // Sort structures: PDBe first, then AlphaFold, then others. 
    // Within groups, sort by release date descending.
    const sortedStructures = [...structureData].sort((a, b) => {
      const prioA = getProviderPriority(a.provider);
      const prioB = getProviderPriority(b.provider);
      
      if (prioA !== prioB) {
        return prioA - prioB;
      }

      const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
      const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
      
      const valA = isNaN(dateA) ? 0 : dateA;
      const valB = isNaN(dateB) ? 0 : dateB;
      
      if (valB === valA) {
        return b.modelId.localeCompare(a.modelId);
      }
      return valB - valA;
    });

    setStructures(sortedStructures);
    setVariants(variantData);

    if (sortedStructures.length > 0) {
      setSelectedStructure(sortedStructures[0]);
    } else {
      setSelectedStructure(null);
    }
    setLoading(false);
    setResults([]); // Clear search results after selection
  };

  return (
    <div className="flex flex-col h-screen bg-[#E4E3E0] text-[#141414] font-sans overflow-hidden">
      {/* Header */}
      <header className="border-b border-[#141414] p-4 flex items-center gap-4 bg-white z-50">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-2xl">💮</span>
          <h1 className="text-xl font-bold tracking-tighter uppercase italic font-serif hidden sm:block">haku 3d viewer</h1>
        </div>
        
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md ml-4">
          <input
            type="text"
            placeholder="Search UniProt AC or Protein Name (e.g. Q12834, cdc20)"
            className="w-full bg-transparent border border-[#141414] px-4 py-2 pr-10 focus:outline-none focus:ring-1 focus:ring-[#141414] placeholder:text-[#141414]/40 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>

          {/* Search Results Dropdown */}
          {results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#141414] z-50 shadow-xl">
              {results.map((r) => (
                <button
                  key={r.uniprotId}
                  onClick={() => selectProtein(r)}
                  className="w-full text-left p-3 hover:bg-[#141414] hover:text-white border-b border-[#141414]/10 last:border-0 transition-colors group"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm font-mono mb-0.5">{r.uniprotId}</div>
                      <div className="text-base font-medium truncate">{r.symbol || 'N/A'}</div>
                      <div className="flex justify-between items-end gap-2">
                        <div className="text-[11px] opacity-60 truncate max-w-[200px]">{r.name}</div>
                        <div className="text-sm font-mono italic opacity-60 shrink-0">{r.organism}</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </form>

        <div className="flex items-center gap-2 lg:hidden ml-auto">
          <button 
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            className={cn("p-2 border border-[#141414] transition-colors", leftPanelOpen ? "bg-[#141414] text-white" : "bg-white")}
            title="Toggle Protein Info"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className={cn("p-2 border border-[#141414] transition-colors", rightPanelOpen ? "bg-[#141414] text-white" : "bg-white")}
            title="Toggle Variants"
          >
            <PanelRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar: Protein Info & Structures */}
        <aside className={cn(
          "border-r border-[#141414] flex flex-col bg-white overflow-y-auto transition-all duration-300 z-40",
          leftPanelOpen ? "w-80 translate-x-0" : "w-0 -translate-x-full lg:w-80 lg:translate-x-0"
        )}>
          {selectedProtein ? (
            <div className="p-6 space-y-8 min-w-[20rem]">
              <section>
                <div className="flex items-center gap-2 mb-4 opacity-40">
                  <Info className="w-3 h-3" />
                  <h2 className="text-sm uppercase tracking-widest font-bold italic font-serif">Protein</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs uppercase opacity-50 block mb-1">UniProt Accession</label>
                    <div className="flex items-center gap-2">
                      <div className="font-mono text-lg font-bold">{selectedProtein.uniprotId}</div>
                      <a 
                        href={`https://www.uniprot.org/uniprotkb/${selectedProtein.uniprotId}/entry`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#141414]/40 hover:text-[#141414] transition-colors"
                        title="View on UniProt"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs uppercase opacity-50 block mb-1">Gene ID</label>
                    <div className="text-md font-bold">{selectedProtein.symbol || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="text-xs uppercase opacity-50 block mb-1">name</label>
                    <div className="text-sm leading-relaxed">{selectedProtein.name}</div>
                  </div>
                  <div>
                    <label className="text-xs uppercase opacity-50 block mb-1">Organism</label>
                    <div className="text-sm italic">{selectedProtein.organism}</div>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 opacity-40">
                    <Database className="w-3 h-3" />
                    <h2 className="text-sm uppercase tracking-widest font-bold italic font-serif">structure</h2>
                  </div>
                  <select 
                    className="text-xs font-bold uppercase tracking-tighter bg-transparent border border-[#141414]/20 px-1 py-0.5 focus:outline-none"
                    value={structureFilter}
                    onChange={(e) => setStructureFilter(e.target.value as any)}
                  >
                    <option value="all">All</option>
                    <option value="pdb">PDB</option>
                    <option value="alphafold">AlphaFold</option>
                    <option value="others">Others</option>
                  </select>
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin opacity-20" />
                  </div>
                ) : structures.length > 0 ? (
                  <div className="space-y-2">
                    {structures
                      .filter(s => {
                        if (structureFilter === 'all') return true;
                        const provider = s.provider?.toLowerCase() || '';
                        if (structureFilter === 'pdb') return provider.includes('pdb');
                        if (structureFilter === 'alphafold') return provider.includes('alphafold');
                        return !provider.includes('pdb') && !provider.includes('alphafold');
                      })
                      .map((s, idx) => {
                        const isPdb = s.provider?.toLowerCase().includes('pdb');
                        const displayId = isPdb ? `PDB_0000${s.modelId.toUpperCase()}` : s.modelId;
                        const pdbeLink = isPdb ? `https://www.ebi.ac.uk/pdbe/entry/pdb/${s.modelId.toLowerCase()}` : null;

                        return (
                          <div key={`${s.modelId}-${idx}`} className="relative group/item">
                            <button
                              onClick={() => setSelectedStructure(s)}
                              className={cn(
                                "w-full text-left p-3 border border-[#141414] transition-all group relative overflow-hidden",
                                selectedStructure?.modelId === s.modelId ? "bg-[#141414] text-white" : "hover:bg-[#141414]/5"
                              )}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold uppercase tracking-tighter">{s.provider || 'Structure'}</span>
                                <div className="flex gap-2 items-center">
                                  {s.releaseDate && (
                                    <span className="text-xs font-mono opacity-60">{s.releaseDate.split('T')[0]}</span>
                                  )}
                                  {s.resolution && (
                                    <span className="text-xs font-mono opacity-60">
                                      {isPdb ? '' : 'Res: '}{s.resolution.toFixed(1)} Å
                                    </span>
                                  )}
                                  {s.confidence && (
                                    <span className="text-xs font-mono opacity-60">Conf: {(s.confidence * 100).toFixed(0)}%</span>
                                  )}
                                </div>
                              </div>
                              <div className="font-mono text-sm truncate">{displayId}</div>
                              {s.method && <div className="text-[10px] opacity-60 mt-1 uppercase tracking-widest">{s.method}</div>}
                            </button>
                            {pdbeLink && (
                              <a 
                                href={pdbeLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  "absolute right-2 bottom-2 p-1 rounded-full hover:bg-white/20 transition-colors",
                                  selectedStructure?.modelId === s.modelId ? "text-white" : "text-[#141414]/40 hover:text-[#141414]"
                                )}
                                title="View on PDBe"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-sm opacity-40 italic">No structures found in 3D-Beacons.</div>
                )}
              </section>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-20">
              <Box className="w-12 h-12 mb-4" />
              <p className="text-base italic font-serif">Search for a protein to explore its 3D architecture.</p>
            </div>
          )}
        </aside>

        {/* Viewer Area */}
        <section className="flex-1 bg-white relative">
          {selectedStructure ? (
            <div className="w-full h-full flex flex-col">
              {/* Sequence Schematic Header */}
              {selectedProtein.length && (
                <div className="border-b border-[#141414] p-4 bg-white">
                  <SequenceSchematic 
                    length={selectedProtein.length}
                    selectedStructure={selectedStructure}
                    variants={variants.filter(v => v.disease)}
                    selectedVariant={selectedVariant}
                    onSelectVariant={(v) => {
                      const isSingleResidue = !v.end || v.end === v.position;
                      if (isSingleResidue) {
                        setSelectedVariant(v);
                      }
                    }}
                  />
                </div>
              )}

              <div className="flex-1 relative">
                <div className="absolute top-4 left-4 z-10">
                  <a 
                    href={selectedStructure.modelUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-white border border-[#141414] p-2 hover:bg-[#141414] hover:text-white transition-colors shadow-lg flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest"
                  >
                    Download {selectedStructure.format.toUpperCase()} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                
                <MolStarViewer 
                  url={selectedStructure.modelUrl} 
                  format={selectedStructure.format} 
                  provider={selectedStructure.provider}
                  uniprotId={selectedProtein.uniprotId}
                  uniprotStart={selectedStructure.uniprotStart}
                  uniprotEnd={selectedStructure.uniprotEnd}
                  highlightPosition={selectedVariant?.position}
                  onSelectResidue={(pos) => {
                    console.debug('App: onSelectResidue called with pos:', pos);
                    if (pos === null) {
                      console.debug('App: Clearing selection (pos is null)');
                      setSelectedVariant(null);
                    } else {
                      // Check if the selected position corresponds to a variant
                      const variant = variants.find(v => v.position === pos);
                      console.debug('App: Found variant for pos:', pos, variant);
                      
                      // Check if it's a single residue variant
                      const isSingleResidue = variant && (!variant.end || variant.end === variant.position);
                      
                      if (isSingleResidue) {
                        setSelectedVariant(variant);
                      } else {
                        // If it's NOT a single residue variant, clear the selection.
                        setSelectedVariant(null);
                        console.debug('App: Selected residue is not a single-residue variant, clearing selection');
                      }
                    }
                  }}
                />
              </div>
              
              <div className="p-4 border-t border-[#141414] bg-[#E4E3E0] flex justify-between items-center text-[11px] font-mono uppercase">
                <div className="flex gap-4">
                  {selectedStructure.provider && <span className="font-bold">{selectedStructure.provider}</span>}
                  <span>
                    ID: {selectedStructure.provider?.toLowerCase().includes('pdb') 
                      ? `PDB_0000${selectedStructure.modelId.toUpperCase()}` 
                      : selectedStructure.modelId}
                  </span>
                  {selectedStructure.resolution && (
                    <span>
                      {selectedStructure.provider?.toLowerCase().includes('pdb') ? '' : 'Resolution: '}
                      {selectedStructure.resolution.toFixed(1)} Å
                    </span>
                  )}
                  {selectedStructure.releaseDate && (
                    <span>Release: {selectedStructure.releaseDate.includes('T') ? selectedStructure.releaseDate.split('T')[0] : selectedStructure.releaseDate}</span>
                  )}
                </div>
                {selectedVariant && (
                  <span className="text-red-600 font-bold">
                    Variant: {selectedVariant.original}{selectedVariant.position}{selectedVariant.mutated}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center opacity-10">
            </div>
          )}
        </section>

        {/* Right Sidebar: Disease Variants */}
        <aside className={cn(
          "border-l border-[#141414] flex flex-col bg-white overflow-y-auto transition-all duration-300 z-40",
          rightPanelOpen ? "w-80 translate-x-0" : "w-0 translate-x-full lg:w-80 lg:translate-x-0"
        )}>
          {selectedProtein ? (
            <div className="p-6 space-y-8 min-w-[20rem]">
              <section>
                <div className="flex flex-col gap-4 mb-4">
                  <div className="flex items-center gap-2 opacity-40">
                    <Activity className="w-3 h-3" />
                    <h2 className="text-sm uppercase tracking-widest font-bold italic font-serif">Disease Variants</h2>
                  </div>
                  
                  {variants.some(v => v.disease) && (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs uppercase font-bold opacity-40">Filter by Disease</label>
                      <select 
                        className="w-full text-sm font-mono bg-transparent border border-[#141414]/20 px-2 py-1.5 focus:outline-none focus:border-[#141414] transition-colors"
                        value={diseaseFilter}
                        onChange={(e) => setDiseaseFilter(e.target.value)}
                      >
                        <option value="all">All Diseases ({variants.filter(v => v.disease).length})</option>
                        {Array.from(new Set(variants.filter(v => v.disease).map(v => v.disease)))
                          .sort()
                          .map(disease => (
                            <option key={disease} value={disease || ''}>
                              {disease} ({variants.filter(v => v.disease === disease).length})
                            </option>
                          ))
                        }
                      </select>
                    </div>
                  )}
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin opacity-20" />
                  </div>
                ) : variants.length > 0 ? (
                  <div className="space-y-2">
                    {variants
                      .filter(v => v.disease && (diseaseFilter === 'all' || v.disease === diseaseFilter))
                      .map((v, idx) => {
                        const isMultiResidue = v.end && v.end !== v.position;
                      const isSelected = selectedVariant?.id === v.id;
                      
                      return (
                        <button
                          key={`${v.id}-${idx}`}
                          onClick={() => !isMultiResidue && setSelectedVariant(v)}
                          disabled={isMultiResidue}
                          className={cn(
                            "w-full text-left p-3 border border-[#141414] transition-all group relative overflow-hidden",
                            isSelected ? "bg-[#141414] text-white" : (isMultiResidue ? "bg-gray-50 opacity-40 cursor-not-allowed" : "hover:bg-[#141414]/5")
                          )}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold uppercase tracking-tighter">
                              Pos: {v.position}{isMultiResidue ? `-${v.end}` : ''}
                            </span>
                            <span className="text-xs font-mono opacity-60">
                              {isMultiResidue ? 'MULTI-RESIDUE' : `${v.original} → ${v.mutated}`}
                            </span>
                          </div>
                          <div className="font-mono text-sm truncate">{v.disease}</div>
                          {v.description && (
                            <div className="text-xs opacity-60 mt-1 leading-tight line-clamp-2">{v.description}</div>
                          )}
                          {isMultiResidue && (
                            <div className="text-xs font-bold uppercase tracking-widest mt-2 text-gray-500 italic">
                              Selection disabled (Spans multiple residues)
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm opacity-40 italic">No disease variants found in UniProt.</div>
                )}
              </section>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-20">
              <Activity className="w-12 h-12 mb-4" />
              <p className="text-base italic font-serif">Select a protein to view associated disease variations.</p>
            </div>
          )}
        </aside>
      </main>

      {/* Footer / Status Bar */}
      <footer className="border-t border-[#141414] p-4 bg-white flex justify-between items-center text-[11px] uppercase tracking-widest font-bold opacity-40">
        <div className="flex gap-4">
          <span>data source: UniProt / 3D-beacons</span>
        </div>
        <div>vibe-coded with Google AI studio</div>
      </footer>
    </div>
  );
}
