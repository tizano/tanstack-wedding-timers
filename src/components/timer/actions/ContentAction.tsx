const ContentAction = ({
  content,
  lang,
  flagPosition,
}: {
  content: string;
  lang: "fr" | "en" | "br";
  flagPosition: "left" | "right";
}) => {
  const positionVariants = {
    left: "-left-6",
    right: "-right-6",
  };

  return (
    <div className="bg-opacity-70 relative flex flex-col gap-6 rounded-xl border border-blue-950/40 bg-gray-900/30 p-4 px-10 py-8 text-pretty text-gray-100 backdrop-blur-lg">
      <div className={`absolute ${positionVariants[flagPosition]} -top-6`}>
        <img src={`/assets/flags/${lang}.png`} alt={lang} width={64} height={64} />
      </div>
      <h2 className="text-3xl">{content}</h2>
    </div>
  );
};

export default ContentAction;
