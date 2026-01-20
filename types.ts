
export type ProductTier = 'Luxury' | 'Premium' | 'Standard' | 'Budget';

export interface AncillaryItem {
  id: string;
  parentProductId: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  total: number;
  category: 'Material' | 'Labor' | 'Consumable' | 'Wastage';
}

export interface ProductCandidate {
  id: string;
  name: string;
  description: string;
  category: 'Industrial' | 'Commercial' | 'Architectural' | 'Generic';
  tier: ProductTier;
  quantity: number;
  suggestedUnit: string;
  dimensions?: string; 
  boundingBox?: [number, number, number, number];
  confidence?: number;
  isVerified?: boolean;
}

export interface DetailedSpecs {
  material: string;
  finish: string;
  brandPreference?: string;
  compliance: string; 
  warranty: string;   
}

export interface VendorOption {
  vendor: string;
  price: string;
  numericPrice: number;
  priceRange?: string; 
  moq?: string; 
  unit: string;
  availability: string;
  url: string;
  deliveryDate?: string;
  daysToDelivery: number;
  address: string;
  reliabilityScore: number;
  contactEmail?: string;
  contactPhone?: string;
  gstNumber?: string;
  gstStatus?: 'Verified' | 'Pending' | 'Unknown';
  isManufacturer?: boolean;
}

export interface GroundingLink {
  uri: string;
  title: string;
}

export interface ProductResult {
  id: string;
  productName: string;
  description: string;
  tier: ProductTier;
  researchNote: string; 
  vendors: VendorOption[];
  groundingSources: GroundingLink[];
  quantity: number;
  unit: string;
  dimensions: string;
  boundingBox?: [number, number, number, number];
  scanSource: string;
  scanZone: string;
  scanConfidence: number;
  specsDetail: DetailedSpecs;
  estimatedLaborRate: number;
  ancillaryItems?: AncillaryItem[];
  thumbnail?: string; 
}

export type SortField = 'price' | 'delivery';
export type SortOrder = 'asc' | 'desc';
export type ViewMode = 'grid' | 'list' | 'boq';
