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
        {showVariants && variants.map((v, idx) => {
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
