export type ErpEnvelope<T> = {
  code: number;
  msg: string;
  time: number;
  data: T | null;
};

export type ErpProductListItem = {
  id: number;
  category_id: number;
  category_name: string;
  product_name: string;
  product_material: Array<Record<string, string>>;
  product_image: string[];
  has_color: number;
};

export type ErpSkuListItem = {
  id: number;
  product_id: number;
  sku_title: string;
  sku_model: string;
  sku_code: string;
  width: string | null;
  length: string | null;
  height: string | null;
  bomList: Array<{
    id: number;
    type: number;
    child_sku_id: number | null;
    child_sku_code: string;
    child_name: string;
    quantity: number;
    weigh: number;
    remark: string;
  }>;
};

export type ErpColorListItem = {
  id: number;
  product_id: number;
  color_id: number;
  color_code: string;
  color_name_en: string;
  color_name_fr: string;
  color_name_cn: string;
  color_image: string;
  sort: number;
};

export type ErpCategoryListItem = {
  id: number;
  parent_id: number;
  pid: number;
  category_code: string;
  category_name: string;
  sort: number;
  status: number;
  children?: ErpCategoryListItem[];
};

export type ErpListResponse<T> = {
  list: T[];
  total?: number;
  page?: number;
  limit?: number;
};
