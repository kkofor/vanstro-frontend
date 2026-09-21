/**
 * product-reviews-seed.ts — English review seed for the storefront PDP (evaluations layer).
 *
 * Single source of truth: /Users/zhangguannan/Documents/AI_OS/projects/vanstro/
 *   tasks/reports/2026-09-12-product-reviews-seed.md
 *
 * Rules implemented here (from the seed order):
 *  - English only; ratings are 4★ or 5★ only (no 3★).
 *  - verifiedBuyer stays false — the system Verified checkbox is reserved for real orders.
 *  - No French reviews: the seed is never applied for fr-CA (see stackReviewSeed).
 *  - No hardware (pulls/knobs), no moldings, no toe kicks, no end panels (VEP), no fillers,
 *    no LSB33/36, no 90/96-tall cabinets — exactly the draft's covered set.
 *  - Slugs are the draft's canonical slugs (kitchen slugs resolved against the live
 *    Website-API catalog; vanity slugs are literal in the draft).
 *  - Usernames read like a real purchaser: an English first name, or a first name plus a
 *    Winnipeg district (St. James, Transcona, Charleswood, St. Vital, Weston, River Heights).
 *    Not every review carries a district; no role titles, no User1/Guest, no duplicate names
 *    within one product, no Calgary/Saanich/Waterloo.
 *
 * The stack layer (applyReviewSeed) is applied in the Next data path (lib/api/server
 * getProductBySlug) so production PDPs served from the Website API render these reviews;
 * count always equals the number of seeded reviews published for that product.
 */
import type { ProductDetail, ProductRatingSummary, ProductReview } from "@/lib/api/api-contract";

/** Deterministic, evenly-spread ISO timestamps (Jul–Sep 2026) so the data file stays static. */
const at = (n: number): string =>
  new Date(Date.UTC(2026, 6, 1 + (n % 70), 9 + ((n * 5) % 10), (n * 7) % 60)).toISOString();

type R = Pick<ProductReview, "rating" | "title" | "body" | "name"> & { at: number };

function rev(i: number, r: R): ProductReview {
  return {
    id: `seed-${(r.title ?? "review").replace(/\s+/g, "-").toLowerCase().slice(0, 28)}-${i}`,
    name: r.name,
    title: r.title,
    body: r.body,
    rating: r.rating,
    createdAt: at(r.at),
    verifiedBuyer: false
  };
}

const build = (slug: string, rows: R[]): ProductReview[] => rows.map((r, i) => rev(i, r));

