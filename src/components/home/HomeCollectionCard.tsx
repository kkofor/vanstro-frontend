import Link from "next/link";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";

export type HomeCollectionCardProps = {
  href: string;
  image: string;
  title: string;
  description?: string;
  width?: number;
  height?: number;
  alt?: string;
};

export function HomeCollectionCard({ href, image, title, description, width, height, alt }: HomeCollectionCardProps) {
  return (
    <Link href={href} prefetch={false} className="home-collection-card">
      <Card className="home-collection-card-face">
        <div className="home-collection-media">
          <img src={image} alt={alt ?? title} width={width} height={height} loading="lazy" decoding="async" />
        </div>
        <CardContent className="home-collection-copy">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardContent>
      </Card>
    </Link>
  );
}
