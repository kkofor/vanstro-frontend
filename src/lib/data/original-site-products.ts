import { ProductSummary } from "@/lib/api/api-contract";
import { originalSiteImageLibrary } from "@/lib/data/original-site-image-library";

// Products recovered from the original-site mirror manifest.
// Keep this generated seed isolated so the future backend product feed can
// replace titles, pricing, SKU data, stock, and image arrays from admin APIs.
const importedProducts = [
  {
    "id": "267",
    "slug": "base-cabinet-267",
    "sku": "VS-CAB-267",
    "manufacturerPartNumber": "VS-CAB-267",
    "name": "Base Cabinet 267",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 7,
      "vancouver": 3,
      "calgary": 3,
      "montreal": 6
    },
    "price": {
      "amount": 635,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "268",
    "slug": "wall-cabinet-268",
    "sku": "VS-CAB-268",
    "manufacturerPartNumber": "VS-CAB-268",
    "name": "Wall Cabinet 268",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 8,
      "vancouver": 4,
      "calgary": 4,
      "montreal": 7
    },
    "price": {
      "amount": 670,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "270",
    "slug": "wall-cabinet-270",
    "sku": "VS-CAB-270",
    "manufacturerPartNumber": "VS-CAB-270",
    "name": "Wall Cabinet 270",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 10,
      "vancouver": 6,
      "calgary": 1,
      "montreal": 9
    },
    "price": {
      "amount": 390,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "271",
    "slug": "base-cabinet-271",
    "sku": "VS-CAB-271",
    "manufacturerPartNumber": "VS-CAB-271",
    "name": "Base Cabinet 271",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 11,
      "vancouver": 7,
      "calgary": 2,
      "montreal": 10
    },
    "price": {
      "amount": 425,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "272",
    "slug": "wall-cabinet-272",
    "sku": "VS-CAB-272",
    "manufacturerPartNumber": "VS-CAB-272",
    "name": "Wall Cabinet 272",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 12,
      "vancouver": 8,
      "calgary": 3,
      "montreal": 3
    },
    "price": {
      "amount": 460,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "273",
    "slug": "base-cabinet-273",
    "sku": "VS-CAB-273",
    "manufacturerPartNumber": "VS-CAB-273",
    "name": "Base Cabinet 273",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 13,
      "vancouver": 2,
      "calgary": 4,
      "montreal": 4
    },
    "price": {
      "amount": 495,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "274",
    "slug": "wall-cabinet-274",
    "sku": "VS-CAB-274",
    "manufacturerPartNumber": "VS-CAB-274",
    "name": "Wall Cabinet 274",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 14,
      "vancouver": 3,
      "calgary": 5,
      "montreal": 5
    },
    "price": {
      "amount": 530,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "275",
    "slug": "base-cabinet-275",
    "sku": "VS-CAB-275",
    "manufacturerPartNumber": "VS-CAB-275",
    "name": "Base Cabinet 275",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 4,
      "vancouver": 4,
      "calgary": 1,
      "montreal": 6
    },
    "price": {
      "amount": 565,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "276",
    "slug": "wall-cabinet-276",
    "sku": "VS-CAB-276",
    "manufacturerPartNumber": "VS-CAB-276",
    "name": "Wall Cabinet 276",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 5,
      "vancouver": 5,
      "calgary": 2,
      "montreal": 7
    },
    "price": {
      "amount": 600,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "277",
    "slug": "base-cabinet-277",
    "sku": "VS-CAB-277",
    "manufacturerPartNumber": "VS-CAB-277",
    "name": "Base Cabinet 277",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 6,
      "vancouver": 6,
      "calgary": 3,
      "montreal": 8
    },
    "price": {
      "amount": 635,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "278",
    "slug": "wall-cabinet-278",
    "sku": "VS-CAB-278",
    "manufacturerPartNumber": "VS-CAB-278",
    "name": "Wall Cabinet 278",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 7,
      "vancouver": 7,
      "calgary": 4,
      "montreal": 9
    },
    "price": {
      "amount": 670,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "279",
    "slug": "base-cabinet-279",
    "sku": "VS-CAB-279",
    "manufacturerPartNumber": "VS-CAB-279",
    "name": "Base Cabinet 279",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 8,
      "vancouver": 8,
      "calgary": 5,
      "montreal": 10
    },
    "price": {
      "amount": 705,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "280",
    "slug": "wall-cabinet-280",
    "sku": "VS-CAB-280",
    "manufacturerPartNumber": "VS-CAB-280",
    "name": "Wall Cabinet 280",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 9,
      "vancouver": 2,
      "calgary": 1,
      "montreal": 3
    },
    "price": {
      "amount": 390,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "282",
    "slug": "wall-cabinet-282",
    "sku": "VS-CAB-282",
    "manufacturerPartNumber": "VS-CAB-282",
    "name": "Wall Cabinet 282",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 11,
      "vancouver": 4,
      "calgary": 3,
      "montreal": 5
    },
    "price": {
      "amount": 460,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "283",
    "slug": "base-cabinet-283",
    "sku": "VS-CAB-283",
    "manufacturerPartNumber": "VS-CAB-283",
    "name": "Base Cabinet 283",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 12,
      "vancouver": 5,
      "calgary": 4,
      "montreal": 6
    },
    "price": {
      "amount": 495,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "284",
    "slug": "wall-cabinet-284",
    "sku": "VS-CAB-284",
    "manufacturerPartNumber": "VS-CAB-284",
    "name": "Wall Cabinet 284",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 13,
      "vancouver": 6,
      "calgary": 5,
      "montreal": 7
    },
    "price": {
      "amount": 530,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "285",
    "slug": "base-cabinet-285",
    "sku": "VS-CAB-285",
    "manufacturerPartNumber": "VS-CAB-285",
    "name": "Base Cabinet 285",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 14,
      "vancouver": 7,
      "calgary": 1,
      "montreal": 8
    },
    "price": {
      "amount": 565,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "286",
    "slug": "wall-cabinet-286",
    "sku": "VS-CAB-286",
    "manufacturerPartNumber": "VS-CAB-286",
    "name": "Wall Cabinet 286",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 4,
      "vancouver": 8,
      "calgary": 2,
      "montreal": 9
    },
    "price": {
      "amount": 600,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "287",
    "slug": "base-cabinet-287",
    "sku": "VS-CAB-287",
    "manufacturerPartNumber": "VS-CAB-287",
    "name": "Base Cabinet 287",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 5,
      "vancouver": 2,
      "calgary": 3,
      "montreal": 10
    },
    "price": {
      "amount": 635,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "288",
    "slug": "wall-cabinet-288",
    "sku": "VS-CAB-288",
    "manufacturerPartNumber": "VS-CAB-288",
    "name": "Wall Cabinet 288",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 6,
      "vancouver": 3,
      "calgary": 4,
      "montreal": 3
    },
    "price": {
      "amount": 670,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "289",
    "slug": "base-cabinet-289",
    "sku": "VS-CAB-289",
    "manufacturerPartNumber": "VS-CAB-289",
    "name": "Base Cabinet 289",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 7,
      "vancouver": 4,
      "calgary": 5,
      "montreal": 4
    },
    "price": {
      "amount": 705,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "290",
    "slug": "wall-cabinet-290",
    "sku": "VS-CAB-290",
    "manufacturerPartNumber": "VS-CAB-290",
    "name": "Wall Cabinet 290",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 8,
      "vancouver": 5,
      "calgary": 1,
      "montreal": 5
    },
    "price": {
      "amount": 390,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "291",
    "slug": "base-cabinet-291",
    "sku": "VS-CAB-291",
    "manufacturerPartNumber": "VS-CAB-291",
    "name": "Base Cabinet 291",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 9,
      "vancouver": 6,
      "calgary": 2,
      "montreal": 6
    },
    "price": {
      "amount": 425,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "292",
    "slug": "wall-cabinet-292",
    "sku": "VS-CAB-292",
    "manufacturerPartNumber": "VS-CAB-292",
    "name": "Wall Cabinet 292",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 10,
      "vancouver": 7,
      "calgary": 3,
      "montreal": 7
    },
    "price": {
      "amount": 460,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "293",
    "slug": "base-cabinet-293",
    "sku": "VS-CAB-293",
    "manufacturerPartNumber": "VS-CAB-293",
    "name": "Base Cabinet 293",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 11,
      "vancouver": 8,
      "calgary": 4,
      "montreal": 8
    },
    "price": {
      "amount": 495,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "294",
    "slug": "wall-cabinet-294",
    "sku": "VS-CAB-294",
    "manufacturerPartNumber": "VS-CAB-294",
    "name": "Wall Cabinet 294",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 12,
      "vancouver": 2,
      "calgary": 5,
      "montreal": 9
    },
    "price": {
      "amount": 530,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "295",
    "slug": "base-cabinet-295",
    "sku": "VS-CAB-295",
    "manufacturerPartNumber": "VS-CAB-295",
    "name": "Base Cabinet 295",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 13,
      "vancouver": 3,
      "calgary": 1,
      "montreal": 10
    },
    "price": {
      "amount": 565,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "296",
    "slug": "wall-cabinet-296",
    "sku": "VS-CAB-296",
    "manufacturerPartNumber": "VS-CAB-296",
    "name": "Wall Cabinet 296",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 14,
      "vancouver": 4,
      "calgary": 2,
      "montreal": 3
    },
    "price": {
      "amount": 600,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "297",
    "slug": "base-cabinet-297",
    "sku": "VS-CAB-297",
    "manufacturerPartNumber": "VS-CAB-297",
    "name": "Base Cabinet 297",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 4,
      "vancouver": 5,
      "calgary": 3,
      "montreal": 4
    },
    "price": {
      "amount": 635,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "298",
    "slug": "wall-cabinet-298",
    "sku": "VS-CAB-298",
    "manufacturerPartNumber": "VS-CAB-298",
    "name": "Wall Cabinet 298",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 5,
      "vancouver": 6,
      "calgary": 4,
      "montreal": 5
    },
    "price": {
      "amount": 670,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "299",
    "slug": "base-cabinet-299",
    "sku": "VS-CAB-299",
    "manufacturerPartNumber": "VS-CAB-299",
    "name": "Base Cabinet 299",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 6,
      "vancouver": 7,
      "calgary": 5,
      "montreal": 6
    },
    "price": {
      "amount": 705,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "300",
    "slug": "wall-cabinet-300",
    "sku": "VS-CAB-300",
    "manufacturerPartNumber": "VS-CAB-300",
    "name": "Wall Cabinet 300",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 7,
      "vancouver": 8,
      "calgary": 1,
      "montreal": 7
    },
    "price": {
      "amount": 390,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "301",
    "slug": "base-cabinet-301",
    "sku": "VS-CAB-301",
    "manufacturerPartNumber": "VS-CAB-301",
    "name": "Base Cabinet 301",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 8,
      "vancouver": 2,
      "calgary": 2,
      "montreal": 8
    },
    "price": {
      "amount": 425,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "302",
    "slug": "wall-cabinet-302",
    "sku": "VS-CAB-302",
    "manufacturerPartNumber": "VS-CAB-302",
    "name": "Wall Cabinet 302",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 9,
      "vancouver": 3,
      "calgary": 3,
      "montreal": 9
    },
    "price": {
      "amount": 460,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "303",
    "slug": "base-cabinet-303",
    "sku": "VS-CAB-303",
    "manufacturerPartNumber": "VS-CAB-303",
    "name": "Base Cabinet 303",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 10,
      "vancouver": 4,
      "calgary": 4,
      "montreal": 10
    },
    "price": {
      "amount": 495,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "304",
    "slug": "wall-cabinet-304",
    "sku": "VS-CAB-304",
    "manufacturerPartNumber": "VS-CAB-304",
    "name": "Wall Cabinet 304",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 11,
      "vancouver": 5,
      "calgary": 5,
      "montreal": 3
    },
    "price": {
      "amount": 530,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "305",
    "slug": "base-cabinet-305",
    "sku": "VS-CAB-305",
    "manufacturerPartNumber": "VS-CAB-305",
    "name": "Base Cabinet 305",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 12,
      "vancouver": 6,
      "calgary": 1,
      "montreal": 4
    },
    "price": {
      "amount": 565,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "306",
    "slug": "wall-cabinet-306",
    "sku": "VS-CAB-306",
    "manufacturerPartNumber": "VS-CAB-306",
    "name": "Wall Cabinet 306",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 13,
      "vancouver": 7,
      "calgary": 2,
      "montreal": 5
    },
    "price": {
      "amount": 600,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "307",
    "slug": "base-cabinet-307",
    "sku": "VS-CAB-307",
    "manufacturerPartNumber": "VS-CAB-307",
    "name": "Base Cabinet 307",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 14,
      "vancouver": 8,
      "calgary": 3,
      "montreal": 6
    },
    "price": {
      "amount": 635,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "308",
    "slug": "wall-cabinet-308",
    "sku": "VS-CAB-308",
    "manufacturerPartNumber": "VS-CAB-308",
    "name": "Wall Cabinet 308",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 4,
      "vancouver": 2,
      "calgary": 4,
      "montreal": 7
    },
    "price": {
      "amount": 670,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "309",
    "slug": "base-cabinet-309",
    "sku": "VS-CAB-309",
    "manufacturerPartNumber": "VS-CAB-309",
    "name": "Base Cabinet 309",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 5,
      "vancouver": 3,
      "calgary": 5,
      "montreal": 8
    },
    "price": {
      "amount": 705,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "310",
    "slug": "wall-cabinet-310",
    "sku": "VS-CAB-310",
    "manufacturerPartNumber": "VS-CAB-310",
    "name": "Wall Cabinet 310",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 6,
      "vancouver": 4,
      "calgary": 1,
      "montreal": 9
    },
    "price": {
      "amount": 390,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "311",
    "slug": "base-cabinet-311",
    "sku": "VS-CAB-311",
    "manufacturerPartNumber": "VS-CAB-311",
    "name": "Base Cabinet 311",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 7,
      "vancouver": 5,
      "calgary": 2,
      "montreal": 10
    },
    "price": {
      "amount": 425,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "312",
    "slug": "wall-cabinet-312",
    "sku": "VS-CAB-312",
    "manufacturerPartNumber": "VS-CAB-312",
    "name": "Wall Cabinet 312",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 8,
      "vancouver": 6,
      "calgary": 3,
      "montreal": 3
    },
    "price": {
      "amount": 460,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "313",
    "slug": "base-cabinet-313",
    "sku": "VS-CAB-313",
    "manufacturerPartNumber": "VS-CAB-313",
    "name": "Base Cabinet 313",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 9,
      "vancouver": 7,
      "calgary": 4,
      "montreal": 4
    },
    "price": {
      "amount": 495,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "314",
    "slug": "wall-cabinet-314",
    "sku": "VS-CAB-314",
    "manufacturerPartNumber": "VS-CAB-314",
    "name": "Wall Cabinet 314",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 10,
      "vancouver": 8,
      "calgary": 5,
      "montreal": 5
    },
    "price": {
      "amount": 530,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "315",
    "slug": "base-cabinet-315",
    "sku": "VS-CAB-315",
    "manufacturerPartNumber": "VS-CAB-315",
    "name": "Base Cabinet 315",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 11,
      "vancouver": 2,
      "calgary": 1,
      "montreal": 6
    },
    "price": {
      "amount": 565,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "316",
    "slug": "wall-cabinet-316",
    "sku": "VS-CAB-316",
    "manufacturerPartNumber": "VS-CAB-316",
    "name": "Wall Cabinet 316",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 12,
      "vancouver": 3,
      "calgary": 2,
      "montreal": 7
    },
    "price": {
      "amount": 600,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "317",
    "slug": "base-cabinet-317",
    "sku": "VS-CAB-317",
    "manufacturerPartNumber": "VS-CAB-317",
    "name": "Base Cabinet 317",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 13,
      "vancouver": 4,
      "calgary": 3,
      "montreal": 8
    },
    "price": {
      "amount": 635,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "318",
    "slug": "wall-cabinet-318",
    "sku": "VS-CAB-318",
    "manufacturerPartNumber": "VS-CAB-318",
    "name": "Wall Cabinet 318",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 14,
      "vancouver": 5,
      "calgary": 4,
      "montreal": 9
    },
    "price": {
      "amount": 670,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "319",
    "slug": "base-cabinet-319",
    "sku": "VS-CAB-319",
    "manufacturerPartNumber": "VS-CAB-319",
    "name": "Base Cabinet 319",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 4,
      "vancouver": 6,
      "calgary": 5,
      "montreal": 10
    },
    "price": {
      "amount": 705,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "320",
    "slug": "wall-cabinet-320",
    "sku": "VS-CAB-320",
    "manufacturerPartNumber": "VS-CAB-320",
    "name": "Wall Cabinet 320",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 5,
      "vancouver": 7,
      "calgary": 1,
      "montreal": 3
    },
    "price": {
      "amount": 390,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "321",
    "slug": "base-cabinet-321",
    "sku": "VS-CAB-321",
    "manufacturerPartNumber": "VS-CAB-321",
    "name": "Base Cabinet 321",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 6,
      "vancouver": 8,
      "calgary": 2,
      "montreal": 4
    },
    "price": {
      "amount": 425,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "322",
    "slug": "wall-cabinet-322",
    "sku": "VS-CAB-322",
    "manufacturerPartNumber": "VS-CAB-322",
    "name": "Wall Cabinet 322",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 7,
      "vancouver": 2,
      "calgary": 3,
      "montreal": 5
    },
    "price": {
      "amount": 460,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "323",
    "slug": "base-cabinet-323",
    "sku": "VS-CAB-323",
    "manufacturerPartNumber": "VS-CAB-323",
    "name": "Base Cabinet 323",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 8,
      "vancouver": 3,
      "calgary": 4,
      "montreal": 6
    },
    "price": {
      "amount": 495,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "324",
    "slug": "wall-cabinet-324",
    "sku": "VS-CAB-324",
    "manufacturerPartNumber": "VS-CAB-324",
    "name": "Wall Cabinet 324",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 9,
      "vancouver": 4,
      "calgary": 5,
      "montreal": 7
    },
    "price": {
      "amount": 530,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "325",
    "slug": "base-cabinet-325",
    "sku": "VS-CAB-325",
    "manufacturerPartNumber": "VS-CAB-325",
    "name": "Base Cabinet 325",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 10,
      "vancouver": 5,
      "calgary": 1,
      "montreal": 8
    },
    "price": {
      "amount": 565,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "326",
    "slug": "wall-cabinet-326",
    "sku": "VS-CAB-326",
    "manufacturerPartNumber": "VS-CAB-326",
    "name": "Wall Cabinet 326",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 11,
      "vancouver": 6,
      "calgary": 2,
      "montreal": 9
    },
    "price": {
      "amount": 600,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "327",
    "slug": "base-cabinet-327",
    "sku": "VS-CAB-327",
    "manufacturerPartNumber": "VS-CAB-327",
    "name": "Base Cabinet 327",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 12,
      "vancouver": 7,
      "calgary": 3,
      "montreal": 10
    },
    "price": {
      "amount": 635,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "328",
    "slug": "wall-cabinet-328",
    "sku": "VS-CAB-328",
    "manufacturerPartNumber": "VS-CAB-328",
    "name": "Wall Cabinet 328",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 13,
      "vancouver": 8,
      "calgary": 4,
      "montreal": 3
    },
    "price": {
      "amount": 670,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "329",
    "slug": "base-cabinet-329",
    "sku": "VS-CAB-329",
    "manufacturerPartNumber": "VS-CAB-329",
    "name": "Base Cabinet 329",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 14,
      "vancouver": 2,
      "calgary": 5,
      "montreal": 4
    },
    "price": {
      "amount": 705,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "330",
    "slug": "wall-cabinet-330",
    "sku": "VS-CAB-330",
    "manufacturerPartNumber": "VS-CAB-330",
    "name": "Wall Cabinet 330",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 4,
      "vancouver": 3,
      "calgary": 1,
      "montreal": 5
    },
    "price": {
      "amount": 390,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "331",
    "slug": "base-cabinet-331",
    "sku": "VS-CAB-331",
    "manufacturerPartNumber": "VS-CAB-331",
    "name": "Base Cabinet 331",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 5,
      "vancouver": 4,
      "calgary": 2,
      "montreal": 6
    },
    "price": {
      "amount": 425,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "332",
    "slug": "wall-cabinet-332",
    "sku": "VS-CAB-332",
    "manufacturerPartNumber": "VS-CAB-332",
    "name": "Wall Cabinet 332",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 6,
      "vancouver": 5,
      "calgary": 3,
      "montreal": 7
    },
    "price": {
      "amount": 460,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "333",
    "slug": "base-cabinet-333",
    "sku": "VS-CAB-333",
    "manufacturerPartNumber": "VS-CAB-333",
    "name": "Base Cabinet 333",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 7,
      "vancouver": 6,
      "calgary": 4,
      "montreal": 8
    },
    "price": {
      "amount": 495,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "334",
    "slug": "wall-cabinet-334",
    "sku": "VS-CAB-334",
    "manufacturerPartNumber": "VS-CAB-334",
    "name": "Wall Cabinet 334",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 8,
      "vancouver": 7,
      "calgary": 5,
      "montreal": 9
    },
    "price": {
      "amount": 530,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "335",
    "slug": "base-cabinet-335",
    "sku": "VS-CAB-335",
    "manufacturerPartNumber": "VS-CAB-335",
    "name": "Base Cabinet 335",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 9,
      "vancouver": 8,
      "calgary": 1,
      "montreal": 10
    },
    "price": {
      "amount": 565,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "336",
    "slug": "wall-cabinet-336",
    "sku": "VS-CAB-336",
    "manufacturerPartNumber": "VS-CAB-336",
    "name": "Wall Cabinet 336",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 10,
      "vancouver": 2,
      "calgary": 2,
      "montreal": 3
    },
    "price": {
      "amount": 600,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "337",
    "slug": "base-cabinet-337",
    "sku": "VS-CAB-337",
    "manufacturerPartNumber": "VS-CAB-337",
    "name": "Base Cabinet 337",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 11,
      "vancouver": 3,
      "calgary": 3,
      "montreal": 4
    },
    "price": {
      "amount": 635,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "338",
    "slug": "wall-cabinet-338",
    "sku": "VS-CAB-338",
    "manufacturerPartNumber": "VS-CAB-338",
    "name": "Wall Cabinet 338",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 12,
      "vancouver": 4,
      "calgary": 4,
      "montreal": 5
    },
    "price": {
      "amount": 670,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "339",
    "slug": "base-cabinet-339",
    "sku": "VS-CAB-339",
    "manufacturerPartNumber": "VS-CAB-339",
    "name": "Base Cabinet 339",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 13,
      "vancouver": 5,
      "calgary": 5,
      "montreal": 6
    },
    "price": {
      "amount": 705,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "340",
    "slug": "wall-cabinet-340",
    "sku": "VS-CAB-340",
    "manufacturerPartNumber": "VS-CAB-340",
    "name": "Wall Cabinet 340",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 14,
      "vancouver": 6,
      "calgary": 1,
      "montreal": 7
    },
    "price": {
      "amount": 390,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "341",
    "slug": "base-cabinet-341",
    "sku": "VS-CAB-341",
    "manufacturerPartNumber": "VS-CAB-341",
    "name": "Base Cabinet 341",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 4,
      "vancouver": 7,
      "calgary": 2,
      "montreal": 8
    },
    "price": {
      "amount": 425,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "342",
    "slug": "wall-cabinet-342",
    "sku": "VS-CAB-342",
    "manufacturerPartNumber": "VS-CAB-342",
    "name": "Wall Cabinet 342",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 5,
      "vancouver": 8,
      "calgary": 3,
      "montreal": 9
    },
    "price": {
      "amount": 460,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "344",
    "slug": "wall-cabinet-344",
    "sku": "VS-CAB-344",
    "manufacturerPartNumber": "VS-CAB-344",
    "name": "Wall Cabinet 344",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 7,
      "vancouver": 3,
      "calgary": 5,
      "montreal": 3
    },
    "price": {
      "amount": 530,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "345",
    "slug": "base-cabinet-345",
    "sku": "VS-CAB-345",
    "manufacturerPartNumber": "VS-CAB-345",
    "name": "Base Cabinet 345",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 8,
      "vancouver": 4,
      "calgary": 1,
      "montreal": 4
    },
    "price": {
      "amount": 565,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "346",
    "slug": "wall-cabinet-346",
    "sku": "VS-CAB-346",
    "manufacturerPartNumber": "VS-CAB-346",
    "name": "Wall Cabinet 346",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 9,
      "vancouver": 5,
      "calgary": 2,
      "montreal": 5
    },
    "price": {
      "amount": 600,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "347",
    "slug": "tall-cabinet-347",
    "sku": "VS-CAB-347",
    "manufacturerPartNumber": "VS-CAB-347",
    "name": "Tall Cabinet 347",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 10,
      "vancouver": 6,
      "calgary": 3,
      "montreal": 6
    },
    "price": {
      "amount": 648,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "348",
    "slug": "wall-cabinet-348",
    "sku": "VS-CAB-348",
    "manufacturerPartNumber": "VS-CAB-348",
    "name": "Wall Cabinet 348",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 11,
      "vancouver": 7,
      "calgary": 4,
      "montreal": 7
    },
    "price": {
      "amount": 686,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "349",
    "slug": "tall-cabinet-349",
    "sku": "VS-CAB-349",
    "manufacturerPartNumber": "VS-CAB-349",
    "name": "Tall Cabinet 349",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 12,
      "vancouver": 8,
      "calgary": 5,
      "montreal": 8
    },
    "price": {
      "amount": 724,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "350",
    "slug": "wall-cabinet-350",
    "sku": "VS-CAB-350",
    "manufacturerPartNumber": "VS-CAB-350",
    "name": "Wall Cabinet 350",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 13,
      "vancouver": 2,
      "calgary": 1,
      "montreal": 9
    },
    "price": {
      "amount": 762,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "351",
    "slug": "tall-cabinet-351",
    "sku": "VS-CAB-351",
    "manufacturerPartNumber": "VS-CAB-351",
    "name": "Tall Cabinet 351",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 14,
      "vancouver": 3,
      "calgary": 2,
      "montreal": 10
    },
    "price": {
      "amount": 800,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "352",
    "slug": "wall-cabinet-352",
    "sku": "VS-CAB-352",
    "manufacturerPartNumber": "VS-CAB-352",
    "name": "Wall Cabinet 352",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 4,
      "vancouver": 4,
      "calgary": 3,
      "montreal": 3
    },
    "price": {
      "amount": 420,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "358",
    "slug": "wall-cabinet-358",
    "sku": "VS-CAB-358",
    "manufacturerPartNumber": "VS-CAB-358",
    "name": "Wall Cabinet 358",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 10,
      "vancouver": 3,
      "calgary": 4,
      "montreal": 9
    },
    "price": {
      "amount": 648,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "359",
    "slug": "tall-cabinet-359",
    "sku": "VS-CAB-359",
    "manufacturerPartNumber": "VS-CAB-359",
    "name": "Tall Cabinet 359",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 11,
      "vancouver": 4,
      "calgary": 5,
      "montreal": 10
    },
    "price": {
      "amount": 686,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "360",
    "slug": "wall-cabinet-360",
    "sku": "VS-CAB-360",
    "manufacturerPartNumber": "VS-CAB-360",
    "name": "Wall Cabinet 360",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 12,
      "vancouver": 5,
      "calgary": 1,
      "montreal": 3
    },
    "price": {
      "amount": 724,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "361",
    "slug": "tall-cabinet-361",
    "sku": "VS-CAB-361",
    "manufacturerPartNumber": "VS-CAB-361",
    "name": "Tall Cabinet 361",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 13,
      "vancouver": 6,
      "calgary": 2,
      "montreal": 4
    },
    "price": {
      "amount": 762,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "362",
    "slug": "wall-cabinet-362",
    "sku": "VS-CAB-362",
    "manufacturerPartNumber": "VS-CAB-362",
    "name": "Wall Cabinet 362",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 14,
      "vancouver": 7,
      "calgary": 3,
      "montreal": 5
    },
    "price": {
      "amount": 800,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "363",
    "slug": "tall-cabinet-363",
    "sku": "VS-CAB-363",
    "manufacturerPartNumber": "VS-CAB-363",
    "name": "Tall Cabinet 363",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 4,
      "vancouver": 8,
      "calgary": 4,
      "montreal": 6
    },
    "price": {
      "amount": 420,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "365",
    "slug": "tall-cabinet-365",
    "sku": "VS-CAB-365",
    "manufacturerPartNumber": "VS-CAB-365",
    "name": "Tall Cabinet 365",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 6,
      "vancouver": 3,
      "calgary": 1,
      "montreal": 8
    },
    "price": {
      "amount": 496,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "366",
    "slug": "wall-cabinet-366",
    "sku": "VS-CAB-366",
    "manufacturerPartNumber": "VS-CAB-366",
    "name": "Wall Cabinet 366",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 7,
      "vancouver": 4,
      "calgary": 2,
      "montreal": 9
    },
    "price": {
      "amount": 534,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "368",
    "slug": "wall-cabinet-368",
    "sku": "VS-CAB-368",
    "manufacturerPartNumber": "VS-CAB-368",
    "name": "Wall Cabinet 368",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 9,
      "vancouver": 6,
      "calgary": 4,
      "montreal": 3
    },
    "price": {
      "amount": 610,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "369",
    "slug": "tall-cabinet-369",
    "sku": "VS-CAB-369",
    "manufacturerPartNumber": "VS-CAB-369",
    "name": "Tall Cabinet 369",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 10,
      "vancouver": 7,
      "calgary": 5,
      "montreal": 4
    },
    "price": {
      "amount": 648,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "370",
    "slug": "wall-cabinet-370",
    "sku": "VS-CAB-370",
    "manufacturerPartNumber": "VS-CAB-370",
    "name": "Wall Cabinet 370",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 11,
      "vancouver": 8,
      "calgary": 1,
      "montreal": 5
    },
    "price": {
      "amount": 686,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "371",
    "slug": "base-cabinet-371",
    "sku": "VS-CAB-371",
    "manufacturerPartNumber": "VS-CAB-371",
    "name": "Base Cabinet 371",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 12,
      "vancouver": 2,
      "calgary": 2,
      "montreal": 6
    },
    "price": {
      "amount": 425,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "372",
    "slug": "wall-cabinet-372",
    "sku": "VS-CAB-372",
    "manufacturerPartNumber": "VS-CAB-372",
    "name": "Wall Cabinet 372",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 13,
      "vancouver": 3,
      "calgary": 3,
      "montreal": 7
    },
    "price": {
      "amount": 460,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "373",
    "slug": "base-cabinet-373",
    "sku": "VS-CAB-373",
    "manufacturerPartNumber": "VS-CAB-373",
    "name": "Base Cabinet 373",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 14,
      "vancouver": 4,
      "calgary": 4,
      "montreal": 8
    },
    "price": {
      "amount": 495,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "374",
    "slug": "wall-cabinet-374",
    "sku": "VS-CAB-374",
    "manufacturerPartNumber": "VS-CAB-374",
    "name": "Wall Cabinet 374",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 4,
      "vancouver": 5,
      "calgary": 5,
      "montreal": 9
    },
    "price": {
      "amount": 530,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "375",
    "slug": "base-cabinet-375",
    "sku": "VS-CAB-375",
    "manufacturerPartNumber": "VS-CAB-375",
    "name": "Base Cabinet 375",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 5,
      "vancouver": 6,
      "calgary": 1,
      "montreal": 10
    },
    "price": {
      "amount": 565,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "376",
    "slug": "wall-cabinet-376",
    "sku": "VS-CAB-376",
    "manufacturerPartNumber": "VS-CAB-376",
    "name": "Wall Cabinet 376",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 6,
      "vancouver": 7,
      "calgary": 2,
      "montreal": 3
    },
    "price": {
      "amount": 600,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "377",
    "slug": "base-cabinet-377",
    "sku": "VS-CAB-377",
    "manufacturerPartNumber": "VS-CAB-377",
    "name": "Base Cabinet 377",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 7,
      "vancouver": 8,
      "calgary": 3,
      "montreal": 4
    },
    "price": {
      "amount": 635,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "378",
    "slug": "wall-cabinet-378",
    "sku": "VS-CAB-378",
    "manufacturerPartNumber": "VS-CAB-378",
    "name": "Wall Cabinet 378",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 8,
      "vancouver": 2,
      "calgary": 4,
      "montreal": 5
    },
    "price": {
      "amount": 670,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "379",
    "slug": "base-cabinet-379",
    "sku": "VS-CAB-379",
    "manufacturerPartNumber": "VS-CAB-379",
    "name": "Base Cabinet 379",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 9,
      "vancouver": 3,
      "calgary": 5,
      "montreal": 6
    },
    "price": {
      "amount": 705,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "380",
    "slug": "wall-cabinet-380",
    "sku": "VS-CAB-380",
    "manufacturerPartNumber": "VS-CAB-380",
    "name": "Wall Cabinet 380",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 10,
      "vancouver": 4,
      "calgary": 1,
      "montreal": 7
    },
    "price": {
      "amount": 390,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "381",
    "slug": "base-cabinet-381",
    "sku": "VS-CAB-381",
    "manufacturerPartNumber": "VS-CAB-381",
    "name": "Base Cabinet 381",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 11,
      "vancouver": 5,
      "calgary": 2,
      "montreal": 8
    },
    "price": {
      "amount": 425,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "382",
    "slug": "wall-cabinet-382",
    "sku": "VS-CAB-382",
    "manufacturerPartNumber": "VS-CAB-382",
    "name": "Wall Cabinet 382",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 12,
      "vancouver": 6,
      "calgary": 3,
      "montreal": 9
    },
    "price": {
      "amount": 460,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "383",
    "slug": "base-cabinet-383",
    "sku": "VS-CAB-383",
    "manufacturerPartNumber": "VS-CAB-383",
    "name": "Base Cabinet 383",
    "category": "Kitchen Cabinets",
    "dimensions": "Original catalog cabinet configuration",
    "finish": "MDF + PVC",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 13,
      "vancouver": 7,
      "calgary": 4,
      "montreal": 10
    },
    "price": {
      "amount": 495,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "401",
    "slug": "vanity-cabinet-401",
    "sku": "VS-VAN-401",
    "manufacturerPartNumber": "VS-VAN-401",
    "name": "Vanity Cabinet 401",
    "category": "Bathroom Vanities",
    "dimensions": "Original catalog vanity configuration",
    "finish": "Painted cabinet finish",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 9,
      "vancouver": 4,
      "calgary": 2,
      "montreal": 4
    },
    "price": {
      "amount": 585,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "402",
    "slug": "vanity-cabinet-402",
    "sku": "VS-VAN-402",
    "manufacturerPartNumber": "VS-VAN-402",
    "name": "Vanity Cabinet 402",
    "category": "Bathroom Vanities",
    "dimensions": "Original catalog vanity configuration",
    "finish": "Painted cabinet finish",
    "colorName": "White",
    "colorHex": "#f8f7f3",
    "dealerStock": {
      "toronto": 10,
      "vancouver": 5,
      "calgary": 3,
      "montreal": 5
    },
    "price": {
      "amount": 630,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "404",
    "slug": "vanity-cabinet-404",
    "sku": "VS-VAN-404",
    "manufacturerPartNumber": "VS-VAN-404",
    "name": "Vanity Cabinet 404",
    "category": "Bathroom Vanities",
    "dimensions": "Original catalog vanity configuration",
    "finish": "Painted cabinet finish",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 12,
      "vancouver": 7,
      "calgary": 5,
      "montreal": 7
    },
    "price": {
      "amount": 720,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "405",
    "slug": "vanity-cabinet-405",
    "sku": "VS-VAN-405",
    "manufacturerPartNumber": "VS-VAN-405",
    "name": "Vanity Cabinet 405",
    "category": "Bathroom Vanities",
    "dimensions": "Original catalog vanity configuration",
    "finish": "Painted cabinet finish",
    "colorName": "White",
    "colorHex": "#f8f7f3",
    "dealerStock": {
      "toronto": 13,
      "vancouver": 8,
      "calgary": 1,
      "montreal": 8
    },
    "price": {
      "amount": 360,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "406",
    "slug": "vanity-cabinet-406",
    "sku": "VS-VAN-406",
    "manufacturerPartNumber": "VS-VAN-406",
    "name": "Vanity Cabinet 406",
    "category": "Bathroom Vanities",
    "dimensions": "Original catalog vanity configuration",
    "finish": "Painted cabinet finish",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 14,
      "vancouver": 2,
      "calgary": 2,
      "montreal": 9
    },
    "price": {
      "amount": 405,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "410",
    "slug": "primed-mdf-moulding-410",
    "sku": "VS-MDF-410",
    "manufacturerPartNumber": "VS-MDF-410",
    "name": "Primed MDF Moulding 410",
    "category": "Baseboards & Mouldings",
    "dimensions": "Original catalog moulding profile",
    "finish": "Primed MDF",
    "colorName": "Primed white",
    "colorHex": "#fbfaf7",
    "dealerStock": {
      "toronto": 7,
      "vancouver": 6,
      "calgary": 1,
      "montreal": 5
    },
    "price": {
      "amount": 7,
      "currency": "CAD"
    },
    "unit": "ea",
    "inStock": true
  },
  {
    "id": "412",
    "slug": "vanity-cabinet-412",
    "sku": "VS-VAN-412",
    "manufacturerPartNumber": "VS-VAN-412",
    "name": "Vanity Cabinet 412",
    "category": "Bathroom Vanities",
    "dimensions": "Original catalog vanity configuration",
    "finish": "Painted cabinet finish",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 9,
      "vancouver": 8,
      "calgary": 3,
      "montreal": 7
    },
    "price": {
      "amount": 675,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "413",
    "slug": "vanity-cabinet-413",
    "sku": "VS-VAN-413",
    "manufacturerPartNumber": "VS-VAN-413",
    "name": "Vanity Cabinet 413",
    "category": "Bathroom Vanities",
    "dimensions": "Original catalog vanity configuration",
    "finish": "Painted cabinet finish",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 10,
      "vancouver": 2,
      "calgary": 4,
      "montreal": 8
    },
    "price": {
      "amount": 720,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  },
  {
    "id": "415",
    "slug": "vanity-cabinet-415",
    "sku": "VS-VAN-415",
    "manufacturerPartNumber": "VS-VAN-415",
    "name": "Vanity Cabinet 415",
    "category": "Bathroom Vanities",
    "dimensions": "Original catalog vanity configuration",
    "finish": "Painted cabinet finish",
    "colorName": "PVC white",
    "colorHex": "#f4f2ee",
    "dealerStock": {
      "toronto": 12,
      "vancouver": 4,
      "calgary": 1,
      "montreal": 10
    },
    "price": {
      "amount": 405,
      "currency": "CAD"
    },
    "unit": "each",
    "inStock": true
  }
] satisfies Array<Omit<ProductSummary, "images">>;

export const originalSiteImportedProducts: ProductSummary[] = importedProducts.map((product) => ({
  ...product,
  brand: "VanStro",
  images: originalSiteImageLibrary[product.id] ?? []
}));
