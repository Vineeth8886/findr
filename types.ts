
export type ProductTier = 'Luxury' | 'Premium' | 'Standard' | 'Budget';

export interface ProductCandidate {
  id: string;
  name: string;
  description: string;
  category: 'Industrial' | 'Commercial' | 'Architectural' | 'Generic';
  tier: ProductTier;
  suggestedUnit?: string;
  boundingBox?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized 0-1000
}

export interface VendorOption {
  vendor: string;
  price: string;
  numericPrice: number;
  unit: string;
  quantityAvailable: string;
  availability: 'In Stock' | 'Backordered' | 'Limited Stock';
  deliveryDate: string;
  daysToDelivery: number;
  url: string;
  productImage?: string;
  reliabilityScore: number;
  address?: string;
  contactPhone?: string;
  contactEmail?: string;
  gstAvailable?: boolean;
}

export interface GroundingLink {
  uri: string;
  title: string;
}

export interface ProductResult {
  productName: string;
  tier: ProductTier;
  researchNote: string; 
  vendors: VendorOption[];
  groundingSources: GroundingLink[];
}

export type SortField = 'price' | 'delivery';
export type SortOrder = 'asc' | 'desc';
export type ViewMode = 'grid' | 'list';
