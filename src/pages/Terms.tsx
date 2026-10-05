import { LegalLayout, LegalSection } from "@/components/LegalLayout";

export default function Terms() {
  return (
    <LegalLayout title="Termos de Uso" updatedAt="5 de outubro de 2026">
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground">
        Revise este documento com apoio jurídico e ajuste dados da empresa,
        foro e condições comerciais antes de publicar.
      </p>

      <LegalSection heading="1. Aceitação">
        <p>
          Ao criar uma conta ou usar o Fotoflow, você concorda com estes Termos e
          com a Política de Privacidade. Se não concordar, não utilize o serviço.
        </p>
      </LegalSection>

      <LegalSection heading="2. O serviço">
        <p>
          O Fotoflow é uma ferramenta de organização de clientes e sessões de
          fotografia. Você é responsável pelas informações que cadastra e por
          manter a veracidade dos dados de seus próprios clientes.
        </p>
      </LegalSection>

      <LegalSection heading="3. Conta e segurança">
        <p>
          O acesso se dá por código enviado ao seu e-mail. Você é responsável por
          manter o controle da sua caixa de entrada e por toda atividade realizada
          na sua conta.
        </p>
      </LegalSection>

      <LegalSection heading="4. Uso aceitável">
        <p>
          Você concorda em não usar o serviço para enviar spam, violar direitos de
          terceiros, burlar limites técnicos ou tentar acessar dados de outros
          usuários. O uso indevido pode levar à suspensão da conta.
        </p>
      </LegalSection>

      <LegalSection heading="5. Integrações de terceiros">
        <p>
          A conexão com o Google Calendar é opcional e depende de autorização sua.
          A indisponibilidade de serviços de terceiros pode afetar a
          sincronização, sem que isso caracterize descumprimento destes Termos.
        </p>
      </LegalSection>

      <LegalSection heading="6. Propriedade">
        <p>
          Os dados que você insere permanecem seus. O software, a marca e a
          interface do Fotoflow pertencem aos seus titulares.
        </p>
      </LegalSection>

      <LegalSection heading="7. Limitação de responsabilidade">
        <p>
          O serviço é fornecido &quot;como está&quot;. Não nos responsabilizamos
          por perdas indiretas decorrentes de erros de digitação, decisões
          comerciais ou uso fora das finalidades descritas. Recomendamos exportar
          seus dados periodicamente.
        </p>
      </LegalSection>

      <LegalSection heading="8. Alterações e foro">
        <p>
          Podemos atualizar estes Termos, indicando a data da última revisão.
          O uso continuado após alterações significa aceitação. Aplica-se a
          legislação brasileira, com foro a definir conforme o domicílio do
          fornecedor.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
