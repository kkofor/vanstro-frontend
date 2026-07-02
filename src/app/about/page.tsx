import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About us",
  description: "Learn about VanStro's Canadian home materials supply platform."
};

export default function AboutPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>About us</h1>
          <p>
            VanStro connects Canadian homeowners, contractors and local dealers with
            ready-to-order cabinets, vanities, trim and home materials.
          </p>
        </div>
      </section>
      <section className="page-panel">
        <div className="container two-column-page">
          <article className="form-panel">
            <h2>Built for local fulfillment</h2>
            <p>
              Customers browse and pay online, then the assigned VanStro dealer handles
              pickup, delivery or project support in their market.
            </p>
          </article>
          <aside className="form-panel">
            <h2>Canadian supply focus</h2>
            <p>
              The platform is designed around stocked products, dealer coverage and
              practical renovation workflows across Canada.
            </p>
          </aside>
        </div>
      </section>
    </>
  );
}
