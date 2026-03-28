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
  className?: string;
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
  className 
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const pluginInstance = useRef<any>(null);
  const isReady = useRef(false);
  const mounted = useRef(true);

  const onSelectResidueRef = useRef(onSelectResidue);
  useEffect(() => {
    onSelectResidueRef.current = onSelectResidue;
  }, [onSelectResidue]);

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

      // 1. Base Grey and Query Blue - ONLY for PDB structures
      // For AlphaFold and others, we want to keep the default coloring (e.g. pLDDT)
      if (isPdb) {
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
            // This ensures Q16531-2 is colored when Q16531 is selected
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
      }

      // 2. Highlight Variant Red (Always apply)
      if (highlightPosition) {
        const highlight: any = {
          color: { r: 220, g: 38, b: 38 },
          focus: true,
          sideChain: true,
        };

        if (uniprotId) {
          // ALWAYS prefer UniProt mapping for selection/zoom
          // This fixes issues where structure numbering (e.g. 4GGC) differs from UniProt
          highlight.uniprot_accession = uniprotId;
          highlight.uniprot_residue_number = highlightPosition;
          data.push(highlight);
          
          // Handle isoforms for variant
          if (uniprotId.includes('-')) {
            data.push({
              ...highlight,
              uniprot_accession: uniprotId.split('-')[0],
              focus: false, // Don't focus twice
            });
          }
        } else {
          // Fallback only if no UniProt ID is available
          highlight.residue_number = highlightPosition;
          data.push(highlight);
        }
      }

      // 3. Highlight Binder (Always apply)
      if (selectedBinder) {
        const binderHighlight: any = {
          color: { r: 16, g: 185, b: 129 }, // Emerald Green
          focus: true,
        };

        if (selectedBinder.category === 'ligand') {
          binderHighlight.label_comp_id = selectedBinder.id;
          data.push(binderHighlight);
        } else if (selectedBinder.category === 'protein' || selectedBinder.category === 'antibody') {
          // 1. Try to highlight by entity_id (most precise)
          if (selectedBinder.entityId) {
            data.push({
              ...binderHighlight,
              entity_id: String(selectedBinder.entityId)
            });
          }

          // 2. Try to highlight by the specific UniProt ID (e.g., Q16531-2)
          data.push({
            ...binderHighlight,
            uniprot_accession: selectedBinder.id,
            focus: !selectedBinder.entityId // Only focus if entityId didn't already
          });
          
          // 3. If it's an isoform, also try to highlight the base ID
          if (selectedBinder.id.includes('-')) {
            const baseId = selectedBinder.id.split('-')[0];
            data.push({
              ...binderHighlight,
              uniprot_accession: baseId,
              focus: false
            });
          } else {
            // 4. If it's a base ID, try to highlight potential isoforms (wildcard-like)
            // PDBe Molstar doesn't support wildcards directly, but we can try common patterns
            // or just rely on the fact that many structures map isoforms to the base ID anyway.
            // For now, let's just ensure the base ID is tried.
          }
        } else {
          // DNA/RNA/Other
          if (selectedBinder.entityId) {
            binderHighlight.entity_id = String(selectedBinder.entityId);
          } else {
            binderHighlight.label_comp_id = selectedBinder.id;
          }
          data.push(binderHighlight);
        }
      }

      pluginInstance.current.visual.clearSelection();
      pluginInstance.current.visual.select({ data });
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
        customData: {
          url: url,
          format: format === 'bcif' ? 'binarycif' : format,
        },
        alphafoldView: url.includes('alphafold') || provider?.toLowerCase().includes('alphafold'),
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
        await pluginInstance.current.render(viewerRef.current, options);
        if (!mounted.current) return;
        
        // Small delay to ensure internal state is fully ready
        await new Promise(resolve => setTimeout(resolve, 300));
        if (!mounted.current) return;
        
        isReady.current = true;
        applyVisualState();

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
  }, [url, format]);

  useEffect(() => {
    applyVisualState();
  }, [highlightPosition, selectedBinder, uniprotId, uniprotStart, uniprotEnd, provider]);

  return (
    <div 
      ref={viewerRef} 
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%' }}
    />
  );
};
