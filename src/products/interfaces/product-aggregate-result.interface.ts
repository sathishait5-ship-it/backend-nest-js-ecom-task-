export interface ProductAggregateResult {
  _id: string;

  name: string;

  price: number;

  stock: number;

  images: string[];

  averageRating: number;

  totalReviews: number;

  reviews: unknown[];

  createdBy: unknown;
}
