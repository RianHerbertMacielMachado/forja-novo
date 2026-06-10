export const statusConfig = {
  na_fila: {
    label: 'Na Fila',
    icon: '🟡',
    className: 'status-na-fila',
    color: '#f59e0b'
  },
  coletando_materiais: {
    label: 'Coletando Materiais',
    icon: '🔵',
    className: 'status-coletando',
    color: '#3b82f6'
  },
  em_producao: {
    label: 'Em Produção',
    icon: '🔧',
    className: 'status-producao',
    color: '#7c3aed'
  },
  concluido: {
    label: 'Concluído',
    icon: '✅',
    className: 'status-concluido',
    color: '#22c55e'
  }
}

const StatusBadge = ({ status, size = 'sm' }) => {
  const config = statusConfig[status] || { label: status, icon: '❓', className: '' }
  const sizeClass = size === 'lg' ? 'text-sm px-3 py-1.5' : 'text-xs px-2 py-0.5'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${config.className} ${sizeClass}`}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  )
}

export default StatusBadge
