import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale,
  LinearScale, BarElement, LineElement, PointElement, Title
} from 'chart.js'
import { Doughnut, Bar, Line } from 'react-chartjs-2'
import api from '../api'
import StatusBadge from '../components/StatusBadge'

ChartJS.register(
  ArcElement, Tooltip, Legend, CategoryScale,
  LinearScale, BarElement, LineElement, PointElement, Title
)

const chartOptions = {
  responsive: true,
  plugins: {
    legend: { labels: { color: '#94a3b8' } }
  },
  scales: {
    x: { ticks: { color: '#94a3b8' }, grid: { color: '#2d3748' } },
    y: { ticks: { color: '#94a3b8' }, grid: { color: '#2d3748' } }
  }
}

const AdminDashboardPage = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(res => setData(res.data))
      .catch(() => toast.error('Erro ao carregar dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forge-gold"></div>
    </div>
  )

  if (!data) return null

  const statusColors = {
    na_fila: '#f59e0b',
    coletando_materiais: '#3b82f6',
    em_producao: '#7c3aed',
    concluido: '#22c55e'
  }

  const statusLabels = {
    na_fila: 'Na Fila',
    coletando_materiais: 'Coletando',
    em_producao: 'Em Produção',
    concluido: 'Concluído'
  }

  const doughnutData = {
    labels: data.pedidosPorStatus.map(s => statusLabels[s.status] || s.status),
    datasets: [{
      data: data.pedidosPorStatus.map(s => parseInt(s.count)),
      backgroundColor: data.pedidosPorStatus.map(s => statusColors[s.status] || '#6b7280'),
      borderWidth: 0
    }]
  }

  const barData = {
    labels: data.pedidosPorForjador.map(f => f.nome),
    datasets: [{
      label: 'Pedidos',
      data: data.pedidosPorForjador.map(f => parseInt(f.count)),
      backgroundColor: '#7c3aed',
      borderRadius: 6
    }]
  }

  const lineData = {
    labels: data.pedidos30dias.map(d => {
      const [y, m, day] = d.dia.split('T')[0].split('-')
      return `${day}/${m}`
    }),
    datasets: [{
      label: 'Pedidos',
      data: data.pedidos30dias.map(d => parseInt(d.count)),
      borderColor: '#f0c040',
      backgroundColor: '#f0c04020',
      fill: true,
      tension: 0.4
    }]
  }

  const stats = [
    { label: 'Total de Pedidos', value: data.totalPedidos, icon: '📦', color: 'text-forge-gold' },
    { label: 'Pedidos Hoje', value: data.pedidosHoje, icon: '📅', color: 'text-blue-400' },
    { label: 'Pedidos (7 dias)', value: data.pedidosSemana, icon: '📊', color: 'text-purple-400' },
    {
      label: 'Faturamento Total',
      value: `R$ ${parseFloat(data.faturamento).toFixed(2).replace('.', ',')}`,
      icon: '💰',
      color: 'text-green-400'
    }
  ]

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="font-rajdhani text-3xl font-bold text-forge-gold">📊 Dashboard</h1>
        <p className="text-forge-text-muted text-sm mt-1">Visão geral do Sistema de Forja</p>
      </div>

      {/* Cards de stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, idx) => (
          <div key={idx} className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{stat.icon}</span>
            </div>
            <p className={`font-rajdhani text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-forge-text-muted text-sm mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Mais vendido / mais usado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="card">
          <p className="text-forge-text-muted text-sm mb-1">⚔️ Produto Mais Vendido</p>
          <p className="font-rajdhani text-xl font-bold text-forge-gold">
            {data.produtoMaisVendido?.nome || 'Nenhum'}
          </p>
          {data.produtoMaisVendido && (
            <p className="text-forge-text-muted text-sm">{data.produtoMaisVendido.total_vendido} unidades</p>
          )}
        </div>
        <div className="card">
          <p className="text-forge-text-muted text-sm mb-1">🪨 Material Mais Utilizado</p>
          <p className="font-rajdhani text-xl font-bold text-forge-gold">
            {data.materialMaisUsado?.nome || 'Nenhum'}
          </p>
          {data.materialMaisUsado && (
            <p className="text-forge-text-muted text-sm">{data.materialMaisUsado.total_usado} unidades</p>
          )}
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Rosca de status */}
        <div className="card">
          <h3 className="font-rajdhani text-lg font-bold text-forge-text mb-4">Por Status</h3>
          <div className="h-48 flex items-center justify-center">
            {data.pedidosPorStatus.length > 0 ? (
              <Doughnut data={doughnutData} options={{ ...chartOptions, scales: undefined }} />
            ) : (
              <p className="text-forge-text-muted">Sem dados</p>
            )}
          </div>
        </div>

        {/* Barras por forjador */}
        <div className="card col-span-2">
          <h3 className="font-rajdhani text-lg font-bold text-forge-text mb-4">Por Forjador</h3>
          <div className="h-48">
            {data.pedidosPorForjador.length > 0 ? (
              <Bar data={barData} options={chartOptions} />
            ) : (
              <p className="text-forge-text-muted">Sem dados</p>
            )}
          </div>
        </div>
      </div>

      {/* Linha dos últimos 30 dias */}
      <div className="card mb-8">
        <h3 className="font-rajdhani text-lg font-bold text-forge-text mb-4">Pedidos nos Últimos 30 Dias</h3>
        <div className="h-48">
          {data.pedidos30dias.length > 0 ? (
            <Line data={lineData} options={chartOptions} />
          ) : (
            <p className="text-forge-text-muted">Sem dados</p>
          )}
        </div>
      </div>

      {/* Últimos pedidos */}
      <div className="card">
        <h3 className="font-rajdhani text-lg font-bold text-forge-text mb-4">📋 Últimos 10 Pedidos</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">Registro</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Forjador</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Data</th>
              </tr>
            </thead>
            <tbody>
              {data.ultimosPedidos.map(pedido => (
                <tr key={pedido.id} className="table-row">
                  <td className="px-4 py-3 font-rajdhani font-bold text-forge-gold">{pedido.registro_id}</td>
                  <td className="px-4 py-3 text-sm">{pedido.cliente_nome || 'N/I'}</td>
                  <td className="px-4 py-3 text-sm text-forge-text-muted">{pedido.forjador_nome || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={pedido.status} /></td>
                  <td className="px-4 py-3 text-right text-forge-gold font-medium">
                    R$ {parseFloat(pedido.total).toFixed(2).replace('.', ',')}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-forge-text-muted">
                    {new Date(pedido.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboardPage
