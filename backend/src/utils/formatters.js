/**
 * Formata valor monetário para exibição
 */
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

/**
 * Formata data para exibição em PT-BR
 */
const formatDate = (date) => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

/**
 * Mapeia status do pedido para texto em PT-BR
 */
const statusLabel = {
  na_fila: 'Na Fila',
  coletando_materiais: 'Coletando Materiais',
  em_producao: 'Em Produção',
  concluido: 'Concluído'
}

/**
 * Formata lista de itens para texto
 */
const formatItensList = (itens) => {
  if (!itens || itens.length === 0) return 'Nenhum item'
  return itens.map(item => `• ${item.produto_nome} x${item.quantidade}`).join('\n')
}

/**
 * Formata lista de materiais para texto
 */
const formatMateriaisList = (materiais) => {
  if (!materiais || materiais.length === 0) return 'Sem materiais'
  return materiais.map(m => `• ${m.nome} x${m.total}`).join('\n')
}

module.exports = { formatCurrency, formatDate, statusLabel, formatItensList, formatMateriaisList }
