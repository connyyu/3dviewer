import React, { useEffect, useRef } from 'react';
// @ts-ignore
import { PDBeMolstarPlugin } from 'pdbe-molstar/lib/viewer';
import 'pdbe-molstar/build/pdbe-molstar-light.css';

import { Binder } from '../types';

interface MolStarViewerProps {
  url: string;
  format: string;
  provider?: string;
  uniprotId?: string;
  uniprotStart?: number;
  uniprotEnd?: number;
  highlightPosition?: number;
  selectedBinder?: Binder | null;
  onSelectResidue?: (position: number | null) => void;
  onPlddtExtracted?: (data: { chainId: string, scores: number[] }[]) => void;
  className?: string;
  resetTrigger?: number;
  isMobile?: boolean;
}

export const MolStarViewer: React.FC<MolStarViewerProps> = ({ 
  url, 
  format, 
  provider,
  uniprotId,
  uniprotStart,
  uniprotEnd,
  highlightPosition, 
  selectedBinder,
  onSelectResidue,
  onPlddtExtracted,
  className,
  resetTrigger,
  isMobile = false
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const pluginInstance = useRef<any>(null);
  const isReady = useRef(false);
  const mounted = useRef(true);

  const onSelectResidueRef = useRef(onSelectResidue);
  useEffect(() => {
    onSelectResidueRef.current = onSelectResidue;
  }, [onSelectResidue]);

  const onPlddtExtractedRef = useRef(onPlddtExtracted);
  useEffect(() => {
    onPlddtExtractedRef.current = onPlddtExtracted;
  }, [onPlddtExtracted]);

  const applyVisualState = () => {
    if (!pluginInstance.current || !isReady.current || !mounted.current) return;
    
    // Check if visual property is available and not throwing
    try {
      if (!pluginInstance.current.visual) return;
    } catch (e) {
      // If accessing .visual throws (e.g. managers undefined), skip
      return;
    }

    try {
      const data: any[] = [];
      const isPdb = provider?.toLowerCase().includes('pdb');

      // Only apply custom coloring and selections to PDB structures
      // For AlphaFold DB and 3D-Beacons models, we keep the default coloring (e.g. pLDDT)
      if (isPdb) {
        // 1. Base Grey and Query Blue
        // Base Grey for everything
        data.push({
          struct_asym_id: undefined, 
          start_residue_number: -10000,
          end_residue_number: 100000,
          color: { r: 220, g: 220, b: 220 },
        });

        // Query Protein Blue
        if (uniprotId) {
          data.push({
            uniprot_accession: uniprotId,
            color: { r: 37, g: 99, b: 235 },
          });
          
          // Handle isoforms for query protein
          if (uniprotId.includes('-')) {
            // If query is an isoform, also highlight the base ID
            data.push({
              uniprot_accession: uniprotId.split('-')[0],
              color: { r: 37, g: 99, b: 235 },
            });
          } else {
            // If query is a base ID, also highlight common isoforms
            ['-1', '-2', '-3', '-4', '-5'].forEach(suffix => {
              data.push({
                uniprot_accession: uniprotId + suffix,
                color: { r: 37, g: 99, b: 235 },
              });
            });
          }
        } else if (uniprotStart && uniprotEnd) {
          data.push({
            start_residue_number: 1,
            end_residue_number: uniprotEnd - uniprotStart + 1,
            color: { r: 37, g: 99, b: 235 },
          });
        }

        // 2. Highlight Variant Red
        if (highlightPosition) {
          const highlight: any = {
            color: { r: 220, g: 38, b: 38 },
            focus: true,
            sideChain: true,
          };

          if (uniprotId) {
            highlight.uniprot_accession = uniprotId;
            highlight.uniprot_residue_number = highlightPosition;
            data.push(highlight);
            
            if (uniprotId.includes('-')) {
              data.push({
                ...highlight,
                uniprot_accession: uniprotId.split('-')[0],
                focus: false,
              });
            }
          } else {
            highlight.residue_number = highlightPosition;
            data.push(highlight);
          }
        }

        // 3. Highlight Binder
        if (selectedBinder) {
          let binderColor = { r: 249, g: 115, b: 22 }; // Default: Orange (Protein)
          
          if (selectedBinder.category === 'ligand') {
            binderColor = { r: 16, g: 185, b: 129 }; // Green
          } else if (selectedBinder.category === 'dna') {
            binderColor = { r: 217, g: 70, b: 239 }; // Magenta
          } else if (selectedBinder.category === 'rna') {
            binderColor = { r: 220, g: 38, b: 38 }; // Red
          }

          const binderHighlight: any = {
            color: binderColor,
            focus: true,
          };

          if (selectedBinder.category === 'ligand') {
            binderHighlight.label_comp_id = selectedBinder.id;
            data.push(binderHighlight);
          } else if (selectedBinder.category === 'protein' || selectedBinder.category === 'antibody') {
            if (selectedBinder.entityId) {
              data.push({
                ...binderHighlight,
                entity_id: String(selectedBinder.entityId)
              });
            }

            data.push({
              ...binderHighlight,
              uniprot_accession: selectedBinder.id,
              focus: !selectedBinder.entityId
            });
            
            if (selectedBinder.id.includes('-')) {
              const baseId = selectedBinder.id.split('-')[0];
              data.push({
                ...binderHighlight,
                uniprot_accession: baseId,
                focus: false
              });
            }
          } else {
            if (selectedBinder.entityId) {
              binderHighlight.entity_id = String(selectedBinder.entityId);
            } else {
              binderHighlight.label_comp_id = selectedBinder.id;
            }
            data.push(binderHighlight);
          }
        }
      }

      pluginInstance.current.visual.clearSelection();
      if (data.length > 0) {
        pluginInstance.current.visual.select({ data });
      }
    } catch (error) {
      console.error('Error updating MolStar visual state:', error);
    }
  };

  useEffect(() => {
    mounted.current = true;
    if (!viewerRef.current) return;

    const init = async () => {
      isReady.current = false;
      const PluginClass = PDBeMolstarPlugin || (window as any).PDBeMolstarPlugin;

      if (!PluginClass) {
        console.error('PDBeMolstarPlugin not found in the imported module.');
        return;
      }

      // Initialize plugin
      pluginInstance.current = new PluginClass();
      
      const options = {
        target: 'pdbe-molstar-viewer',
        customData: {
          url: url,
          format: format === 'bcif' ? 'binarycif' : format,
        },
        alphafoldView: url.includes('alphafold') || provider?.toLowerCase().includes('alphafold'),
        hideStructureQuality: isMobile,
        bgColor: { r: 255, g: 255, b: 255 },
        hideCanvasControls: ['all'],
        landscape: true,
        leftPanel: false,
        rightPanel: false,
        hideControls: true,
        pdbeLink: false,
        subscribeEvents: true, // Ensure events are subscribed
      };

      try {
        if (!viewerRef.current || !document.body.contains(viewerRef.current)) return;
        
        await pluginInstance.current.render(viewerRef.current, options);
        if (!mounted.current) return;
        
        // Small delay to ensure internal state is fully ready
        await new Promise(resolve => setTimeout(resolve, 300));
        if (!mounted.current) return;
        
        isReady.current = true;
        applyVisualState();

        // Extract pLDDT from B-factors if it's an AlphaFold model
        const isAlphaFold = url.includes('alphafold') || provider?.toLowerCase().includes('alphafold');
        if (isAlphaFold && onPlddtExtractedRef.current) {
          try {
            // Access underlying Mol* plugin context
            const plugin = pluginInstance.current.plugin || pluginInstance.current.viewerInstance?.plugin;
            if (plugin) {
              const structures = plugin.managers.structure.hierarchy.current.structures;
              if (structures.length > 0) {
                // Try to get the model from the structure hierarchy
                const structureRef = structures[0];
                const structure = structureRef.cell.obj?.data;
                // In Mol*, a structure can have multiple models, but usually it's just one
                const model = structure?.models?.[0] || structureRef.model;
                
                if (model && model.atomicConformation && model.atomicConformation.B_iso_or_equiv) {
                  const bFactors = model.atomicConformation.B_iso_or_equiv;
                  const residueIndex = model.atomicHierarchy.residueAtomSegments.index;
                  const residueCount = model.atomicHierarchy.residueAtomSegments.count;
                  const chainIndex = model.atomicHierarchy.chainAtomSegments.index;
                  const chainCount = model.atomicHierarchy.chainAtomSegments.count;
                  
                  // Map residue to chain
                  const residueToChain = new Int32Array(residueCount);
                  for (let i = 0; i < model.atomicHierarchy.residueAtomSegments.count; i++) {
                    const firstAtom = model.atomicHierarchy.residueAtomSegments.offsets[i];
                    residueToChain[i] = chainIndex[firstAtom];
                  }

                  const chainResults: { chainId: string, scores: number[] }[] = [];
                  
                  for (let c = 0; c < chainCount; c++) {
                    const chainId = model.atomicHierarchy.chains.label_asym_id.value(c);
                    const chainResidueOffsets = model.atomicHierarchy.residueAtomSegments.offsets;
                    
                    // Find residues in this chain
                    const chainAtomsStart = model.atomicHierarchy.chainAtomSegments.offsets[c];
                    const chainAtomsEnd = model.atomicHierarchy.chainAtomSegments.offsets[c+1] || model.atomicHierarchy.atoms._count;
                    
                    const firstResidue = residueIndex[chainAtomsStart];
                    const lastResidue = residueIndex[chainAtomsEnd - 1];
                    const chainResidueCount = lastResidue - firstResidue + 1;

                    const plddtByResidue = new Array(chainResidueCount).fill(0);
                    const atomCountByResidue = new Array(chainResidueCount).fill(0);
                    
                    for (let i = chainAtomsStart; i < chainAtomsEnd; i++) {
                      const rIdx = residueIndex[i] - firstResidue;
                      plddtByResidue[rIdx] += bFactors[i];
                      atomCountByResidue[rIdx]++;
                    }
                    
                    const finalPlddt = plddtByResidue.map((sum, i) => sum / atomCountByResidue[i]);
                    
                    // Basic validation: check if scores are all the same or all zero
                    const nonZeroScores = finalPlddt.filter(s => s > 0);
                    const allSame = finalPlddt.length > 0 && finalPlddt.every(s => s === finalPlddt[0]);
                    
                    if (nonZeroScores.length > 0 && !(allSame && finalPlddt[0] === 0)) {
                      // If we have uniprotStart, we should offset the scores to match the full sequence
                      let adjustedPlddt = finalPlddt;
                      if (uniprotStart && uniprotStart > 1) {
                        const padding = new Array(uniprotStart - 1).fill(undefined);
                        adjustedPlddt = [...padding, ...finalPlddt];
                      }
                      chainResults.push({ chainId, scores: adjustedPlddt });
                    }
                  }
                  
                  if (chainResults.length > 0) {
                    console.debug('Extracted pLDDT per chain:', chainResults.map(c => `${c.chainId}: ${c.scores.length}`).join(', '));
                    onPlddtExtractedRef.current(chainResults);
                  }
                } else {
                  console.debug('MolStar: Model or atomicConformation not found for pLDDT extraction');
                  if (model) {
                    console.debug('Model exists but missing data:', {
                      hasConformation: !!model.atomicConformation,
                      hasBFactors: !!model.atomicConformation?.B_iso_or_equiv
                    });
                  }
                }
              }
            }
          } catch (e) {
            console.error('Error extracting pLDDT from MolStar:', e);
          }
        }

        // Robust event extraction logic
        const extractPosition = (event: any) => {
          if (typeof event === 'number') return event;
          if (!event || typeof event !== 'object') return null;
          
          // Check for data property (common in PDBe wrapper) or direct properties
          const data = event.data || event;
          
          // Try various possible property names for residue number
          const pos = data.residueNumber ?? 
                      data.residue_number ?? 
                      data.seq_id ?? 
                      data.auth_seq_id ?? 
                      data.label_seq_id ?? 
                      null;
          
          return pos !== null && pos !== undefined && !isNaN(Number(pos)) ? Number(pos) : null;
        };

        // Subscribe to click events
        if (pluginInstance.current.events?.click) {
          pluginInstance.current.events.click.subscribe((event: any) => {
            if (onSelectResidueRef.current) {
              const pos = extractPosition(event);
              console.debug('MolStar Click Event Data:', event);
              console.debug('MolStar Click -> Extracted Position:', pos);
              onSelectResidueRef.current(pos);
            }
          });
        }

        // Subscribe to select events (often more reliable for selection changes)
        if (pluginInstance.current.events?.select) {
          pluginInstance.current.events.select.subscribe((event: any) => {
            if (onSelectResidueRef.current) {
              const pos = extractPosition(event);
              console.debug('MolStar Select Event Data:', event);
              console.debug('MolStar Select -> Extracted Position:', pos);
              
              // Only call if we have a position or if the event is empty (clear)
              // This helps avoid redundant calls but ensures clearing works
              if (pos !== null || !event || (typeof event === 'object' && Object.keys(event).length === 0)) {
                onSelectResidueRef.current(pos);
              }
            }
          });
        }
      } catch (error) {
        console.error('Error rendering MolStar viewer:', error);
      }
    };

    init();

    return () => {
      mounted.current = false;
      isReady.current = false;
      if (viewerRef.current) {
        viewerRef.current.innerHTML = '';
      }
      pluginInstance.current = null;
    };
  }, [url, format, isMobile]);

  useEffect(() => {
    applyVisualState();
  }, [highlightPosition, selectedBinder, uniprotId, uniprotStart, uniprotEnd, provider]);

  useEffect(() => {
    if (resetTrigger && pluginInstance.current && isReady.current) {
      try {
        // Reset camera and visual state
        pluginInstance.current.visual.reset({ camera: true, theme: true });
        // Re-apply visual state to restore coloring and highlights
        applyVisualState();
      } catch (e) {
        console.error('Error resetting MolStar view:', e);
      }
    }
  }, [resetTrigger]);

  return (
    <div 
      ref={viewerRef} 
      id="pdbe-molstar-viewer"
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%' }}
    />
  );
};
