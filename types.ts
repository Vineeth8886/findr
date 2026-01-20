
export type ProductTier = 'Luxury' | 'Premium' | 'Standard' | 'Budget';

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
  isConfirmed?: boolean;
}

export interface DetailedSpecs {
  material: string;
  finish: string;
  brandPreference?: string;
  compliance: string; // IS Codes
  warranty: string;   // Warranty terms
}

export interface VendorOption {
  vendor: string;
  price: string;
  numericPrice: number;
  priceRange?: string; // e.g. "₹12k - ₹15k"
  moq?: string; // Minimum Order Quantity
  unit: string;
  availability: string;
  url: string;
  deliveryDate: string;
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
  thumbnail?: string; 
}

export type SortField = 'price' | 'delivery';
export type SortOrder = 'asc' | 'desc';
export type ViewMode = 'grid' | 'list' | 'boq';
