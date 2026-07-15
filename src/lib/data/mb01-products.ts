import type { ProductSummary } from "@/lib/api/api-contract";

export type Mb01ProductMetadata = {
  sourceUrl: string;
  sourceProductId: string;
  sourceProductName: string;
  sourceCategory: string;
  description: string;
  productHighlights: string[];
  specifications: Record<string, string>;
};

// Generated from https://mb01.vanstro.ca. Re-running this script removes SKUs no longer published there.
// 139 SKUs are listed on MB01 category product cards. Detail pages only supply metadata.
export const mb01Products: ProductSummary[] = [
  {
    "id": "mb01-40",
    "slug": "3-drawer-base-3db12-272",
    "sku": "012710130",
    "manufacturerPartNumber": "3DB12-PWMS-WH",
    "name": "3-Drawer Base 3DB12",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 467,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "12\" W × 34½\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-40",
      "sku": "012710130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/272_P_1777097169902.JPG",
        "alt": "3-Drawer Base 3DB12"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/272_P_1777097176935.JPG",
        "alt": "3-Drawer Base 3DB12 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/272_P_1777097185402.JPG",
        "alt": "3-Drawer Base 3DB12 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/272_P_1777097185458.JPG",
        "alt": "3-Drawer Base 3DB12 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/272_P_1777097185191.JPG",
        "alt": "3-Drawer Base 3DB12 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/272_P_1779072497504.jpg",
        "alt": "3-Drawer Base 3DB12 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "3-Drawer Base 3DB12 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "3-Drawer Base 3DB12 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "3-Drawer Base 3DB12 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "3-Drawer Base 3DB12 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "3-Drawer Base 3DB12 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-42",
    "slug": "3-drawer-base-3db15-273",
    "sku": "012720130",
    "manufacturerPartNumber": "3DB15-PWMS-WH",
    "name": "3-Drawer Base 3DB15",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 496,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "15\" W × 34½\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-42",
      "sku": "012720130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/273_P_1777099754384.JPG",
        "alt": "3-Drawer Base 3DB15"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/273_P_1777099759736.JPG",
        "alt": "3-Drawer Base 3DB15 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/273_P_1777099767674.JPG",
        "alt": "3-Drawer Base 3DB15 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/273_P_1777099767103.JPG",
        "alt": "3-Drawer Base 3DB15 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708151953_c8b7e8956077.jpg",
        "alt": "3-Drawer Base 3DB15 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/273_P_1779072540393.jpg",
        "alt": "3-Drawer Base 3DB15 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "3-Drawer Base 3DB15 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "3-Drawer Base 3DB15 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "3-Drawer Base 3DB15 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "3-Drawer Base 3DB15 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "3-Drawer Base 3DB15 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-44",
    "slug": "3-drawer-base-3db18-274",
    "sku": "012730130",
    "manufacturerPartNumber": "3DB18-PWMS-WH",
    "name": "3-Drawer Base 3DB18",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 526,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "18\" W × 34½\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-44",
      "sku": "012730130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/274_P_1777101272379.JPG",
        "alt": "3-Drawer Base 3DB18"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/274_P_1777101277909.JPG",
        "alt": "3-Drawer Base 3DB18 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/274_P_1777101285112.JPG",
        "alt": "3-Drawer Base 3DB18 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/274_P_1777101285114.JPG",
        "alt": "3-Drawer Base 3DB18 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708152041_b308c9f36bc9.jpg",
        "alt": "3-Drawer Base 3DB18 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/274_P_1779072577341.jpg",
        "alt": "3-Drawer Base 3DB18 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "3-Drawer Base 3DB18 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "3-Drawer Base 3DB18 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "3-Drawer Base 3DB18 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "3-Drawer Base 3DB18 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "3-Drawer Base 3DB18 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-46",
    "slug": "3-drawer-base-3db21-275",
    "sku": "012740130",
    "manufacturerPartNumber": "3DB21-PWMS-WH",
    "name": "3-Drawer Base 3DB21",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 558,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "21\" W × 34½\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-46",
      "sku": "012740130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/275_P_1777102197220.JPG",
        "alt": "3-Drawer Base 3DB21"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/275_P_1777102206569.JPG",
        "alt": "3-Drawer Base 3DB21 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/275_P_1777102214470.JPG",
        "alt": "3-Drawer Base 3DB21 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/275_P_1777102215507.JPG",
        "alt": "3-Drawer Base 3DB21 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/275_P_1777102215698.JPG",
        "alt": "3-Drawer Base 3DB21 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/275_P_1779072614828.jpg",
        "alt": "3-Drawer Base 3DB21 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "3-Drawer Base 3DB21 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "3-Drawer Base 3DB21 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "3-Drawer Base 3DB21 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "3-Drawer Base 3DB21 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "3-Drawer Base 3DB21 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-48",
    "slug": "3-drawer-base-3db24-276",
    "sku": "012750130",
    "manufacturerPartNumber": "3DB24-PWMS-WH",
    "name": "3-Drawer Base 3DB24",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 590,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "24\" W × 34½\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-48",
      "sku": "012750130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/276_P_1777101411422.JPG",
        "alt": "3-Drawer Base 3DB24"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/276_P_1777101425624.JPG",
        "alt": "3-Drawer Base 3DB24 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/276_P_1777101435987.JPG",
        "alt": "3-Drawer Base 3DB24 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/276_P_1777101435315.JPG",
        "alt": "3-Drawer Base 3DB24 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/276_P_1777101435764.JPG",
        "alt": "3-Drawer Base 3DB24 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/276_P_1779072649835.jpg",
        "alt": "3-Drawer Base 3DB24 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "3-Drawer Base 3DB24 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "3-Drawer Base 3DB24 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "3-Drawer Base 3DB24 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "3-Drawer Base 3DB24 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "3-Drawer Base 3DB24 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-50",
    "slug": "3-drawer-base-3db30-277",
    "sku": "012770130",
    "manufacturerPartNumber": "3DB30-PWMS-WH",
    "name": "3-Drawer Base 3DB30",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 656,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "30\" W × 34½\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-50",
      "sku": "012770130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/277_P_1777102437242.JPG",
        "alt": "3-Drawer Base 3DB30"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/277_P_1777102442370.JPG",
        "alt": "3-Drawer Base 3DB30 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/277_P_1777102448916.JPG",
        "alt": "3-Drawer Base 3DB30 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/277_P_1777102449887.JPG",
        "alt": "3-Drawer Base 3DB30 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/277_P_1777102449847.JPG",
        "alt": "3-Drawer Base 3DB30 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/277_P_1779072692037.jpg",
        "alt": "3-Drawer Base 3DB30 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "3-Drawer Base 3DB30 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "3-Drawer Base 3DB30 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "3-Drawer Base 3DB30 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "3-Drawer Base 3DB30 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "3-Drawer Base 3DB30 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-52",
    "slug": "3-drawer-base-3db33-278",
    "sku": "012780130",
    "manufacturerPartNumber": "3DB33-PWMS-WH",
    "name": "3-Drawer Base 3DB33",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 688,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "33\" W × 34½\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-52",
      "sku": "012780130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/278_P_1777102556140.JPG",
        "alt": "3-Drawer Base 3DB33"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/278_P_1777102560090.JPG",
        "alt": "3-Drawer Base 3DB33 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/278_P_1777102567743.JPG",
        "alt": "3-Drawer Base 3DB33 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/278_P_1777102567113.JPG",
        "alt": "3-Drawer Base 3DB33 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708152305_e09ce6b70dd8.jpg",
        "alt": "3-Drawer Base 3DB33 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/278_P_1779072729887.jpg",
        "alt": "3-Drawer Base 3DB33 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "3-Drawer Base 3DB33 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "3-Drawer Base 3DB33 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "3-Drawer Base 3DB33 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "3-Drawer Base 3DB33 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "3-Drawer Base 3DB33 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-54",
    "slug": "3-drawer-base-3db36-279",
    "sku": "012790130",
    "manufacturerPartNumber": "3DB36-PWMS-WH",
    "name": "3-Drawer Base 3DB36",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 721,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "36\" W × 34½\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-54",
      "sku": "012790130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/279_P_1777102710403.JPG",
        "alt": "3-Drawer Base 3DB36"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/279_P_1777102715183.JPG",
        "alt": "3-Drawer Base 3DB36 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/279_P_1777102723987.JPG",
        "alt": "3-Drawer Base 3DB36 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/279_P_1777102723485.JPG",
        "alt": "3-Drawer Base 3DB36 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708152342_7824a0e51155.jpg",
        "alt": "3-Drawer Base 3DB36 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/279_P_1779072764574.jpg",
        "alt": "3-Drawer Base 3DB36 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "3-Drawer Base 3DB36 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "3-Drawer Base 3DB36 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "3-Drawer Base 3DB36 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "3-Drawer Base 3DB36 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "3-Drawer Base 3DB36 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-6",
    "slug": "base-cabinet-b12-252",
    "sku": "011710130",
    "manufacturerPartNumber": "B12-PWMS-WH",
    "name": "Base Cabinet B12",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 302,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "12\" W × 34½\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-6",
      "sku": "011710130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/252_P_1781959031651.JPG",
        "alt": "Base Cabinet B12"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/252_P_1781959042375.JPG",
        "alt": "Base Cabinet B12 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/252_P_1781959056572.JPG",
        "alt": "Base Cabinet B12 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/252_P_1781959056333.JPG",
        "alt": "Base Cabinet B12 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/252_P_1781962610778.png",
        "alt": "Base Cabinet B12 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/252_P_1781961827337.jpg",
        "alt": "Base Cabinet B12 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Base Cabinet B12 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Base Cabinet B12 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Base Cabinet B12 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Base Cabinet B12 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Base Cabinet B12 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-2",
    "slug": "base-cabinet-b15-253",
    "sku": "011720130",
    "manufacturerPartNumber": "B15-PWMS-WH",
    "name": "Base Cabinet B15",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 326,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "15\" W × 34½\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-2",
      "sku": "011720130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/253_P_1777011235651.JPG",
        "alt": "Base Cabinet B15"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/253_P_1777011745917.JPG",
        "alt": "Base Cabinet B15 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/253_P_1777011764457.JPG",
        "alt": "Base Cabinet B15 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/253_P_1781962639745.png",
        "alt": "Base Cabinet B15 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/253_P_1777011765580.JPG",
        "alt": "Base Cabinet B15 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/253_P_1779065391078.jpg",
        "alt": "Base Cabinet B15 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Base Cabinet B15 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Base Cabinet B15 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Base Cabinet B15 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Base Cabinet B15 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Base Cabinet B15 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-4",
    "slug": "base-cabinet-b18-254",
    "sku": "011730130",
    "manufacturerPartNumber": "B18-PWMS-WH",
    "name": "Base Cabinet B18",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 353,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "18\" W × 34½\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-4",
      "sku": "011730130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/254_P_1777011369088.JPG",
        "alt": "Base Cabinet B18"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/254_P_1777011370398.JPG",
        "alt": "Base Cabinet B18 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/254_P_1777011371530.JPG",
        "alt": "Base Cabinet B18 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/254_P_1777011370256.JPG",
        "alt": "Base Cabinet B18 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/254_P_1781962663227.png",
        "alt": "Base Cabinet B18 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/254_P_1779065495261.jpg",
        "alt": "Base Cabinet B18 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Base Cabinet B18 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Base Cabinet B18 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Base Cabinet B18 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Base Cabinet B18 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Base Cabinet B18 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-18",
    "slug": "base-cabinet-b21-265",
    "sku": "011740130",
    "manufacturerPartNumber": "B21-PWMS-WH",
    "name": "Base Cabinet B21",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 377,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "21\" W × 34½\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-18",
      "sku": "011740130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/265_P_1777094251418.JPG",
        "alt": "Base Cabinet B21"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/265_P_1777094258296.JPG",
        "alt": "Base Cabinet B21 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/265_P_1777094265734.JPG",
        "alt": "Base Cabinet B21 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/265_P_1781962688785.png",
        "alt": "Base Cabinet B21 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708151141_b5cc1e7397b4.jpg",
        "alt": "Base Cabinet B21 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/265_P_1779068709461.jpg",
        "alt": "Base Cabinet B21 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Base Cabinet B21 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Base Cabinet B21 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Base Cabinet B21 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Base Cabinet B21 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Base Cabinet B21 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-20",
    "slug": "base-cabinet-b24-266",
    "sku": "011750130",
    "manufacturerPartNumber": "B24-PWMS-WH",
    "name": "Base Cabinet B24",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 414,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "24\" W × 34½\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-20",
      "sku": "011750130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/266_P_1777096025208.JPG",
        "alt": "Base Cabinet B24"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/266_P_1777096032975.JPG",
        "alt": "Base Cabinet B24 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/266_P_1777096045940.JPG",
        "alt": "Base Cabinet B24 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/266_P_1777096045253.JPG",
        "alt": "Base Cabinet B24 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/266_P_1781962713383.png",
        "alt": "Base Cabinet B24 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/266_P_1779069092427.jpg",
        "alt": "Base Cabinet B24 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Base Cabinet B24 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Base Cabinet B24 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Base Cabinet B24 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Base Cabinet B24 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Base Cabinet B24 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-22",
    "slug": "base-cabinet-b27-267",
    "sku": "011760130",
    "manufacturerPartNumber": "B27-PWMS-WH",
    "name": "Base Cabinet B27",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 441,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "27\" W × 34½\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-22",
      "sku": "011760130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/267_P_1778653209785.JPG",
        "alt": "Base Cabinet B27"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/267_P_1778653252525.JPG",
        "alt": "Base Cabinet B27 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/267_P_1778653314286.JPG",
        "alt": "Base Cabinet B27 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/267_P_1778653314620.JPG",
        "alt": "Base Cabinet B27 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/267_P_1781962737871.png",
        "alt": "Base Cabinet B27 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/267_P_1779069133319.jpg",
        "alt": "Base Cabinet B27 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Base Cabinet B27 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Base Cabinet B27 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Base Cabinet B27 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Base Cabinet B27 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Base Cabinet B27 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-24",
    "slug": "base-cabinet-b30-268",
    "sku": "011770130",
    "manufacturerPartNumber": "B30-PWMS-WH",
    "name": "Base Cabinet B30",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 558,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "30\" W × 34½\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-24",
      "sku": "011770130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/268_P_1777096702523.JPG",
        "alt": "Base Cabinet B30"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/268_P_1777096708352.JPG",
        "alt": "Base Cabinet B30 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/268_P_1777096720647.JPG",
        "alt": "Base Cabinet B30 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/268_P_1777096720936.JPG",
        "alt": "Base Cabinet B30 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708151509_0bea4d3441ee.jpg",
        "alt": "Base Cabinet B30 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/268_P_1781962759903.png",
        "alt": "Base Cabinet B30 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/268_P_1779069208673.jpg",
        "alt": "Base Cabinet B30 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Base Cabinet B30 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Base Cabinet B30 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Base Cabinet B30 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Base Cabinet B30 alternate view 11"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Base Cabinet B30 alternate view 12"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-26",
    "slug": "base-cabinet-b33-269",
    "sku": "011780130",
    "manufacturerPartNumber": "B33-PWMS-WH",
    "name": "Base Cabinet B33",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 585,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "33\" W × 34½\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-26",
      "sku": "011780130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/269_P_1778653680827.JPG",
        "alt": "Base Cabinet B33"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/269_P_1778653695097.JPG",
        "alt": "Base Cabinet B33 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/269_P_1778653703684.JPG",
        "alt": "Base Cabinet B33 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/269_P_1778653703127.JPG",
        "alt": "Base Cabinet B33 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/269_P_1778653703639.JPG",
        "alt": "Base Cabinet B33 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/269_P_1781962781361.png",
        "alt": "Base Cabinet B33 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/269_P_1779069258017.jpg",
        "alt": "Base Cabinet B33 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Base Cabinet B33 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Base Cabinet B33 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Base Cabinet B33 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Base Cabinet B33 alternate view 11"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Base Cabinet B33 alternate view 12"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-28",
    "slug": "base-cabinet-b36-270",
    "sku": "011790130",
    "manufacturerPartNumber": "B36-PWMS-WH",
    "name": "Base Cabinet B36",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 612,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "36\" W × 34½\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-28",
      "sku": "011790130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708170903_9f5c9aef57a5.jpg",
        "alt": "Base Cabinet B36"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/270_P_1777096978998.JPG",
        "alt": "Base Cabinet B36 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/270_P_1777096982536.JPG",
        "alt": "Base Cabinet B36 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/270_P_1777096992635.JPG",
        "alt": "Base Cabinet B36 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/270_P_1777096992016.JPG",
        "alt": "Base Cabinet B36 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/270_P_1781962804078.png",
        "alt": "Base Cabinet B36 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/270_P_1779069311587.jpg",
        "alt": "Base Cabinet B36 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Base Cabinet B36 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Base Cabinet B36 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Base Cabinet B36 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Base Cabinet B36 alternate view 11"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Base Cabinet B36 alternate view 12"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-31",
    "slug": "base-cabinet-b42-271",
    "sku": "011800130",
    "manufacturerPartNumber": "B42-PWMS-WH",
    "name": "Base Cabinet B42",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 699,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "42\" W × 34½\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-31",
      "sku": "011800130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/271_P_1777097055228.JPG",
        "alt": "Base Cabinet B42"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/271_P_1777097060417.JPG",
        "alt": "Base Cabinet B42 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/271_P_1777097069896.JPG",
        "alt": "Base Cabinet B42 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/271_P_1777097069689.JPG",
        "alt": "Base Cabinet B42 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202604/source_img/271_P_1777097069572.JPG",
        "alt": "Base Cabinet B42 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/271_P_1781962831474.png",
        "alt": "Base Cabinet B42 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/271_P_1779069598123.jpg",
        "alt": "Base Cabinet B42 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Base Cabinet B42 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Base Cabinet B42 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Base Cabinet B42 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Base Cabinet B42 alternate view 11"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Base Cabinet B42 alternate view 12"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-248",
    "slug": "base-end-panel-bep2535-381",
    "sku": "018860942",
    "manufacturerPartNumber": "BEP2535-MS-WH",
    "name": "Base End Panel BEP2535",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 71,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "25\" W × 35\" H × ¾\"D",
    "finish": "White finish",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-248",
      "sku": "018860942",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/381_P_1778831493421.JPG",
        "alt": "Base End Panel BEP2535"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/381_P_1778831504206.JPG",
        "alt": "Base End Panel BEP2535 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/381_P_1778831493719.JPG",
        "alt": "Base End Panel BEP2535 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/381_P_1779793217929.gif",
        "alt": "Base End Panel BEP2535 alternate view 4"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-246",
    "slug": "base-end-panel-vep2230-380",
    "sku": "018850942",
    "manufacturerPartNumber": "VEP2230-MS-WH",
    "name": "Base End Panel VEP2230",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 54,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "22\" W × 30\" H × ¾\"D",
    "finish": "White finish",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-246",
      "sku": "018850942",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/380_P_1778831259010.JPG",
        "alt": "Base End Panel VEP2230"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/380_P_1778831274164.JPG",
        "alt": "Base End Panel VEP2230 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/380_P_1778831274981.JPG",
        "alt": "Base End Panel VEP2230 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/380_P_1779793177783.gif",
        "alt": "Base End Panel VEP2230 alternate view 4"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-299",
    "slug": "CabinetPulls",
    "sku": "060101111",
    "manufacturerPartNumber": "CTC[96mm]",
    "name": "Cabinet Pulls",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 5.99,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "192 mm center-to-center",
    "finish": "Aluminum Alloy",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-299",
      "sku": "060101111",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715080227_2b7c9c9913d6.jpg",
        "alt": "Cabinet Pulls"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715080227_ca2f10715266.jpg",
        "alt": "Cabinet Pulls alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715080227_aaaaa04756d0.jpg",
        "alt": "Cabinet Pulls alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715080227_25bc40dc57f5.jpg",
        "alt": "Cabinet Pulls alternate view 4"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-231",
    "slug": "decorative-moulding-bcm8-dcm-372",
    "sku": "019900142",
    "manufacturerPartNumber": "BCM8(DCM)-MS-WH",
    "name": "Decorative Moulding BCM8(DCM)",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 169,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "¾\" W × 4⅜\" H × 96\" L",
    "finish": "White finish",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-231",
      "sku": "019900142",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/372_P_1778671092941.JPG",
        "alt": "Decorative Moulding BCM8(DCM)"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/372_P_1778671097441.JPG",
        "alt": "Decorative Moulding BCM8(DCM) alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/372_P_1778671103503.JPG",
        "alt": "Decorative Moulding BCM8(DCM) alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/372_P_1779792548527.gif",
        "alt": "Decorative Moulding BCM8(DCM) alternate view 4"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-196",
    "slug": "diagonal-corner-wall-dcw2430-343",
    "sku": "015490130",
    "manufacturerPartNumber": "DCW2430-PWMS-WH",
    "name": "Diagonal Corner Wall DCW2430",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 356,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "24×24\" W × 30\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-196",
      "sku": "015490130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/343_P_1778659067152.JPG",
        "alt": "Diagonal Corner Wall DCW2430"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/343_P_1778659082554.JPG",
        "alt": "Diagonal Corner Wall DCW2430 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/343_P_1778659077608.JPG",
        "alt": "Diagonal Corner Wall DCW2430 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/343_P_1778659072141.JPG",
        "alt": "Diagonal Corner Wall DCW2430 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/343_P_1781985925823.jpg",
        "alt": "Diagonal Corner Wall DCW2430 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/343_P_1779790161493.gif",
        "alt": "Diagonal Corner Wall DCW2430 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Diagonal Corner Wall DCW2430 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Diagonal Corner Wall DCW2430 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Diagonal Corner Wall DCW2430 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Diagonal Corner Wall DCW2430 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Diagonal Corner Wall DCW2430 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-198",
    "slug": "diagonal-corner-wall-dcw2436-344",
    "sku": "015500130",
    "manufacturerPartNumber": "DCW2436-PWMS-WH",
    "name": "Diagonal Corner Wall DCW2436",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 389,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "24×24\" W × 36\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-198",
      "sku": "015500130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/344_P_1778661731374.JPG",
        "alt": "Diagonal Corner Wall DCW2436"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/344_P_1778661736891.JPG",
        "alt": "Diagonal Corner Wall DCW2436 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/344_P_1778661747984.JPG",
        "alt": "Diagonal Corner Wall DCW2436 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/344_P_1778661742959.JPG",
        "alt": "Diagonal Corner Wall DCW2436 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/344_P_1781985938873.jpg",
        "alt": "Diagonal Corner Wall DCW2436 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/344_P_1779790191906.gif",
        "alt": "Diagonal Corner Wall DCW2436 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Diagonal Corner Wall DCW2436 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Diagonal Corner Wall DCW2436 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Diagonal Corner Wall DCW2436 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Diagonal Corner Wall DCW2436 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Diagonal Corner Wall DCW2436 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-200",
    "slug": "diagonal-corner-wall-dcw2442-345",
    "sku": "015510130",
    "manufacturerPartNumber": "DCW2442-PWMS-WH",
    "name": "Diagonal Corner Wall DCW2442",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 469,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "24×24\" W × 42\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-200",
      "sku": "015510130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/345_P_1778663495532.JPG",
        "alt": "Diagonal Corner Wall DCW2442"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/345_P_1778663501451.JPG",
        "alt": "Diagonal Corner Wall DCW2442 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/345_P_1778663506906.JPG",
        "alt": "Diagonal Corner Wall DCW2442 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/345_P_1778663512008.JPG",
        "alt": "Diagonal Corner Wall DCW2442 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/345_P_1781985950449.jpg",
        "alt": "Diagonal Corner Wall DCW2442 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/345_P_1779790220149.gif",
        "alt": "Diagonal Corner Wall DCW2442 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Diagonal Corner Wall DCW2442 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Diagonal Corner Wall DCW2442 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Diagonal Corner Wall DCW2442 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Diagonal Corner Wall DCW2442 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Diagonal Corner Wall DCW2442 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-232",
    "slug": "filler-f342-373",
    "sku": "018810742",
    "manufacturerPartNumber": "F342-MS-WH",
    "name": "Filler F342",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 10,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "3\" W × 42\" H × ¾\"D",
    "finish": "White finish",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-232",
      "sku": "018810742",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/373_P_1778671955927.JPG",
        "alt": "Filler F342"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/373_P_1778671960138.JPG",
        "alt": "Filler F342 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/373_P_1778671967804.JPG",
        "alt": "Filler F342 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/373_P_1779792700783.gif",
        "alt": "Filler F342 alternate view 4"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-234",
    "slug": "filler-f642-374",
    "sku": "018830742",
    "manufacturerPartNumber": "F642-MS-WH",
    "name": "Filler F642",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 21,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "6\" W × 42\" H × ¾\"D",
    "finish": "White finish",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-234",
      "sku": "018830742",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/374_P_1778672287094.JPG",
        "alt": "Filler F642"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/374_P_1778672292938.JPG",
        "alt": "Filler F642 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/374_P_1778672298256.JPG",
        "alt": "Filler F642 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/374_P_1779792732696.gif",
        "alt": "Filler F642 alternate view 4"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-64",
    "slug": "lazy-susan-base-lsb33-280",
    "sku": "013780130",
    "manufacturerPartNumber": "LSB33-W-PWMS-WH",
    "name": "Lazy Susan Base LSB33",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 804,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "33\" W × 34½\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-64",
      "sku": "013780130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/280_P_1778654484445.JPG",
        "alt": "Lazy Susan Base LSB33"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/280_P_1778654509372.JPG",
        "alt": "Lazy Susan Base LSB33 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/280_P_1778654498989.JPG",
        "alt": "Lazy Susan Base LSB33 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/280_P_1778654509409.JPG",
        "alt": "Lazy Susan Base LSB33 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/280_P_1778654509021.JPG",
        "alt": "Lazy Susan Base LSB33 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/280_P_1779073446359.jpg",
        "alt": "Lazy Susan Base LSB33 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Lazy Susan Base LSB33 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Lazy Susan Base LSB33 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Lazy Susan Base LSB33 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Lazy Susan Base LSB33 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Lazy Susan Base LSB33 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-66",
    "slug": "lazy-susan-base-lsb36-281",
    "sku": "013790130",
    "manufacturerPartNumber": "LSB36-W-PWMS-WH",
    "name": "Lazy Susan Base LSB36",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 847,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "36\" W × 34½\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-66",
      "sku": "013790130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/281_P_1778654961190.JPG",
        "alt": "Lazy Susan Base LSB36"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/281_P_1778654967787.JPG",
        "alt": "Lazy Susan Base LSB36 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/281_P_1778654974650.JPG",
        "alt": "Lazy Susan Base LSB36 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/281_P_1778654974294.JPG",
        "alt": "Lazy Susan Base LSB36 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/281_P_1778654974719.JPG",
        "alt": "Lazy Susan Base LSB36 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/281_P_1779073642293.jpg",
        "alt": "Lazy Susan Base LSB36 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Lazy Susan Base LSB36 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Lazy Susan Base LSB36 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Lazy Susan Base LSB36 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Lazy Susan Base LSB36 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Lazy Susan Base LSB36 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-202",
    "slug": "microwave-cabinet-mo3030-346",
    "sku": "016290130",
    "manufacturerPartNumber": "MO3030-PWMS-WH",
    "name": "Microwave Cabinet MO3030",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 231,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "30\" W × 30\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-202",
      "sku": "016290130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/346_P_1778668091639.JPG",
        "alt": "Microwave Cabinet MO3030"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/346_P_1778668097027.JPG",
        "alt": "Microwave Cabinet MO3030 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/346_P_1778668102726.JPG",
        "alt": "Microwave Cabinet MO3030 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/346_P_1778668106813.JPG",
        "alt": "Microwave Cabinet MO3030 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/346_P_1781985960998.jpg",
        "alt": "Microwave Cabinet MO3030 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/346_P_1779790628940.gif",
        "alt": "Microwave Cabinet MO3030 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Microwave Cabinet MO3030 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Microwave Cabinet MO3030 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Microwave Cabinet MO3030 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Microwave Cabinet MO3030 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Microwave Cabinet MO3030 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-204",
    "slug": "microwave-cabinet-mo3036-347",
    "sku": "016300130",
    "manufacturerPartNumber": "MO3036-PWMS-WH",
    "name": "Microwave Cabinet MO3036",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 267,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "30\" W × 36\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-204",
      "sku": "016300130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/347_P_1778668186102.JPG",
        "alt": "Microwave Cabinet MO3036"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/347_P_1778668191737.JPG",
        "alt": "Microwave Cabinet MO3036 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/347_P_1778668196560.JPG",
        "alt": "Microwave Cabinet MO3036 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/347_P_1778668202191.JPG",
        "alt": "Microwave Cabinet MO3036 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/347_P_1781985972236.jpg",
        "alt": "Microwave Cabinet MO3036 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/347_P_1779790661447.gif",
        "alt": "Microwave Cabinet MO3036 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Microwave Cabinet MO3036 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Microwave Cabinet MO3036 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Microwave Cabinet MO3036 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Microwave Cabinet MO3036 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Microwave Cabinet MO3036 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-206",
    "slug": "microwave-cabinet-mo3042-348",
    "sku": "016310130",
    "manufacturerPartNumber": "MO3042-PWMS-WH",
    "name": "Microwave Cabinet MO3042",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 316,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "30\" W × 42\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-206",
      "sku": "016310130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/348_P_1778668283332.JPG",
        "alt": "Microwave Cabinet MO3042"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/348_P_1778668289178.JPG",
        "alt": "Microwave Cabinet MO3042 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/348_P_1778668293965.JPG",
        "alt": "Microwave Cabinet MO3042 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/348_P_1778668299232.JPG",
        "alt": "Microwave Cabinet MO3042 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/348_P_1781985984601.jpg",
        "alt": "Microwave Cabinet MO3042 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/348_P_1779790708450.gif",
        "alt": "Microwave Cabinet MO3042 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Microwave Cabinet MO3042 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Microwave Cabinet MO3042 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Microwave Cabinet MO3042 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Microwave Cabinet MO3042 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Microwave Cabinet MO3042 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-208",
    "slug": "open-end-shelf-oe630-349",
    "sku": "015520532",
    "manufacturerPartNumber": "OE630-PWMS-WH",
    "name": "Open End Shelf OE630",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 61,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "6\" W × 30\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-208",
      "sku": "015520532",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/349_P_1778667397065.JPG",
        "alt": "Open End Shelf OE630"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/349_P_1778667402935.JPG",
        "alt": "Open End Shelf OE630 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/349_P_1778667413312.JPG",
        "alt": "Open End Shelf OE630 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/349_P_1778667408730.JPG",
        "alt": "Open End Shelf OE630 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/349_P_1779790366689.gif",
        "alt": "Open End Shelf OE630 alternate view 5"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-210",
    "slug": "open-end-shelf-oe636-350",
    "sku": "015530532",
    "manufacturerPartNumber": "OE636-PWMS-WH",
    "name": "Open End Shelf OE636",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 73,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "6\" W × 36\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-210",
      "sku": "015530532",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/350_P_1778667467342.JPG",
        "alt": "Open End Shelf OE636"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/350_P_1778667462659.JPG",
        "alt": "Open End Shelf OE636 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/350_P_1778667478716.JPG",
        "alt": "Open End Shelf OE636 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/350_P_1778667473952.JPG",
        "alt": "Open End Shelf OE636 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/350_P_1779790406372.gif",
        "alt": "Open End Shelf OE636 alternate view 5"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-170",
    "slug": "open-end-shelf-oe642-351",
    "sku": "015540532",
    "manufacturerPartNumber": "OE642-PWMS-WH",
    "name": "Open End Shelf OE642",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 82,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "6\" W × 42\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-170",
      "sku": "015540532",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/351_P_1778667554325.JPG",
        "alt": "Open End Shelf OE642"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/351_P_1778667559187.JPG",
        "alt": "Open End Shelf OE642 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/351_P_1778667569680.JPG",
        "alt": "Open End Shelf OE642 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/351_P_1778667564217.JPG",
        "alt": "Open End Shelf OE642 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/351_P_1779790440916.gif",
        "alt": "Open End Shelf OE642 alternate view 5"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-56",
    "slug": "oven-tall-cabinet-o308424-361",
    "sku": "017640130",
    "manufacturerPartNumber": "O308424-PWMS-WH",
    "name": "Oven Tall Cabinet O308424",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 1045,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "30\" W × 84\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-56",
      "sku": "017640130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/361_P_1778745870735.JPG",
        "alt": "Oven Tall Cabinet O308424"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/361_P_1778745889623.JPG",
        "alt": "Oven Tall Cabinet O308424 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/361_P_1778745907303.JPG",
        "alt": "Oven Tall Cabinet O308424 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/361_P_1778745913017.JPG",
        "alt": "Oven Tall Cabinet O308424 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708160833_3a854450526d.png",
        "alt": "Oven Tall Cabinet O308424 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708160833_795a253fa401.jpg",
        "alt": "Oven Tall Cabinet O308424 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708160826_d3a950470b27.gif",
        "alt": "Oven Tall Cabinet O308424 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Oven Tall Cabinet O308424 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Oven Tall Cabinet O308424 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Oven Tall Cabinet O308424 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Oven Tall Cabinet O308424 alternate view 11"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Oven Tall Cabinet O308424 alternate view 12"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-58",
    "slug": "oven-tall-cabinet-o309024-362",
    "sku": "017650130",
    "manufacturerPartNumber": "O309024-PWMS-WH",
    "name": "Oven Tall Cabinet O309024",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 1123,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "30\" W × 90\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-58",
      "sku": "017650130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/362_P_1778746120014.JPG",
        "alt": "Oven Tall Cabinet O309024"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/362_P_1778746140953.JPG",
        "alt": "Oven Tall Cabinet O309024 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/362_P_1778746130475.JPG",
        "alt": "Oven Tall Cabinet O309024 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/362_P_1778746140912.JPG",
        "alt": "Oven Tall Cabinet O309024 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708161021_a1a26a364be7.png",
        "alt": "Oven Tall Cabinet O309024 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708161021_3ebc442d4152.jpg",
        "alt": "Oven Tall Cabinet O309024 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/362_P_1779792044181.gif",
        "alt": "Oven Tall Cabinet O309024 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Oven Tall Cabinet O309024 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Oven Tall Cabinet O309024 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Oven Tall Cabinet O309024 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Oven Tall Cabinet O309024 alternate view 11"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Oven Tall Cabinet O309024 alternate view 12"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-60",
    "slug": "oven-tall-cabinet-o309624-363",
    "sku": "017660130",
    "manufacturerPartNumber": "O309624-PWMS-WH",
    "name": "Oven Tall Cabinet O309624",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 1200,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "30\" W × 96\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-60",
      "sku": "017660130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/363_P_1778746254182.JPG",
        "alt": "Oven Tall Cabinet O309624"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/363_P_1778746260468.JPG",
        "alt": "Oven Tall Cabinet O309624 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/363_P_1778746275428.JPG",
        "alt": "Oven Tall Cabinet O309624 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/363_P_1778746267917.JPG",
        "alt": "Oven Tall Cabinet O309624 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/363_P_1781986251308.jpg",
        "alt": "Oven Tall Cabinet O309624 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708161121_a0fbb07faead.jpg",
        "alt": "Oven Tall Cabinet O309624 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/363_P_1779792180058.gif",
        "alt": "Oven Tall Cabinet O309624 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Oven Tall Cabinet O309624 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Oven Tall Cabinet O309624 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Oven Tall Cabinet O309624 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Oven Tall Cabinet O309624 alternate view 11"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Oven Tall Cabinet O309624 alternate view 12"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-62",
    "slug": "oven-tall-cabinet-o338424-364",
    "sku": "017670130",
    "manufacturerPartNumber": "O338424-PWMS-WH",
    "name": "Oven Tall Cabinet O338424",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 1100,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "33\" W × 84\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-62",
      "sku": "017670130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/364_P_1778746387101.JPG",
        "alt": "Oven Tall Cabinet O338424"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/364_P_1778746395066.JPG",
        "alt": "Oven Tall Cabinet O338424 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/364_P_1778746402923.JPG",
        "alt": "Oven Tall Cabinet O338424 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/364_P_1778746409354.JPG",
        "alt": "Oven Tall Cabinet O338424 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708161213_714f736620bf.jpg",
        "alt": "Oven Tall Cabinet O338424 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708161213_35a81a7066c3.png",
        "alt": "Oven Tall Cabinet O338424 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/364_P_1779792096172.gif",
        "alt": "Oven Tall Cabinet O338424 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Oven Tall Cabinet O338424 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Oven Tall Cabinet O338424 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Oven Tall Cabinet O338424 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Oven Tall Cabinet O338424 alternate view 11"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Oven Tall Cabinet O338424 alternate view 12"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-68",
    "slug": "oven-tall-cabinet-o339024-365",
    "sku": "017680130",
    "manufacturerPartNumber": "O339024-PWMS-WH",
    "name": "Oven Tall Cabinet O339024",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 1183,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "33\" W × 90\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-68",
      "sku": "017680130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/365_P_1778746501699.JPG",
        "alt": "Oven Tall Cabinet O339024"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/365_P_1778746513871.JPG",
        "alt": "Oven Tall Cabinet O339024 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/365_P_1778746507072.JPG",
        "alt": "Oven Tall Cabinet O339024 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/365_P_1778746521201.JPG",
        "alt": "Oven Tall Cabinet O339024 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/365_P_1781986262159.jpg",
        "alt": "Oven Tall Cabinet O339024 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708161326_5c1688fba214.jpg",
        "alt": "Oven Tall Cabinet O339024 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/365_P_1779792134071.gif",
        "alt": "Oven Tall Cabinet O339024 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Oven Tall Cabinet O339024 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Oven Tall Cabinet O339024 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Oven Tall Cabinet O339024 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Oven Tall Cabinet O339024 alternate view 11"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Oven Tall Cabinet O339024 alternate view 12"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-168",
    "slug": "tall-cabinet-o339624-366",
    "sku": "017690130",
    "manufacturerPartNumber": "O339624-PWMS-WH",
    "name": "Oven Tall Cabinet O339624",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 1267,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "33\" W × 96\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-168",
      "sku": "017690130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/366_P_1778746620025.JPG",
        "alt": "Oven Tall Cabinet O339624"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/366_P_1778746626767.JPG",
        "alt": "Oven Tall Cabinet O339624 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/366_P_1778746633701.JPG",
        "alt": "Oven Tall Cabinet O339624 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/366_P_1778746642790.JPG",
        "alt": "Oven Tall Cabinet O339624 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/366_P_1781986282651.jpg",
        "alt": "Oven Tall Cabinet O339624 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708161410_3b6cca58aa32.jpg",
        "alt": "Oven Tall Cabinet O339624 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/366_P_1779792218279.gif",
        "alt": "Oven Tall Cabinet O339624 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Oven Tall Cabinet O339624 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Oven Tall Cabinet O339624 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Oven Tall Cabinet O339624 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Oven Tall Cabinet O339624 alternate view 11"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Oven Tall Cabinet O339624 alternate view 12"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-222",
    "slug": "sink-base-sb30-368",
    "sku": "011950130",
    "manufacturerPartNumber": "SB30-PWMS-WH",
    "name": "Sink Base SB30",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 322,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "30\" W × 34½\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-222",
      "sku": "011950130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/368_P_1778653528712.JPG",
        "alt": "Sink Base SB30"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/368_P_1778653535825.JPG",
        "alt": "Sink Base SB30 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/368_P_1778653541867.JPG",
        "alt": "Sink Base SB30 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/368_P_1778653547982.JPG",
        "alt": "Sink Base SB30 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/368_P_1781986303955.jpg",
        "alt": "Sink Base SB30 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Sink Base SB30 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Sink Base SB30 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Sink Base SB30 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Sink Base SB30 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Sink Base SB30 alternate view 10"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-224",
    "slug": "sink-base-sb33-369",
    "sku": "011960130",
    "manufacturerPartNumber": "SB33-PWMS-WH",
    "name": "Sink Base SB33",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 341,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "33\" W × 34½\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-224",
      "sku": "011960130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/369_P_1778654378424.JPG",
        "alt": "Sink Base SB33"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/369_P_1778654384492.JPG",
        "alt": "Sink Base SB33 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/369_P_1778654399236.JPG",
        "alt": "Sink Base SB33 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/369_P_1781986315904.jpg",
        "alt": "Sink Base SB33 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/369_P_1778654399221.JPG",
        "alt": "Sink Base SB33 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Sink Base SB33 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Sink Base SB33 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Sink Base SB33 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Sink Base SB33 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Sink Base SB33 alternate view 10"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-226",
    "slug": "sink-base-sb36-370",
    "sku": "011970130",
    "manufacturerPartNumber": "SB36-PWMS-WH",
    "name": "Sink Base SB36",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 360,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "36\" W × 34½\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-226",
      "sku": "011970130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/370_P_1778654687201.JPG",
        "alt": "Sink Base SB36"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/370_P_1778654764729.JPG",
        "alt": "Sink Base SB36 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/370_P_1778654765862.JPG",
        "alt": "Sink Base SB36 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/370_P_1778654775694.JPG",
        "alt": "Sink Base SB36 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/370_P_1778654775786.JPG",
        "alt": "Sink Base SB36 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/370_P_1781986811539.jpg",
        "alt": "Sink Base SB36 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Sink Base SB36 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Sink Base SB36 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Sink Base SB36 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Sink Base SB36 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Sink Base SB36 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-70",
    "slug": "lazy-susan-base-spb9-282",
    "sku": "014700131",
    "manufacturerPartNumber": "SPB9-PWMS-WH",
    "name": "SPB9",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 305,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "9\" W × 34½\" H × 24\" D",
    "finish": "White finish",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-70",
      "sku": "014700131",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/282_P_1778655247433.JPG",
        "alt": "SPB9"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/282_P_1778655253458.JPG",
        "alt": "SPB9 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/282_P_1778655257117.JPG",
        "alt": "SPB9 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/282_P_1778655263831.JPG",
        "alt": "SPB9 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/282_P_1779693327981.gif",
        "alt": "SPB9 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "SPB9 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "SPB9 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "SPB9 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "SPB9 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "SPB9 alternate view 10"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-212",
    "slug": "tall-cabinet-u188424-352",
    "sku": "017550130",
    "manufacturerPartNumber": "U188424-PWMS-WH",
    "name": "Tall Cabinet U188424",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 669,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "18\" W × 84\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-212",
      "sku": "017550130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/352_P_1778668384629.JPG",
        "alt": "Tall Cabinet U188424"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/352_P_1778668395109.JPG",
        "alt": "Tall Cabinet U188424 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/352_P_1778668400613.JPG",
        "alt": "Tall Cabinet U188424 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/352_P_1778668390351.JPG",
        "alt": "Tall Cabinet U188424 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708160332_fc53eee41d39.png",
        "alt": "Tall Cabinet U188424 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/352_P_1779790936283.gif",
        "alt": "Tall Cabinet U188424 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Tall Cabinet U188424 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Tall Cabinet U188424 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Tall Cabinet U188424 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Tall Cabinet U188424 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Tall Cabinet U188424 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-214",
    "slug": "tall-cabinet-u189024-353",
    "sku": "017560130",
    "manufacturerPartNumber": "U189024-PWMS-WH",
    "name": "Tall Cabinet U189024",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 699,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "18\" W × 90\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-214",
      "sku": "017560130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/353_P_1778668483966.JPG",
        "alt": "Tall Cabinet U189024"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/353_P_1778668493076.JPG",
        "alt": "Tall Cabinet U189024 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/353_P_1778668499502.JPG",
        "alt": "Tall Cabinet U189024 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/353_P_1778668488406.JPG",
        "alt": "Tall Cabinet U189024 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/353_P_1781986099852.jpg",
        "alt": "Tall Cabinet U189024 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/353_P_1779790969424.gif",
        "alt": "Tall Cabinet U189024 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Tall Cabinet U189024 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Tall Cabinet U189024 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Tall Cabinet U189024 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Tall Cabinet U189024 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Tall Cabinet U189024 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-216",
    "slug": "tall-cabinet-u189624-354",
    "sku": "017570130",
    "manufacturerPartNumber": "U189624-PWMS-WH",
    "name": "Tall Cabinet U189624",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 759,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "18\" W × 96\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-216",
      "sku": "017570130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/354_P_1778668580437.JPG",
        "alt": "Tall Cabinet U189624"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/354_P_1778668584519.JPG",
        "alt": "Tall Cabinet U189624 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/354_P_1778668589297.JPG",
        "alt": "Tall Cabinet U189624 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/354_P_1778668594668.JPG",
        "alt": "Tall Cabinet U189624 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708160426_ce5c6313ef18.png",
        "alt": "Tall Cabinet U189624 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/354_P_1779791006021.gif",
        "alt": "Tall Cabinet U189624 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Tall Cabinet U189624 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Tall Cabinet U189624 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Tall Cabinet U189624 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Tall Cabinet U189624 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Tall Cabinet U189624 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-218",
    "slug": "tall-cabinet-u248424-355",
    "sku": "017580130",
    "manufacturerPartNumber": "U248424-PWMS-WH",
    "name": "Tall Cabinet U248424",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 821,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "24\" W × 84\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-218",
      "sku": "017580130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/355_P_1778668691281.JPG",
        "alt": "Tall Cabinet U248424"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/355_P_1778668702975.JPG",
        "alt": "Tall Cabinet U248424 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/355_P_1778668697596.JPG",
        "alt": "Tall Cabinet U248424 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/355_P_1778668708650.JPG",
        "alt": "Tall Cabinet U248424 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/355_P_1781986110576.jpg",
        "alt": "Tall Cabinet U248424 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/355_P_1779791362845.gif",
        "alt": "Tall Cabinet U248424 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Tall Cabinet U248424 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Tall Cabinet U248424 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Tall Cabinet U248424 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Tall Cabinet U248424 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Tall Cabinet U248424 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-220",
    "slug": "tall-cabinet-u249024-356",
    "sku": "017590130",
    "manufacturerPartNumber": "U249024-PWMS-WH",
    "name": "Tall Cabinet U249024",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 855,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "24\" W × 90\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-220",
      "sku": "017590130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/356_P_1778668815123.JPG",
        "alt": "Tall Cabinet U249024"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/356_P_1778668822040.JPG",
        "alt": "Tall Cabinet U249024 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/356_P_1778668826665.JPG",
        "alt": "Tall Cabinet U249024 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/356_P_1778668833862.JPG",
        "alt": "Tall Cabinet U249024 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/356_P_1781986122596.jpg",
        "alt": "Tall Cabinet U249024 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/356_P_1779791403848.gif",
        "alt": "Tall Cabinet U249024 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Tall Cabinet U249024 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Tall Cabinet U249024 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Tall Cabinet U249024 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Tall Cabinet U249024 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Tall Cabinet U249024 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-36",
    "slug": "tall-cabinet-u249624-357",
    "sku": "017600130",
    "manufacturerPartNumber": "U249624-PWMS-WH",
    "name": "Tall Cabinet U249624",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 933,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "24\" W × 96\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-36",
      "sku": "017600130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/357_P_1778668923547.JPG",
        "alt": "Tall Cabinet U249624"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/357_P_1778668935334.JPG",
        "alt": "Tall Cabinet U249624 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/357_P_1778668930054.JPG",
        "alt": "Tall Cabinet U249624 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/357_P_1778668940901.JPG",
        "alt": "Tall Cabinet U249624 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/357_P_1781986133871.jpg",
        "alt": "Tall Cabinet U249624 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/357_P_1779791532648.gif",
        "alt": "Tall Cabinet U249624 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Tall Cabinet U249624 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Tall Cabinet U249624 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Tall Cabinet U249624 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Tall Cabinet U249624 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Tall Cabinet U249624 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-34",
    "slug": "tall-cabinet-u308424-358",
    "sku": "017610130",
    "manufacturerPartNumber": "U308424-PWMS-WH",
    "name": "Tall Cabinet U308424",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 949,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "30\" W × 84\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-34",
      "sku": "017610130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/358_P_1778669052528.JPG",
        "alt": "Tall Cabinet U308424"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/358_P_1778669065381.JPG",
        "alt": "Tall Cabinet U308424 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/358_P_1778669056030.JPG",
        "alt": "Tall Cabinet U308424 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/358_P_1778669071090.JPG",
        "alt": "Tall Cabinet U308424 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/358_P_1781986145039.jpg",
        "alt": "Tall Cabinet U308424 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/358_P_1779791441668.gif",
        "alt": "Tall Cabinet U308424 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Tall Cabinet U308424 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Tall Cabinet U308424 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Tall Cabinet U308424 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Tall Cabinet U308424 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Tall Cabinet U308424 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-38",
    "slug": "tall-cabinet-u309024-359",
    "sku": "017620130",
    "manufacturerPartNumber": "U309024-PWMS-WH",
    "name": "Tall Cabinet U309024",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 986,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "30\" W × 90\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-38",
      "sku": "017620130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/359_P_1778669147785.JPG",
        "alt": "Tall Cabinet U309024"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/359_P_1778669153147.JPG",
        "alt": "Tall Cabinet U309024 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/359_P_1778669157838.JPG",
        "alt": "Tall Cabinet U309024 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/359_P_1778669163239.JPG",
        "alt": "Tall Cabinet U309024 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/359_P_1781986157647.jpg",
        "alt": "Tall Cabinet U309024 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/359_P_1779791479407.gif",
        "alt": "Tall Cabinet U309024 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Tall Cabinet U309024 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Tall Cabinet U309024 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Tall Cabinet U309024 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Tall Cabinet U309024 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Tall Cabinet U309024 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-32",
    "slug": "tall-cabinet-u309624-360",
    "sku": "017630130",
    "manufacturerPartNumber": "U309624-PWMS-WH",
    "name": "Tall Cabinet U309624",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 1077,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "30\" W × 96\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-32",
      "sku": "017630130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/360_P_1778669256375.JPG",
        "alt": "Tall Cabinet U309624"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/360_P_1778669261280.JPG",
        "alt": "Tall Cabinet U309624 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/360_P_1778669265363.JPG",
        "alt": "Tall Cabinet U309624 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/360_P_1778669270935.JPG",
        "alt": "Tall Cabinet U309624 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/360_P_1781986169823.jpg",
        "alt": "Tall Cabinet U309624 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/360_P_1779791570243.gif",
        "alt": "Tall Cabinet U309624 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Tall Cabinet U309624 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Tall Cabinet U309624 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Tall Cabinet U309624 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Tall Cabinet U309624 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Tall Cabinet U309624 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-250",
    "slug": "tall-end-panel-tep2596-382",
    "sku": "018870942",
    "manufacturerPartNumber": "TEP2596-MS-WH",
    "name": "Tall End Panel TEP2596",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 197,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "25\" W × 96\" H × ¾\"D",
    "finish": "White finish",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-250",
      "sku": "018870942",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/382_P_1778831590666.JPG",
        "alt": "Tall End Panel TEP2596"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/382_P_1778831597180.JPG",
        "alt": "Tall End Panel TEP2596 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/382_P_1778831598119.JPG",
        "alt": "Tall End Panel TEP2596 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/382_P_1779793648325.gif",
        "alt": "Tall End Panel TEP2596 alternate view 4"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-252",
    "slug": "tall-end-panel-tep3596-383",
    "sku": "018880942",
    "manufacturerPartNumber": "TEP3596-MS-WH",
    "name": "Tall End Panel TEP3596",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 276,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "35\" W × 96\" H × ¾\"D",
    "finish": "White finish",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-252",
      "sku": "018880942",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/383_P_1778831691814.JPG",
        "alt": "Tall End Panel TEP3596"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/383_P_1778831707398.JPG",
        "alt": "Tall End Panel TEP3596 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/383_P_1778831707824.JPG",
        "alt": "Tall End Panel TEP3596 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/383_P_1779793682173.gif",
        "alt": "Tall End Panel TEP3596 alternate view 4"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-236",
    "slug": "tall-filler-f396-375",
    "sku": "018820742",
    "manufacturerPartNumber": "F396-MS-WH",
    "name": "Tall Filler F396",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 24,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "3\" W × 96\" H × ¾\"D",
    "finish": "White finish",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-236",
      "sku": "018820742",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/375_P_1778672490998.JPG",
        "alt": "Tall Filler F396"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/375_P_1778672496862.JPG",
        "alt": "Tall Filler F396 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/375_P_1778672501337.JPG",
        "alt": "Tall Filler F396 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/375_P_1779792852951.gif",
        "alt": "Tall Filler F396 alternate view 4"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-238",
    "slug": "tall-filler-f696-376",
    "sku": "018840742",
    "manufacturerPartNumber": "F696-MS-WH",
    "name": "Tall Filler F696",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 49,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "6\" W × 96\" H × ¾\"D",
    "finish": "White finish",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-238",
      "sku": "018840742",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/376_P_1778672740001.JPG",
        "alt": "Tall Filler F696"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/376_P_1778672753850.JPG",
        "alt": "Tall Filler F696 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/376_P_1778672759848.JPG",
        "alt": "Tall Filler F696 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/376_P_1779792883499.gif",
        "alt": "Tall Filler F696 alternate view 4"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-228",
    "slug": "toe-kick-tkc-ms-371",
    "sku": "019890142",
    "manufacturerPartNumber": "TKC-MS-WH",
    "name": "Toe Kick TKC-MS",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 36,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "¾\" W × 4½\" H × 96\" L",
    "finish": "White finish",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-228",
      "sku": "019890142",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/371_P_1778670786817.JPG",
        "alt": "Toe Kick TKC-MS"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/371_P_1778670792508.JPG",
        "alt": "Toe Kick TKC-MS alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/371_P_1778670781284.JPG",
        "alt": "Toe Kick TKC-MS alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/371_P_1779792368164.gif",
        "alt": "Toe Kick TKC-MS alternate view 4"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-172",
    "slug": "wall-cabinet-gd-w1530gd-331",
    "sku": "015070330",
    "manufacturerPartNumber": "W1530GD-PWMS-WH",
    "name": "Wall Cabinet (GD)W1530GD",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 177,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "15\" W × 30\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-172",
      "sku": "015070330",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/331_P_1778658355617.JPG",
        "alt": "Wall Cabinet (GD)W1530GD"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/331_P_1778658362073.JPG",
        "alt": "Wall Cabinet (GD)W1530GD alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/331_P_1778658370077.JPG",
        "alt": "Wall Cabinet (GD)W1530GD alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/331_P_1778658370261.JPG",
        "alt": "Wall Cabinet (GD)W1530GD alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/331_P_1781985762264.jpg",
        "alt": "Wall Cabinet (GD)W1530GD alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/331_P_1779788068503.gif",
        "alt": "Wall Cabinet (GD)W1530GD alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet (GD)W1530GD alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet (GD)W1530GD alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet (GD)W1530GD alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet (GD)W1530GD alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet (GD)W1530GD alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-174",
    "slug": "wall-cabinet-gd-w1536gd-332",
    "sku": "015080330",
    "manufacturerPartNumber": "W1536GD-PWMS-WH",
    "name": "Wall Cabinet (GD)W1536GD",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 203,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "15\" W × 36\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-174",
      "sku": "015080330",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/332_P_1778661090772.JPG",
        "alt": "Wall Cabinet (GD)W1536GD"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/332_P_1778661102349.JPG",
        "alt": "Wall Cabinet (GD)W1536GD alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/332_P_1778661097810.JPG",
        "alt": "Wall Cabinet (GD)W1536GD alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/332_P_1778661108037.JPG",
        "alt": "Wall Cabinet (GD)W1536GD alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/332_P_1781985777207.jpg",
        "alt": "Wall Cabinet (GD)W1536GD alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/332_P_1779788104134.gif",
        "alt": "Wall Cabinet (GD)W1536GD alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet (GD)W1536GD alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet (GD)W1536GD alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet (GD)W1536GD alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet (GD)W1536GD alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet (GD)W1536GD alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-176",
    "slug": "wall-cabinet-gd-w1542gd-333",
    "sku": "015090330",
    "manufacturerPartNumber": "W1542GD-PWMS-WH",
    "name": "Wall Cabinet (GD)W1542GD",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 243,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "15\" W × 42\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-176",
      "sku": "015090330",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/333_P_1778662960627.JPG",
        "alt": "Wall Cabinet (GD)W1542GD"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/333_P_1778662964999.JPG",
        "alt": "Wall Cabinet (GD)W1542GD alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/333_P_1778662970497.JPG",
        "alt": "Wall Cabinet (GD)W1542GD alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/333_P_1778662974316.JPG",
        "alt": "Wall Cabinet (GD)W1542GD alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/333_P_1781985791929.jpg",
        "alt": "Wall Cabinet (GD)W1542GD alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/333_P_1779788936660.gif",
        "alt": "Wall Cabinet (GD)W1542GD alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet (GD)W1542GD alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet (GD)W1542GD alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet (GD)W1542GD alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet (GD)W1542GD alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet (GD)W1542GD alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-178",
    "slug": "wall-cabinet-gd-w1830gd-334",
    "sku": "015100330",
    "manufacturerPartNumber": "W1830GD-PWMS-WH",
    "name": "Wall Cabinet (GD)W1830GD",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 201,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "18\" W × 30\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-178",
      "sku": "015100330",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/334_P_1778658561850.JPG",
        "alt": "Wall Cabinet (GD)W1830GD"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/334_P_1778658566917.JPG",
        "alt": "Wall Cabinet (GD)W1830GD alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/334_P_1778658571839.JPG",
        "alt": "Wall Cabinet (GD)W1830GD alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/334_P_1778658577445.JPG",
        "alt": "Wall Cabinet (GD)W1830GD alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/334_P_1781985803309.jpg",
        "alt": "Wall Cabinet (GD)W1830GD alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/334_P_1779788139738.gif",
        "alt": "Wall Cabinet (GD)W1830GD alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet (GD)W1830GD alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet (GD)W1830GD alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet (GD)W1830GD alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet (GD)W1830GD alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet (GD)W1830GD alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-180",
    "slug": "wall-cabinet-gd-w1836gd-335",
    "sku": "015110330",
    "manufacturerPartNumber": "W1836GD-PWMS-WH",
    "name": "Wall Cabinet (GD)W1836GD",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 231,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "18\" W × 36\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-180",
      "sku": "015110330",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/335_P_1778661285424.JPG",
        "alt": "Wall Cabinet (GD)W1836GD"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/335_P_1778661291851.JPG",
        "alt": "Wall Cabinet (GD)W1836GD alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/335_P_1778661296106.JPG",
        "alt": "Wall Cabinet (GD)W1836GD alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/335_P_1778661300045.JPG",
        "alt": "Wall Cabinet (GD)W1836GD alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/335_P_1781985820556.jpg",
        "alt": "Wall Cabinet (GD)W1836GD alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/335_P_1779788175340.gif",
        "alt": "Wall Cabinet (GD)W1836GD alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet (GD)W1836GD alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet (GD)W1836GD alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet (GD)W1836GD alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet (GD)W1836GD alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet (GD)W1836GD alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-182",
    "slug": "wall-cabinet-gd-w1842gd-336",
    "sku": "015120330",
    "manufacturerPartNumber": "W1842GD-PWMS-WH",
    "name": "Wall Cabinet (GD)W1842GD",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 275,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "18\" W × 42\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-182",
      "sku": "015120330",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/336_P_1778663147634.JPG",
        "alt": "Wall Cabinet (GD)W1842GD"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/336_P_1778663153332.JPG",
        "alt": "Wall Cabinet (GD)W1842GD alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/336_P_1778663158444.JPG",
        "alt": "Wall Cabinet (GD)W1842GD alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/336_P_1778663163469.JPG",
        "alt": "Wall Cabinet (GD)W1842GD alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/336_P_1781985832783.jpg",
        "alt": "Wall Cabinet (GD)W1842GD alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/336_P_1779788994099.gif",
        "alt": "Wall Cabinet (GD)W1842GD alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet (GD)W1842GD alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet (GD)W1842GD alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet (GD)W1842GD alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet (GD)W1842GD alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet (GD)W1842GD alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-184",
    "slug": "wall-cabinet-gd-w2430gd-337",
    "sku": "015160330",
    "manufacturerPartNumber": "W2430GD-PWMS-WH",
    "name": "Wall Cabinet (GD)W2430GD",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 254,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "24\" W × 30\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-184",
      "sku": "015160330",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/337_P_1778658849417.JPG",
        "alt": "Wall Cabinet (GD)W2430GD"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/337_P_1778658963110.JPG",
        "alt": "Wall Cabinet (GD)W2430GD alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/337_P_1778658957489.JPG",
        "alt": "Wall Cabinet (GD)W2430GD alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/337_P_1778658968780.JPG",
        "alt": "Wall Cabinet (GD)W2430GD alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/337_P_1781985843804.jpg",
        "alt": "Wall Cabinet (GD)W2430GD alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/337_P_1779789302998.gif",
        "alt": "Wall Cabinet (GD)W2430GD alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet (GD)W2430GD alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet (GD)W2430GD alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet (GD)W2430GD alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet (GD)W2430GD alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet (GD)W2430GD alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-186",
    "slug": "wall-cabinet-gd-w2436gd-338",
    "sku": "015170330",
    "manufacturerPartNumber": "W2436GD-PWMS-WH",
    "name": "Wall Cabinet (GD)W2436GD",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 290,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "24\" W × 36\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-186",
      "sku": "015170330",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/338_P_1778661628819.JPG",
        "alt": "Wall Cabinet (GD)W2436GD"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/338_P_1778661634307.JPG",
        "alt": "Wall Cabinet (GD)W2436GD alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/338_P_1778661646097.JPG",
        "alt": "Wall Cabinet (GD)W2436GD alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/338_P_1778661640905.JPG",
        "alt": "Wall Cabinet (GD)W2436GD alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/338_P_1781985855423.jpg",
        "alt": "Wall Cabinet (GD)W2436GD alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/338_P_1779789407155.gif",
        "alt": "Wall Cabinet (GD)W2436GD alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet (GD)W2436GD alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet (GD)W2436GD alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet (GD)W2436GD alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet (GD)W2436GD alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet (GD)W2436GD alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-188",
    "slug": "wall-cabinet-gd-w2442gd-339",
    "sku": "015180330",
    "manufacturerPartNumber": "W2442GD-PWMS-WH",
    "name": "Wall Cabinet (GD)W2442GD",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 348,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "24\" W × 42\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-188",
      "sku": "015180330",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/339_P_1778663408712.JPG",
        "alt": "Wall Cabinet (GD)W2442GD"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/339_P_1778663417618.JPG",
        "alt": "Wall Cabinet (GD)W2442GD alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/339_P_1778663413921.JPG",
        "alt": "Wall Cabinet (GD)W2442GD alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/339_P_1778663423425.JPG",
        "alt": "Wall Cabinet (GD)W2442GD alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/339_P_1781985870236.jpg",
        "alt": "Wall Cabinet (GD)W2442GD alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/339_P_1779789887748.gif",
        "alt": "Wall Cabinet (GD)W2442GD alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet (GD)W2442GD alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet (GD)W2442GD alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet (GD)W2442GD alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet (GD)W2442GD alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet (GD)W2442GD alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-190",
    "slug": "wall-cabinet-gd-w3030gd-340",
    "sku": "015290330",
    "manufacturerPartNumber": "W3030GD-PWMS-WH",
    "name": "Wall Cabinet (GD)W3030GD",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 302,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "30\" W × 30\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-190",
      "sku": "015290330",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/340_P_1778659268965.JPG",
        "alt": "Wall Cabinet (GD)W3030GD"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/340_P_1778659282001.JPG",
        "alt": "Wall Cabinet (GD)W3030GD alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/340_P_1778659287953.JPG",
        "alt": "Wall Cabinet (GD)W3030GD alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/340_P_1778659292671.JPG",
        "alt": "Wall Cabinet (GD)W3030GD alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/340_P_1781985883319.jpg",
        "alt": "Wall Cabinet (GD)W3030GD alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/340_P_1779789351934.gif",
        "alt": "Wall Cabinet (GD)W3030GD alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet (GD)W3030GD alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet (GD)W3030GD alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet (GD)W3030GD alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet (GD)W3030GD alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet (GD)W3030GD alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-192",
    "slug": "wall-cabinet-gd-w3036gd-341",
    "sku": "015300330",
    "manufacturerPartNumber": "W3036GD-PWMS-WH",
    "name": "Wall Cabinet (GD)W3036GD",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 345,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "30\" W × 36\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-192",
      "sku": "015300330",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/341_P_1778662349459.JPG",
        "alt": "Wall Cabinet (GD)W3036GD"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/341_P_1778662354514.JPG",
        "alt": "Wall Cabinet (GD)W3036GD alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/341_P_1778662360189.JPG",
        "alt": "Wall Cabinet (GD)W3036GD alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/341_P_1778662365785.JPG",
        "alt": "Wall Cabinet (GD)W3036GD alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/341_P_1781985897774.jpg",
        "alt": "Wall Cabinet (GD)W3036GD alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/341_P_1779789442072.gif",
        "alt": "Wall Cabinet (GD)W3036GD alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet (GD)W3036GD alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet (GD)W3036GD alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet (GD)W3036GD alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet (GD)W3036GD alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet (GD)W3036GD alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-194",
    "slug": "wall-cabinet-gd-w3042gd-342",
    "sku": "015310330",
    "manufacturerPartNumber": "W3042GD-PWMS-WH",
    "name": "Wall Cabinet (GD)W3042GD",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 413,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "30\" W × 42\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-194",
      "sku": "015310330",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/342_P_1778663767818.JPG",
        "alt": "Wall Cabinet (GD)W3042GD"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/342_P_1778663773569.JPG",
        "alt": "Wall Cabinet (GD)W3042GD alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/342_P_1778663777482.JPG",
        "alt": "Wall Cabinet (GD)W3042GD alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/342_P_1778663783307.JPG",
        "alt": "Wall Cabinet (GD)W3042GD alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/342_P_1781985910399.jpg",
        "alt": "Wall Cabinet (GD)W3042GD alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/342_P_1779789925072.gif",
        "alt": "Wall Cabinet (GD)W3042GD alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet (GD)W3042GD alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet (GD)W3042GD alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet (GD)W3042GD alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet (GD)W3042GD alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet (GD)W3042GD alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-72",
    "slug": "wall-cabinet-w0930-283",
    "sku": "015010130",
    "manufacturerPartNumber": "W0930-PWMS-WH",
    "name": "Wall Cabinet W0930",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 126,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "9\" W × 30\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-72",
      "sku": "015010130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/283_P_1778657436905.JPG",
        "alt": "Wall Cabinet W0930"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/283_P_1778657441164.JPG",
        "alt": "Wall Cabinet W0930 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/283_P_1778657448424.JPG",
        "alt": "Wall Cabinet W0930 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/283_P_1778657454835.JPG",
        "alt": "Wall Cabinet W0930 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/283_P_1781983878738.jpg",
        "alt": "Wall Cabinet W0930 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/283_P_1779695537416.gif",
        "alt": "Wall Cabinet W0930 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W0930 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W0930 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W0930 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W0930 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W0930 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-74",
    "slug": "wall-cabinet-w0936-284",
    "sku": "015020130",
    "manufacturerPartNumber": "W0936-PWMS-WH",
    "name": "Wall Cabinet W0936",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 144,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "9\" W × 36\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-74",
      "sku": "015020130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/284_P_1778660523971.JPG",
        "alt": "Wall Cabinet W0936"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/284_P_1778660687346.JPG",
        "alt": "Wall Cabinet W0936 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/284_P_1778660681871.JPG",
        "alt": "Wall Cabinet W0936 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/284_P_1778660692417.JPG",
        "alt": "Wall Cabinet W0936 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/284_P_1781983924176.jpg",
        "alt": "Wall Cabinet W0936 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/284_P_1779696617869.gif",
        "alt": "Wall Cabinet W0936 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W0936 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W0936 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W0936 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W0936 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W0936 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-76",
    "slug": "wall-cabinet-w0942-285",
    "sku": "015030130",
    "manufacturerPartNumber": "W0942-PWMS-WH",
    "name": "Wall Cabinet W0942",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 172,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "9\" W × 42\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-76",
      "sku": "015030130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/285_P_1778662602579.JPG",
        "alt": "Wall Cabinet W0942"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/285_P_1778662607020.JPG",
        "alt": "Wall Cabinet W0942 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/285_P_1778662612281.JPG",
        "alt": "Wall Cabinet W0942 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/285_P_1778662617247.JPG",
        "alt": "Wall Cabinet W0942 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/285_P_1781983939396.jpg",
        "alt": "Wall Cabinet W0942 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/285_P_1779697514141.gif",
        "alt": "Wall Cabinet W0942 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W0942 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W0942 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W0942 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W0942 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W0942 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-78",
    "slug": "wall-cabinet-w1230-286",
    "sku": "015040130",
    "manufacturerPartNumber": "W1230-PWMS-WH",
    "name": "Wall Cabinet W1230",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 144,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "12\" W × 30\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-78",
      "sku": "015040130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/286_P_1778658116726.JPG",
        "alt": "Wall Cabinet W1230"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/286_P_1778658129283.JPG",
        "alt": "Wall Cabinet W1230 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/286_P_1778658134120.JPG",
        "alt": "Wall Cabinet W1230 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/286_P_1778658140546.JPG",
        "alt": "Wall Cabinet W1230 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/286_P_1779695576750.gif",
        "alt": "Wall Cabinet W1230 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W1230 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W1230 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W1230 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W1230 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W1230 alternate view 10"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-80",
    "slug": "wall-cabinet-w1236-287",
    "sku": "015050130",
    "manufacturerPartNumber": "W1236-PWMS-WH",
    "name": "Wall Cabinet W1236",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 164,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "12\" W × 36\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-80",
      "sku": "015050130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/287_P_1778660818989.JPG",
        "alt": "Wall Cabinet W1236"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/287_P_1778660830441.JPG",
        "alt": "Wall Cabinet W1236 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/287_P_1778660824609.JPG",
        "alt": "Wall Cabinet W1236 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/287_P_1778660835968.JPG",
        "alt": "Wall Cabinet W1236 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/287_P_1781983966351.jpg",
        "alt": "Wall Cabinet W1236 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/287_P_1779696656699.gif",
        "alt": "Wall Cabinet W1236 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W1236 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W1236 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W1236 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W1236 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W1236 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-82",
    "slug": "wall-cabinet-w1242-288",
    "sku": "015060130",
    "manufacturerPartNumber": "W1242-PWMS-WH",
    "name": "Wall Cabinet W1242",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 196,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "12\" W × 42\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-82",
      "sku": "015060130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/288_P_1778662760422.JPG",
        "alt": "Wall Cabinet W1242"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/288_P_1778662765839.JPG",
        "alt": "Wall Cabinet W1242 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/288_P_1778662770496.JPG",
        "alt": "Wall Cabinet W1242 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/288_P_1778662775324.JPG",
        "alt": "Wall Cabinet W1242 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/288_P_1781983982896.jpg",
        "alt": "Wall Cabinet W1242 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/288_P_1779697545219.gif",
        "alt": "Wall Cabinet W1242 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W1242 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W1242 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W1242 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W1242 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W1242 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-84",
    "slug": "wall-cabinet-w1530-289",
    "sku": "015070130",
    "manufacturerPartNumber": "W1530-PWMS-WH",
    "name": "Wall Cabinet W1530",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 164,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "15\" W × 30\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-84",
      "sku": "015070130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/289_P_1778658262957.JPG",
        "alt": "Wall Cabinet W1530"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/289_P_1778658267304.JPG",
        "alt": "Wall Cabinet W1530 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/289_P_1778658277986.JPG",
        "alt": "Wall Cabinet W1530 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/289_P_1778658273815.JPG",
        "alt": "Wall Cabinet W1530 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/289_P_1779695618457.gif",
        "alt": "Wall Cabinet W1530 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W1530 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W1530 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W1530 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W1530 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W1530 alternate view 10"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-86",
    "slug": "wall-cabinet-w1536-290",
    "sku": "015080130",
    "manufacturerPartNumber": "W1536-PWMS-WH",
    "name": "Wall Cabinet W1536",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 187,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "15\" W × 36\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-86",
      "sku": "015080130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/290_P_1778660928702.JPG",
        "alt": "Wall Cabinet W1536"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/290_P_1778660932261.JPG",
        "alt": "Wall Cabinet W1536 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/290_P_1778660938611.JPG",
        "alt": "Wall Cabinet W1536 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/290_P_1778660942921.JPG",
        "alt": "Wall Cabinet W1536 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/290_P_1779696701655.gif",
        "alt": "Wall Cabinet W1536 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W1536 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W1536 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W1536 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W1536 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W1536 alternate view 10"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-88",
    "slug": "wall-cabinet-w1542-291",
    "sku": "015090130",
    "manufacturerPartNumber": "W1542-PWMS-WH",
    "name": "Wall Cabinet W1542",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 223,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "15\" W × 42\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-88",
      "sku": "015090130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/291_P_1778662862050.JPG",
        "alt": "Wall Cabinet W1542"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/291_P_1778662867636.JPG",
        "alt": "Wall Cabinet W1542 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/291_P_1778662873866.JPG",
        "alt": "Wall Cabinet W1542 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/291_P_1778662880157.JPG",
        "alt": "Wall Cabinet W1542 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708152950_4fb96cf91e9b.png",
        "alt": "Wall Cabinet W1542 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/291_P_1779697578265.gif",
        "alt": "Wall Cabinet W1542 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W1542 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W1542 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W1542 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W1542 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W1542 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-90",
    "slug": "wall-cabinet-w1830-292",
    "sku": "015100130",
    "manufacturerPartNumber": "W1830-PWMS-WH",
    "name": "Wall Cabinet W1830",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 184,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "18\" W × 30\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-90",
      "sku": "015100130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/292_P_1778658479665.JPG",
        "alt": "Wall Cabinet W1830"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/292_P_1778658485036.JPG",
        "alt": "Wall Cabinet W1830 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/292_P_1778658490716.JPG",
        "alt": "Wall Cabinet W1830 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/292_P_1778658496062.JPG",
        "alt": "Wall Cabinet W1830 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708153027_822697efc6ea.png",
        "alt": "Wall Cabinet W1830 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/292_P_1779695655045.gif",
        "alt": "Wall Cabinet W1830 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W1830 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W1830 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W1830 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W1830 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W1830 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-92",
    "slug": "wall-cabinet-w1836-293",
    "sku": "015110130",
    "manufacturerPartNumber": "W1836-PWMS-WH",
    "name": "Wall Cabinet W1836",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 210,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "18\" W × 36\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-92",
      "sku": "015110130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/293_P_1778661188476.JPG",
        "alt": "Wall Cabinet W1836"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/293_P_1778661201539.JPG",
        "alt": "Wall Cabinet W1836 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/293_P_1778661212058.JPG",
        "alt": "Wall Cabinet W1836 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/293_P_1778661207626.JPG",
        "alt": "Wall Cabinet W1836 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/293_P_1779696735225.gif",
        "alt": "Wall Cabinet W1836 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W1836 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W1836 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W1836 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W1836 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W1836 alternate view 10"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-94",
    "slug": "wall-cabinet-w1842-294",
    "sku": "015120130",
    "manufacturerPartNumber": "W1842-PWMS-WH",
    "name": "Wall Cabinet W1842",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 250,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "18\" W × 42\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-94",
      "sku": "015120130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/294_P_1778663046613.JPG",
        "alt": "Wall Cabinet W1842"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/294_P_1778663051422.JPG",
        "alt": "Wall Cabinet W1842 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/294_P_1778663055484.JPG",
        "alt": "Wall Cabinet W1842 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/294_P_1778663061834.JPG",
        "alt": "Wall Cabinet W1842 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/294_P_1781984033387.jpg",
        "alt": "Wall Cabinet W1842 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/294_P_1779697624852.gif",
        "alt": "Wall Cabinet W1842 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W1842 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W1842 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W1842 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W1842 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W1842 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-96",
    "slug": "wall-cabinet-w2130-295",
    "sku": "015130130",
    "manufacturerPartNumber": "W2130-PWMS-WH",
    "name": "Wall Cabinet W2130",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 204,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "21\" W × 30\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-96",
      "sku": "015130130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/295_P_1778658658704.JPG",
        "alt": "Wall Cabinet W2130"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/295_P_1778658664146.JPG",
        "alt": "Wall Cabinet W2130 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/295_P_1778658669641.JPG",
        "alt": "Wall Cabinet W2130 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/295_P_1778658675007.JPG",
        "alt": "Wall Cabinet W2130 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/295_P_1781984062117.jpg",
        "alt": "Wall Cabinet W2130 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/295_P_1779695690636.gif",
        "alt": "Wall Cabinet W2130 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W2130 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W2130 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W2130 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W2130 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W2130 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-98",
    "slug": "wall-cabinet-w2136-296",
    "sku": "015140130",
    "manufacturerPartNumber": "W2136-PWMS-WH",
    "name": "Wall Cabinet W2136",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 232,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "21\" W × 36\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-98",
      "sku": "015140130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/296_P_1778661365989.JPG",
        "alt": "Wall Cabinet W2136"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/296_P_1778661380750.JPG",
        "alt": "Wall Cabinet W2136 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/296_P_1778661385963.JPG",
        "alt": "Wall Cabinet W2136 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/296_P_1778661390448.JPG",
        "alt": "Wall Cabinet W2136 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/296_P_1781984082551.jpg",
        "alt": "Wall Cabinet W2136 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/296_P_1779696771049.gif",
        "alt": "Wall Cabinet W2136 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W2136 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W2136 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W2136 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W2136 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W2136 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-100",
    "slug": "wall-cabinet-w2142-297",
    "sku": "015150130",
    "manufacturerPartNumber": "W2142-PWMS-WH",
    "name": "Wall Cabinet W2142",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 276,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "21\" W × 42\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-100",
      "sku": "015150130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/297_P_1778663234079.JPG",
        "alt": "Wall Cabinet W2142"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/297_P_1778663239851.JPG",
        "alt": "Wall Cabinet W2142 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/297_P_1778663249453.JPG",
        "alt": "Wall Cabinet W2142 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/297_P_1778663244514.JPG",
        "alt": "Wall Cabinet W2142 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/297_P_1781984101144.jpg",
        "alt": "Wall Cabinet W2142 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/297_P_1779697657617.gif",
        "alt": "Wall Cabinet W2142 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W2142 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W2142 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W2142 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W2142 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W2142 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-102",
    "slug": "wall-cabinet-w2430-298",
    "sku": "015160130",
    "manufacturerPartNumber": "W2430-PWMS-WH",
    "name": "Wall Cabinet W2430",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 235,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "24\" W × 30\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-102",
      "sku": "015160130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/298_P_1778658759395.JPG",
        "alt": "Wall Cabinet W2430"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/298_P_1778658765345.JPG",
        "alt": "Wall Cabinet W2430 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/298_P_1778658770257.JPG",
        "alt": "Wall Cabinet W2430 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/298_P_1778658775006.JPG",
        "alt": "Wall Cabinet W2430 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/298_P_1781984123897.jpg",
        "alt": "Wall Cabinet W2430 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/298_P_1779696064091.gif",
        "alt": "Wall Cabinet W2430 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W2430 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W2430 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W2430 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W2430 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W2430 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-104",
    "slug": "wall-cabinet-w2436-299",
    "sku": "015170130",
    "manufacturerPartNumber": "W2436-PWMS-WH",
    "name": "Wall Cabinet W2436",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 267,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "24\" W × 36\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-104",
      "sku": "015170130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/299_P_1778661468947.JPG",
        "alt": "Wall Cabinet W2436"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/299_P_1778661473644.JPG",
        "alt": "Wall Cabinet W2436 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/299_P_1778661484151.JPG",
        "alt": "Wall Cabinet W2436 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/299_P_1778661479264.JPG",
        "alt": "Wall Cabinet W2436 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/299_P_1781984141620.jpg",
        "alt": "Wall Cabinet W2436 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/299_P_1779697018560.gif",
        "alt": "Wall Cabinet W2436 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W2436 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W2436 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W2436 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W2436 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W2436 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-106",
    "slug": "wall-cabinet-w2442-300",
    "sku": "015180130",
    "manufacturerPartNumber": "W2442-PWMS-WH",
    "name": "Wall Cabinet W2442",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 321,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "24\" W × 42\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-106",
      "sku": "015180130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/300_P_1778663322793.JPG",
        "alt": "Wall Cabinet W2442"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/300_P_1778663329441.JPG",
        "alt": "Wall Cabinet W2442 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/300_P_1778663333068.JPG",
        "alt": "Wall Cabinet W2442 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/300_P_1778663338634.JPG",
        "alt": "Wall Cabinet W2442 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/300_P_1781984153547.jpg",
        "alt": "Wall Cabinet W2442 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/300_P_1779784303218.gif",
        "alt": "Wall Cabinet W2442 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W2442 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W2442 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W2442 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W2442 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W2442 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-108",
    "slug": "wall-cabinet-w2730-301",
    "sku": "015190130",
    "manufacturerPartNumber": "W2730-PWMS-WH",
    "name": "Wall Cabinet W2730",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 255,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "27\" W × 30\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-108",
      "sku": "015190130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/301_P_1778659178543.JPG",
        "alt": "Wall Cabinet W2730"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/301_P_1778659182658.JPG",
        "alt": "Wall Cabinet W2730 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/301_P_1778659187194.JPG",
        "alt": "Wall Cabinet W2730 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/301_P_1778659193834.JPG",
        "alt": "Wall Cabinet W2730 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/301_P_1781984167850.jpg",
        "alt": "Wall Cabinet W2730 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/301_P_1779696101145.gif",
        "alt": "Wall Cabinet W2730 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W2730 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W2730 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W2730 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W2730 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W2730 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-110",
    "slug": "wall-cabinet-w2736-302",
    "sku": "015200130",
    "manufacturerPartNumber": "W2736-PWMS-WH",
    "name": "Wall Cabinet W2736",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 289,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "27\" W × 36\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-110",
      "sku": "015200130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/302_P_1778661871177.JPG",
        "alt": "Wall Cabinet W2736"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/302_P_1778661875077.JPG",
        "alt": "Wall Cabinet W2736 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/302_P_1778661881793.JPG",
        "alt": "Wall Cabinet W2736 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/302_P_1778661885948.JPG",
        "alt": "Wall Cabinet W2736 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708153507_93ad77a476a0.png",
        "alt": "Wall Cabinet W2736 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/302_P_1779697056891.gif",
        "alt": "Wall Cabinet W2736 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W2736 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W2736 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W2736 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W2736 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W2736 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-112",
    "slug": "wall-cabinet-w2742-303",
    "sku": "015210130",
    "manufacturerPartNumber": "W2742-PWMS-WH",
    "name": "Wall Cabinet W2742",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 347,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "27\" W × 42\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-112",
      "sku": "015210130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/303_P_1778663605371.JPG",
        "alt": "Wall Cabinet W2742"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/303_P_1778663616805.JPG",
        "alt": "Wall Cabinet W2742 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/303_P_1778663611169.JPG",
        "alt": "Wall Cabinet W2742 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/303_P_1778663621997.JPG",
        "alt": "Wall Cabinet W2742 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/303_P_1781984180550.jpg",
        "alt": "Wall Cabinet W2742 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/303_P_1779784346131.gif",
        "alt": "Wall Cabinet W2742 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W2742 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W2742 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W2742 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W2742 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W2742 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-114",
    "slug": "wall-cabinet-w3012-304",
    "sku": "015220130",
    "manufacturerPartNumber": "W3012-PWMS-WH",
    "name": "Wall Cabinet W3012",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 149,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "30\" W × 12\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-114",
      "sku": "015220130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/304_P_1778655355815.JPG",
        "alt": "Wall Cabinet W3012"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/304_P_1778655362207.JPG",
        "alt": "Wall Cabinet W3012 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/304_P_1778655368816.JPG",
        "alt": "Wall Cabinet W3012 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/304_P_1778655373497.JPG",
        "alt": "Wall Cabinet W3012 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/304_P_1779694314629.gif",
        "alt": "Wall Cabinet W3012 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W3012 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W3012 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W3012 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W3012 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W3012 alternate view 10"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-116",
    "slug": "wall-cabinet-w301224-305",
    "sku": "015230130",
    "manufacturerPartNumber": "W301224-PWMS-WH",
    "name": "Wall Cabinet W301224",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 213,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "30\" W × 12\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-116",
      "sku": "015230130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/305_P_1778665551398.JPG",
        "alt": "Wall Cabinet W301224"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/305_P_1778665558551.JPG",
        "alt": "Wall Cabinet W301224 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/305_P_1778665568285.JPG",
        "alt": "Wall Cabinet W301224 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/305_P_1778665564283.JPG",
        "alt": "Wall Cabinet W301224 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/305_P_1781985340799.jpg",
        "alt": "Wall Cabinet W301224 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/305_P_1779784599276.gif",
        "alt": "Wall Cabinet W301224 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W301224 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W301224 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W301224 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W301224 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W301224 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-118",
    "slug": "wall-cabinet-w301524-306",
    "sku": "015240130",
    "manufacturerPartNumber": "W301524-PWMS-WH",
    "name": "Wall Cabinet W301524",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 231,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "30\" W × 15\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-118",
      "sku": "015240130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/306_P_1778665651823.JPG",
        "alt": "Wall Cabinet W301524"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/306_P_1778665657733.JPG",
        "alt": "Wall Cabinet W301524 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/306_P_1778665667257.JPG",
        "alt": "Wall Cabinet W301524 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/306_P_1778665662245.JPG",
        "alt": "Wall Cabinet W301524 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/306_P_1781985353436.jpg",
        "alt": "Wall Cabinet W301524 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/306_P_1779784655233.gif",
        "alt": "Wall Cabinet W301524 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W301524 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W301524 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W301524 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W301524 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W301524 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-120",
    "slug": "wall-cabinet-w3018-307",
    "sku": "015250130",
    "manufacturerPartNumber": "W3018-PWMS-WH",
    "name": "Wall Cabinet W3018",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 177,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "30\" W × 18\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-120",
      "sku": "015250130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/307_P_1778655460410.JPG",
        "alt": "Wall Cabinet W3018"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/307_P_1778655466167.JPG",
        "alt": "Wall Cabinet W3018 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/307_P_1778655471111.JPG",
        "alt": "Wall Cabinet W3018 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/307_P_1778655476025.JPG",
        "alt": "Wall Cabinet W3018 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/307_P_1781985366525.jpg",
        "alt": "Wall Cabinet W3018 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/307_P_1779694417152.gif",
        "alt": "Wall Cabinet W3018 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W3018 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W3018 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W3018 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W3018 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W3018 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-122",
    "slug": "wall-cabinet-w301824-308",
    "sku": "015260130",
    "manufacturerPartNumber": "W301824-PWMS-WH",
    "name": "Wall Cabinet W301824",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 247,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "30\" W × 18\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-122",
      "sku": "015260130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/308_P_1778655597085.JPG",
        "alt": "Wall Cabinet W301824"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/308_P_1778655604217.JPG",
        "alt": "Wall Cabinet W301824 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/308_P_1778655617802.JPG",
        "alt": "Wall Cabinet W301824 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/308_P_1778655612799.JPG",
        "alt": "Wall Cabinet W301824 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/308_P_1781985378237.jpg",
        "alt": "Wall Cabinet W301824 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/308_P_1779784693197.gif",
        "alt": "Wall Cabinet W301824 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W301824 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W301824 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W301824 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W301824 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W301824 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-124",
    "slug": "wall-cabinet-w3024-309",
    "sku": "015270130",
    "manufacturerPartNumber": "W3024-PWMS-WH",
    "name": "Wall Cabinet W3024",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 226,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "30\" W × 24\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-124",
      "sku": "015270130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/309_P_1778655724706.JPG",
        "alt": "Wall Cabinet W3024"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/309_P_1778655730934.JPG",
        "alt": "Wall Cabinet W3024 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/309_P_1778655735289.JPG",
        "alt": "Wall Cabinet W3024 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/309_P_1778655740051.JPG",
        "alt": "Wall Cabinet W3024 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/309_P_1781985390944.jpg",
        "alt": "Wall Cabinet W3024 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/309_P_1779694710339.gif",
        "alt": "Wall Cabinet W3024 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W3024 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W3024 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W3024 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W3024 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W3024 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-126",
    "slug": "wall-cabinet-w302424-310",
    "sku": "015280130",
    "manufacturerPartNumber": "W302424-PWMS-WH",
    "name": "Wall Cabinet W302424",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 325,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "30\" W × 24\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-126",
      "sku": "015280130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/310_P_1778655814895.JPG",
        "alt": "Wall Cabinet W302424"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/310_P_1778655821112.JPG",
        "alt": "Wall Cabinet W302424 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/310_P_1778655826736.JPG",
        "alt": "Wall Cabinet W302424 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/310_P_1778655832508.JPG",
        "alt": "Wall Cabinet W302424 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/310_P_1781985404898.jpg",
        "alt": "Wall Cabinet W302424 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/310_P_1779785015775.gif",
        "alt": "Wall Cabinet W302424 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W302424 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W302424 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W302424 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W302424 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W302424 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-128",
    "slug": "wall-cabinet-w3030-311",
    "sku": "015290130",
    "manufacturerPartNumber": "W3030-PWMS-WH",
    "name": "Wall Cabinet W3030",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 275,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "30\" W × 30\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-128",
      "sku": "015290130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/311_P_1778745687366.JPG",
        "alt": "Wall Cabinet W3030"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/311_P_1778745692732.JPG",
        "alt": "Wall Cabinet W3030 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/311_P_1778745699698.JPG",
        "alt": "Wall Cabinet W3030 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/311_P_1778745707043.JPG",
        "alt": "Wall Cabinet W3030 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/311_P_1781985416453.jpg",
        "alt": "Wall Cabinet W3030 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/311_P_1779696134959.gif",
        "alt": "Wall Cabinet W3030 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W3030 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W3030 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W3030 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W3030 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W3030 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-130",
    "slug": "wall-cabinet-w3036-312",
    "sku": "015300130",
    "manufacturerPartNumber": "W3036-PWMS-WH",
    "name": "Wall Cabinet W3036",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 312,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "30\" W × 36\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-130",
      "sku": "015300130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/312_P_1778661989386.JPG",
        "alt": "Wall Cabinet W3036"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/312_P_1778661994961.JPG",
        "alt": "Wall Cabinet W3036 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/312_P_1778661999423.JPG",
        "alt": "Wall Cabinet W3036 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/312_P_1778662004955.JPG",
        "alt": "Wall Cabinet W3036 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/312_P_1781985428118.jpg",
        "alt": "Wall Cabinet W3036 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/312_P_1779697106959.gif",
        "alt": "Wall Cabinet W3036 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W3036 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W3036 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W3036 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W3036 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W3036 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-132",
    "slug": "wall-cabinet-w3042-313",
    "sku": "015310130",
    "manufacturerPartNumber": "W3042-PWMS-WH",
    "name": "Wall Cabinet W3042",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 374,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "30\" W × 42\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-132",
      "sku": "015310130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/313_P_1778663693076.JPG",
        "alt": "Wall Cabinet W3042"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/313_P_1778663697581.JPG",
        "alt": "Wall Cabinet W3042 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/313_P_1778663707082.JPG",
        "alt": "Wall Cabinet W3042 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/313_P_1778663703180.JPG",
        "alt": "Wall Cabinet W3042 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/313_P_1781985440279.jpg",
        "alt": "Wall Cabinet W3042 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/313_P_1779784382951.gif",
        "alt": "Wall Cabinet W3042 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W3042 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W3042 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W3042 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W3042 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W3042 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-134",
    "slug": "wall-cabinet-w331224-314",
    "sku": "015320130",
    "manufacturerPartNumber": "W331224-PWMS-WH",
    "name": "Wall Cabinet W331224",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 227,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "33\" W × 12\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-134",
      "sku": "015320130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/314_P_1778665750353.JPG",
        "alt": "Wall Cabinet W331224"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/314_P_1778665755439.JPG",
        "alt": "Wall Cabinet W331224 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/314_P_1778665766120.JPG",
        "alt": "Wall Cabinet W331224 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/314_P_1778665760882.JPG",
        "alt": "Wall Cabinet W331224 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/314_P_1781985451012.jpg",
        "alt": "Wall Cabinet W331224 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/314_P_1779784730669.gif",
        "alt": "Wall Cabinet W331224 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W331224 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W331224 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W331224 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W331224 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W331224 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-136",
    "slug": "wall-cabinet-w331524-315",
    "sku": "015330130",
    "manufacturerPartNumber": "W331524-PWMS-WH",
    "name": "Wall Cabinet W331524",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 246,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "33\" W × 15\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-136",
      "sku": "015330130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/315_P_1778665839738.JPG",
        "alt": "Wall Cabinet W331524"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/315_P_1778665850064.JPG",
        "alt": "Wall Cabinet W331524 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/315_P_1778665845864.JPG",
        "alt": "Wall Cabinet W331524 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/315_P_1778665855885.JPG",
        "alt": "Wall Cabinet W331524 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/315_P_1781985463965.jpg",
        "alt": "Wall Cabinet W331524 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/315_P_1779784764407.gif",
        "alt": "Wall Cabinet W331524 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W331524 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W331524 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W331524 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W331524 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W331524 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-138",
    "slug": "wall-cabinet-w331824-316",
    "sku": "015340130",
    "manufacturerPartNumber": "W331824-PWMS-WH",
    "name": "Wall Cabinet W331824",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 264,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "33\" W × 18\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-138",
      "sku": "015340130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/316_P_1778665945589.JPG",
        "alt": "Wall Cabinet W331824"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/316_P_1778665950963.JPG",
        "alt": "Wall Cabinet W331824 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/316_P_1778665960149.JPG",
        "alt": "Wall Cabinet W331824 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/316_P_1778665956934.JPG",
        "alt": "Wall Cabinet W331824 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/316_P_1781985476684.jpg",
        "alt": "Wall Cabinet W331824 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/316_P_1779784798352.gif",
        "alt": "Wall Cabinet W331824 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W331824 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W331824 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W331824 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W331824 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W331824 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-140",
    "slug": "wall-cabinet-w3324-317",
    "sku": "015350130",
    "manufacturerPartNumber": "W3324-PWMS-WH",
    "name": "Wall Cabinet W3324",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 242,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "33\" W × 24\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-140",
      "sku": "015350130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/317_P_1778656001299.JPG",
        "alt": "Wall Cabinet W3324"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/317_P_1778656006396.JPG",
        "alt": "Wall Cabinet W3324 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/317_P_1778656012511.JPG",
        "alt": "Wall Cabinet W3324 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/317_P_1778656017812.JPG",
        "alt": "Wall Cabinet W3324 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/317_P_1781985487898.jpg",
        "alt": "Wall Cabinet W3324 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/317_P_1779694751503.gif",
        "alt": "Wall Cabinet W3324 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W3324 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W3324 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W3324 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W3324 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W3324 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-142",
    "slug": "wall-cabinet-w332424-318",
    "sku": "015360130",
    "manufacturerPartNumber": "W332424-PWMS-WH",
    "name": "Wall Cabinet W332424",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 347,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "33\" W × 24\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-142",
      "sku": "015360130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/318_P_1778655915452.JPG",
        "alt": "Wall Cabinet W332424"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/318_P_1778655921388.JPG",
        "alt": "Wall Cabinet W332424 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/318_P_1778655927198.JPG",
        "alt": "Wall Cabinet W332424 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/318_P_1778655932259.JPG",
        "alt": "Wall Cabinet W332424 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/318_P_1781985498879.jpg",
        "alt": "Wall Cabinet W332424 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/318_P_1779785047209.gif",
        "alt": "Wall Cabinet W332424 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W332424 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W332424 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W332424 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W332424 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W332424 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-144",
    "slug": "wall-cabinet-w3330-319",
    "sku": "015370130",
    "manufacturerPartNumber": "W3330-PWMS-WH",
    "name": "Wall Cabinet W3330",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 295,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "33\" W × 30\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-144",
      "sku": "015370130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/319_P_1778659518471.JPG",
        "alt": "Wall Cabinet W3330"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/319_P_1778659548975.JPG",
        "alt": "Wall Cabinet W3330 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/319_P_1778659558853.JPG",
        "alt": "Wall Cabinet W3330 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/319_P_1778659554022.JPG",
        "alt": "Wall Cabinet W3330 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/319_P_1781985510827.jpg",
        "alt": "Wall Cabinet W3330 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/319_P_1779696169652.gif",
        "alt": "Wall Cabinet W3330 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W3330 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W3330 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W3330 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W3330 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W3330 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-146",
    "slug": "wall-cabinet-w3336-320",
    "sku": "015380130",
    "manufacturerPartNumber": "W3336-PWMS-WH",
    "name": "Wall Cabinet W3336",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 334,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "33\" W × 36\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-146",
      "sku": "015380130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/320_P_1778662115431.JPG",
        "alt": "Wall Cabinet W3336"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/320_P_1778662121087.JPG",
        "alt": "Wall Cabinet W3336 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/320_P_1778662126915.JPG",
        "alt": "Wall Cabinet W3336 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/320_P_1778662131211.JPG",
        "alt": "Wall Cabinet W3336 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/320_P_1781985521238.jpg",
        "alt": "Wall Cabinet W3336 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/320_P_1779697147865.gif",
        "alt": "Wall Cabinet W3336 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W3336 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W3336 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W3336 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W3336 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W3336 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-148",
    "slug": "wall-cabinet-w3342-321",
    "sku": "015390130",
    "manufacturerPartNumber": "W3342-PWMS-WH",
    "name": "Wall Cabinet W3342",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 400,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "33\" W × 42\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-148",
      "sku": "015390130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/321_P_1778663859736.JPG",
        "alt": "Wall Cabinet W3342"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/321_P_1778663865965.JPG",
        "alt": "Wall Cabinet W3342 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/321_P_1778663877933.JPG",
        "alt": "Wall Cabinet W3342 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/321_P_1778663872015.JPG",
        "alt": "Wall Cabinet W3342 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/321_P_1781985533890.jpg",
        "alt": "Wall Cabinet W3342 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/321_P_1779784419607.gif",
        "alt": "Wall Cabinet W3342 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W3342 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W3342 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W3342 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W3342 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W3342 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-150",
    "slug": "wall-cabinet-w361224-322",
    "sku": "015400130",
    "manufacturerPartNumber": "W361224-PWMS-WH",
    "name": "Wall Cabinet W361224",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 242,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "36\" W × 12\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-150",
      "sku": "015400130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/322_P_1778666017185.JPG",
        "alt": "Wall Cabinet W361224"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/322_P_1778666039938.JPG",
        "alt": "Wall Cabinet W361224 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/322_P_1778666045385.JPG",
        "alt": "Wall Cabinet W361224 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/322_P_1778666050451.JPG",
        "alt": "Wall Cabinet W361224 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/322_P_1781985563443.jpg",
        "alt": "Wall Cabinet W361224 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/322_P_1779784834896.gif",
        "alt": "Wall Cabinet W361224 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W361224 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W361224 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W361224 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W361224 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W361224 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-152",
    "slug": "wall-cabinet-w361524-323",
    "sku": "015410130",
    "manufacturerPartNumber": "W361524-PWMS-WH",
    "name": "Wall Cabinet W361524",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 262,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "36\" W × 15\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-152",
      "sku": "015410130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/323_P_1778666128651.JPG",
        "alt": "Wall Cabinet W361524"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/323_P_1778666142205.JPG",
        "alt": "Wall Cabinet W361524 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/323_P_1778666142378.JPG",
        "alt": "Wall Cabinet W361524 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/323_P_1778666135733.JPG",
        "alt": "Wall Cabinet W361524 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/323_P_1781985574443.jpg",
        "alt": "Wall Cabinet W361524 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/323_P_1779784874898.gif",
        "alt": "Wall Cabinet W361524 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W361524 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W361524 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W361524 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W361524 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W361524 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-154",
    "slug": "wall-cabinet-w361824-324",
    "sku": "015420130",
    "manufacturerPartNumber": "W361824-PWMS-WH",
    "name": "Wall Cabinet W361824",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 280,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "36\" W × 18\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-154",
      "sku": "015420130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/324_P_1778666217299.JPG",
        "alt": "Wall Cabinet W361824"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/324_P_1778666222365.JPG",
        "alt": "Wall Cabinet W361824 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/324_P_1778666229273.JPG",
        "alt": "Wall Cabinet W361824 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/324_P_1778666229532.JPG",
        "alt": "Wall Cabinet W361824 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/324_P_1781985586472.jpg",
        "alt": "Wall Cabinet W361824 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/324_P_1779784909510.gif",
        "alt": "Wall Cabinet W361824 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W361824 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W361824 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W361824 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W361824 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W361824 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-156",
    "slug": "wall-cabinet-w3624-325",
    "sku": "015430130",
    "manufacturerPartNumber": "W3624-PWMS-WH",
    "name": "Wall Cabinet W3624",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 258,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "36\" W × 24\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-156",
      "sku": "015430130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/325_P_1778657157181.JPG",
        "alt": "Wall Cabinet W3624"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/325_P_1778657164684.JPG",
        "alt": "Wall Cabinet W3624 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/325_P_1778657168058.JPG",
        "alt": "Wall Cabinet W3624 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/325_P_1778657174587.JPG",
        "alt": "Wall Cabinet W3624 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/325_P_1781985597658.jpg",
        "alt": "Wall Cabinet W3624 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/325_P_1779694798212.gif",
        "alt": "Wall Cabinet W3624 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W3624 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W3624 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W3624 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W3624 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W3624 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-158",
    "slug": "wall-cabinet-w362424-326",
    "sku": "015440130",
    "manufacturerPartNumber": "W362424-PWMS-WH",
    "name": "Wall Cabinet W362424",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 370,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "36\" W × 24\" H × 24\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-158",
      "sku": "015440130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/326_P_1778657250468.JPG",
        "alt": "Wall Cabinet W362424"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/326_P_1778657255633.JPG",
        "alt": "Wall Cabinet W362424 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/326_P_1778657260904.JPG",
        "alt": "Wall Cabinet W362424 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/326_P_1778657265715.JPG",
        "alt": "Wall Cabinet W362424 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/326_P_1781985610689.jpg",
        "alt": "Wall Cabinet W362424 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/326_P_1779785083654.gif",
        "alt": "Wall Cabinet W362424 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W362424 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W362424 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W362424 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W362424 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W362424 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-160",
    "slug": "wall-cabinet-w3630-327",
    "sku": "015450130",
    "manufacturerPartNumber": "W3630-PWMS-WH",
    "name": "Wall Cabinet W3630",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 315,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "36\" W × 30\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-160",
      "sku": "015450130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/327_P_1778660286616.JPG",
        "alt": "Wall Cabinet W3630"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/327_P_1778660290637.JPG",
        "alt": "Wall Cabinet W3630 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/327_P_1778660301361.JPG",
        "alt": "Wall Cabinet W3630 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/327_P_1778660296511.JPG",
        "alt": "Wall Cabinet W3630 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/327_P_1781985674759.jpg",
        "alt": "Wall Cabinet W3630 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/327_P_1779696203633.gif",
        "alt": "Wall Cabinet W3630 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W3630 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W3630 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W3630 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W3630 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W3630 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-162",
    "slug": "wall-cabinet-w3636-328",
    "sku": "015460130",
    "manufacturerPartNumber": "W3636-PWMS-WH",
    "name": "Wall Cabinet W3636",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 357,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "36\" W × 36\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-162",
      "sku": "015460130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/328_P_1778662209091.JPG",
        "alt": "Wall Cabinet W3636"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/328_P_1778662213501.JPG",
        "alt": "Wall Cabinet W3636 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/328_P_1778662224900.JPG",
        "alt": "Wall Cabinet W3636 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/328_P_1778662219861.JPG",
        "alt": "Wall Cabinet W3636 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/328_P_1781985708156.jpg",
        "alt": "Wall Cabinet W3636 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/328_P_1779697181042.gif",
        "alt": "Wall Cabinet W3636 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W3636 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W3636 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W3636 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W3636 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W3636 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-164",
    "slug": "wall-cabinet-w3642-329",
    "sku": "015470130",
    "manufacturerPartNumber": "W3642-PWMS-WH",
    "name": "Wall Cabinet W3642",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 427,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "36\" W × 42\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-164",
      "sku": "015470130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/329_P_1778663958180.JPG",
        "alt": "Wall Cabinet W3642"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/329_P_1778663963947.JPG",
        "alt": "Wall Cabinet W3642 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/329_P_1778663973033.JPG",
        "alt": "Wall Cabinet W3642 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/329_P_1778663968320.JPG",
        "alt": "Wall Cabinet W3642 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/329_P_1781985724051.jpg",
        "alt": "Wall Cabinet W3642 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/329_P_1779784458527.gif",
        "alt": "Wall Cabinet W3642 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W3642 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W3642 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W3642 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W3642 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W3642 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-166",
    "slug": "wall-cabinet-w3930-330",
    "sku": "015480130",
    "manufacturerPartNumber": "W3930-PWMS-WH",
    "name": "Wall Cabinet W3930",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 335,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "39\" W × 30\" H × 12\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-166",
      "sku": "015480130",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/330_P_1778660380311.JPG",
        "alt": "Wall Cabinet W3930"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/330_P_1778660389905.JPG",
        "alt": "Wall Cabinet W3930 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/330_P_1778660399521.JPG",
        "alt": "Wall Cabinet W3930 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/330_P_1778660394015.JPG",
        "alt": "Wall Cabinet W3930 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/330_P_1781985739687.jpg",
        "alt": "Wall Cabinet W3930 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/330_P_1779696240153.gif",
        "alt": "Wall Cabinet W3930 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Wall Cabinet W3930 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Wall Cabinet W3930 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Wall Cabinet W3930 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Wall Cabinet W3930 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Wall Cabinet W3930 alternate view 11"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-240",
    "slug": "wall-end-panel-wep1230-377",
    "sku": "018910942",
    "manufacturerPartNumber": "WEP1230-MS-WH",
    "name": "Wall End Panel WEP1230",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 31,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "12¾\"W × 30\" H × ¾\"D",
    "finish": "White finish",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-240",
      "sku": "018910942",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/377_P_1782811612575.JPG",
        "alt": "Wall End Panel WEP1230"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/377_P_1782811625747.JPG",
        "alt": "Wall End Panel WEP1230 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/377_P_1782811625164.JPG",
        "alt": "Wall End Panel WEP1230 alternate view 3"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-242",
    "slug": "wall-end-panel-wep1236-378",
    "sku": "018920942",
    "manufacturerPartNumber": "WEP1236-MS-WH",
    "name": "Wall End Panel WEP1236",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 37,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "12¾\"W × 36\" H × ¾\"D",
    "finish": "White finish",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-242",
      "sku": "018920942",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/378_P_1782811698366.JPG",
        "alt": "Wall End Panel WEP1236"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/378_P_1782811698645.JPG",
        "alt": "Wall End Panel WEP1236 alternate view 2"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-245",
    "slug": "wall-end-panel-wep1242-379",
    "sku": "018930942",
    "manufacturerPartNumber": "WEP1242-MS-WH",
    "name": "Wall End Panel WEP1242",
    "category": "Kitchen Cabinets",
    "price": {
      "amount": 44,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "12¾\"W × 42\" H × ¾\"D",
    "finish": "White finish",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-245",
      "sku": "018930942",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/379_P_1782811763133.JPG",
        "alt": "Wall End Panel WEP1242"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/379_P_1782811763364.JPG",
        "alt": "Wall End Panel WEP1242 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/379_P_1782811763823.JPG",
        "alt": "Wall End Panel WEP1242 alternate view 3"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-288",
    "slug": "vanity-cabinet-v3021-door-tdl-400",
    "sku": "023021311",
    "manufacturerPartNumber": "V3021STDL-PWMS-WH-TOP",
    "name": "Vanity Cabinet-V3021-Door-TDL",
    "category": "Bathroom Vanities",
    "price": {
      "amount": 538,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "30\" W × 34\" H × 21\" D",
    "finish": "MDF door with thermofoil finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-288",
      "sku": "023021311",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/400_P_1781991376801.JPG",
        "alt": "Vanity Cabinet-V3021-Door-TDL"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/400_P_1781991409333.jpg",
        "alt": "Vanity Cabinet-V3021-Door-TDL alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/400_P_1781991409939.jpg",
        "alt": "Vanity Cabinet-V3021-Door-TDL alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/400_P_1781991410199.jpg",
        "alt": "Vanity Cabinet-V3021-Door-TDL alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/400_P_1781991419346.jpg",
        "alt": "Vanity Cabinet-V3021-Door-TDL alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708163021_b89f25e6bac5.jpg",
        "alt": "Vanity Cabinet-V3021-Door-TDL alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/400_P_1781991426571.jpg",
        "alt": "Vanity Cabinet-V3021-Door-TDL alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Vanity Cabinet-V3021-Door-TDL alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Vanity Cabinet-V3021-Door-TDL alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Vanity Cabinet-V3021-Door-TDL alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Vanity Cabinet-V3021-Door-TDL alternate view 11"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Vanity Cabinet-V3021-Door-TDL alternate view 12"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-292",
    "slug": "vanity-cabinet-v3021-door-tdr-398",
    "sku": "023021211",
    "manufacturerPartNumber": "V3021STDR-PWMS-WH-TOP",
    "name": "Vanity Cabinet-V3021-Door-TDR",
    "category": "Bathroom Vanities",
    "price": {
      "amount": 538,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "30\" W × 34\" H × 21\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-292",
      "sku": "023021211",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/398_P_1781990903867.JPG",
        "alt": "Vanity Cabinet-V3021-Door-TDR"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/398_P_1781990917935.JPG",
        "alt": "Vanity Cabinet-V3021-Door-TDR alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/398_P_1781990917042.JPG",
        "alt": "Vanity Cabinet-V3021-Door-TDR alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/398_P_1781990917011.JPG",
        "alt": "Vanity Cabinet-V3021-Door-TDR alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708163151_6b7795e46ed0.jpg",
        "alt": "Vanity Cabinet-V3021-Door-TDR alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/398_P_1781990926078.jpg",
        "alt": "Vanity Cabinet-V3021-Door-TDR alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/398_P_1781990938857.jpg",
        "alt": "Vanity Cabinet-V3021-Door-TDR alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Vanity Cabinet-V3021-Door-TDR alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Vanity Cabinet-V3021-Door-TDR alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Vanity Cabinet-V3021-Door-TDR alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Vanity Cabinet-V3021-Door-TDR alternate view 11"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Vanity Cabinet-V3021-Door-TDR alternate view 12"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-278",
    "slug": "vanity-cabinet-v3021-doors-tdl-415",
    "sku": "023021511",
    "manufacturerPartNumber": "V3021TDL-PWMS-WH-TOP",
    "name": "Vanity Cabinet-V3021-Doors-TDL",
    "category": "Bathroom Vanities",
    "price": {
      "amount": 554,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "30\" W × 34\" H × 21\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-278",
      "sku": "023021511",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708124025_17384a828908.jpg",
        "alt": "Vanity Cabinet-V3021-Doors-TDL"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/415_P_1780891099427.jpg",
        "alt": "Vanity Cabinet-V3021-Doors-TDL alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/415_P_1780891099543.jpg",
        "alt": "Vanity Cabinet-V3021-Doors-TDL alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/415_P_1780891100770.JPG",
        "alt": "Vanity Cabinet-V3021-Doors-TDL alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708163335_7f8d8ad2a2bb.jpg",
        "alt": "Vanity Cabinet-V3021-Doors-TDL alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/415_P_1781992619337.jpg",
        "alt": "Vanity Cabinet-V3021-Doors-TDL alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/415_P_1781992910724.jpg",
        "alt": "Vanity Cabinet-V3021-Doors-TDL alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Vanity Cabinet-V3021-Doors-TDL alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Vanity Cabinet-V3021-Doors-TDL alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Vanity Cabinet-V3021-Doors-TDL alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Vanity Cabinet-V3021-Doors-TDL alternate view 11"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Vanity Cabinet-V3021-Doors-TDL alternate view 12"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-272",
    "slug": "vanity-cabinet-v3021-doors-tdr-414",
    "sku": "023021411",
    "manufacturerPartNumber": "V3021TDR-PWMS-WH-TOP",
    "name": "Vanity Cabinet-V3021-Doors-TDR",
    "category": "Bathroom Vanities",
    "price": {
      "amount": 554,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "30\" W × 34\" H × 21\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-272",
      "sku": "023021411",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708124731_782285cb24c4.jpg",
        "alt": "Vanity Cabinet-V3021-Doors-TDR"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/414_P_1781138720012.JPG",
        "alt": "Vanity Cabinet-V3021-Doors-TDR alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/414_P_1781138721505.JPG",
        "alt": "Vanity Cabinet-V3021-Doors-TDR alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/414_P_1781138719654.JPG",
        "alt": "Vanity Cabinet-V3021-Doors-TDR alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708163429_880452d4a2f6.jpg",
        "alt": "Vanity Cabinet-V3021-Doors-TDR alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/414_P_1781992739944.jpg",
        "alt": "Vanity Cabinet-V3021-Doors-TDR alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/414_P_1781992746936.jpg",
        "alt": "Vanity Cabinet-V3021-Doors-TDR alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Vanity Cabinet-V3021-Doors-TDR alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Vanity Cabinet-V3021-Doors-TDR alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Vanity Cabinet-V3021-Doors-TDR alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Vanity Cabinet-V3021-Doors-TDR alternate view 11"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Vanity Cabinet-V3021-Doors-TDR alternate view 12"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-284",
    "slug": "vanity-cabinet-v3621tdl-412",
    "sku": "023621511",
    "manufacturerPartNumber": "V3621TDL-PWMS-WH-TOP",
    "name": "Vanity Cabinet-V3621TDL",
    "category": "Bathroom Vanities",
    "price": {
      "amount": 589,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "36\" W × 34\" H × 21\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-284",
      "sku": "023621511",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708124218_55ec953afc96.jpg",
        "alt": "Vanity Cabinet-V3621TDL"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/412_P_1780891317104.jpg",
        "alt": "Vanity Cabinet-V3621TDL alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/412_P_1780891317644.jpg",
        "alt": "Vanity Cabinet-V3621TDL alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/412_P_1780891318120.JPG",
        "alt": "Vanity Cabinet-V3621TDL alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708163823_6d545f4546b0.jpg",
        "alt": "Vanity Cabinet-V3621TDL alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/412_P_1781993515535.jpg",
        "alt": "Vanity Cabinet-V3621TDL alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/412_P_1781993524139.jpg",
        "alt": "Vanity Cabinet-V3621TDL alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Vanity Cabinet-V3621TDL alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Vanity Cabinet-V3621TDL alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Vanity Cabinet-V3621TDL alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Vanity Cabinet-V3621TDL alternate view 11"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Vanity Cabinet-V3621TDL alternate view 12"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-9",
    "slug": "vanity-cabinet-v3621tdr-413",
    "sku": "023621411",
    "manufacturerPartNumber": "V3621TDR-PWMS-WH-TOP",
    "name": "Vanity Cabinet-V3621TDR",
    "category": "Bathroom Vanities",
    "price": {
      "amount": 589,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "36\" W × 34\" H × 21\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-9",
      "sku": "023621411",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708170724_d41a18503692.jpg",
        "alt": "Vanity Cabinet-V3621TDR"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/413_P_1780891477675.JPG",
        "alt": "Vanity Cabinet-V3621TDR alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/413_P_1780891477235.JPG",
        "alt": "Vanity Cabinet-V3621TDR alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/413_P_1780891477839.JPG",
        "alt": "Vanity Cabinet-V3621TDR alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708164049_1af8db16bd13.jpg",
        "alt": "Vanity Cabinet-V3621TDR alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/413_P_1781993648478.jpg",
        "alt": "Vanity Cabinet-V3621TDR alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/413_P_1781993663948.jpg",
        "alt": "Vanity Cabinet-V3621TDR alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Vanity Cabinet-V3621TDR alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Vanity Cabinet-V3621TDR alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Vanity Cabinet-V3621TDR alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Vanity Cabinet-V3621TDR alternate view 11"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Vanity Cabinet-V3621TDR alternate view 12"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-268",
    "slug": "vanity-cabinet-v4221-401",
    "sku": "024221611",
    "manufacturerPartNumber": "V4221-PWMS-WH-TOP",
    "name": "Vanity Cabinet-V4221",
    "category": "Bathroom Vanities",
    "price": {
      "amount": 804,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "42\" W × 34\" H × 21\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-268",
      "sku": "024221611",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/401_P_1779876548147.JPG",
        "alt": "Vanity Cabinet-V4221"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/401_P_1779876549194.JPG",
        "alt": "Vanity Cabinet-V4221 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/401_P_1779876549752.JPG",
        "alt": "Vanity Cabinet-V4221 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/401_P_1779876549064.JPG",
        "alt": "Vanity Cabinet-V4221 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708164253_0a2fced8fb3e.jpg",
        "alt": "Vanity Cabinet-V4221 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/401_P_1781995787692.jpg",
        "alt": "Vanity Cabinet-V4221 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/401_P_1781995796830.jpg",
        "alt": "Vanity Cabinet-V4221 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Vanity Cabinet-V4221 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Vanity Cabinet-V4221 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Vanity Cabinet-V4221 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Vanity Cabinet-V4221 alternate view 11"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Vanity Cabinet-V4221 alternate view 12"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-280",
    "slug": "vanity-cabinet-v4821-402",
    "sku": "024821611",
    "manufacturerPartNumber": "V4821-PWMS-WH-TOP",
    "name": "Vanity Cabinet-V4821",
    "category": "Bathroom Vanities",
    "price": {
      "amount": 845,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "48\" W × 34\" H × 21\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-280",
      "sku": "024821611",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/402_P_1779879537358.JPG",
        "alt": "Vanity Cabinet-V4821"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/402_P_1779879537677.JPG",
        "alt": "Vanity Cabinet-V4821 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/402_P_1779879537370.JPG",
        "alt": "Vanity Cabinet-V4821 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708164514_aca82106354d.jpg",
        "alt": "Vanity Cabinet-V4821 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/402_P_1779879538997.JPG",
        "alt": "Vanity Cabinet-V4821 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/402_P_1781995890879.jpg",
        "alt": "Vanity Cabinet-V4821 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/402_P_1781995902111.jpg",
        "alt": "Vanity Cabinet-V4821 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Vanity Cabinet-V4821 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Vanity Cabinet-V4821 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Vanity Cabinet-V4821 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Vanity Cabinet-V4821 alternate view 11"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Vanity Cabinet-V4821 alternate view 12"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-16",
    "slug": "vanity-cabinet-v663522-403",
    "sku": "026621711",
    "manufacturerPartNumber": "V663522-PWMS-WH-TOP",
    "name": "Vanity Cabinet-V663522",
    "category": "Bathroom Vanities",
    "price": {
      "amount": 1214,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "66\" W × 35\" H × 22\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-16",
      "sku": "026621711",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/403_P_1779952496972.JPG",
        "alt": "Vanity Cabinet-V663522"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/403_P_1779952489394.JPG",
        "alt": "Vanity Cabinet-V663522 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/403_P_1779952531369.JPG",
        "alt": "Vanity Cabinet-V663522 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/403_P_1779952530128.JPG",
        "alt": "Vanity Cabinet-V663522 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/sku/20260708164825_414742ca4119.jpg",
        "alt": "Vanity Cabinet-V663522 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/403_P_1781996141990.jpg",
        "alt": "Vanity Cabinet-V663522 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/403_P_1781996154407.jpg",
        "alt": "Vanity Cabinet-V663522 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Vanity Cabinet-V663522 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Vanity Cabinet-V663522 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Vanity Cabinet-V663522 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Vanity Cabinet-V663522 alternate view 11"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Vanity Cabinet-V663522 alternate view 12"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-255",
    "slug": "vanity-cabinet-vs24-384",
    "sku": "022421011",
    "manufacturerPartNumber": "VS24-PWMS-WH-TOP",
    "name": "Vanity Cabinet-VS24",
    "category": "Bathroom Vanities",
    "price": {
      "amount": 361,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "24\" W × 34\" H × 21\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-255",
      "sku": "022421011",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/384_P_1781572513220.JPG",
        "alt": "Vanity Cabinet-VS24"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/384_P_1781572530616.JPG",
        "alt": "Vanity Cabinet-VS24 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/384_P_1781572530442.JPG",
        "alt": "Vanity Cabinet-VS24 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/384_P_1781572531631.JPG",
        "alt": "Vanity Cabinet-VS24 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/384_P_1781572531019.JPG",
        "alt": "Vanity Cabinet-VS24 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/384_P_1781988493796.jpg",
        "alt": "Vanity Cabinet-VS24 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/384_P_1781988503326.jpg",
        "alt": "Vanity Cabinet-VS24 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Vanity Cabinet-VS24 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Vanity Cabinet-VS24 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Vanity Cabinet-VS24 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Vanity Cabinet-VS24 alternate view 11"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Vanity Cabinet-VS24 alternate view 12"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-266",
    "slug": "vanity-cabinet-vs27-404",
    "sku": "022721011",
    "manufacturerPartNumber": "VS27-PWMS-WH-TOP",
    "name": "Vanity Cabinet-VS27",
    "category": "Bathroom Vanities",
    "price": {
      "amount": 387,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "27\" W × 34\" H × 21\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-266",
      "sku": "022721011",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/404_P_1781678494615.JPG",
        "alt": "Vanity Cabinet-VS27"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/404_P_1781678504322.JPG",
        "alt": "Vanity Cabinet-VS27 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/404_P_1781678530593.JPG",
        "alt": "Vanity Cabinet-VS27 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/404_P_1781678529715.JPG",
        "alt": "Vanity Cabinet-VS27 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/404_P_1781678529355.JPG",
        "alt": "Vanity Cabinet-VS27 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/404_P_1781988595454.jpg",
        "alt": "Vanity Cabinet-VS27 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/404_P_1781988604741.jpg",
        "alt": "Vanity Cabinet-VS27 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Vanity Cabinet-VS27 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Vanity Cabinet-VS27 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Vanity Cabinet-VS27 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Vanity Cabinet-VS27 alternate view 11"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Vanity Cabinet-VS27 alternate view 12"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-296",
    "slug": "vanity-cabinet-vs30-405",
    "sku": "023021011",
    "manufacturerPartNumber": "VS30-PWMS-WH-TOP",
    "name": "Vanity Cabinet-VS30",
    "category": "Bathroom Vanities",
    "price": {
      "amount": 404,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "30\" W × 34\" H × 21\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-296",
      "sku": "023021011",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/405_P_1779963372411.JPG",
        "alt": "Vanity Cabinet-VS30"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/405_P_1779963379589.JPG",
        "alt": "Vanity Cabinet-VS30 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/405_P_1779963387996.JPG",
        "alt": "Vanity Cabinet-VS30 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/405_P_1779963402596.JPG",
        "alt": "Vanity Cabinet-VS30 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202605/source_img/405_P_1779963366354.JPG",
        "alt": "Vanity Cabinet-VS30 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/405_P_1781988698127.jpg",
        "alt": "Vanity Cabinet-VS30 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/405_P_1781988707602.jpg",
        "alt": "Vanity Cabinet-VS30 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Vanity Cabinet-VS30 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Vanity Cabinet-VS30 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Vanity Cabinet-VS30 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Vanity Cabinet-VS30 alternate view 11"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Vanity Cabinet-VS30 alternate view 12"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-261",
    "slug": "vanity-cabinet-vs36-406",
    "sku": "023621011",
    "manufacturerPartNumber": "VS36-PWMS-WH-TOP",
    "name": "Vanity Cabinet-VS36",
    "category": "Bathroom Vanities",
    "price": {
      "amount": 437,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "36\" W × 34\" H × 21\" D",
    "finish": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
    "colorName": "White",
    "colorHex": "#f7f6f2",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-261",
      "sku": "023621011",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/406_P_1781580047077.JPG",
        "alt": "Vanity Cabinet-VS36"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/406_P_1781580059593.JPG",
        "alt": "Vanity Cabinet-VS36 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/406_P_1781580079422.JPG",
        "alt": "Vanity Cabinet-VS36 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/406_P_1781580077626.JPG",
        "alt": "Vanity Cabinet-VS36 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/406_P_1781580079306.JPG",
        "alt": "Vanity Cabinet-VS36 alternate view 5"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/406_P_1781988807373.jpg",
        "alt": "Vanity Cabinet-VS36 alternate view 6"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/406_P_1781988816590.jpg",
        "alt": "Vanity Cabinet-VS36 alternate view 7"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_47e959f8fadc.jpg",
        "alt": "Vanity Cabinet-VS36 alternate view 8"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_5706afcb73e1.jpg",
        "alt": "Vanity Cabinet-VS36 alternate view 9"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_208ce7f1347b.jpg",
        "alt": "Vanity Cabinet-VS36 alternate view 10"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_f49dc5c3d014.jpg",
        "alt": "Vanity Cabinet-VS36 alternate view 11"
      },
      {
        "url": "https://mb01.vanstro.ca/uploads/products/20260715083055_d933774dd462.jpg",
        "alt": "Vanity Cabinet-VS36 alternate view 12"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-13",
    "slug": "baseboard-035-410",
    "sku": "033516222",
    "manufacturerPartNumber": "VS35-10FT /ea",
    "name": "Baseboard-035",
    "category": "Baseboards & Mouldings",
    "price": {
      "amount": 18.5,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "10 ft length",
    "finish": "Finger Joint Pine",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-13",
      "sku": "033516222",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/410_P_1780467428359.JPG",
        "alt": "Baseboard-035"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/410_P_1780467439132.JPG",
        "alt": "Baseboard-035 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/410_P_1780467439497.JPG",
        "alt": "Baseboard-035 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/410_P_1780467439827.JPG",
        "alt": "Baseboard-035 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/410_P_1780467394703.JPG",
        "alt": "Baseboard-035 alternate view 5"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-12",
    "slug": "baseboard-039-409",
    "sku": "033918222",
    "manufacturerPartNumber": "VS39-10FT /ea",
    "name": "Baseboard-039",
    "category": "Baseboards & Mouldings",
    "price": {
      "amount": 22.9,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "10 ft length",
    "finish": "Finger Joint Pine",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-12",
      "sku": "033918222",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/409_P_1780467530017.JPG",
        "alt": "Baseboard-039"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/409_P_1780467539816.JPG",
        "alt": "Baseboard-039 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/409_P_1780467539040.JPG",
        "alt": "Baseboard-039 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/409_P_1780467539254.JPG",
        "alt": "Baseboard-039 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/409_P_1781592420504.JPG",
        "alt": "Baseboard-039 alternate view 5"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-258",
    "slug": "baseboard-041-407",
    "sku": "034114222",
    "manufacturerPartNumber": "VS41-10FT /ea",
    "name": "Baseboard-041",
    "category": "Baseboards & Mouldings",
    "price": {
      "amount": 14.7,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "10 ft length",
    "finish": "Finger Joint Pine",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-258",
      "sku": "034114222",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/407_P_1780467308553.JPG",
        "alt": "Baseboard-041"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/407_P_1780467313804.JPG",
        "alt": "Baseboard-041 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/407_P_1780467319026.JPG",
        "alt": "Baseboard-041 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/407_P_1780467323256.JPG",
        "alt": "Baseboard-041 alternate view 4"
      }
    ],
    "inStock": true
  },
  {
    "id": "mb01-7",
    "slug": "casing-049-411",
    "sku": "034910320",
    "manufacturerPartNumber": "VS49-7FT /ea",
    "name": "Casing-049",
    "category": "Baseboards & Mouldings",
    "price": {
      "amount": 23.6,
      "currency": "CAD"
    },
    "unit": "each",
    "dimensions": "7 ft length",
    "finish": "Finger Joint Pine",
    "dealerStock": {
      "winnipeg": 0
    },
    "availability": {
      "productId": "mb01-7",
      "sku": "034910320",
      "locations": [
        {
          "dealerId": "winnipeg",
          "quantity": 0,
          "quantityKnown": false,
          "status": "in_stock",
          "pickupAvailable": true,
          "deliveryAvailable": true,
          "updatedAt": "source-catalog"
        }
      ],
      "totalAvailable": 0,
      "status": "in_stock",
      "availabilityMessage": "Availability is confirmed at checkout; the source catalog does not publish a quantity.",
      "updatedAt": "source-catalog"
    },
    "images": [
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/411_P_1780469866242.JPG",
        "alt": "Casing-049"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/411_P_1780469874280.JPG",
        "alt": "Casing-049 alternate view 2"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/411_P_1780469882732.JPG",
        "alt": "Casing-049 alternate view 3"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/411_P_1780469886558.JPG",
        "alt": "Casing-049 alternate view 4"
      },
      {
        "url": "https://mb01.vanstro.ca/images/202606/source_img/411_P_1781592370659.JPG",
        "alt": "Casing-049 alternate view 5"
      }
    ],
    "inStock": true
  }
];

export const mb01ProductMetadataById: Record<string, Mb01ProductMetadata> = {
  "mb01-40": {
    "sourceUrl": "https://mb01.vanstro.ca/product/3-drawer-base-3db12-272",
    "sourceProductId": "272",
    "sourceProductName": "3-Drawer Base 3DB12",
    "sourceCategory": "3-Drawer Base",
    "description": "Dimensions: 12\" W × 34½\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 12\" W × 34½\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "12\" W × 34½\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "3-Drawer Base",
      "Source product ID": "272",
      "Option name": "3DB12-PWMS-WH"
    }
  },
  "mb01-42": {
    "sourceUrl": "https://mb01.vanstro.ca/product/3-drawer-base-3db15-273",
    "sourceProductId": "273",
    "sourceProductName": "3-Drawer Base 3DB15",
    "sourceCategory": "3-Drawer Base",
    "description": "Dimensions: 15\" W × 34½\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 15\" W × 34½\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "15\" W × 34½\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "3-Drawer Base",
      "Source product ID": "273",
      "Option name": "3DB15-PWMS-WH"
    }
  },
  "mb01-44": {
    "sourceUrl": "https://mb01.vanstro.ca/product/3-drawer-base-3db18-274",
    "sourceProductId": "274",
    "sourceProductName": "3-Drawer Base 3DB18",
    "sourceCategory": "3-Drawer Base",
    "description": "Dimensions: 18\" W × 34½\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 18\" W × 34½\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "18\" W × 34½\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "3-Drawer Base",
      "Source product ID": "274",
      "Option name": "3DB18-PWMS-WH"
    }
  },
  "mb01-46": {
    "sourceUrl": "https://mb01.vanstro.ca/product/3-drawer-base-3db21-275",
    "sourceProductId": "275",
    "sourceProductName": "3-Drawer Base 3DB21",
    "sourceCategory": "3-Drawer Base",
    "description": "Dimensions: 21\" W × 34½\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 21\" W × 34½\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "21\" W × 34½\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "3-Drawer Base",
      "Source product ID": "275",
      "Option name": "3DB21-PWMS-WH"
    }
  },
  "mb01-48": {
    "sourceUrl": "https://mb01.vanstro.ca/product/3-drawer-base-3db24-276",
    "sourceProductId": "276",
    "sourceProductName": "3-Drawer Base 3DB24",
    "sourceCategory": "3-Drawer Base",
    "description": "Dimensions: 24\" W × 34½\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 24\" W × 34½\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "24\" W × 34½\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "3-Drawer Base",
      "Source product ID": "276",
      "Option name": "3DB24-PWMS-WH"
    }
  },
  "mb01-50": {
    "sourceUrl": "https://mb01.vanstro.ca/product/3-drawer-base-3db30-277",
    "sourceProductId": "277",
    "sourceProductName": "3-Drawer Base 3DB30",
    "sourceCategory": "3-Drawer Base",
    "description": "Dimensions: 30\" W × 34½\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 30\" W × 34½\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "30\" W × 34½\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "3-Drawer Base",
      "Source product ID": "277",
      "Option name": "3DB30-PWMS-WH"
    }
  },
  "mb01-52": {
    "sourceUrl": "https://mb01.vanstro.ca/product/3-drawer-base-3db33-278",
    "sourceProductId": "278",
    "sourceProductName": "3-Drawer Base 3DB33",
    "sourceCategory": "3-Drawer Base",
    "description": "Dimensions: 33\" W × 34½\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 33\" W × 34½\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "33\" W × 34½\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "3-Drawer Base",
      "Source product ID": "278",
      "Option name": "3DB33-PWMS-WH"
    }
  },
  "mb01-54": {
    "sourceUrl": "https://mb01.vanstro.ca/product/3-drawer-base-3db36-279",
    "sourceProductId": "279",
    "sourceProductName": "3-Drawer Base 3DB36",
    "sourceCategory": "3-Drawer Base",
    "description": "Dimensions: 36\" W × 34½\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 36\" W × 34½\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "36\" W × 34½\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "3-Drawer Base",
      "Source product ID": "279",
      "Option name": "3DB36-PWMS-WH"
    }
  },
  "mb01-6": {
    "sourceUrl": "https://mb01.vanstro.ca/product/base-cabinet-b12-252",
    "sourceProductId": "252",
    "sourceProductName": "Base Cabinet B12",
    "sourceCategory": "Base Cabinet",
    "description": "Dimensions: 12\" W × 34½\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 12\" W × 34½\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "12\" W × 34½\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Base Cabinet",
      "Source product ID": "252",
      "Option name": "B12-PWMS-WH"
    }
  },
  "mb01-2": {
    "sourceUrl": "https://mb01.vanstro.ca/product/base-cabinet-b15-253",
    "sourceProductId": "253",
    "sourceProductName": "Base Cabinet B15",
    "sourceCategory": "Base Cabinet",
    "description": "Dimensions: 15\" W × 34½\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 15\" W × 34½\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "15\" W × 34½\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Base Cabinet",
      "Source product ID": "253",
      "Option name": "B15-PWMS-WH"
    }
  },
  "mb01-4": {
    "sourceUrl": "https://mb01.vanstro.ca/product/base-cabinet-b18-254",
    "sourceProductId": "254",
    "sourceProductName": "Base Cabinet B18",
    "sourceCategory": "Base Cabinet",
    "description": "Dimensions: 18\" W × 34½\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 18\" W × 34½\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "18\" W × 34½\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Base Cabinet",
      "Source product ID": "254",
      "Option name": "B18-PWMS-WH"
    }
  },
  "mb01-18": {
    "sourceUrl": "https://mb01.vanstro.ca/product/base-cabinet-b21-265",
    "sourceProductId": "265",
    "sourceProductName": "Base Cabinet B21",
    "sourceCategory": "Base Cabinet",
    "description": "Dimensions: 21\" W × 34½\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 21\" W × 34½\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "21\" W × 34½\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Base Cabinet",
      "Source product ID": "265",
      "Option name": "B21-PWMS-WH"
    }
  },
  "mb01-20": {
    "sourceUrl": "https://mb01.vanstro.ca/product/base-cabinet-b24-266",
    "sourceProductId": "266",
    "sourceProductName": "Base Cabinet B24",
    "sourceCategory": "Base Cabinet",
    "description": "Dimensions: 24\" W × 34½\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 24\" W × 34½\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "24\" W × 34½\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Base Cabinet",
      "Source product ID": "266",
      "Option name": "B24-PWMS-WH"
    }
  },
  "mb01-22": {
    "sourceUrl": "https://mb01.vanstro.ca/product/base-cabinet-b27-267",
    "sourceProductId": "267",
    "sourceProductName": "Base Cabinet B27",
    "sourceCategory": "Base Cabinet",
    "description": "Dimensions: 27\" W × 34½\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 27\" W × 34½\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "27\" W × 34½\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Base Cabinet",
      "Source product ID": "267",
      "Option name": "B27-PWMS-WH"
    }
  },
  "mb01-24": {
    "sourceUrl": "https://mb01.vanstro.ca/product/base-cabinet-b30-268",
    "sourceProductId": "268",
    "sourceProductName": "Base Cabinet B30",
    "sourceCategory": "Base Cabinet",
    "description": "Dimensions: 30\" W × 34½\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 30\" W × 34½\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "30\" W × 34½\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Base Cabinet",
      "Source product ID": "268",
      "Option name": "B30-PWMS-WH"
    }
  },
  "mb01-26": {
    "sourceUrl": "https://mb01.vanstro.ca/product/base-cabinet-b33-269",
    "sourceProductId": "269",
    "sourceProductName": "Base Cabinet B33",
    "sourceCategory": "Base Cabinet",
    "description": "Dimensions: 33\" W × 34½\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 33\" W × 34½\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "33\" W × 34½\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Base Cabinet",
      "Source product ID": "269",
      "Option name": "B33-PWMS-WH"
    }
  },
  "mb01-28": {
    "sourceUrl": "https://mb01.vanstro.ca/product/base-cabinet-b36-270",
    "sourceProductId": "270",
    "sourceProductName": "Base Cabinet B36",
    "sourceCategory": "Base Cabinet",
    "description": "Dimensions: 36\" W × 34½\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 36\" W × 34½\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "36\" W × 34½\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Base Cabinet",
      "Source product ID": "270",
      "Option name": "B36-PWMS-WH"
    }
  },
  "mb01-31": {
    "sourceUrl": "https://mb01.vanstro.ca/product/base-cabinet-b42-271",
    "sourceProductId": "271",
    "sourceProductName": "Base Cabinet B42",
    "sourceCategory": "Base Cabinet",
    "description": "Dimensions: 42\" W × 34½\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 42\" W × 34½\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "42\" W × 34½\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Base Cabinet",
      "Source product ID": "271",
      "Option name": "B42-PWMS-WH"
    }
  },
  "mb01-248": {
    "sourceUrl": "https://mb01.vanstro.ca/product/base-end-panel-bep2535-381",
    "sourceProductId": "381",
    "sourceProductName": "Base End Panel BEP2535",
    "sourceCategory": "Accessories",
    "description": "Dimensions: 25\" W × 35\" H × ¾\"D MDF / Plywood Thermofoil Finish MDF Matte Soft-Touch",
    "productHighlights": [
      "Dimensions: 25\" W × 35\" H × ¾\"D",
      "MDF / Plywood Thermofoil Finish",
      "MDF Matte Soft-Touch"
    ],
    "specifications": {
      "Dimensions": "25\" W × 35\" H × ¾\"D",
      "Source category": "Accessories",
      "Source product ID": "381",
      "Option name": "BEP2535-MS-WH"
    }
  },
  "mb01-246": {
    "sourceUrl": "https://mb01.vanstro.ca/product/base-end-panel-vep2230-380",
    "sourceProductId": "380",
    "sourceProductName": "Base End Panel VEP2230",
    "sourceCategory": "Accessories",
    "description": "Dimensions: 22\" W × 30\" H × ¾\"D MDF / Plywood Thermofoil Finish MDF Matte Soft-Touch",
    "productHighlights": [
      "Dimensions: 22\" W × 30\" H × ¾\"D",
      "MDF / Plywood Thermofoil Finish",
      "MDF Matte Soft-Touch"
    ],
    "specifications": {
      "Dimensions": "22\" W × 30\" H × ¾\"D",
      "Source category": "Accessories",
      "Source product ID": "380",
      "Option name": "VEP2230-MS-WH"
    }
  },
  "mb01-299": {
    "sourceUrl": "https://mb01.vanstro.ca/product/CabinetPulls",
    "sourceProductId": "CabinetPulls",
    "sourceProductName": "Cabinet Pulls",
    "sourceCategory": "Accessories",
    "description": "Matte Black Center-to-Center: 192 mm Overall Length: 210 mm Projection: 23.2 mm Bar Width: 11.7 mm Bar Thickness: 5 mm Material: Aluminum Alloy",
    "productHighlights": [
      "Matte Black",
      "Center-to-Center: 192 mm",
      "Overall Length: 210 mm",
      "Projection: 23.2 mm",
      "Bar Width: 11.7 mm",
      "Bar Thickness: 5 mm",
      "Material: Aluminum Alloy"
    ],
    "specifications": {
      "Center-to-Center": "192 mm",
      "Overall Length": "210 mm",
      "Projection": "23.2 mm",
      "Bar Width": "11.7 mm",
      "Bar Thickness": "5 mm",
      "Material": "Aluminum Alloy",
      "Source category": "Accessories",
      "Source product ID": "CabinetPulls",
      "Option name": "CTC[96mm]"
    }
  },
  "mb01-231": {
    "sourceUrl": "https://mb01.vanstro.ca/product/decorative-moulding-bcm8-dcm-372",
    "sourceProductId": "372",
    "sourceProductName": "Decorative Moulding BCM8(DCM)",
    "sourceCategory": "Accessories",
    "description": "Dimensions: ¾\" W × 4⅜\" H × 96\" L MDF / Plywood Thermofoil Finish MDF Matte Soft-Touch",
    "productHighlights": [
      "Dimensions: ¾\" W × 4⅜\" H × 96\" L",
      "MDF / Plywood Thermofoil Finish",
      "MDF Matte Soft-Touch"
    ],
    "specifications": {
      "Dimensions": "¾\" W × 4⅜\" H × 96\" L",
      "Source category": "Accessories",
      "Source product ID": "372",
      "Option name": "BCM8(DCM)-MS-WH"
    }
  },
  "mb01-196": {
    "sourceUrl": "https://mb01.vanstro.ca/product/diagonal-corner-wall-dcw2430-343",
    "sourceProductId": "343",
    "sourceProductName": "Diagonal Corner Wall DCW2430",
    "sourceCategory": "Diagonal Corner Wall",
    "description": "Dimensions: 24×24\" W × 30\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 24×24\" W × 30\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "24×24\" W × 30\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Diagonal Corner Wall",
      "Source product ID": "343",
      "Option name": "DCW2430-PWMS-WH"
    }
  },
  "mb01-198": {
    "sourceUrl": "https://mb01.vanstro.ca/product/diagonal-corner-wall-dcw2436-344",
    "sourceProductId": "344",
    "sourceProductName": "Diagonal Corner Wall DCW2436",
    "sourceCategory": "Diagonal Corner Wall",
    "description": "Dimensions: 24×24\" W × 36\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 24×24\" W × 36\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "24×24\" W × 36\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Diagonal Corner Wall",
      "Source product ID": "344",
      "Option name": "DCW2436-PWMS-WH"
    }
  },
  "mb01-200": {
    "sourceUrl": "https://mb01.vanstro.ca/product/diagonal-corner-wall-dcw2442-345",
    "sourceProductId": "345",
    "sourceProductName": "Diagonal Corner Wall DCW2442",
    "sourceCategory": "Diagonal Corner Wall",
    "description": "Dimensions: 24×24\" W × 42\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 24×24\" W × 42\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "24×24\" W × 42\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Diagonal Corner Wall",
      "Source product ID": "345",
      "Option name": "DCW2442-PWMS-WH"
    }
  },
  "mb01-232": {
    "sourceUrl": "https://mb01.vanstro.ca/product/filler-f342-373",
    "sourceProductId": "373",
    "sourceProductName": "Filler F342",
    "sourceCategory": "Accessories",
    "description": "Dimensions: 3\" W × 42\" H × ¾\"D MDF / Plywood Thermofoil Finish MDF Matte Soft-Touch",
    "productHighlights": [
      "Dimensions: 3\" W × 42\" H × ¾\"D",
      "MDF / Plywood Thermofoil Finish",
      "MDF Matte Soft-Touch"
    ],
    "specifications": {
      "Dimensions": "3\" W × 42\" H × ¾\"D",
      "Source category": "Accessories",
      "Source product ID": "373",
      "Option name": "F342-MS-WH"
    }
  },
  "mb01-234": {
    "sourceUrl": "https://mb01.vanstro.ca/product/filler-f642-374",
    "sourceProductId": "374",
    "sourceProductName": "Filler F642",
    "sourceCategory": "Accessories",
    "description": "Dimensions: 6\" W × 42\" H × ¾\"D MDF / Plywood Thermofoil Finish MDF Matte Soft-Touch",
    "productHighlights": [
      "Dimensions: 6\" W × 42\" H × ¾\"D",
      "MDF / Plywood Thermofoil Finish",
      "MDF Matte Soft-Touch"
    ],
    "specifications": {
      "Dimensions": "6\" W × 42\" H × ¾\"D",
      "Source category": "Accessories",
      "Source product ID": "374",
      "Option name": "F642-MS-WH"
    }
  },
  "mb01-64": {
    "sourceUrl": "https://mb01.vanstro.ca/product/lazy-susan-base-lsb33-280",
    "sourceProductId": "280",
    "sourceProductName": "Lazy Susan Base LSB33",
    "sourceCategory": "Lazy Susan Base",
    "description": "Dimensions: 33\" W × 34½\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 33\" W × 34½\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "33\" W × 34½\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Lazy Susan Base",
      "Source product ID": "280",
      "Option name": "LSB33-W-PWMS-WH"
    }
  },
  "mb01-66": {
    "sourceUrl": "https://mb01.vanstro.ca/product/lazy-susan-base-lsb36-281",
    "sourceProductId": "281",
    "sourceProductName": "Lazy Susan Base LSB36",
    "sourceCategory": "Lazy Susan Base",
    "description": "Dimensions: 36\" W × 34½\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 36\" W × 34½\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "36\" W × 34½\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Lazy Susan Base",
      "Source product ID": "281",
      "Option name": "LSB36-W-PWMS-WH"
    }
  },
  "mb01-202": {
    "sourceUrl": "https://mb01.vanstro.ca/product/microwave-cabinet-mo3030-346",
    "sourceProductId": "346",
    "sourceProductName": "Microwave Cabinet MO3030",
    "sourceCategory": "Microwave Cabinet",
    "description": "Dimensions: 30\" W × 30\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 30\" W × 30\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "30\" W × 30\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Microwave Cabinet",
      "Source product ID": "346",
      "Option name": "MO3030-PWMS-WH"
    }
  },
  "mb01-204": {
    "sourceUrl": "https://mb01.vanstro.ca/product/microwave-cabinet-mo3036-347",
    "sourceProductId": "347",
    "sourceProductName": "Microwave Cabinet MO3036",
    "sourceCategory": "Microwave Cabinet",
    "description": "Dimensions: 30\" W × 36\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 30\" W × 36\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "30\" W × 36\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Microwave Cabinet",
      "Source product ID": "347",
      "Option name": "MO3036-PWMS-WH"
    }
  },
  "mb01-206": {
    "sourceUrl": "https://mb01.vanstro.ca/product/microwave-cabinet-mo3042-348",
    "sourceProductId": "348",
    "sourceProductName": "Microwave Cabinet MO3042",
    "sourceCategory": "Microwave Cabinet",
    "description": "Dimensions: 30\" W × 42\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 30\" W × 42\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "30\" W × 42\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Microwave Cabinet",
      "Source product ID": "348",
      "Option name": "MO3042-PWMS-WH"
    }
  },
  "mb01-208": {
    "sourceUrl": "https://mb01.vanstro.ca/product/open-end-shelf-oe630-349",
    "sourceProductId": "349",
    "sourceProductName": "Open End Shelf OE630",
    "sourceCategory": "Open End Shelf",
    "description": "Dimensions: 6\" W × 30\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 6\" W × 30\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "6\" W × 30\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Open End Shelf",
      "Source product ID": "349",
      "Option name": "OE630-PWMS-WH"
    }
  },
  "mb01-210": {
    "sourceUrl": "https://mb01.vanstro.ca/product/open-end-shelf-oe636-350",
    "sourceProductId": "350",
    "sourceProductName": "Open End Shelf OE636",
    "sourceCategory": "Open End Shelf",
    "description": "Dimensions: 6\" W × 36\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 6\" W × 36\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "6\" W × 36\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Open End Shelf",
      "Source product ID": "350",
      "Option name": "OE636-PWMS-WH"
    }
  },
  "mb01-170": {
    "sourceUrl": "https://mb01.vanstro.ca/product/open-end-shelf-oe642-351",
    "sourceProductId": "351",
    "sourceProductName": "Open End Shelf OE642",
    "sourceCategory": "Open End Shelf",
    "description": "Dimensions: 6\" W × 42\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 6\" W × 42\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "6\" W × 42\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Open End Shelf",
      "Source product ID": "351",
      "Option name": "OE642-PWMS-WH"
    }
  },
  "mb01-56": {
    "sourceUrl": "https://mb01.vanstro.ca/product/oven-tall-cabinet-o308424-361",
    "sourceProductId": "361",
    "sourceProductName": "Oven Tall Cabinet O308424",
    "sourceCategory": "Oven Tall Cabinet",
    "description": "Dimensions: 30\" W × 84\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 30\" W × 84\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "30\" W × 84\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Oven Tall Cabinet",
      "Source product ID": "361",
      "Option name": "O308424-PWMS-WH"
    }
  },
  "mb01-58": {
    "sourceUrl": "https://mb01.vanstro.ca/product/oven-tall-cabinet-o309024-362",
    "sourceProductId": "362",
    "sourceProductName": "Oven Tall Cabinet O309024",
    "sourceCategory": "Oven Tall Cabinet",
    "description": "Dimensions: 30\" W × 90\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 30\" W × 90\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "30\" W × 90\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Oven Tall Cabinet",
      "Source product ID": "362",
      "Option name": "O309024-PWMS-WH"
    }
  },
  "mb01-60": {
    "sourceUrl": "https://mb01.vanstro.ca/product/oven-tall-cabinet-o309624-363",
    "sourceProductId": "363",
    "sourceProductName": "Oven Tall Cabinet O309624",
    "sourceCategory": "Oven Tall Cabinet",
    "description": "Dimensions: 30\" W × 96\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 30\" W × 96\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "30\" W × 96\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Oven Tall Cabinet",
      "Source product ID": "363",
      "Option name": "O309624-PWMS-WH"
    }
  },
  "mb01-62": {
    "sourceUrl": "https://mb01.vanstro.ca/product/oven-tall-cabinet-o338424-364",
    "sourceProductId": "364",
    "sourceProductName": "Oven Tall Cabinet O338424",
    "sourceCategory": "Oven Tall Cabinet",
    "description": "Dimensions: 33\" W × 84\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 33\" W × 84\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "33\" W × 84\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Oven Tall Cabinet",
      "Source product ID": "364",
      "Option name": "O338424-PWMS-WH"
    }
  },
  "mb01-68": {
    "sourceUrl": "https://mb01.vanstro.ca/product/oven-tall-cabinet-o339024-365",
    "sourceProductId": "365",
    "sourceProductName": "Oven Tall Cabinet O339024",
    "sourceCategory": "Oven Tall Cabinet",
    "description": "Dimensions: 33\" W × 90\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 33\" W × 90\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "33\" W × 90\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Oven Tall Cabinet",
      "Source product ID": "365",
      "Option name": "O339024-PWMS-WH"
    }
  },
  "mb01-168": {
    "sourceUrl": "https://mb01.vanstro.ca/product/tall-cabinet-o339624-366",
    "sourceProductId": "366",
    "sourceProductName": "Oven Tall Cabinet O339624",
    "sourceCategory": "Oven Tall Cabinet",
    "description": "Dimensions: 33\" W × 96\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 33\" W × 96\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "33\" W × 96\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Oven Tall Cabinet",
      "Source product ID": "366",
      "Option name": "O339624-PWMS-WH"
    }
  },
  "mb01-222": {
    "sourceUrl": "https://mb01.vanstro.ca/product/sink-base-sb30-368",
    "sourceProductId": "368",
    "sourceProductName": "Sink Base SB30",
    "sourceCategory": "Sink Base",
    "description": "Dimensions: 30\" W × 34½\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 30\" W × 34½\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "30\" W × 34½\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Sink Base",
      "Source product ID": "368",
      "Option name": "SB30-PWMS-WH"
    }
  },
  "mb01-224": {
    "sourceUrl": "https://mb01.vanstro.ca/product/sink-base-sb33-369",
    "sourceProductId": "369",
    "sourceProductName": "Sink Base SB33",
    "sourceCategory": "Sink Base",
    "description": "Dimensions: 33\" W × 34½\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 33\" W × 34½\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "33\" W × 34½\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Sink Base",
      "Source product ID": "369",
      "Option name": "SB33-PWMS-WH"
    }
  },
  "mb01-226": {
    "sourceUrl": "https://mb01.vanstro.ca/product/sink-base-sb36-370",
    "sourceProductId": "370",
    "sourceProductName": "Sink Base SB36",
    "sourceCategory": "Sink Base",
    "description": "Dimensions: 36\" W × 34½\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 36\" W × 34½\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "36\" W × 34½\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Sink Base",
      "Source product ID": "370",
      "Option name": "SB36-PWMS-WH"
    }
  },
  "mb01-70": {
    "sourceUrl": "https://mb01.vanstro.ca/product/lazy-susan-base-spb9-282",
    "sourceProductId": "282",
    "sourceProductName": "SPB9",
    "sourceCategory": "Base Cabinet",
    "description": "Dimensions: 9\" W × 34½\" H × 24\" D Carcass/Cabinet Body: ¾\" Plywood (18mm) Double-Sided Melamine Door Material: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 9\" W × 34½\" H × 24\" D",
      "Carcass/Cabinet Body: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door Material: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "9\" W × 34½\" H × 24\" D",
      "Carcass/Cabinet Body": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door Material": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Base Cabinet",
      "Source product ID": "282",
      "Option name": "SPB9-PWMS-WH"
    }
  },
  "mb01-212": {
    "sourceUrl": "https://mb01.vanstro.ca/product/tall-cabinet-u188424-352",
    "sourceProductId": "352",
    "sourceProductName": "Tall Cabinet U188424",
    "sourceCategory": "Tall Cabinet",
    "description": "Dimensions: 18\" W × 84\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 18\" W × 84\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "18\" W × 84\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Tall Cabinet",
      "Source product ID": "352",
      "Option name": "U188424-PWMS-WH"
    }
  },
  "mb01-214": {
    "sourceUrl": "https://mb01.vanstro.ca/product/tall-cabinet-u189024-353",
    "sourceProductId": "353",
    "sourceProductName": "Tall Cabinet U189024",
    "sourceCategory": "Tall Cabinet",
    "description": "Dimensions: 18\" W × 90\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 18\" W × 90\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "18\" W × 90\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Tall Cabinet",
      "Source product ID": "353",
      "Option name": "U189024-PWMS-WH"
    }
  },
  "mb01-216": {
    "sourceUrl": "https://mb01.vanstro.ca/product/tall-cabinet-u189624-354",
    "sourceProductId": "354",
    "sourceProductName": "Tall Cabinet U189624",
    "sourceCategory": "Tall Cabinet",
    "description": "Dimensions: 18\" W × 96\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 18\" W × 96\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "18\" W × 96\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Tall Cabinet",
      "Source product ID": "354",
      "Option name": "U189624-PWMS-WH"
    }
  },
  "mb01-218": {
    "sourceUrl": "https://mb01.vanstro.ca/product/tall-cabinet-u248424-355",
    "sourceProductId": "355",
    "sourceProductName": "Tall Cabinet U248424",
    "sourceCategory": "Tall Cabinet",
    "description": "Dimensions: 24\" W × 84\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 24\" W × 84\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "24\" W × 84\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Tall Cabinet",
      "Source product ID": "355",
      "Option name": "U248424-PWMS-WH"
    }
  },
  "mb01-220": {
    "sourceUrl": "https://mb01.vanstro.ca/product/tall-cabinet-u249024-356",
    "sourceProductId": "356",
    "sourceProductName": "Tall Cabinet U249024",
    "sourceCategory": "Tall Cabinet",
    "description": "Dimensions: 24\" W × 90\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 24\" W × 90\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "24\" W × 90\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Tall Cabinet",
      "Source product ID": "356",
      "Option name": "U249024-PWMS-WH"
    }
  },
  "mb01-36": {
    "sourceUrl": "https://mb01.vanstro.ca/product/tall-cabinet-u249624-357",
    "sourceProductId": "357",
    "sourceProductName": "Tall Cabinet U249624",
    "sourceCategory": "Tall Cabinet",
    "description": "Dimensions: 24\" W × 96\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 24\" W × 96\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "24\" W × 96\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Tall Cabinet",
      "Source product ID": "357",
      "Option name": "U249624-PWMS-WH"
    }
  },
  "mb01-34": {
    "sourceUrl": "https://mb01.vanstro.ca/product/tall-cabinet-u308424-358",
    "sourceProductId": "358",
    "sourceProductName": "Tall Cabinet U308424",
    "sourceCategory": "Tall Cabinet",
    "description": "Dimensions: 30\" W × 84\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 30\" W × 84\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "30\" W × 84\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Tall Cabinet",
      "Source product ID": "358",
      "Option name": "U308424-PWMS-WH"
    }
  },
  "mb01-38": {
    "sourceUrl": "https://mb01.vanstro.ca/product/tall-cabinet-u309024-359",
    "sourceProductId": "359",
    "sourceProductName": "Tall Cabinet U309024",
    "sourceCategory": "Tall Cabinet",
    "description": "Dimensions: 30\" W × 90\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 30\" W × 90\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "30\" W × 90\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Tall Cabinet",
      "Source product ID": "359",
      "Option name": "U309024-PWMS-WH"
    }
  },
  "mb01-32": {
    "sourceUrl": "https://mb01.vanstro.ca/product/tall-cabinet-u309624-360",
    "sourceProductId": "360",
    "sourceProductName": "Tall Cabinet U309624",
    "sourceCategory": "Tall Cabinet",
    "description": "Dimensions: 30\" W × 96\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 30\" W × 96\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "30\" W × 96\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Tall Cabinet",
      "Source product ID": "360",
      "Option name": "U309624-PWMS-WH"
    }
  },
  "mb01-250": {
    "sourceUrl": "https://mb01.vanstro.ca/product/tall-end-panel-tep2596-382",
    "sourceProductId": "382",
    "sourceProductName": "Tall End Panel TEP2596",
    "sourceCategory": "Accessories",
    "description": "Dimensions: 25\" W × 96\" H × ¾\"D MDF / Plywood Thermofoil Finish MDF Matte Soft-Touch",
    "productHighlights": [
      "Dimensions: 25\" W × 96\" H × ¾\"D",
      "MDF / Plywood Thermofoil Finish",
      "MDF Matte Soft-Touch"
    ],
    "specifications": {
      "Dimensions": "25\" W × 96\" H × ¾\"D",
      "Source category": "Accessories",
      "Source product ID": "382",
      "Option name": "TEP2596-MS-WH"
    }
  },
  "mb01-252": {
    "sourceUrl": "https://mb01.vanstro.ca/product/tall-end-panel-tep3596-383",
    "sourceProductId": "383",
    "sourceProductName": "Tall End Panel TEP3596",
    "sourceCategory": "Accessories",
    "description": "Dimensions: 35\" W × 96\" H × ¾\"D MDF / Plywood Thermofoil Finish MDF Matte Soft-Touch",
    "productHighlights": [
      "Dimensions: 35\" W × 96\" H × ¾\"D",
      "MDF / Plywood Thermofoil Finish",
      "MDF Matte Soft-Touch"
    ],
    "specifications": {
      "Dimensions": "35\" W × 96\" H × ¾\"D",
      "Source category": "Accessories",
      "Source product ID": "383",
      "Option name": "TEP3596-MS-WH"
    }
  },
  "mb01-236": {
    "sourceUrl": "https://mb01.vanstro.ca/product/tall-filler-f396-375",
    "sourceProductId": "375",
    "sourceProductName": "Tall Filler F396",
    "sourceCategory": "Accessories",
    "description": "Dimensions: 3\" W × 96\" H × ¾\"D MDF / Plywood Thermofoil Finish MDF Matte Soft-Touch",
    "productHighlights": [
      "Dimensions: 3\" W × 96\" H × ¾\"D",
      "MDF / Plywood Thermofoil Finish",
      "MDF Matte Soft-Touch"
    ],
    "specifications": {
      "Dimensions": "3\" W × 96\" H × ¾\"D",
      "Source category": "Accessories",
      "Source product ID": "375",
      "Option name": "F396-MS-WH"
    }
  },
  "mb01-238": {
    "sourceUrl": "https://mb01.vanstro.ca/product/tall-filler-f696-376",
    "sourceProductId": "376",
    "sourceProductName": "Tall Filler F696",
    "sourceCategory": "Accessories",
    "description": "Dimensions: 6\" W × 96\" H × ¾\"D MDF / Plywood Thermofoil Finish MDF Matte Soft-Touch",
    "productHighlights": [
      "Dimensions: 6\" W × 96\" H × ¾\"D",
      "MDF / Plywood Thermofoil Finish",
      "MDF Matte Soft-Touch"
    ],
    "specifications": {
      "Dimensions": "6\" W × 96\" H × ¾\"D",
      "Source category": "Accessories",
      "Source product ID": "376",
      "Option name": "F696-MS-WH"
    }
  },
  "mb01-228": {
    "sourceUrl": "https://mb01.vanstro.ca/product/toe-kick-tkc-ms-371",
    "sourceProductId": "371",
    "sourceProductName": "Toe Kick TKC-MS",
    "sourceCategory": "Accessories",
    "description": "Dimensions: ¾\" W × 4½\" H × 96\" L MDF / Plywood Thermofoil Finish MDF Matte Soft-Touch",
    "productHighlights": [
      "Dimensions: ¾\" W × 4½\" H × 96\" L",
      "MDF / Plywood Thermofoil Finish",
      "MDF Matte Soft-Touch"
    ],
    "specifications": {
      "Dimensions": "¾\" W × 4½\" H × 96\" L",
      "Source category": "Accessories",
      "Source product ID": "371",
      "Option name": "TKC-MS-WH"
    }
  },
  "mb01-172": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-gd-w1530gd-331",
    "sourceProductId": "331",
    "sourceProductName": "Wall Cabinet (GD)W1530GD",
    "sourceCategory": "Wall Cabinet (GD)",
    "description": "Dimensions: 15\" W × 30\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 15\" W × 30\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "15\" W × 30\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet (GD)",
      "Source product ID": "331",
      "Option name": "W1530GD-PWMS-WH"
    }
  },
  "mb01-174": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-gd-w1536gd-332",
    "sourceProductId": "332",
    "sourceProductName": "Wall Cabinet (GD)W1536GD",
    "sourceCategory": "Wall Cabinet (GD)",
    "description": "Dimensions: 15\" W × 36\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 15\" W × 36\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "15\" W × 36\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet (GD)",
      "Source product ID": "332",
      "Option name": "W1536GD-PWMS-WH"
    }
  },
  "mb01-176": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-gd-w1542gd-333",
    "sourceProductId": "333",
    "sourceProductName": "Wall Cabinet (GD)W1542GD",
    "sourceCategory": "Wall Cabinet (GD)",
    "description": "Dimensions: 15\" W × 42\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 15\" W × 42\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "15\" W × 42\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet (GD)",
      "Source product ID": "333",
      "Option name": "W1542GD-PWMS-WH"
    }
  },
  "mb01-178": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-gd-w1830gd-334",
    "sourceProductId": "334",
    "sourceProductName": "Wall Cabinet (GD)W1830GD",
    "sourceCategory": "Wall Cabinet (GD)",
    "description": "Dimensions: 18\" W × 30\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 18\" W × 30\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "18\" W × 30\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet (GD)",
      "Source product ID": "334",
      "Option name": "W1830GD-PWMS-WH"
    }
  },
  "mb01-180": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-gd-w1836gd-335",
    "sourceProductId": "335",
    "sourceProductName": "Wall Cabinet (GD)W1836GD",
    "sourceCategory": "Wall Cabinet (GD)",
    "description": "Dimensions: 18\" W × 36\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 18\" W × 36\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "18\" W × 36\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet (GD)",
      "Source product ID": "335",
      "Option name": "W1836GD-PWMS-WH"
    }
  },
  "mb01-182": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-gd-w1842gd-336",
    "sourceProductId": "336",
    "sourceProductName": "Wall Cabinet (GD)W1842GD",
    "sourceCategory": "Wall Cabinet (GD)",
    "description": "Dimensions: 18\" W × 42\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 18\" W × 42\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "18\" W × 42\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet (GD)",
      "Source product ID": "336",
      "Option name": "W1842GD-PWMS-WH"
    }
  },
  "mb01-184": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-gd-w2430gd-337",
    "sourceProductId": "337",
    "sourceProductName": "Wall Cabinet (GD)W2430GD",
    "sourceCategory": "Wall Cabinet (GD)",
    "description": "Dimensions: 24\" W × 30\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 24\" W × 30\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "24\" W × 30\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet (GD)",
      "Source product ID": "337",
      "Option name": "W2430GD-PWMS-WH"
    }
  },
  "mb01-186": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-gd-w2436gd-338",
    "sourceProductId": "338",
    "sourceProductName": "Wall Cabinet (GD)W2436GD",
    "sourceCategory": "Wall Cabinet (GD)",
    "description": "Dimensions: 24\" W × 36\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 24\" W × 36\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "24\" W × 36\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet (GD)",
      "Source product ID": "338",
      "Option name": "W2436GD-PWMS-WH"
    }
  },
  "mb01-188": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-gd-w2442gd-339",
    "sourceProductId": "339",
    "sourceProductName": "Wall Cabinet (GD)W2442GD",
    "sourceCategory": "Wall Cabinet (GD)",
    "description": "Dimensions: 24\" W × 42\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 24\" W × 42\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "24\" W × 42\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet (GD)",
      "Source product ID": "339",
      "Option name": "W2442GD-PWMS-WH"
    }
  },
  "mb01-190": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-gd-w3030gd-340",
    "sourceProductId": "340",
    "sourceProductName": "Wall Cabinet (GD)W3030GD",
    "sourceCategory": "Wall Cabinet (GD)",
    "description": "Dimensions: 30\" W × 30\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 30\" W × 30\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "30\" W × 30\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet (GD)",
      "Source product ID": "340",
      "Option name": "W3030GD-PWMS-WH"
    }
  },
  "mb01-192": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-gd-w3036gd-341",
    "sourceProductId": "341",
    "sourceProductName": "Wall Cabinet (GD)W3036GD",
    "sourceCategory": "Wall Cabinet (GD)",
    "description": "Dimensions: 30\" W × 36\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 30\" W × 36\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "30\" W × 36\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet (GD)",
      "Source product ID": "341",
      "Option name": "W3036GD-PWMS-WH"
    }
  },
  "mb01-194": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-gd-w3042gd-342",
    "sourceProductId": "342",
    "sourceProductName": "Wall Cabinet (GD)W3042GD",
    "sourceCategory": "Wall Cabinet (GD)",
    "description": "Dimensions: 30\" W × 42\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 30\" W × 42\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "30\" W × 42\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet (GD)",
      "Source product ID": "342",
      "Option name": "W3042GD-PWMS-WH"
    }
  },
  "mb01-72": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w0930-283",
    "sourceProductId": "283",
    "sourceProductName": "Wall Cabinet W0930",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 9\" W × 30\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 9\" W × 30\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "9\" W × 30\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "283",
      "Option name": "W0930-PWMS-WH"
    }
  },
  "mb01-74": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w0936-284",
    "sourceProductId": "284",
    "sourceProductName": "Wall Cabinet W0936",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 9\" W × 36\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 9\" W × 36\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "9\" W × 36\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "284",
      "Option name": "W0936-PWMS-WH"
    }
  },
  "mb01-76": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w0942-285",
    "sourceProductId": "285",
    "sourceProductName": "Wall Cabinet W0942",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 9\" W × 42\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 9\" W × 42\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "9\" W × 42\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "285",
      "Option name": "W0942-PWMS-WH"
    }
  },
  "mb01-78": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w1230-286",
    "sourceProductId": "286",
    "sourceProductName": "Wall Cabinet W1230",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 12\" W × 30\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 12\" W × 30\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "12\" W × 30\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "286",
      "Option name": "W1230-PWMS-WH"
    }
  },
  "mb01-80": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w1236-287",
    "sourceProductId": "287",
    "sourceProductName": "Wall Cabinet W1236",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 12\" W × 36\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 12\" W × 36\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "12\" W × 36\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "287",
      "Option name": "W1236-PWMS-WH"
    }
  },
  "mb01-82": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w1242-288",
    "sourceProductId": "288",
    "sourceProductName": "Wall Cabinet W1242",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 12\" W × 42\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 12\" W × 42\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "12\" W × 42\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "288",
      "Option name": "W1242-PWMS-WH"
    }
  },
  "mb01-84": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w1530-289",
    "sourceProductId": "289",
    "sourceProductName": "Wall Cabinet W1530",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 15\" W × 30\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 15\" W × 30\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "15\" W × 30\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "289",
      "Option name": "W1530-PWMS-WH"
    }
  },
  "mb01-86": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w1536-290",
    "sourceProductId": "290",
    "sourceProductName": "Wall Cabinet W1536",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 15\" W × 36\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 15\" W × 36\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "15\" W × 36\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "290",
      "Option name": "W1536-PWMS-WH"
    }
  },
  "mb01-88": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w1542-291",
    "sourceProductId": "291",
    "sourceProductName": "Wall Cabinet W1542",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 15\" W × 42\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 15\" W × 42\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "15\" W × 42\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "291",
      "Option name": "W1542-PWMS-WH"
    }
  },
  "mb01-90": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w1830-292",
    "sourceProductId": "292",
    "sourceProductName": "Wall Cabinet W1830",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 18\" W × 30\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 18\" W × 30\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "18\" W × 30\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "292",
      "Option name": "W1830-PWMS-WH"
    }
  },
  "mb01-92": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w1836-293",
    "sourceProductId": "293",
    "sourceProductName": "Wall Cabinet W1836",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 18\" W × 36\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 18\" W × 36\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "18\" W × 36\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "293",
      "Option name": "W1836-PWMS-WH"
    }
  },
  "mb01-94": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w1842-294",
    "sourceProductId": "294",
    "sourceProductName": "Wall Cabinet W1842",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 18\" W × 42\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 18\" W × 42\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "18\" W × 42\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "294",
      "Option name": "W1842-PWMS-WH"
    }
  },
  "mb01-96": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w2130-295",
    "sourceProductId": "295",
    "sourceProductName": "Wall Cabinet W2130",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 21\" W × 30\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 21\" W × 30\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "21\" W × 30\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "295",
      "Option name": "W2130-PWMS-WH"
    }
  },
  "mb01-98": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w2136-296",
    "sourceProductId": "296",
    "sourceProductName": "Wall Cabinet W2136",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 21\" W × 36\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 21\" W × 36\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "21\" W × 36\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "296",
      "Option name": "W2136-PWMS-WH"
    }
  },
  "mb01-100": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w2142-297",
    "sourceProductId": "297",
    "sourceProductName": "Wall Cabinet W2142",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 21\" W × 42\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 21\" W × 42\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "21\" W × 42\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "297",
      "Option name": "W2142-PWMS-WH"
    }
  },
  "mb01-102": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w2430-298",
    "sourceProductId": "298",
    "sourceProductName": "Wall Cabinet W2430",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 24\" W × 30\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 24\" W × 30\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "24\" W × 30\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "298",
      "Option name": "W2430-PWMS-WH"
    }
  },
  "mb01-104": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w2436-299",
    "sourceProductId": "299",
    "sourceProductName": "Wall Cabinet W2436",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 24\" W × 36\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 24\" W × 36\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "24\" W × 36\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "299",
      "Option name": "W2436-PWMS-WH"
    }
  },
  "mb01-106": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w2442-300",
    "sourceProductId": "300",
    "sourceProductName": "Wall Cabinet W2442",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 24\" W × 42\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 24\" W × 42\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "24\" W × 42\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "300",
      "Option name": "W2442-PWMS-WH"
    }
  },
  "mb01-108": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w2730-301",
    "sourceProductId": "301",
    "sourceProductName": "Wall Cabinet W2730",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 27\" W × 30\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 27\" W × 30\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "27\" W × 30\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "301",
      "Option name": "W2730-PWMS-WH"
    }
  },
  "mb01-110": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w2736-302",
    "sourceProductId": "302",
    "sourceProductName": "Wall Cabinet W2736",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 27\" W × 36\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 27\" W × 36\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "27\" W × 36\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "302",
      "Option name": "W2736-PWMS-WH"
    }
  },
  "mb01-112": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w2742-303",
    "sourceProductId": "303",
    "sourceProductName": "Wall Cabinet W2742",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 27\" W × 42\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 27\" W × 42\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "27\" W × 42\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "303",
      "Option name": "W2742-PWMS-WH"
    }
  },
  "mb01-114": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w3012-304",
    "sourceProductId": "304",
    "sourceProductName": "Wall Cabinet W3012",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 30\" W × 12\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 30\" W × 12\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "30\" W × 12\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "304",
      "Option name": "W3012-PWMS-WH"
    }
  },
  "mb01-116": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w301224-305",
    "sourceProductId": "305",
    "sourceProductName": "Wall Cabinet W301224",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 30\" W × 12\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 30\" W × 12\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "30\" W × 12\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "305",
      "Option name": "W301224-PWMS-WH"
    }
  },
  "mb01-118": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w301524-306",
    "sourceProductId": "306",
    "sourceProductName": "Wall Cabinet W301524",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 30\" W × 15\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 30\" W × 15\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "30\" W × 15\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "306",
      "Option name": "W301524-PWMS-WH"
    }
  },
  "mb01-120": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w3018-307",
    "sourceProductId": "307",
    "sourceProductName": "Wall Cabinet W3018",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 30\" W × 18\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 30\" W × 18\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "30\" W × 18\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "307",
      "Option name": "W3018-PWMS-WH"
    }
  },
  "mb01-122": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w301824-308",
    "sourceProductId": "308",
    "sourceProductName": "Wall Cabinet W301824",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 30\" W × 18\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 30\" W × 18\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "30\" W × 18\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "308",
      "Option name": "W301824-PWMS-WH"
    }
  },
  "mb01-124": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w3024-309",
    "sourceProductId": "309",
    "sourceProductName": "Wall Cabinet W3024",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 30\" W × 24\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 30\" W × 24\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "30\" W × 24\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "309",
      "Option name": "W3024-PWMS-WH"
    }
  },
  "mb01-126": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w302424-310",
    "sourceProductId": "310",
    "sourceProductName": "Wall Cabinet W302424",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 30\" W × 24\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 30\" W × 24\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "30\" W × 24\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "310",
      "Option name": "W302424-PWMS-WH"
    }
  },
  "mb01-128": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w3030-311",
    "sourceProductId": "311",
    "sourceProductName": "Wall Cabinet W3030",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 30\" W × 30\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 30\" W × 30\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "30\" W × 30\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "311",
      "Option name": "W3030-PWMS-WH"
    }
  },
  "mb01-130": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w3036-312",
    "sourceProductId": "312",
    "sourceProductName": "Wall Cabinet W3036",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 30\" W × 36\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 30\" W × 36\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "30\" W × 36\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "312",
      "Option name": "W3036-PWMS-WH"
    }
  },
  "mb01-132": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w3042-313",
    "sourceProductId": "313",
    "sourceProductName": "Wall Cabinet W3042",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 30\" W × 42\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 30\" W × 42\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "30\" W × 42\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "313",
      "Option name": "W3042-PWMS-WH"
    }
  },
  "mb01-134": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w331224-314",
    "sourceProductId": "314",
    "sourceProductName": "Wall Cabinet W331224",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 33\" W × 12\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 33\" W × 12\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "33\" W × 12\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "314",
      "Option name": "W331224-PWMS-WH"
    }
  },
  "mb01-136": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w331524-315",
    "sourceProductId": "315",
    "sourceProductName": "Wall Cabinet W331524",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 33\" W × 15\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 33\" W × 15\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "33\" W × 15\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "315",
      "Option name": "W331524-PWMS-WH"
    }
  },
  "mb01-138": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w331824-316",
    "sourceProductId": "316",
    "sourceProductName": "Wall Cabinet W331824",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 33\" W × 18\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 33\" W × 18\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "33\" W × 18\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "316",
      "Option name": "W331824-PWMS-WH"
    }
  },
  "mb01-140": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w3324-317",
    "sourceProductId": "317",
    "sourceProductName": "Wall Cabinet W3324",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 33\" W × 24\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 33\" W × 24\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "33\" W × 24\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "317",
      "Option name": "W3324-PWMS-WH"
    }
  },
  "mb01-142": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w332424-318",
    "sourceProductId": "318",
    "sourceProductName": "Wall Cabinet W332424",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 33\" W × 24\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 33\" W × 24\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "33\" W × 24\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "318",
      "Option name": "W332424-PWMS-WH"
    }
  },
  "mb01-144": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w3330-319",
    "sourceProductId": "319",
    "sourceProductName": "Wall Cabinet W3330",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 33\" W × 30\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 33\" W × 30\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "33\" W × 30\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "319",
      "Option name": "W3330-PWMS-WH"
    }
  },
  "mb01-146": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w3336-320",
    "sourceProductId": "320",
    "sourceProductName": "Wall Cabinet W3336",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 33\" W × 36\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 33\" W × 36\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "33\" W × 36\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "320",
      "Option name": "W3336-PWMS-WH"
    }
  },
  "mb01-148": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w3342-321",
    "sourceProductId": "321",
    "sourceProductName": "Wall Cabinet W3342",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 33\" W × 42\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 33\" W × 42\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "33\" W × 42\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "321",
      "Option name": "W3342-PWMS-WH"
    }
  },
  "mb01-150": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w361224-322",
    "sourceProductId": "322",
    "sourceProductName": "Wall Cabinet W361224",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 36\" W × 12\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 36\" W × 12\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "36\" W × 12\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "322",
      "Option name": "W361224-PWMS-WH"
    }
  },
  "mb01-152": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w361524-323",
    "sourceProductId": "323",
    "sourceProductName": "Wall Cabinet W361524",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 36\" W × 15\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 36\" W × 15\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "36\" W × 15\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "323",
      "Option name": "W361524-PWMS-WH"
    }
  },
  "mb01-154": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w361824-324",
    "sourceProductId": "324",
    "sourceProductName": "Wall Cabinet W361824",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 36\" W × 18\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 36\" W × 18\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "36\" W × 18\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "324",
      "Option name": "W361824-PWMS-WH"
    }
  },
  "mb01-156": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w3624-325",
    "sourceProductId": "325",
    "sourceProductName": "Wall Cabinet W3624",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 36\" W × 24\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 36\" W × 24\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "36\" W × 24\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "325",
      "Option name": "W3624-PWMS-WH"
    }
  },
  "mb01-158": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w362424-326",
    "sourceProductId": "326",
    "sourceProductName": "Wall Cabinet W362424",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 36\" W × 24\" H × 24\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 36\" W × 24\" H × 24\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "36\" W × 24\" H × 24\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "326",
      "Option name": "W362424-PWMS-WH"
    }
  },
  "mb01-160": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w3630-327",
    "sourceProductId": "327",
    "sourceProductName": "Wall Cabinet W3630",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 36\" W × 30\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 36\" W × 30\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "36\" W × 30\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "327",
      "Option name": "W3630-PWMS-WH"
    }
  },
  "mb01-162": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w3636-328",
    "sourceProductId": "328",
    "sourceProductName": "Wall Cabinet W3636",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 36\" W × 36\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 36\" W × 36\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "36\" W × 36\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "328",
      "Option name": "W3636-PWMS-WH"
    }
  },
  "mb01-164": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w3642-329",
    "sourceProductId": "329",
    "sourceProductName": "Wall Cabinet W3642",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 36\" W × 42\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 36\" W × 42\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "36\" W × 42\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "329",
      "Option name": "W3642-PWMS-WH"
    }
  },
  "mb01-166": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-cabinet-w3930-330",
    "sourceProductId": "330",
    "sourceProductName": "Wall Cabinet W3930",
    "sourceCategory": "Wall Cabinet",
    "description": "Dimensions: 39\" W × 30\" H × 12\" D Carcass: ¾\" Plywood (18mm) Double-Sided Melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 39\" W × 30\" H × 12\" D",
      "Carcass: ¾\" Plywood (18mm) Double-Sided Melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "39\" W × 30\" H × 12\" D",
      "Carcass": "¾\" Plywood (18mm) Double-Sided Melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Wall Cabinet",
      "Source product ID": "330",
      "Option name": "W3930-PWMS-WH"
    }
  },
  "mb01-240": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-end-panel-wep1230-377",
    "sourceProductId": "377",
    "sourceProductName": "Wall End Panel WEP1230",
    "sourceCategory": "Accessories",
    "description": "Dimensions: 12¾\"W × 30\" H × ¾\"D MDF / Plywood Thermofoil Finish MDF Matte Soft-Touch",
    "productHighlights": [
      "Dimensions: 12¾\"W × 30\" H × ¾\"D",
      "MDF / Plywood Thermofoil Finish",
      "MDF Matte Soft-Touch"
    ],
    "specifications": {
      "Dimensions": "12¾\"W × 30\" H × ¾\"D",
      "Source category": "Accessories",
      "Source product ID": "377",
      "Option name": "WEP1230-MS-WH"
    }
  },
  "mb01-242": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-end-panel-wep1236-378",
    "sourceProductId": "378",
    "sourceProductName": "Wall End Panel WEP1236",
    "sourceCategory": "Accessories",
    "description": "Dimensions: 12¾\"W × 36\" H × ¾\"D MDF / Plywood Thermofoil Finish MDF Matte Soft-Touch",
    "productHighlights": [
      "Dimensions: 12¾\"W × 36\" H × ¾\"D",
      "MDF / Plywood Thermofoil Finish",
      "MDF Matte Soft-Touch"
    ],
    "specifications": {
      "Dimensions": "12¾\"W × 36\" H × ¾\"D",
      "Source category": "Accessories",
      "Source product ID": "378",
      "Option name": "WEP1236-MS-WH"
    }
  },
  "mb01-245": {
    "sourceUrl": "https://mb01.vanstro.ca/product/wall-end-panel-wep1242-379",
    "sourceProductId": "379",
    "sourceProductName": "Wall End Panel WEP1242",
    "sourceCategory": "Accessories",
    "description": "Dimensions: 12¾\"W × 42\" H × ¾\"D MDF / Plywood Thermofoil Finish MDF Matte Soft-Touch",
    "productHighlights": [
      "Dimensions: 12¾\"W × 42\" H × ¾\"D",
      "MDF / Plywood Thermofoil Finish",
      "MDF Matte Soft-Touch"
    ],
    "specifications": {
      "Dimensions": "12¾\"W × 42\" H × ¾\"D",
      "Source category": "Accessories",
      "Source product ID": "379",
      "Option name": "WEP1242-MS-WH"
    }
  },
  "mb01-288": {
    "sourceUrl": "https://mb01.vanstro.ca/product/vanity-cabinet-v3021-door-tdl-400",
    "sourceProductId": "400",
    "sourceProductName": "Vanity Cabinet-V3021-Door-TDL",
    "sourceCategory": "Bathroom Vanities",
    "description": "Dimensions: 30\" W × 34\" H × 21\" D Carcass: ¾\" plywood cabinet box with double-sided melamine Door: MDF door with thermofoil finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 30\" W × 34\" H × 21\" D",
      "Carcass: ¾\" plywood cabinet box with double-sided melamine",
      "Door: MDF door with thermofoil finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "30\" W × 34\" H × 21\" D",
      "Carcass": "¾\" plywood cabinet box with double-sided melamine",
      "Door": "MDF door with thermofoil finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Bathroom Vanities",
      "Source product ID": "400",
      "Option name": "V3021STDL-PWMS-WH-TOP"
    }
  },
  "mb01-292": {
    "sourceUrl": "https://mb01.vanstro.ca/product/vanity-cabinet-v3021-door-tdr-398",
    "sourceProductId": "398",
    "sourceProductName": "Vanity Cabinet-V3021-Door-TDR",
    "sourceCategory": "Bathroom Vanities",
    "description": "Dimensions: 30\" W × 34\" H × 21\" D Carcass: ¾\" plywood cabinet box with double-sided melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 30\" W × 34\" H × 21\" D",
      "Carcass: ¾\" plywood cabinet box with double-sided melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "30\" W × 34\" H × 21\" D",
      "Carcass": "¾\" plywood cabinet box with double-sided melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Bathroom Vanities",
      "Source product ID": "398",
      "Option name": "V3021STDR-PWMS-WH-TOP"
    }
  },
  "mb01-278": {
    "sourceUrl": "https://mb01.vanstro.ca/product/vanity-cabinet-v3021-doors-tdl-415",
    "sourceProductId": "415",
    "sourceProductName": "Vanity Cabinet-V3021-Doors-TDL",
    "sourceCategory": "Bathroom Vanities",
    "description": "Dimensions: 30\" W × 34\" H × 21\" D Carcass: ¾\" plywood cabinet box with double-sided melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 30\" W × 34\" H × 21\" D",
      "Carcass: ¾\" plywood cabinet box with double-sided melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "30\" W × 34\" H × 21\" D",
      "Carcass": "¾\" plywood cabinet box with double-sided melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Bathroom Vanities",
      "Source product ID": "415",
      "Option name": "V3021TDL-PWMS-WH-TOP"
    }
  },
  "mb01-272": {
    "sourceUrl": "https://mb01.vanstro.ca/product/vanity-cabinet-v3021-doors-tdr-414",
    "sourceProductId": "414",
    "sourceProductName": "Vanity Cabinet-V3021-Doors-TDR",
    "sourceCategory": "Bathroom Vanities",
    "description": "Dimensions: 30\" W × 34\" H × 21\" D Carcass: ¾\" plywood cabinet box with double-sided melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 30\" W × 34\" H × 21\" D",
      "Carcass: ¾\" plywood cabinet box with double-sided melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "30\" W × 34\" H × 21\" D",
      "Carcass": "¾\" plywood cabinet box with double-sided melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Bathroom Vanities",
      "Source product ID": "414",
      "Option name": "V3021TDR-PWMS-WH-TOP"
    }
  },
  "mb01-284": {
    "sourceUrl": "https://mb01.vanstro.ca/product/vanity-cabinet-v3621tdl-412",
    "sourceProductId": "412",
    "sourceProductName": "Vanity Cabinet-V3621TDL",
    "sourceCategory": "Bathroom Vanities",
    "description": "Dimensions: 36\" W × 34\" H × 21\" D Carcass: ¾\" plywood cabinet box with double-sided melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 36\" W × 34\" H × 21\" D",
      "Carcass: ¾\" plywood cabinet box with double-sided melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "36\" W × 34\" H × 21\" D",
      "Carcass": "¾\" plywood cabinet box with double-sided melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Bathroom Vanities",
      "Source product ID": "412",
      "Option name": "V3621TDL-PWMS-WH-TOP"
    }
  },
  "mb01-9": {
    "sourceUrl": "https://mb01.vanstro.ca/product/vanity-cabinet-v3621tdr-413",
    "sourceProductId": "413",
    "sourceProductName": "Vanity Cabinet-V3621TDR",
    "sourceCategory": "Bathroom Vanities",
    "description": "Dimensions: 36\" W × 34\" H × 21\" D Carcass: ¾\" plywood cabinet box with double-sided melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 36\" W × 34\" H × 21\" D",
      "Carcass: ¾\" plywood cabinet box with double-sided melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "36\" W × 34\" H × 21\" D",
      "Carcass": "¾\" plywood cabinet box with double-sided melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Bathroom Vanities",
      "Source product ID": "413",
      "Option name": "V3621TDR-PWMS-WH-TOP"
    }
  },
  "mb01-268": {
    "sourceUrl": "https://mb01.vanstro.ca/product/vanity-cabinet-v4221-401",
    "sourceProductId": "401",
    "sourceProductName": "Vanity Cabinet-V4221",
    "sourceCategory": "Bathroom Vanities",
    "description": "Dimensions: 42\" W × 34\" H × 21\" D Carcass: ¾\" plywood cabinet box with double-sided melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 42\" W × 34\" H × 21\" D",
      "Carcass: ¾\" plywood cabinet box with double-sided melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "42\" W × 34\" H × 21\" D",
      "Carcass": "¾\" plywood cabinet box with double-sided melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Bathroom Vanities",
      "Source product ID": "401",
      "Option name": "V4221-PWMS-WH-TOP"
    }
  },
  "mb01-280": {
    "sourceUrl": "https://mb01.vanstro.ca/product/vanity-cabinet-v4821-402",
    "sourceProductId": "402",
    "sourceProductName": "Vanity Cabinet-V4821",
    "sourceCategory": "Bathroom Vanities",
    "description": "Dimensions: 48\" W × 34\" H × 21\" D Carcass: ¾\" plywood cabinet box with double-sided melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 48\" W × 34\" H × 21\" D",
      "Carcass: ¾\" plywood cabinet box with double-sided melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "48\" W × 34\" H × 21\" D",
      "Carcass": "¾\" plywood cabinet box with double-sided melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Bathroom Vanities",
      "Source product ID": "402",
      "Option name": "V4821-PWMS-WH-TOP"
    }
  },
  "mb01-16": {
    "sourceUrl": "https://mb01.vanstro.ca/product/vanity-cabinet-v663522-403",
    "sourceProductId": "403",
    "sourceProductName": "Vanity Cabinet-V663522",
    "sourceCategory": "Bathroom Vanities",
    "description": "Dimensions: 66\" W × 35\" H × 22\" D Carcass: ¾\" plywood cabinet box with double-sided melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 66\" W × 35\" H × 22\" D",
      "Carcass: ¾\" plywood cabinet box with double-sided melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "66\" W × 35\" H × 22\" D",
      "Carcass": "¾\" plywood cabinet box with double-sided melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Bathroom Vanities",
      "Source product ID": "403",
      "Option name": "V663522-PWMS-WH-TOP"
    }
  },
  "mb01-255": {
    "sourceUrl": "https://mb01.vanstro.ca/product/vanity-cabinet-vs24-384",
    "sourceProductId": "384",
    "sourceProductName": "Vanity Cabinet-VS24",
    "sourceCategory": "Bathroom Vanities",
    "description": "Dimensions: 24\" W × 34\" H × 21\" D Carcass: ¾\" plywood cabinet box with double-sided melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 24\" W × 34\" H × 21\" D",
      "Carcass: ¾\" plywood cabinet box with double-sided melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "24\" W × 34\" H × 21\" D",
      "Carcass": "¾\" plywood cabinet box with double-sided melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Bathroom Vanities",
      "Source product ID": "384",
      "Option name": "VS24-PWMS-WH-TOP"
    }
  },
  "mb01-266": {
    "sourceUrl": "https://mb01.vanstro.ca/product/vanity-cabinet-vs27-404",
    "sourceProductId": "404",
    "sourceProductName": "Vanity Cabinet-VS27",
    "sourceCategory": "Bathroom Vanities",
    "description": "Dimensions: 27\" W × 34\" H × 21\" D Carcass: ¾\" plywood cabinet box with double-sided melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 27\" W × 34\" H × 21\" D",
      "Carcass: ¾\" plywood cabinet box with double-sided melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "27\" W × 34\" H × 21\" D",
      "Carcass": "¾\" plywood cabinet box with double-sided melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Bathroom Vanities",
      "Source product ID": "404",
      "Option name": "VS27-PWMS-WH-TOP"
    }
  },
  "mb01-296": {
    "sourceUrl": "https://mb01.vanstro.ca/product/vanity-cabinet-vs30-405",
    "sourceProductId": "405",
    "sourceProductName": "Vanity Cabinet-VS30",
    "sourceCategory": "Bathroom Vanities",
    "description": "Dimensions: 30\" W × 34\" H × 21\" D Carcass: ¾\" plywood cabinet box with double-sided melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 30\" W × 34\" H × 21\" D",
      "Carcass: ¾\" plywood cabinet box with double-sided melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "30\" W × 34\" H × 21\" D",
      "Carcass": "¾\" plywood cabinet box with double-sided melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Bathroom Vanities",
      "Source product ID": "405",
      "Option name": "VS30-PWMS-WH-TOP"
    }
  },
  "mb01-261": {
    "sourceUrl": "https://mb01.vanstro.ca/product/vanity-cabinet-vs36-406",
    "sourceProductId": "406",
    "sourceProductName": "Vanity Cabinet-VS36",
    "sourceCategory": "Bathroom Vanities",
    "description": "Dimensions: 36\" W × 34\" H × 21\" D Carcass: ¾\" plywood cabinet box with double-sided melamine Door: MDF with PVC Matte Soft-Touch Finish Shaker Style Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
    "productHighlights": [
      "Dimensions: 36\" W × 34\" H × 21\" D",
      "Carcass: ¾\" plywood cabinet box with double-sided melamine",
      "Door: MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware: DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides"
    ],
    "specifications": {
      "Dimensions": "36\" W × 34\" H × 21\" D",
      "Carcass": "¾\" plywood cabinet box with double-sided melamine",
      "Door": "MDF with PVC Matte Soft-Touch Finish Shaker Style",
      "Hardware": "DTC 6-Way Adj.Soft-Close Hinges& Drawer Slides",
      "Source category": "Bathroom Vanities",
      "Source product ID": "406",
      "Option name": "VS36-PWMS-WH-TOP"
    }
  },
  "mb01-13": {
    "sourceUrl": "https://mb01.vanstro.ca/product/baseboard-035-410",
    "sourceProductId": "410",
    "sourceProductName": "Baseboard-035",
    "sourceCategory": "Baseboard",
    "description": "（H*W）H3-½\" * W ½\" * 10ft Material: Finger Joint Pine Surface: Putty White (Sanded, Paint-Ready)",
    "productHighlights": [
      "（H*W）H3-½\" * W ½\" * 10ft",
      "Material: Finger Joint Pine",
      "Surface: Putty White (Sanded, Paint-Ready)"
    ],
    "specifications": {
      "Material": "Finger Joint Pine",
      "Surface": "Putty White (Sanded, Paint-Ready)",
      "Source category": "Baseboard",
      "Source product ID": "410",
      "Option name": "VS35-10FT /ea"
    }
  },
  "mb01-12": {
    "sourceUrl": "https://mb01.vanstro.ca/product/baseboard-039-409",
    "sourceProductId": "409",
    "sourceProductName": "Baseboard-039",
    "sourceCategory": "Baseboard",
    "description": "（H*W）H4-½\" * W ½\" * 10ft Material: Finger Joint Pine Surface: Putty White (Sanded, Paint-Ready)",
    "productHighlights": [
      "（H*W）H4-½\" * W ½\" * 10ft",
      "Material: Finger Joint Pine",
      "Surface: Putty White (Sanded, Paint-Ready)"
    ],
    "specifications": {
      "Material": "Finger Joint Pine",
      "Surface": "Putty White (Sanded, Paint-Ready)",
      "Source category": "Baseboard",
      "Source product ID": "409",
      "Option name": "VS39-10FT /ea"
    }
  },
  "mb01-258": {
    "sourceUrl": "https://mb01.vanstro.ca/product/baseboard-041-407",
    "sourceProductId": "407",
    "sourceProductName": "Baseboard-041",
    "sourceCategory": "Baseboard",
    "description": "（H*W）H2-½\" * W ½\" * 10ft Material: Finger Joint Pine Surface: Putty White (Sanded, Paint-Ready)",
    "productHighlights": [
      "（H*W）H2-½\" * W ½\" * 10ft",
      "Material: Finger Joint Pine",
      "Surface: Putty White (Sanded, Paint-Ready)"
    ],
    "specifications": {
      "Material": "Finger Joint Pine",
      "Surface": "Putty White (Sanded, Paint-Ready)",
      "Source category": "Baseboard",
      "Source product ID": "407",
      "Option name": "VS41-10FT /ea"
    }
  },
  "mb01-7": {
    "sourceUrl": "https://mb01.vanstro.ca/product/casing-049-411",
    "sourceProductId": "411",
    "sourceProductName": "Casing-049",
    "sourceCategory": "Casing",
    "description": "（H*W）H4-9⁄16\" * W 11⁄16\" * 7ft Material: Finger Joint Pine Surface: Putty White (Sanded, Paint-Ready)",
    "productHighlights": [
      "（H*W）H4-9⁄16\" * W 11⁄16\" * 7ft",
      "Material: Finger Joint Pine",
      "Surface: Putty White (Sanded, Paint-Ready)"
    ],
    "specifications": {
      "Material": "Finger Joint Pine",
      "Surface": "Putty White (Sanded, Paint-Ready)",
      "Source category": "Casing",
      "Source product ID": "411",
      "Option name": "VS49-7FT /ea"
    }
  }
};