/** Review seed keyed by product slug. Count per slug == published count (manual truth). */
export const PRODUCT_REVIEW_SEED: Record<string, readonly ProductReview[]> = {
  /* ---------------- Vanities (13) ---------------- */
  "vanity-cabinet-vs24-384": build("vs24", [
    { at: 1, rating: 5, name: "Alice", title: "Fits a 24-inch gap", body: "Ordered the 24-inch vanity. Gap in the powder room was 24 and a quarter. Box sat in. Pickup at Yuan on Century Street. Foam on the corners. Door is White PVC. Not wood." },
    { at: 3, rating: 5, name: "Dan · St. James", title: "White door, melamine box", body: "Client wanted a small vanity. VS24. Door face is the soft PVC. Inside is melamine. I picked it up in Winnipeg. Counted one box. No extra top in this SKU." },
    { at: 6, rating: 4, name: "Erin · River Heights", title: "Call Yuan before you drive", body: "Cabinet is the 24-inch. I showed up and the counter was busy. They found it in the back. Bring a van. One person can lift it." },
    { at: 9, rating: 5, name: "Jack", title: "Plumbing hole was where I needed", body: "Set VS24 against the wall. Drain lined up. I cut the back. VanStro does not install. I did the taps." },
    { at: 12, rating: 4, name: "Megan", title: "Match a sample, not a phone photo", body: "White on the site looked colder than the photo. I checked a door chip at the dealer. After that it was fine. 24-inch width is the limit in this suite." },
    { at: 15, rating: 5, name: "Ken", title: "One box, labels clear", body: "SKU on the carton matched the paper. We loaded at Century Street. No broken corner. Door still had the film." }
  ]),

  "vanity-cabinet-vs27-404": build("vs27", [
    { at: 2, rating: 5, name: "Grace · Charleswood", title: "27 inch was the right call", body: "24 felt tight. 27 filled the run. Height 34. Pickup in Winnipeg." },
    { at: 4, rating: 4, name: "Victor", title: "Film off, wipe dust", body: "Door had shipping film. I pulled it on site. White PVC. I do not wax it. Yuan had it on a pallet." },
    { at: 7, rating: 5, name: "Paula", title: "Carton held", body: "Rain that day. Carton stayed dry in the van. Corner blocks inside." },
    { at: 10, rating: 4, name: "Randy", title: "Leave a scribe", body: "27-inch cabinet. Tile lip on the left. I left a gap for caulk. Do not force it to the drywall." },
    { at: 13, rating: 5, name: "Hank · Transcona", title: "Century Street load-out", body: "They brought the VS27 to the dock. I signed the count. One cabinet." },
    { at: 16, rating: 5, name: "Irene", title: "Soft-touch door", body: "Client touched the door in the shop. Matte. Not a painted wood. We ordered White." }
  ]),

  "vanity-cabinet-vs30-405": build("vs30", [
    { at: 3, rating: 5, name: "Brian · St. Vital", title: "30 inch under the window", body: "Window stool is 31. VS30 went under. Drawers clear the stool." },
    { at: 5, rating: 5, name: "Trent", title: "Two people for the van", body: "30-inch is heavier than the 24. Two of us at Yuan. No lift gate." },
    { at: 8, rating: 4, name: "Sharon", title: "Grey or white — see a door", body: "I almost ordered Light Grey from a screenshot. Dealer had both doors. I took White." },
    { at: 11, rating: 5, name: "Owen", title: "Box stood upright", body: "Kept it upright in the truck. Instructions in the bag. I used my own screws for the wall." },
    { at: 14, rating: 4, name: "Lana", title: "Floor not level", body: "Cabinet is square. Floor is not. I shimmed the base. That is on the house, not the box." },
    { at: 17, rating: 5, name: "Curtis", title: "Paperwork matched SKU", body: "023021011 on the sheet. Same on the carton. Paid the dealer for pickup time." }
  ]),

  "vanity-cabinet-vs36-406": build("vs36", [
    { at: 4, rating: 5, name: "Naomi", title: "36 inch double-bowl plan", body: "We put a 36-inch top later. Cabinet width was 36. Dealer sold the box. Top was a separate SKU." },
    { at: 6, rating: 4, name: "Walter", title: "Needs a six-foot box", body: "VS36 does not sit in a car. I used the van. Yuan dock." },
    { at: 9, rating: 5, name: "Mona", title: "Pair of doors", body: "Two doors, White. Edges even. I did not sand them." },
    { at: 12, rating: 5, name: "Felix", title: "Straps on the carton", body: "Carton had straps. We kept them on until the bathroom." },
    { at: 15, rating: 4, name: "Dora", title: "Watch the toilet offset", body: "36-inch vanity. Toilet is close. Measure the bowl before you buy. Cabinet itself is the 36." },
    { at: 18, rating: 5, name: "Sam", title: "Called the day before", body: "Yuan asked for the order number. They had the 36 ready." }
  ]),

  "vanity-cabinet-v3021-door-tdl-400": build("v3021stdl", [
    { at: 2, rating: 5, name: "Peter", title: "Single door, drawers left", body: "Face the cabinet. Drawers on the left. That is STDL. 30 by 21. Pickup Winnipeg." },
    { at: 5, rating: 5, name: "June", title: "Matches the drawing", body: "Plumber put the drain on the right. Drawers left. Door on the rest. No surprise." },
    { at: 8, rating: 4, name: "Gilbert · St. James", title: "Confirm the hand", body: "I almost grabbed an STDR. Labels say STDL. Check before you leave the yard." },
    { at: 11, rating: 5, name: "Rosa", title: "White PVC door", body: "One door. Soft face. Box is 21 deep." },
    { at: 14, rating: 4, name: "Nolan", title: "Hand stamp on the carton", body: "Carton had STDL. We kept the sticker for the installer." }
  ]),

  "vanity-cabinet-v3021-door-tdr-398": build("v3021stdr", [
    { at: 3, rating: 5, name: "Bill", title: "Drawers on the right", body: "Face on. Drawers right. STDR. Toilet on the left wall." },
    { at: 7, rating: 4, name: "Holly", title: "Do not mix TDL and TDR", body: "Two jobs same day. I read the SKU twice at Yuan." },
    { at: 10, rating: 5, name: "Marcus", title: "Same White as the 24s", body: "Door colour matches the small VS cabinets we used in the hall." },
    { at: 13, rating: 5, name: "Wanda", title: "21 inch depth", body: "Shallow room. 21-inch depth helped. 30-inch width." },
    { at: 16, rating: 4, name: "Theo", title: "Corner crush on the outer box", body: "Outer carton had a dent. Cabinet inside was fine. I noted it on the pickup sheet." }
  ]),

  "vanity-cabinet-v3021-doors-tdl-415": build("v3021tdl", [
    { at: 1, rating: 5, name: "Kirk", title: "Two doors, drawers left", body: "TDL. Face the box. Drawers left. Two doors. 30 x 21." },
    { at: 4, rating: 5, name: "Sonja", title: "Same as the catalog drawing", body: "Catalog said drawers left. That is what arrived." },
    { at: 8, rating: 4, name: "Dean", title: "Heavier than VS30", body: "Extra drawers. Two people. Yuan dock." },
    { at: 12, rating: 5, name: "Clara", title: "Doors even", body: "Two doors meet in the middle. White. Gap is even." },
    { at: 15, rating: 4, name: "Morris", title: "Hardware bag taped inside", body: "Hinges in a bag. I counted them before I left." }
  ]),

  "vanity-cabinet-v3021-doors-tdr-414": build("v3021tdr", [
    { at: 2, rating: 5, name: "Louis", title: "Drawers right, two doors", body: "TDR. Drawers on the right when you stand in front." },
    { at: 6, rating: 5, name: "Tara", title: "Mirror of the TDL", body: "Neighbour has TDL. We took TDR for the other wall." },
    { at: 9, rating: 4, name: "Seth · Transcona", title: "SKU 023021411", body: "I photographed the label at Century Street." },
    { at: 13, rating: 5, name: "Gwen", title: "Light Grey option in the shop", body: "We stayed with White. Dealer had both." },
    { at: 16, rating: 4, name: "Hugo", title: "Keep the film on until install", body: "Film saved the door in the bathroom dust." }
  ]),

  "vanity-cabinet-v3621tdl-412": build("v3621tdl", [
    { at: 3, rating: 5, name: "Grant", title: "36 x 21, drawers left", body: "TDL. 36-inch. Drawers left. Two of us on the lift." },
    { at: 7, rating: 4, name: "Priscilla", title: "Book the dock", body: "Walk-in pickup was slow. I booked." },
    { at: 11, rating: 5, name: "Leon", title: "Wide doors", body: "Doors are wide. They do not sag on the hinges out of the box." },
    { at: 14, rating: 5, name: "Yolanda", title: "Top is extra", body: "Cabinet only. Stone top from another PO." },
    { at: 17, rating: 4, name: "Ezra", title: "Pallet, not a loose box", body: "Yuan kept it on a pallet. I brought a truck." }
  ]),

  "vanity-cabinet-v3621tdr-413": build("v3621tdr", [
    { at: 5, rating: 5, name: "Calvin", title: "Drawers right, 36 inch", body: "TDR. Toilet on the left. Drawers on the right." },
    { at: 9, rating: 5, name: "Mabel", title: "Depth 21", body: "21-inch depth. Door swing is fine." },
    { at: 12, rating: 4, name: "Ross", title: "Same yard as the 30s", body: "Century Street. They pulled TDR after TDL for another job." },
    { at: 15, rating: 4, name: "Esther", title: "Wipe with a damp cloth", body: "No wood polish. PVC face." },
    { at: 18, rating: 5, name: "Wayne", title: "Label face-out", body: "TDR printed on the end of the carton. Easy to see in the stack." }
  ]),

  "vanity-cabinet-v4221-401": build("v4221", [
    { at: 12, rating: 4, name: "Alvin", title: "42-inch, plan the truck", body: "42-inch vanity. Fits the drawing. Pickup at Yuan. I used a cube van. Top not included. One piece, heavy." }
  ]),

  "vanity-cabinet-v4821-402": build("v4821", [
    { at: 18, rating: 4, name: "Bonnie", title: "48-inch needs two people and a truck", body: "48-inch. Width is correct. I do not put this in a half-ton without a second set of hands. Winnipeg pickup." }
  ]),

  "vanity-cabinet-v663522-403": build("v663522", [
    { at: 22, rating: 4, name: "Shelby", title: "66-inch, check the site door", body: "Cabinet is 66. Site door was 32. We unboxed in the garage and carried in parts of the run as the design allows. Confirm openings. Pickup Yuan." }
  ]),

  /* ---------------- Kitchen — base cabinets ---------------- */
  "base-cabinet-b12-252": build("b12", [
    { at: 2, rating: 5, name: "Oscar", title: "Fit", body: "12-inch next to the range. Box is square. 3-inch step in the line." },
    { at: 5, rating: 4, name: "Beth", title: "Pickup", body: "Yuan. Small carton. I carried it myself." },
    { at: 9, rating: 5, name: "Rudy", title: "Packaging", body: "Corners had foam. Door film on." },
    { at: 13, rating: 4, name: "Zelda", title: "Finish", body: "White PVC door. Melamine box. I do not oil it." }
  ]),
  "base-cabinet-b15-253": build("b15", [
    { at: 1, rating: 5, name: "Clark", title: "Fit", body: "15-inch filler run. Sat between B12 and B18." },
    { at: 6, rating: 5, name: "Diana", title: "Pickup", body: "Century Street. One box." },
    { at: 10, rating: 4, name: "Fern", title: "Finish", body: "Same White as B12." },
    { at: 14, rating: 4, name: "Sal", title: "Packaging", body: "Label SKU matched the invoice." }
  ]),
  "base-cabinet-b18-254": build("b18", [
    { at: 3, rating: 5, name: "Andy", title: "Fit", body: "18-inch. Two doors? No — this SKU is the 18 box. Width is 18." },
    { at: 7, rating: 4, name: "Carol", title: "Pickup", body: "Stacked with B15 in the van." },
    { at: 11, rating: 5, name: "Miles", title: "Packaging", body: "No racking in the carton." },
    { at: 15, rating: 5, name: "Tina", title: "Finish", body: "Door to door with the 15. Colour match." }
  ]),
  "base-cabinet-b21-265": build("b21", [
    { at: 4, rating: 5, name: "Ned", title: "Fit", body: "21-inch base. Toe kick separate." },
    { at: 8, rating: 4, name: "Lois", title: "Pickup", body: "Heavier than B12." },
    { at: 12, rating: 5, name: "Phil", title: "Finish", body: "White." },
    { at: 16, rating: 4, name: "Greta", title: "Packaging", body: "Strap on the outside." }
  ]),
  "base-cabinet-b24-266": build("b24", [
    { at: 5, rating: 5, name: "Evan", title: "Fit", body: "Standard 24. Dishwasher beside it." },
    { at: 9, rating: 5, name: "Trudy", title: "Pickup", body: "Winnipeg. Two boxes that day, B24 and B30." },
    { at: 13, rating: 4, name: "Silas", title: "Finish", body: "Soft-touch. No wax." },
    { at: 17, rating: 4, name: "Joan", title: "Packaging", body: "Pallet corner." }
  ]),
  "base-cabinet-b27-267": build("b27", [
    { at: 6, rating: 5, name: "Fritz", title: "Fit", body: "27-inch. Filled a leftover 27." },
    { at: 10, rating: 4, name: "Meg", title: "Pickup", body: "Called ahead." },
    { at: 14, rating: 5, name: "Harvey", title: "Finish", body: "White." },
    { at: 18, rating: 4, name: "Sonia", title: "Packaging", body: "Dry carton." }
  ]),
  "base-cabinet-b30-268": build("b30", [
    { at: 7, rating: 5, name: "Edwin", title: "Fit", body: "30-inch base under a 30 sink plan — wait, this is not the SB. This is a door base. Width 30." },
    { at: 11, rating: 4, name: "Ruth", title: "Pickup", body: "Dock." },
    { at: 15, rating: 5, name: "Percy", title: "Packaging", body: "Fine." },
    { at: 19, rating: 4, name: "Marta", title: "Finish", body: "Matches the wall row." }
  ]),
  "sink-base-sb30-368": build("sb30", [
    { at: 1, rating: 5, name: "Dale", title: "Fit", body: "Sink base 30. Open top for the sink." },
    { at: 4, rating: 5, name: "Elsie", title: "Pickup", body: "Yuan." },
    { at: 9, rating: 4, name: "Boyd", title: "Finish", body: "Same door as B30." },
    { at: 13, rating: 4, name: "Vera", title: "Packaging", body: "Keep upright. I did." }
  ]),
  "sink-base-sb33-369": build("sb33", [
    { at: 2, rating: 5, name: "Janet", title: "Fit", body: "33-inch sink base." },
    { at: 6, rating: 4, name: "Earl", title: "Pickup", body: "Two people." },
    { at: 10, rating: 5, name: "Nina", title: "Packaging", body: "OK." },
    { at: 14, rating: 4, name: "Vince", title: "Finish", body: "White." }
  ]),
  "3-drawer-base-3db12-272": build("3db12", [
    { at: 2, rating: 5, name: "Angus", title: "Fit", body: "12-inch three-drawer. Next to B12." },
    { at: 5, rating: 5, name: "Peggy", title: "Pickup", body: "Small." },
    { at: 9, rating: 4, name: "Roman", title: "Finish", body: "Drawer fronts even." },
    { at: 13, rating: 4, name: "Una", title: "Packaging", body: "Drawers braced." }
  ]),
  "3-drawer-base-3db15-273": build("3db15", [
    { at: 3, rating: 5, name: "Blake", title: "Fit", body: "15-inch drawers." },
    { at: 7, rating: 4, name: "Ivy", title: "Pickup", body: "Winnipeg." },
    { at: 11, rating: 5, name: "Cedric", title: "Finish", body: "White." },
    { at: 15, rating: 4, name: "Faye", title: "Packaging", body: "Fine." }
  ]),
  "3-drawer-base-3db18-274": build("3db18", [
    { at: 4, rating: 5, name: "Drew", title: "Fit", body: "18-inch. Utensils." },
    { at: 8, rating: 4, name: "Olive", title: "Pickup", body: "Dock." },
    { at: 12, rating: 4, name: "Guy", title: "Packaging", body: "Carton dry." },
    { at: 16, rating: 5, name: "Zoe", title: "Finish", body: "Fronts align with B18." }
  ]),
  "3-drawer-base-3db21-275": build("3db21", [
    { at: 5, rating: 5, name: "Hal", title: "Fit", body: "21-inch drawers." },
    { at: 9, rating: 4, name: "Rita", title: "Pickup", body: "Van." },
    { at: 13, rating: 4, name: "Omar", title: "Finish", body: "PVC." },
    { at: 17, rating: 5, name: "Cass", title: "Packaging", body: "Corner foam." }
  ]),
  "3-drawer-base-3db24-276": build("3db24", [
    { at: 6, rating: 5, name: "Ivan", title: "Fit", body: "24-inch three-drawer." },
    { at: 10, rating: 4, name: "Dawn", title: "Pickup", body: "Heavy. Two people." },
    { at: 14, rating: 5, name: "Pierce", title: "Finish", body: "White." },
    { at: 18, rating: 4, name: "Lola", title: "Packaging", body: "Strap." }
  ]),
  "base-cabinet-b33-269": build("b33", [
    { at: 10, rating: 4, name: "Mack", title: "Fit / Pickup", body: "33-inch base. Width correct. Pickup Yuan. Two people." }
  ]),
  "base-cabinet-b36-270": build("b36", [
    { at: 14, rating: 4, name: "Nora", title: "Fit / Pickup", body: "36-inch base. Truck. Winnipeg." }
  ]),
  "base-cabinet-b42-271": build("b42", [
    { at: 18, rating: 4, name: "Abel", title: "Fit / Pickup", body: "42-inch. Measure the doorways. Pickup at Yuan." }
  ]),
  "3-drawer-base-3db30-277": build("3db30", [
    { at: 10, rating: 4, name: "Grover", title: "Fit / Pickup", body: "30-inch drawers. Heavy. Truck." }
  ]),
  "3-drawer-base-3db33-278": build("3db33", [
    { at: 14, rating: 4, name: "Mina", title: "Fit / Pickup", body: "33-inch drawers. Two people." }
  ]),
  "3-drawer-base-3db36-279": build("3db36", [
    { at: 18, rating: 4, name: "Dexter", title: "Fit / Pickup", body: "36-inch drawers. Dock only." }
  ]),

  /* ---------------- Kitchen — wall cabinets ---------------- */
  "wall-cabinet-w0930-283": build("w0930", [
    { at: 1, rating: 5, name: "Kent", title: "Fit", body: "9 x 30 wall. 3-inch grid. Filler for the rest." },
    { at: 4, rating: 5, name: "Pearl", title: "Pickup", body: "One small box. I carried it." },
    { at: 8, rating: 4, name: "Simon", title: "Finish", body: "White." },
    { at: 12, rating: 4, name: "Ada", title: "Packaging", body: "Light." }
  ]),
  "wall-cabinet-w0936-284": build("w0936", [
    { at: 2, rating: 5, name: "Ray", title: "Fit", body: "9 x 36." },
    { at: 6, rating: 4, name: "Faith", title: "Pickup", body: "Yuan." },
    { at: 10, rating: 5, name: "Todd", title: "Finish", body: "White." },
    { at: 14, rating: 4, name: "Beryl", title: "Packaging", body: "OK." }
  ]),
  "wall-cabinet-w1230-286": build("w1230", [
    { at: 3, rating: 5, name: "Neil", title: "Fit", body: "12 x 30 wall." },
    { at: 7, rating: 5, name: "Gail", title: "Pickup", body: "Easy." },
    { at: 11, rating: 4, name: "Coy", title: "Finish", body: "White." },
    { at: 15, rating: 4, name: "Sue", title: "Packaging", body: "Fine." }
  ]),
  "wall-cabinet-w1236-287": build("w1236", [
    { at: 5, rating: 5, name: "Hugh", title: "Fit", body: "12 x 36." },
    { at: 9, rating: 4, name: "Leslie", title: "Pickup", body: "Winnipeg." },
    { at: 13, rating: 5, name: "Paxton", title: "Finish", body: "Matches W1230." },
    { at: 17, rating: 4, name: "Edith", title: "Packaging", body: "OK." }
  ]),
  "wall-cabinet-w1530-289": build("w1530", [
    { at: 1, rating: 5, name: "Gord", title: "Fit", body: "15 x 30." },
    { at: 5, rating: 5, name: "Willow", title: "Pickup", body: "Dock." },
    { at: 10, rating: 4, name: "Manny", title: "Finish", body: "White." },
    { at: 14, rating: 4, name: "Jill", title: "Packaging", body: "Foam." }
  ]),
  "wall-cabinet-w1536-290": build("w1536", [
    { at: 2, rating: 5, name: "Al", title: "Fit", body: "15 x 36." },
    { at: 6, rating: 4, name: "Fran", title: "Pickup", body: "Van." },
    { at: 11, rating: 5, name: "Bruno", title: "Finish", body: "White." },
    { at: 15, rating: 4, name: "Joyce", title: "Packaging", body: "OK." }
  ]),
  "wall-cabinet-w1830-292": build("w1830", [
    { at: 3, rating: 5, name: "Merv", title: "Fit", body: "18 x 30." },
    { at: 7, rating: 5, name: "Katie", title: "Pickup", body: "Yuan." },
    { at: 12, rating: 4, name: "Sloan", title: "Finish", body: "White." },
    { at: 16, rating: 4, name: "Pam", title: "Packaging", body: "Fine." }
  ]),
  "wall-cabinet-w1836-293": build("w1836", [
    { at: 4, rating: 5, name: "Rex", title: "Fit", body: "18 x 36." },
    { at: 8, rating: 4, name: "Nadia", title: "Pickup", body: "Two boxes with W1830." },
    { at: 13, rating: 5, name: "Quinn", title: "Finish", body: "White." },
    { at: 17, rating: 4, name: "Tess", title: "Packaging", body: "OK." }
  ]),
  "wall-cabinet-w2130-295": build("w2130", [
    { at: 5, rating: 5, name: "Doug", title: "Fit", body: "21 x 30." },
    { at: 9, rating: 4, name: "Kit", title: "Pickup", body: "Winnipeg." },
    { at: 13, rating: 5, name: "Brent", title: "Finish", body: "White." },
    { at: 18, rating: 4, name: "Opal", title: "Packaging", body: "OK." }
  ]),
  "wall-cabinet-w2430-298": build("w2430", [
    { at: 6, rating: 5, name: "Ralph", title: "Fit", body: "24 x 30 wall. Over the sink line." },
    { at: 10, rating: 5, name: "Gina", title: "Pickup", body: "Dock." },
    { at: 14, rating: 4, name: "Cole", title: "Finish", body: "White." },
    { at: 19, rating: 4, name: "Nell", title: "Packaging", body: "Strap." }
  ]),
  "wall-cabinet-w2436-299": build("w2436", [
    { at: 7, rating: 5, name: "Walt", title: "Fit", body: "24 x 36." },
    { at: 11, rating: 4, name: "Dina", title: "Pickup", body: "Heavier." },
    { at: 15, rating: 5, name: "Abe", title: "Finish", body: "White." },
    { at: 20, rating: 4, name: "Sally", title: "Packaging", body: "OK." }
  ]),
  "wall-cabinet-w2730-301": build("w2730", [
    { at: 8, rating: 5, name: "Orville", title: "Fit", body: "27 x 30." },
    { at: 12, rating: 4, name: "Helena", title: "Pickup", body: "Van." },
    { at: 16, rating: 5, name: "Claude", title: "Finish", body: "White." },
    { at: 21, rating: 4, name: "Ruby", title: "Packaging", body: "Fine." }
  ]),
  "wall-cabinet-w3012-304": build("w3012", [
    { at: 1, rating: 5, name: "Bo", title: "Fit", body: "30 x 12 fridge wall." },
    { at: 5, rating: 5, name: "Mavis", title: "Pickup", body: "Small." },
    { at: 9, rating: 4, name: "Gus", title: "Finish", body: "White." },
    { at: 13, rating: 4, name: "Iona", title: "Packaging", body: "Light." }
  ]),
  "wall-cabinet-w3018-307": build("w3018", [
    { at: 2, rating: 5, name: "Len", title: "Fit", body: "30 x 18." },
    { at: 6, rating: 4, name: "Cora", title: "Pickup", body: "Yuan." },
    { at: 10, rating: 5, name: "Burt", title: "Finish", body: "White." },
    { at: 14, rating: 4, name: "Avis", title: "Packaging", body: "OK." }
  ]),
  "wall-cabinet-w3024-309": build("w3024", [
    { at: 3, rating: 5, name: "Van", title: "Fit", body: "30 x 24." },
    { at: 7, rating: 4, name: "Eve", title: "Pickup", body: "Winnipeg." },
    { at: 11, rating: 5, name: "Rollo", title: "Finish", body: "White." },
    { at: 15, rating: 4, name: "Kaye", title: "Packaging", body: "OK." }
  ]),
  "wall-cabinet-w3030-311": build("w3030", [
    { at: 4, rating: 5, name: "Floyd", title: "Fit", body: "30 x 30." },
    { at: 8, rating: 4, name: "Molly", title: "Pickup", body: "Two people." },
    { at: 12, rating: 5, name: "Stan", title: "Finish", body: "White." },
    { at: 16, rating: 4, name: "Rena", title: "Packaging", body: "Fine." }
  ]),
  "wall-cabinet-w0942-285": build("w0942", [
    { at: 9, rating: 4, name: "Chip", title: "Fit / Pickup", body: "9 x 42. Tall. Two people on the ladder. Pickup Yuan." }
  ]),
  "wall-cabinet-w1242-288": build("w1242", [
    { at: 13, rating: 4, name: "Bea", title: "Fit / Pickup", body: "12 x 42. Height is 42." }
  ]),
  "wall-cabinet-w1542-291": build("w1542", [
    { at: 17, rating: 4, name: "York", title: "Fit / Pickup", body: "15 x 42. Truck." }
  ]),
  "wall-cabinet-w3036-312": build("w3036", [
    { at: 9, rating: 4, name: "Milo", title: "Fit / Pickup", body: "30 x 36. Heavy wall box. Two people." }
  ]),
  "wall-cabinet-w3042-313": build("w3042", [
    { at: 13, rating: 4, name: "Tansy", title: "Fit / Pickup", body: "30 x 42. Check ceiling." }
  ]),
  "wall-cabinet-w3630-327": build("w3630", [
    { at: 17, rating: 4, name: "Vance", title: "Fit / Pickup", body: "36 x 30. Wide. Van." }
  ]),
  "wall-cabinet-w3642-329": build("w3642", [
    { at: 20, rating: 4, name: "Roxanne", title: "Fit / Pickup", body: "36 x 42. Two people and a van." }
  ]),

  /* ---------------- Kitchen — specials ---------------- */
  "wall-cabinet-gd-w1530gd-331": build("gd1530", [
    { at: 2, rating: 5, name: "Ike", title: "Fit", body: "Glass door 15 x 30." },
    { at: 6, rating: 4, name: "Fern", title: "Pickup", body: "Glass — I stood it up." },
    { at: 10, rating: 5, name: "Kurt", title: "Finish", body: "White frame." },
    { at: 14, rating: 4, name: "Dee", title: "Packaging", body: "Extra cardboard on the glass." }
  ]),
  "wall-cabinet-gd-w1830gd-334": build("gd1830", [
    { at: 3, rating: 5, name: "Ames", title: "Fit", body: "Glass 18 x 30." },
    { at: 7, rating: 4, name: "Clio", title: "Pickup", body: "Upright." },
    { at: 11, rating: 5, name: "Noel", title: "Finish", body: "White." },
    { at: 15, rating: 4, name: "Trin", title: "Packaging", body: "Glass pack." }
  ]),
  "open-end-shelf-oe630-349": build("oe630", [
    { at: 1, rating: 5, name: "Eli", title: "Fit", body: "6-inch open end 30 high. End of the wall run." },
    { at: 5, rating: 5, name: "Moira", title: "Pickup", body: "Tiny." },
    { at: 9, rating: 4, name: "Duke", title: "Finish", body: "White interior." },
    { at: 13, rating: 4, name: "Polly", title: "Packaging", body: "Light." }
  ]),
  "open-end-shelf-oe636-350": build("oe636", [
    { at: 2, rating: 5, name: "Ron", title: "Fit", body: "6 x 36 open end." },
    { at: 6, rating: 4, name: "Sadie", title: "Pickup", body: "Yuan." },
    { at: 10, rating: 5, name: "Buzz", title: "Finish", body: "White." },
    { at: 14, rating: 4, name: "Lily", title: "Packaging", body: "OK." }
  ]),
  "diagonal-corner-wall-dcw2430-343": build("dcw2430", [
    { at: 3, rating: 5, name: "Odell", title: "Fit", body: "Diagonal corner 24 x 30." },
    { at: 7, rating: 4, name: "Rhea", title: "Pickup", body: "Awkward shape. Van." },
    { at: 11, rating: 5, name: "Saul", title: "Finish", body: "White." },
    { at: 15, rating: 4, name: "Neta", title: "Packaging", body: "Corner carton." }
  ]),
  "microwave-cabinet-mo3030-346": build("mo3030", [
    { at: 2, rating: 5, name: "Cletus", title: "Fit", body: "30 x 30 microwave cabinet. Opening matches the spec sheet." },
    { at: 6, rating: 4, name: "Min", title: "Pickup", body: "Yuan." },
    { at: 10, rating: 5, name: "Wes", title: "Finish", body: "White." },
    { at: 14, rating: 4, name: "Allie", title: "Packaging", body: "OK." }
  ]),
  "microwave-cabinet-mo3036-347": build("mo3036", [
    { at: 3, rating: 5, name: "Glenn", title: "Fit", body: "30 x 36 microwave box." },
    { at: 7, rating: 4, name: "Nola", title: "Pickup", body: "Heavier." },
    { at: 11, rating: 5, name: "Basil", title: "Finish", body: "White." },
    { at: 15, rating: 4, name: "Wyn", title: "Packaging", body: "Fine." }
  ]),
  "tall-cabinet-u188424-352": build("u188424", [
    { at: 12, rating: 4, name: "Orin", title: "Fit / Pickup", body: "18 x 84 pantry. Height 84. Site ceiling 96. Pickup Yuan. Two people. Truck." }
  ]),
  "tall-cabinet-u248424-355": build("u248424", [
    { at: 16, rating: 4, name: "Lorna", title: "Fit / Pickup", body: "24 x 84. Doorways first. Winnipeg dock." }
  ]),
  "tall-cabinet-u308424-358": build("u308424", [
    { at: 20, rating: 4, name: "Wade", title: "Fit / Pickup", body: "30 x 84. Heavy. Cube van." }
  ]),
  "oven-tall-cabinet-o308424-361": build("o308424", [
    { at: 14, rating: 4, name: "Fonda", title: "Fit / Pickup", body: "30 x 84 oven tall. Cutout per the sheet. I confirm with the appliance guy. Pickup Yuan." }
  ]),
  "lazy-susan-base-spb9-282": build("spb9", [
    { at: 2, rating: 5, name: "Elroy", title: "Fit", body: "9-inch lazy susan base. Corner. Follow the sheet." },
    { at: 6, rating: 4, name: "Maisie", title: "Pickup", body: "Yuan. Odd carton." },
    { at: 10, rating: 5, name: "Norm", title: "Finish", body: "White." },
    { at: 14, rating: 4, name: "Vena", title: "Packaging", body: "Tray inside, strapped." }
  ])
};

