# Plano: indicação de compras da rifa

## Objetivo
Adicionar a indicação opcional ao formulário e ao painel administrativo, preservando integralmente todas as compras e reservas atuais.

## Implementação
- Adicionar somente a coluna opcional `indicacao` à tabela existente, com `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`; nenhum registro será apagado, recriado ou atualizado.
- Incluir no formulário o campo “Quem te indicou?” abaixo do Instagram, com “Ninguém / Sem indicação” e as 11 opções na ordem informada.
- Mostrar a indicação na etapa de confirmação e enviá-la junto dos dados da nova compra; seleção vazia será gravada como `NULL`.
- Atualizar a criação do PIX para salvar a indicação somente nas novas reservas e também limpá-la nos rollbacks das reservas recém-tentadas.
- Exibir “Indicação” no painel, usando “Sem indicação” nos registros antigos ou vazios.
- Adicionar filtro por indicação e um resumo com a quantidade de números trazidos por cada opção, sem alterar a busca atual.
- Ao usar “Disponibilizar”, limpar também a indicação daquele número, mantendo o comportamento existente dessa ação administrativa.

## Segurança e preservação
- Não usar `DROP`, `TRUNCATE`, `DELETE`, recriação de tabela ou atualização dos dados atuais.
- Não alterar as políticas de acesso existentes.
- Não mudar seleção de números, preço, geração do PIX, confirmação de pagamento ou status.

## Validação
- Confirmar que compras antigas aparecem como “Sem indicação”.
- Testar formulário sem indicação e com uma indicação selecionada.
- Verificar filtro, contadores e tabela do painel em telas menores e maiores.
- Confirmar que a aplicação continua compilando e sem erros de execução.
