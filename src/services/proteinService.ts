import axios from 'axios';
import { ProteinSummary, StructureModel, Variant } from '../types';

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
