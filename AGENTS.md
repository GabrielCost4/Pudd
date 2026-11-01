# Instruções do projeto

<!-- postman-cli:installation:start -->
Postman CLI is installed on this device, and can be used for API Engineering work.
<!-- postman-cli:installation:end -->

## IDEIAS DE OTIMIZAÇÃO

Ideias para avaliação futura; este registro não autoriza implementação automática.

### Cache do feed e dos posts no perfil

- Guardar temporariamente no Angular os posts paginados e as URLs de imagens já obtidas, para reaproveitá-los ao sair e voltar às telas.
- Identificar cada consulta pela sessão, filtros e página. Na grade do perfil, incluir também o ID do autor e a aba de imagens/textos.
- Avaliar validade de poucos minutos e limitar a quantidade de páginas em memória; os valores devem ser definidos ao implementar.
- Atualizar ou invalidar os dados afetados após criar, editar ou excluir publicações; sincronizar também curtidas e comentários exibidos em telas diferentes.
- Limpar o cache ao sair ou trocar de conta e evitar exibir dados de uma sessão anterior.
- Avaliar o cache HTTP das imagens no navegador conforme os cabeçalhos do Supabase. Esse cache pode evitar novos downloads, mas não substitui o cache das consultas à API.
- Respeitar a expiração das URLs assinadas e renová-las quando necessário. Não armazenar credenciais no cache nem tratar URLs temporárias como permanentes.
- Objetivo: reduzir consultas à API, solicitações de URLs assinadas e downloads repetidos ao alternar entre feed e perfil, mantendo dados atualizados e uso de memória limitado.
