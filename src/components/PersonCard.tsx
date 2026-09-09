import Image from "next/image";

type PersonCardProps = {
  name: string;
  role?: string;
  bio?: string;
  imageSrc?: string;
  imageAlt?: string;
};

export default function PersonCard({
  name,
  role,
  bio,
  imageSrc,
  imageAlt,
}: PersonCardProps) {
  return (
    <article className="flex flex-col gap-4">
      <div className="aspect-[4/5] w-full overflow-hidden border border-border bg-paper-alt">
        {imageSrc && (
          <Image
            src={imageSrc}
            alt={imageAlt ?? name}
            width={400}
            height={500}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-ink">{name}</h3>
        {role && <p className="text-sm text-ink-muted">{role}</p>}
        {bio && <p className="mt-2 text-sm leading-relaxed text-ink-muted">{bio}</p>}
      </div>
    </article>
  );
}
