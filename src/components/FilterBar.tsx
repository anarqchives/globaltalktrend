const FilterBar = () => {
  return (
    <div className="bg-card rounded-[20px] p-4 md:p-5 border border-border flex flex-col md:flex-row flex-wrap gap-4 md:gap-6 items-stretch md:items-center" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">País</span>
        <select className="filter-pill">
          <option>🌎 Global</option>
          <option>🇧🇷 Brasil</option>
          <option>🇺🇸 EUA</option>
          <option>🇬🇧 Reino Unido</option>
          <option>🇫🇷 França</option>
          <option>🇩🇪 Alemanha</option>
          <option>🇯🇵 Japão</option>
          <option>🇮🇳 Índia</option>
        </select>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Período</span>
        <select className="filter-pill">
          <option>Última hora</option>
          <option>Hoje</option>
          <option>Esta semana</option>
        </select>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categoria</span>
        <select className="filter-pill">
          <option>Todas</option>
          <option>Política</option>
          <option>Entretenimento</option>
          <option>Tecnologia</option>
          <option>Esportes</option>
          <option>Cultura</option>
          <option>Negócios/Finanças</option>
          <option>Ciência</option>
        </select>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</span>
        <select className="filter-pill">
          <option>Todas mídias</option>
          <option>Redes sociais</option>
          <option>Imprensa</option>
          <option>Buscas (Google)</option>
        </select>
      </div>
    </div>
  );
};

export default FilterBar;
