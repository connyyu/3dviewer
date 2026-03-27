import React from 'react';
import { StructureModel, Variant } from '../types';
import { cn } from '../lib/utils';

interface SequenceSchematicProps {
  length: number;
  selectedStructure: StructureModel | null;
  variants: Variant[];
  selectedVariant: Variant | null;
  onSelectVariant: (variant: Variant) => void;
  className?: string;
}

export const SequenceSchematic: React.FC<SequenceSchematicProps> = ({
  length,
  selectedStructure,
  variants,
  selectedVariant,
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

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex justify-between items-end mb-1">
        <div className="flex flex-col">
          <span className="text-xs uppercase font-bold opacity-40">SEQUENCE (1 - {length})</span>
        </div>
      </div>

      <div className="relative h-5 bg-yellow-50 border border-yellow-200 rounded-md overflow-hidden group shadow-inner">
        {/* Full Sequence Bar */}
        <div className="absolute inset-0 flex items-center px-1">
          <div className="w-full h-1 bg-yellow-200/50 rounded-full" />
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
        {variants.map((v, idx) => {
          const isSelected = selectedVariant?.id === v.id;
          const pos = getPercentage(v.position);
          const isMultiResidue = v.end && v.end !== v.position;
          
          return (
            <button
              key={`${v.id}-${idx}`}
              onClick={() => !isMultiResidue && onSelectVariant(v)}
              disabled={isMultiResidue}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 w-1 h-3 transition-all z-30",
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

      <div className="flex justify-end">
        {selectedStructure && (
          <span className="text-xs uppercase font-bold opacity-40 text-right">
            Structure: {start}-{end} ({((end - start + 1) / length * 100).toFixed(1)}% coverage)
          </span>
        )}
      </div>
    </div>
  );
};
