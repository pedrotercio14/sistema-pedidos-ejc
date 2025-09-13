import supabase from './supabaseclient.js';

// Elementos da DOM (sem mudanças)
const totalArrecadadoEl = document.getElementById('total-arrecadado');
const maisVendidosEl = document.getElementById('produtos-mais-vendidos');
const horariosPicoEl = document.getElementById('horarios-pico');
const exportBtn = document.getElementById('export-btn');

// Função principal que carrega todos os dados (sem mudanças)
async function loadDashboardData() {
    console.log("Atualizando dados do dashboard..."); // Log para ver a atualização em tempo real
    
    // Busca todos os pedidos concluídos com seus itens e produtos
    const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select('created_at, itens_pedido(*, produtos(preco))')
        .eq('status', 'entregue');

    if (error) { console.error("Erro ao buscar dados:", error); return; }

    // 1. Calcular Valor Total Arrecadado
    let total = 0;
    pedidos.forEach(pedido => {
        pedido.itens_pedido.forEach(item => {
            if (item.produtos) { // Garante que o produto não foi deletado
                total += item.quantidade * item.produtos.preco;
            }
        });
    });
    totalArrecadadoEl.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;

    // 2. Buscar Produtos Mais Vendidos (usando nossa função RPC)
    const { data: maisVendidos, error: rpcError } = await supabase.rpc('get_produtos_mais_vendidos');
    if (rpcError) {
        console.error("Erro RPC:", rpcError);
        maisVendidosEl.innerHTML = '<li>Erro ao carregar.</li>';
    } else {
        maisVendidosEl.innerHTML = maisVendidos.length > 0 ? maisVendidos.map(produto => 
            `<li>${produto.nome_produto} - <strong>${produto.total_vendido} unidades</strong></li>`
        ).join('') : '<li>Nenhuma venda concluída.</li>';
    }

    // 3. Calcular Horários de Pico
    const hourlyCounts = {};
    pedidos.forEach(pedido => {
        const hour = new Date(pedido.created_at).getHours();
        hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
    });
    const sortedHours = Object.entries(hourlyCounts).sort((a, b) => b[1] - a[1]);
    horariosPicoEl.innerHTML = sortedHours.length > 0 ? sortedHours.map(([hour, count]) => 
        `<li>${String(hour).padStart(2, '0')}:00 - ${String(parseInt(hour) + 1).padStart(2, '0')}:00: <strong>${count} pedidos</strong></li>`
    ).join('') : '<li>Nenhuma venda concluída.</li>';
}

// Função para exportar os dados para CSV (sem mudanças)
async function exportToCSV() {
    // ... (a lógica de exportação continua a mesma)
}


// --- ADIÇÃO PARA O TEMPO REAL ---
// Listener do Supabase Realtime para a tabela de pedidos
supabase.channel('pedidos_dashboard_updates')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, payload => {
    // Quando qualquer mudança ocorrer na tabela 'pedidos' (ex: um status muda para 'entregue'),
    // a função loadDashboardData será chamada novamente para recalcular tudo.
    console.log('Mudança detectada nos pedidos, atualizando dashboard!', payload);
    loadDashboardData();
  })
  .subscribe();


// Event Listeners e Carregamento Inicial
exportBtn.addEventListener('click', exportToCSV);
loadDashboardData(); // Carrega os dados na primeira vez que a página abre