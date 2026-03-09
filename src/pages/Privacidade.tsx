import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const sections = [
  {
    title: "1. Introdução",
    content:
      "O Global Talk Trend é uma plataforma de análise de tendências globais que agrega dados públicos de múltiplas fontes (redes sociais, portais de notícias, APIs abertas). Esta Política de Privacidade descreve como tratamos informações no contexto do uso da plataforma.",
  },
  {
    title: "2. Dados que NÃO coletamos",
    content:
      "O Global Talk Trend NÃO coleta, armazena ou compartilha dados pessoais de navegação dos visitantes não-autenticados. Especificamente:\n\n• Nenhum dado de navegação é retido em nossos servidores\n• Nenhuma informação pessoal identificável é armazenada sem consentimento explícito\n• Não utilizamos cookies de rastreamento de terceiros\n• Não vendemos ou compartilhamos dados com anunciantes",
  },
  {
    title: "3. Dados de usuários autenticados",
    content:
      "Caso você opte por criar uma conta, armazenamos apenas as informações necessárias para o funcionamento do serviço:\n\n• Nome de exibição e nome de usuário (fornecidos por você)\n• Endereço de e-mail (para autenticação)\n• Preferências de perfil e configurações de privacidade\n• Cards salvos, boards e relatórios criados por você\n\nTodos os dados de conta são protegidos por Row Level Security (RLS) e acessíveis apenas pelo próprio usuário.",
  },
  {
    title: "4. Fontes de dados públicos",
    content:
      "As tendências exibidas na plataforma são obtidas de fontes públicas como Google Trends, YouTube, Reddit, Hacker News, NewsAPI, The Guardian, GNews, Bluesky e Mastodon. Nenhum dado pessoal de usuários dessas plataformas é coletado — apenas metadados agregados de tendências (títulos, volumes, categorias).",
  },
  {
    title: "5. Armazenamento e segurança",
    content:
      "Os dados são armazenados em infraestrutura segura com criptografia em trânsito (HTTPS/TLS) e em repouso. Utilizamos políticas de segurança em nível de linha (RLS) para garantir que cada usuário acesse apenas seus próprios dados.",
  },
  {
    title: "6. Seus direitos (LGPD)",
    content:
      "Em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), você tem o direito de:\n\n• Acessar seus dados pessoais armazenados\n• Corrigir dados incompletos ou desatualizados\n• Solicitar a exclusão de seus dados\n• Revogar consentimento a qualquer momento\n• Solicitar portabilidade dos dados\n\nPara exercer qualquer um desses direitos, entre em contato conosco.",
  },
  {
    title: "7. Cookies e armazenamento local",
    content:
      "Utilizamos localStorage do navegador exclusivamente para salvar preferências de interface (tema, idioma, consentimento de privacidade). Esses dados permanecem no seu dispositivo e não são transmitidos para nossos servidores.",
  },
  {
    title: "8. Alterações nesta política",
    content:
      "Esta política pode ser atualizada periodicamente. Qualquer alteração significativa será comunicada através da plataforma. A data da última atualização está indicada abaixo.",
  },
  {
    title: "9. Contato",
    content:
      "Para dúvidas sobre esta política ou sobre o tratamento dos seus dados, entre em contato através do formulário disponível na plataforma ou envie um e-mail para o endereço indicado na seção 'Sobre' do Global Talk Trend.",
  },
];

export default function Privacidade() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-header sticky top-0 z-50 px-4 md:px-6 py-2 h-12 flex items-center">
        <a href="/" className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Global Talk Trend</span>
        </a>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-12 space-y-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Política de Privacidade</h1>
          <p className="text-sm text-muted-foreground">Última atualização: 9 de março de 2026</p>
        </div>

        <div className="space-y-8">
          {sections.map((s, i) => (
            <section key={i} className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">{s.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{s.content}</p>
            </section>
          ))}
        </div>

        <div className="pt-8 border-t border-border/50">
          <Button variant="outline" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Dashboard
          </Button>
        </div>
      </main>
    </div>
  );
}
