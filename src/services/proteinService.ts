import axios from 'axios';
import { Binder, ProteinSummary, StructureModel, Variant } from '../types';

const BEACONS_API = 'https://www.ebi.ac.uk/pdbe/pdbe-kb/3dbeacons/api/v2/uniprot/summary';
const UNIPROT_API = 'https://rest.uniprot.org/uniprotkb';
const PROTEINS_API = 'https://www.ebi.ac.uk/proteins/api/variation';

export async function searchUniProt(query: string): Promise<ProteinSummary[]> {
  try {
    const response = await axios.get(`${UNIPROT_API}/search`, {
      params: {
        query: query,
        fields: 'accession,gene_names,protein_name,organism_name,length',
        size: 5
      }
    });

    return response.data.results.map((r: any) => ({
      uniprotId: r.primaryAccession,
      symbol: r.genes?.[0]?.geneName?.value,
      name: r.proteinDescription?.recommendedName?.fullName?.value || r.proteinDescription?.submissionNames?.[0]?.fullName?.value,
      organism: r.organism?.commonName || r.organism?.scientificName,
      length: r.sequence?.length
    }));
  } catch (error) {
    console.error('UniProt search error:', error);
    return [];
  }
}

export async function getStructures(uniprotId: string): Promise<StructureModel[]> {
  const id = uniprotId.toUpperCase();
  console.log(`Fetching structures for: ${id}`);
  try {
    const response = await axios.get(`${BEACONS_API}/${id}.json`);
    const data = response.data;
    console.log('3D Beacons Response:', data);

    // 3D Beacons v2 API parsing
    let structuresList: any[] = [];
    if (data && Array.isArray(data.structures)) {
      structuresList = data.structures;
    } else if (data && data.summary && Array.isArray(data.summary.structures)) {
      structuresList = data.summary.structures;
    }

    const models: StructureModel[] = [];
    const seenIds = new Set<string>();

    structuresList.forEach((item: any) => {
      // In v2, structure details are usually nested under 'summary'
      const s = item.summary || item;
      
      if (s.model_url) {
        const modelId = s.model_identifier || s.entry_id || 'N/A';
        
        // De-duplicate by modelId
        if (seenIds.has(modelId)) return;
        seenIds.add(modelId);

        const rawFormat = (s.model_format || 'pdb').toLowerCase();
        const format = (rawFormat === 'mmcif' || rawFormat === 'cif') ? 'cif' : 
                      (rawFormat === 'bcif' ? 'bcif' : 'pdb');

        models.push({
          provider: s.provider || '',
          modelId: modelId,
          modelUrl: s.model_url,
          format: format as 'pdb' | 'cif' | 'bcif',
          method: s.method || s.experimental_method || '',
          confidence: s.confidence_avg || s.confidence_score,
          coverage: s.coverage,
          resolution: s.resolution,
          releaseDate: s.release_date || item.release_date || s.created || item.created,
          uniprotStart: s.uniprot_start,
          uniprotEnd: s.uniprot_end
        });
      }
    });

    console.log(`Found ${models.length} structures`);
    return models;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      console.warn(`No structures found for ${id} in 3D-Beacons.`);
      return [];
    }
    console.error('3D Beacons error:', error);
    return [];
  }
}

export async function getVariants(uniprotId: string): Promise<Variant[]> {
  try {
    const response = await axios.get(`${PROTEINS_API}/${uniprotId.toUpperCase()}`);
    const data = response.data;
    
    if (!data || !Array.isArray(data.features)) {
      return [];
    }

    return data.features.map((f: any) => ({
      id: f.id || `var_${f.begin}`,
      type: f.type,
      position: parseInt(f.begin),
      end: parseInt(f.end),
      original: f.wildType,
      mutated: f.alternativeSequence,
      description: f.description,
      disease: f.association?.[0]?.name || f.association?.[0]?.description,
      source: f.sourceType
    }));
  } catch (error) {
    console.error('Proteins API error:', error);
    return [];
  }
}

