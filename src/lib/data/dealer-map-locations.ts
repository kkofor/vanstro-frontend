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
    name: "2369783 Alberta Ltd",
    contactName: "George Athur",
    phone: "431 877 2659",
    email: "AB10@VANSTRO.CA",
    address: "148 Carrington Cl NW",
    city: "Calgary",
    province: "AB",
    postalCode: "T3P 1P8",
    latitude: 51.1824,
    longitude: -114.0862
  },
  {
    id: "qc10",
    code: "QC10",
    name: "2897776 Quebec Ltd",
    contactName: "George Athur",
    phone: "431 877 2659",
    email: "QC10@VANSTRO.CA",
    address: "220-4 Av. du Voyageur",
    city: "Pointe-Claire",
    province: "QC",
    postalCode: "H9R 6A8",
    latitude: 45.4658,
    longitude: -73.7882
  },
  {
    id: "on10",
    code: "ON10",
    name: "9871451 Ontario Ltd",
    contactName: "George Athur",
    phone: "431 877 2659",
    email: "on10@vanstro.ca",
    address: "217 Deacon Wood Pl 217",
    city: "Waterloo",
    province: "ON",
    postalCode: "N2T 2S1",
    latitude: 43.4732,
    longitude: -80.5731
  },
  {
    id: "bc10",
    code: "BC10",
    name: "8276533 B.C. Ltd.",
    contactName: "George Athur",
    phone: "431 877 2659",
    email: "BC10@VANSTRO.CA",
    address: "754 Audley St",
    city: "Saanich Core",
    province: "BC",
    postalCode: "V8X 2V3",
    latitude: 48.4508,
    longitude: -123.3741
  },
  {
    id: "sk10",
    code: "SK10",
    name: "2456877 Saskatchewan Ltd",
    contactName: "George Arthur",
    phone: "431 877 2659",
    email: "SK10@VANSTRO.CA",
    address: "717 47 St W",
    city: "Saskatoon",
    province: "SK",
    postalCode: "S7L 6C1",
    latitude: 52.1656,
    longitude: -106.6812
  }
];
