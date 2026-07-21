export type DealerMapLocation = {
  id: string;
  code: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  latitude: number;
  longitude: number;
};

export const dealerMapLocations: DealerMapLocation[] = [
  {
    id: "mb01",
    code: "MB01",
    name: "Yuan Construction Ltd.",
    contactName: "Lester",
    phone: "204 221 8288",
    email: "MB01@VANSTRO.CA",
    address: "856 Century St",
    city: "Winnipeg",
    province: "MB",
    postalCode: "R3H 0M5",
    latitude: 49.909,
    longitude: -97.1591
  },
  {
    id: "ab10",
    code: "AB10",
    name: "AB10",
    contactName: "Scott",
    phone: "431-8772658",
    email: "AB10@VANSTRO.CA",
    address: "800 Macleod Trail SE",
    city: "Calgary",
    province: "AB",
    postalCode: "T2G 2M3",
    latitude: 51.0455062,
    longitude: -114.0564712
  },
  {
    id: "qc10",
    code: "QC10",
    name: "QC10",
    contactName: "Scott",
    phone: "431-8772658",
    email: "QC10@VANSTRO.CA",
    address: "451 Saint-Jean Boulevard",
    city: "Pointe-Claire",
    province: "QC",
    postalCode: "H9R 3J3",
    latitude: 45.44858,
    longitude: -73.8170771
  },
  {
    id: "on10",
    code: "ON10",
    name: "ON10",
    contactName: "Scott",
    phone: "431-8772658",
    email: "on10@vanstro.ca",
    address: "100 Regina Street South",
    city: "Waterloo",
    province: "ON",
    postalCode: "N2J 4P9",
    latitude: 43.4632692,
    longitude: -80.5201339
  },
  {
    id: "bc10",
    code: "BC10",
    name: "BC10",
    contactName: "Scott",
    phone: "431-8772658",
    email: "BC10@VANSTRO.CA",
    address: "770 Vernon Avenue",
    city: "Saanich",
    province: "BC",
    postalCode: "V8X 2W7",
    latitude: 48.4594183,
    longitude: -123.3764626
  },
  {
    id: "sk10",
    code: "SK10",
    name: "SK10",
    contactName: "Scott",
    phone: "431-8772658",
    email: "SK10@VANSTRO.CA",
    address: "222 3rd Avenue North",
    city: "Saskatoon",
    province: "SK",
    postalCode: "S7K 0J5",
    latitude: 52.1306803,
    longitude: -106.6602406
  }
];