const SEED_COUNT = Object.values(PRODUCT_REVIEW_SEED).reduce((s, r) => s + r.length, 0);
export const REVIEW_SEED_PRODUCT_COUNT = Object.keys(PRODUCT_REVIEW_SEED).length;
export const REVIEW_SEED_ENTRY_COUNT = SEED_COUNT;

/** True when the seed has published reviews for this slug. */
export function hasReviewSeed(slug: string): boolean {
  const rows = PRODUCT_REVIEW_SEED[slug];
  return rows !== undefined && rows.length > 0;
}

/** Summary-level stack (homepage showcase + /products/ list cards): attaches only the
 *  rating summary (average + count) for en-CA when the slug has a seed; fr-CA and
 *  seedless products are returned untouched (they stay review-free). */
export function applyReviewSeedToSummary<S extends { slug: string }>(
  summary: S,
  locale?: string | null
): S & { ratingSummary?: ProductRatingSummary } {
  if (locale === "fr-CA") return summary as S & { ratingSummary?: ProductRatingSummary };
  const rows = PRODUCT_REVIEW_SEED[summary.slug];
  if (!rows || rows.length === 0) {
    return summary as S & { ratingSummary?: ProductRatingSummary };
  }
  const count = rows.length;
  const average = Math.round((rows.reduce((s, r) => s + (r.rating ?? 0), 0) / count) * 100) / 100;
  return { ...summary, ratingSummary: { average, count, writeReviewEnabled: true } };
}

/**
 * Lay the English review seed onto a product detail (Next data path). fr-CA is never
 * seeded — French PDPs keep "Aucun avis publié". count always equals the number of
 * seeded (published) reviews for the product. API data is stacked, not replaced:
 * products without a seed row are returned untouched.
 */
export function applyReviewSeed(
  product: ProductDetail,
  locale?: string | null
): ProductDetail {
  if (locale === "fr-CA") return product;
  const rows = PRODUCT_REVIEW_SEED[product.slug];
  if (!rows || rows.length === 0) return product;
  const reviews = rows.map((row) => ({ ...row }));
  const average = Math.round((reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / reviews.length) * 100) / 100;
  return {
    ...product,
    reviews,
    ratingSummary: {
      average,
      count: reviews.length,
      sourceLabel: "Published customer reviews.",
      writeReviewEnabled: true
    }
  };
}