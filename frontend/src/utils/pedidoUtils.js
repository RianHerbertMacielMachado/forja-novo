/**
 * Calcula materiais necessários para um array de itens de pedido
 * @param {Array} itens - Array de itens do pedido (produto_nome, produto_id, quantidade)
 * @returns {Array} - Array de materiais com totais
 */
export const calcularMateriaisPedido = async (itens) => {
  // Caso os itens já venham com materiais pré-calculados
  if (itens?.[0]?.materiais) {
    const map = {}
    itens.forEach(item => {
      (item.materiais || []).forEach(mat => {
        if (!map[mat.nome]) map[mat.nome] = { nome: mat.nome, total: 0 }
        map[mat.nome].total += mat.quantidade * item.quantidade
      })
    })
    return Object.values(map)
  }
  return []
}

/**
 * Formata valor em moeda BRL
 */
export const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

/**
 * Formata data para pt-BR
 */
export const formatDate = (date) => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}
