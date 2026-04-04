import React from 'react';
import { StructureModel, Variant } from '../types';
import { cn } from '../lib/utils';

interface SequenceSchematicProps {
  length: number;
  selectedStructure: StructureModel | null;
  variants: Variant[];
  selectedVariant: Variant | null;
  showVariants?: boolean;
  isMobile?: boolean;
  plddtScores?: number[][];
  onSelectVariant: (variant: Variant) => void;
  className?: string;
}

export const SequenceSchematic: React.FC<SequenceSchematicProps> = ({
  length,
  selectedStructure,
  variants,
  selectedVariant,
  showVariants = true,
  isMobile = false,
  plddtScores,
  onSelectVariant,
  className
}) => {
  if (!length) return null;

  const getPercentage = (pos: number) => (pos / length) * 100;

  // Calculate structure coverage
  const start = selectedStructure?.uniprotStart || 1;
  const end = selectedStructure?.uniprotEnd || length;
  const left = getPercentage(start - 1);
  const width = getPercentage(end - start + 1);

  // Ruler intervals
  const interval = length < 800 ? 50 : 100;
  const ticks = [];
  for (let i = interval; i <= length; i += interval) {
    ticks.push(i);
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex justify-between items-end mb-0.5">
        <div className="flex flex-col">
          <span className="text-xs uppercase font-bold opacity-40 tracking-widest">SEQUENCE (1 - {length})</span>
        </div>
      </div>

      <div className="relative h-4 bg-yellow-50 border border-yellow-200 rounded-sm overflow-hidden group shadow-inner">
        {/* Full Sequence Bar */}
        <div className="absolute inset-0 flex items-center px-1">
          <div className="w-full h-0.5 bg-yellow-200/50 rounded-full" />
        </div>

        {/* Structure Coverage Highlight */}
        {selectedStructure && (
          <div 
            className="absolute h-full top-0 bg-blue-500/20 rounded-sm border border-blue-500/30 transition-all duration-500 z-10"
            style={{ left: `${left}%`, width: `${width}%` }}
            title={`Structure Coverage: ${start}-${end}`}
          />
        )}

        {/* Selected Residue Indicator */}
        {selectedVariant && (
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-red-600 z-50 shadow-[0_0_12px_rgba(220,38,38,0.8)]"
            style={{ left: `${getPercentage(selectedVariant.position)}%` }}
          />
        )}

        {/* Variant Markers */}
        {showVariants && Array.isArray(variants) && variants.map((v, idx) => {
          const isSelected = selectedVariant?.id === v.id;
          const pos = getPercentage(v.position);
          const isMultiResidue = v.end && v.end !== v.position;
          
          return (
            <button
              key={`${v.id}-${idx}`}
              onClick={() => !isMultiResidue && onSelectVariant(v)}
              disabled={isMultiResidue}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 w-1 h-2.5 transition-all z-30",
                isMultiResidue ? "bg-gray-400 opacity-40 cursor-not-allowed" : "hover:scale-y-125 cursor-pointer",
                isSelected ? "bg-red-600 w-1.5 z-40" : (!isMultiResidue && "bg-red-400 opacity-60 hover:opacity-100")
              )}
              style={{ left: `${pos}%` }}
              title={isMultiResidue 
                ? `Multi-residue variant at ${v.position}-${v.end} (Selection disabled): ${v.disease || v.description}`
                : `Variant at ${v.position}: ${v.disease || v.description}`}
            />
          );
        })}
      </div>

      {/* Ruler */}
      {!isMobile && (
        <div className="relative h-4 mt-0">
          {ticks.map(tick => (
            <div 
              key={tick} 
              className="absolute flex flex-col items-center -translate-x-1/2"
              style={{ left: `${getPercentage(tick)}%` }}
            >
              <div className="w-px h-1 bg-[#141414]/20" />
              <span className="text-[8px] font-mono opacity-40 mt-0">{tick}</span>
            </div>
          ))}
        </div>
      )}

      {/* pLDDT Confidence Bar */}
      {selectedStructure && (selectedStructure.provider?.toLowerCase().includes('alphafold') || selectedStructure.modelId?.startsWith('AF-')) && (
        <div className="space-y-1 mt-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] uppercase font-bold opacity-40 tracking-widest">pLDDT CONFIDENCE</span>
            {(!plddtScores || plddtScores.length === 0) && (
              <span className="text-[9px] italic opacity-40">Loading confidence scores...</span>
            )}
          </div>
          
          {plddtScores && Array.isArray(plddtScores) && plddtScores.length > 0 ? (
            <div className="space-y-1">
              {plddtScores.map((scores, idx) => (
                <div key={idx} className="relative h-2 w-full bg-gray-200 rounded-sm overflow-hidden flex border border-[#141414]/10">
                  <canvas 
                    ref={(canvas) => {
                      if (canvas) {
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                          const w = canvas.width;
                          const h = canvas.height;
                          ctx.clearRect(0, 0, w, h);
                          const step = w / length;
                          
                          const getPlddtColor = (score: number) => {
                            if (score > 90) return '#0053D6';
                            if (score > 70) return '#65CBF3';
                            if (score > 50) return '#FFDB13';
                            return '#FF7D45';
                          };
      
                          scores.forEach((score, i) => {
                            if (score !== undefined) {
                              ctx.fillStyle = getPlddtColor(score);
                              ctx.fillRect(i * step, 0, step + 0.5, h);
                            }
                          });
                        }
                      }
                    }}
                    width={2000} // High resolution for the bar
                    height={40}
                    className="w-full h-full"
                  />
                  {plddtScores.length > 1 && (
                    <div className="absolute left-1 top-0 bottom-0 flex items-center">
                      <span className="text-[6px] font-bold bg-white/80 px-0.5 rounded text-[#141414]/60">CHAIN {idx + 1}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="relative h-2 w-full bg-gray-200 rounded-sm overflow-hidden flex border border-[#141414]/10">
              <div className="w-full h-full bg-gray-100 animate-pulse" />
            </div>
          )}
          
          {/* pLDDT Color Key */}
          {!isMobile && (
            <div className="flex items-center gap-4 px-1">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#0053D6]" />
                  <span className="text-[9px] font-mono opacity-60">Very High (&gt;90)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#65CBF3]" />
                  <span className="text-[9px] font-mono opacity-60">Confident (70-90)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#FFDB13]" />
                  <span className="text-[9px] font-mono opacity-60">Low (50-70)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#FF7D45]" />
                  <span className="text-[9px] font-mono opacity-60">Very Low (&lt;50)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end mt-1">
        {selectedStructure && (
          <span className="text-[10px] uppercase font-bold opacity-30 text-right">
            Structure: {start}-{end} ({((end - start + 1) / length * 100).toFixed(1)}% coverage)
          </span>
        )}
      </div>
    </div>
  );
};
