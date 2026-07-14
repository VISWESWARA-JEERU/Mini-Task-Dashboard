import KPICard from "./KPICard";

export default function KPISection({
  cards,
  activeMenu,
  onCardClick,
}) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <KPICard
          key={card.type}
          title={card.title}
          value={card.value}
          description={card.description}
          icon={card.icon}
          active={activeMenu === card.type}
          onClick={() => onCardClick(card.type)}
        />
      ))}
    </section>
  );
}