export async function getBinders(pdbIds: string[], queryUniprot?: string): Promise<Binder[]> {
  const binders: Binder[] = [];

  // Limit to first 15 PDBs to avoid overwhelming the browser/API
  const limitedPdbIds = pdbIds.slice(0, 15);

  const fetchForPdb = async (pdbId: string) => {
    const id = pdbId.toLowerCase();
    const seenInThisPdb = new Set<string>();
    try {
      const [ligandsRes, moleculesRes, mappingsRes] = await Promise.all([
        axios.get(`https://www.ebi.ac.uk/pdbe/api/pdb/entry/ligand_monomers/${id}`).catch(() => ({ data: {} })),
        axios.get(`https://www.ebi.ac.uk/pdbe/api/pdb/entry/molecules/${id}`).catch(() => ({ data: {} })),
        axios.get(`https://www.ebi.ac.uk/pdbe/api/mappings/uniprot/${id}`).catch(() => ({ data: {} }))
      ]);

      // Create a map of entity_id to UniProt ID and Name from mappings API
      const entityToUniprot: Record<number, string> = {};
      const entityToUniprotName: Record<number, string> = {};
      const pdbMappings = mappingsRes.data[id]?.UniProt || {};
      Object.entries(pdbMappings).forEach(([uniprotId, mapping]: [string, any]) => {
        if (mapping.mappings) {
          mapping.mappings.forEach((m: any) => {
            if (m.entity_id) {
              entityToUniprot[m.entity_id] = uniprotId;
              if (mapping.name) {
                entityToUniprotName[m.entity_id] = mapping.name;
              }
            }
          });
        }
      });

      const ligands = ligandsRes.data[id] || [];
      ligands.forEach((l: any) => {
        const key = `${l.chem_comp_id}_ligand`;
        if (!seenInThisPdb.has(key)) {
          binders.push({
            id: l.chem_comp_id,
            name: l.chem_comp_name,
            category: 'ligand',
            pdbId: pdbId
          });
          seenInThisPdb.add(key);
        }
      });

      const molecules = moleculesRes.data[id] || [];
      molecules.forEach((m: any) => {
        // molecule_name and description are often arrays in PDBe API
        const rawName = m.molecule_name || m.description || '';
        const molName = Array.isArray(rawName) ? rawName.join(', ') : String(rawName);
        const molNameLower = molName.toLowerCase();
        const molType = (m.molecule_type || '').toLowerCase();
        
        if (molType.includes('protein') || molType.includes('polypeptide')) {
          const uniprot = m.uniprot_accession?.[0] || 
                          m.uniprot_id?.[0] || 
                          m.source?.[0]?.uniprot_id ||
                          m.source?.[0]?.accession ||
                          entityToUniprot[m.entity_id];
          
          // Filter out the query protein itself (including isoforms)
          const isQueryProtein = uniprot === queryUniprot || 
                                (uniprot && queryUniprot && uniprot.split('-')[0] === queryUniprot.split('-')[0]);
          
          if (uniprot && !isQueryProtein) {
            const isAntibody = molNameLower.includes('antibody') || 
                               molNameLower.includes('fab fragment') || 
                               molNameLower.includes('igg') || 
                               molNameLower.includes('scfv');
            const category = isAntibody ? 'antibody' : 'protein';
            const key = `${uniprot}_${category}`;
            
            if (!seenInThisPdb.has(key)) {
              let symbol = m.gene_name?.[0] || m.source?.[0]?.gene_name?.[0];
              if (!symbol && entityToUniprotName[m.entity_id]) {
                // Extract gene name from UniProt name (e.g., NEDD8_HUMAN -> NEDD8)
                symbol = entityToUniprotName[m.entity_id].split('_')[0];
              }
              
              const source = m.source?.[0] || {};
              let organism = source.organism_common_name || source.organism_scientific_name;
              
              if (organism) {
                const speciesMap: Record<string, string> = {
                  'homo sapiens': 'HUMAN',
                  'mus musculus': 'MOUSE',
                  'rattus norvegicus': 'RAT',
                  'bos taurus': 'BOVINE',
                  'sus scrofa': 'PIG',
                  'danio rerio': 'ZEBRAFISH',
                  'drosophila melanogaster': 'FRUIT FLY',
                  'caenorhabditis elegans': 'NEMATODE',
                  'saccharomyces cerevisiae': 'YEAST',
                  'escherichia coli': 'E. COLI',
                  'arabidopsis thaliana': 'THALE CRESS',
                  'xenopus laevis': 'FROG',
                  'oryctolagus cuniculus': 'RABBIT',
                  'gallus gallus': 'CHICKEN'
                };
                const lowerOrg = organism.toLowerCase();
                if (speciesMap[lowerOrg]) {
                  organism = speciesMap[lowerOrg];
                }
              }
              
              binders.push({
                id: uniprot,
                name: molName,
                symbol: symbol,
                organism: organism,
                category: category,
                pdbId: pdbId,
                entityId: m.entity_id
              });
              seenInThisPdb.add(key);
            }
          }
        } else if (
          molNameLower.includes('dna') || 
          molType.includes('dna') || 
          molNameLower.includes('polydeoxyribonucleotide') ||
          molType.includes('polydeoxyribonucleotide')
        ) {
          const key = `${molName}_dna`;
          if (!seenInThisPdb.has(key)) {
            binders.push({
              id: `DNA_${m.entity_id}`,
              name: molName,
              category: 'dna',
              pdbId: pdbId,
              entityId: m.entity_id
            });
            seenInThisPdb.add(key);
          }
        } else if (
          molNameLower.includes('rna') || 
          molType.includes('rna') || 
          molNameLower.includes('polyribonucleotide') ||
          molType.includes('polyribonucleotide')
        ) {
          const key = `${molName}_rna`;
          if (!seenInThisPdb.has(key)) {
            binders.push({
              id: `RNA_${m.entity_id}`,
              name: molName,
              category: 'rna',
              pdbId: pdbId,
              entityId: m.entity_id
            });
            seenInThisPdb.add(key);
          }
        }
      });
    } catch (e) {
      console.error(`Error fetching binders for ${pdbId}:`, e);
    }
  };

  await Promise.all(limitedPdbIds.map(fetchForPdb));
  
  return binders;
}

