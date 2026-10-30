import { LegalLayout, LegalSection } from "@/components/LegalLayout";

export default function Privacy() {
  return (
    <LegalLayout title="Política de Privacidade" updatedAt="5 de outubro de 2026">
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground">
        Antes de publicar, revise este documento com apoio jurídico e preencha os
        dados do controlador (razão social, CNPJ e canal do encarregado). Os
        textos abaixo descrevem como o Fotoflow trata dados na configuração atual.
      </p>

      <LegalSection heading="1. Quem é o controlador">
        <p>
          O Fotoflow é uma ferramenta de gestão para fotógrafos. O fotógrafo que
          cria a conta (controlador) decide quais dados de clientes cadastra; a
          plataforma atua como operadora no tratamento desses registros. Dúvidas
          sobre dados pessoais podem ser enviadas ao encarregado em{" "}
          <span className="font-medium text-foreground">
            [e-mail do encarregado a definir]
          </span>
          .
        </p>
      </LegalSection>

      <LegalSection heading="2. Quais dados tratamos">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="font-medium text-foreground">Conta:</span> e-mail
            usado no acesso e credenciais protegidas por hash, além do nome, quando informado.
          </li>
          <li>
            <span className="font-medium text-foreground">Clientes:</span> nome,
            e-mail, telefone/WhatsApp e anotações que você cadastra.
          </li>
          <li>
            <span className="font-medium text-foreground">Sessões:</span> título,
            tipo, data, local, valores e status de pagamento.
          </li>
          <li>
            <span className="font-medium text-foreground">Google Calendar:</span>{" "}
            tokens de acesso, somente se você conectar sua conta para sincronizar
            sessões.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. Para que usamos e base legal">
        <p>
          Usamos os dados para autenticar seu acesso, exibir e organizar seus
          clientes e sessões, calcular valores e, quando habilitado, sincronizar
          compromissos com sua agenda. O tratamento se apoia na execução do
          contrato (art. 7º, V da LGPD), no legítimo interesse para segurança e
          prevenção a abusos, e no consentimento quando você conecta serviços de
          terceiros.
        </p>
      </LegalSection>

      <LegalSection heading="4. Compartilhamento com operadores">
        <p>
          Não vendemos dados. Compartilhamos o mínimo necessário com prestadores
          que viabilizam o serviço: infraestrutura de banco de dados (Convex), e, se você conectar, a API do Google Calendar. Cada um trata os dados conforme suas próprias
          políticas.
        </p>
      </LegalSection>

      <LegalSection heading="5. Cookies e armazenamento local">
        <p>
          Usamos apenas armazenamento essencial à sessão (token de autenticação).
          Não há cookies de publicidade nem rastreamento de terceiros.
        </p>
      </LegalSection>

      <LegalSection heading="6. Retenção">
        <p>
          Mantemos os dados enquanto sua conta existir. Ao excluir uma sessão ou
          cliente, o registro é removido. Você pode solicitar a exclusão da conta
          a qualquer momento pelo canal do encarregado.
        </p>
      </LegalSection>

      <LegalSection heading="7. Seus direitos (LGPD, art. 18)">
        <p>
          Você pode solicitar confirmação de tratamento, acesso, correção,
          anonimização, portabilidade, eliminação e informação sobre
          compartilhamentos. A exportação de clientes e sessões em CSV, disponível
          na própria ferramenta, atende ao direito de portabilidade.
        </p>
      </LegalSection>

      <LegalSection heading="8. Segurança">
        <p>
          O acesso é individual por conta e os dados são isolados por usuário no
          banco. Tokens de integração ficam armazenados no servidor e nunca são
          expostos ao navegador. Em caso de incidente que possa acarretar risco
          relevante, os titulares e a ANPD serão comunicados conforme a lei.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
