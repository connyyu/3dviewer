export interface Variant {
  id: string;
  type: string;
  position: number;
  end?: number;
  original: string;
  mutated: string;
  description?: string;
  disease?: string;
  source?: string;
}

export interface Binder {
  id: string;
  name: string;
  symbol?: string;
  organism?: string;
  category: 'ligand' | 'protein' | 'dna' | 'rna' | 'antibody' | 'other';
  pdbId: string;
  entityId?: number;
}

export interface ProteinSummary {
  uniprotId: string;
  symbol?: string;
  name?: string;
  organism?: string;
  length?: number;
}

export interface StructureModel {
  provider: string;
  modelId: string;
  modelUrl: string;
  format: 'pdb' | 'cif' | 'bcif';
  method: string;
  confidence?: number;
  coverage?: number;
  resolution?: number;
  releaseDate?: string;
  uniprotStart?: number;
  uniprotEnd?: number;
}