export async function getAlphaFoldConfidence(modelId: string): Promise<number[] | null> {
  try {
    // modelId is usually like AF-P04637-F1 or AF-0000000066253723
    let version = 4;
    
    try {
      const uniprotPart = modelId.replace('AF-', '').split('-')[0];
      // Only call prediction API if it looks like a UniProt accession (usually alphanumeric, not just digits)
      if (uniprotPart.length <= 10 && /[A-Z]/.test(uniprotPart)) {
        const response = await axios.get(`https://alphafold.ebi.ac.uk/api/prediction/${uniprotPart}`);
        version = response.data?.[0]?.latestVersion || 4;
      }
    } catch (e) {
      console.debug(`Prediction API failed for ${modelId}, falling back to v4`);
    }
    
    try {
      const confResponse = await axios.get(`https://alphafold.ebi.ac.uk/files/${modelId}-confidence_v${version}.json`);
      if (confResponse.data && Array.isArray(confResponse.data.confidenceScore)) {
        return confResponse.data.confidenceScore;
      }
    } catch (e) {
      // If v4 fails, try v1 as a last resort
      if (version !== 1) {
        try {
          const confResponseV1 = await axios.get(`https://alphafold.ebi.ac.uk/files/${modelId}-confidence_v1.json`);
          if (confResponseV1.data && Array.isArray(confResponseV1.data.confidenceScore)) {
            return confResponseV1.data.confidenceScore;
          }
        } catch (v1Err) {
          // Both failed
        }
      }
    }
    return null;
  } catch (error) {
    console.warn(`Error fetching AlphaFold confidence for ${modelId}:`, error);
    return null;
  }
}

export async function getResidueConfidence(uniprotId: string): Promise<Record<string, number[]>> {
  const id = uniprotId.toUpperCase();
  const confidenceMap: Record<string, number[]> = {};

  try {
    // Try 3D-Beacons residue API first as it's the standard for residue-level data
    const response = await axios.get(`https://www.ebi.ac.uk/pdbe/pdbe-kb/3dbeacons/api/v2/uniprot/residue/${id}.json`);
    const data = response.data;
    
    if (data && Array.isArray(data.structures)) {
      data.structures.forEach((s: any) => {
        const modelId = s.model_identifier;
        if (!confidenceMap[modelId]) {
          confidenceMap[modelId] = [];
        }
        
        if (Array.isArray(s.residues)) {
          s.residues.forEach((r: any) => {
            const index = r.residue_number - 1;
            if (index >= 0) {
              confidenceMap[modelId][index] = r.confidence_score;
            }
          });
        }
      });
      
      // Also store under the UniProt ID as a fallback for all models of this protein
      const firstModelId = data.structures[0]?.model_identifier;
      if (firstModelId && confidenceMap[firstModelId]) {
        confidenceMap[id] = confidenceMap[firstModelId];
      }
    }
    
    if (Object.keys(confidenceMap).length > 0) {
      return confidenceMap;
    }

    // Fallback: Try AlphaFold API if 3D-Beacons failed
    try {
      const uniprotPart = id.split('-')[0];
      // Only call prediction API if it looks like a UniProt accession
      if (uniprotPart.length <= 10 && /[A-Z]/.test(uniprotPart)) {
        const afResponse = await axios.get(`https://alphafold.ebi.ac.uk/api/prediction/${uniprotPart}`);
        if (afResponse.data && Array.isArray(afResponse.data) && afResponse.data.length > 0) {
          const prediction = afResponse.data[0];
          const entryId = prediction.entryId;
          const version = prediction.latestVersion || 4;
          
          // Fetch the actual confidence scores from the AlphaFold files server
          try {
            const confResponse = await axios.get(`https://alphafold.ebi.ac.uk/files/${entryId}-confidence_v${version}.json`);
            if (confResponse.data && Array.isArray(confResponse.data.confidenceScore)) {
              const scores = confResponse.data.confidenceScore;
              confidenceMap[entryId] = scores;
              confidenceMap[id] = scores;
              if (prediction.uniprotAccession) {
                confidenceMap[prediction.uniprotAccession.toUpperCase()] = scores;
              }
            }
          } catch (e) {
            console.warn('Failed to fetch AlphaFold confidence file:', e);
          }
        }
      }
    } catch (e) {
      console.debug(`Prediction API failed in getResidueConfidence for ${id}`);
    }
    
    return confidenceMap;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return confidenceMap;
    }
    console.warn('Error fetching residue confidence:', error.message || error);
    return confidenceMap;
  }
}
