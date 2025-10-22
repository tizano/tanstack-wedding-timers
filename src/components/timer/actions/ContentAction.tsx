import { cn } from "@/lib/utils";

const ContentAction = ({
  content,
  lang,
  flagPosition,
  variant = "default",
}: {
  content: string;
  lang: "fr" | "en" | "br";
  flagPosition: "left" | "right";
  variant?: "default" | "big" | "small";
}) => {
  const positionVariants = {
    left: "-left-6",
    right: "-right-6",
  };

  return (
    <div
      className={cn(
        "bg-opacity-70 relative flex flex-col gap-6 rounded-xl border border-blue-950/40 bg-gray-900/30 p-6 text-pretty text-gray-100 backdrop-blur-lg",
        flagPosition === "left" && "pl-10",
        flagPosition === "right" && "pr-10",
      )}
    >
      <div className={`absolute ${positionVariants[flagPosition]} -top-6`}>
        <img src={`/assets/flags/${lang}.png`} alt={lang} width={64} height={64} />
      </div>
      <h2
        className={cn(
          "text-3xl",
          variant === "small" && "text-2xl leading-snug",
          variant === "big" && "wide:text-6xl text-5xl leading-snug",
        )}
      >
        {content}
      </h2>
    </div>
  );
};

export default ContentAction;
