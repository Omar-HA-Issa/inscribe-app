export const Summary = () => {
  const keywords = ["revenue growth", "operational efficiency", "market expansion", "risk factors"];
  
  const summaryText = `This comprehensive financial analysis document outlines strategic initiatives 
    for sustained revenue growth through Q4 2025. Key focus areas include operational efficiency 
    improvements, aggressive market expansion into emerging territories, and detailed mitigation 
    strategies for identified risk factors. The document presents a data-driven approach with 
    quarterly benchmarks and performance indicators across all business units.`;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-3xl font-semibold mb-2 lowercase">summary</h2>
        <p className="text-muted-foreground">AI-generated document overview</p>
      </div>

      <div className="bg-card rounded-xl p-8 shadow-card">
        <p className="text-lg leading-relaxed">
          {summaryText.split(' ').map((word, i) => (
            <span
              key={i}
              className={keywords.some(kw => word.toLowerCase().includes(kw.split(' ')[0])) 
                ? "text-chart-cyan font-semibold" 
                : ""}
            >
              {word}{' '}
            </span>
          ))}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {keywords.map((keyword, i) => (
          <div
            key={i}
            className="bg-card rounded-lg p-4 text-center shadow-card hover:shadow-hover transition-all hover:scale-[1.01]"
          >
            <span className="text-chart-cyan text-sm font-medium">{keyword}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
