import supabase from './supabaseclient.js';

// Elementos da DOM
const totalArrecadadoEl = document.getElementById('total-arrecadado');
const maisVendidosEl = document.getElementById('produtos-mais-vendidos');
const horariosPicoEl = document.getElementById('horarios-pico');
const exportSummaryBtn = document.getElementById('export-summary-btn');
const exportDetailBtn = document.getElementById('export-detail-btn');

// --- FUNÇÃO PARA CARREGAR OS DADOS DO DASHBOARD ---
async function loadDashboardData() {
    console.log("Atualizando dados do dashboard...");

    const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select('created_at, itens_pedido(*, produtos(preco))')
        .eq('status', 'entregue');

    if (error) { console.error("Erro ao buscar dados:", error); return; }

    // 1. Calcular Valor Total Arrecadado
    let total = 0;
    pedidos.forEach(pedido => {
        pedido.itens_pedido.forEach(item => {
            if (item.produtos) {
                total += item.quantidade * item.produtos.preco;
            }
        });
    });
    totalArrecadadoEl.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;

    // 2. Buscar Produtos Mais Vendidos
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

// --- FUNÇÃO PARA EXPORTAR RESUMO POR DIA ---
async function exportSummaryToCSV() {
    exportSummaryBtn.textContent = 'Gerando resumo...';
    exportSummaryBtn.disabled = true;

    const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select('created_at, itens_pedido(*, produtos(preco))')
        .eq('status', 'entregue');
    
    if (error || !pedidos) {
        alert('Erro ao buscar dados para o resumo.');
        console.error(error);
        exportSummaryBtn.disabled = false;
        exportSummaryBtn.textContent = 'Baixar Resumo por Dia (CSV)';
        return;
    }

    const dailySummary = {};
    pedidos.forEach(pedido => {
        const date = new Date(pedido.created_at).toLocaleDateString('pt-BR');
        if (!dailySummary[date]) {
            dailySummary[date] = { totalArrecadado: 0, totalItens: 0 };
        }
        pedido.itens_pedido.forEach(item => {
            if (item.produtos) {
                dailySummary[date].totalArrecadado += item.quantidade * item.produtos.preco;
                dailySummary[date].totalItens += item.quantidade;
            }
        });
    });

    let csvContent = "Data;Total Itens Vendidos;Total Arrecadado (R$)\n";
    for (const date in dailySummary) {
        const row = [
            date,
            dailySummary[date].totalItens,
            dailySummary[date].totalArrecadado.toFixed(2).replace('.', ',')
        ].join(';');
        csvContent += row + "\n";
    }
    
    downloadCSV(csvContent, 'resumo_vendas_ejc');
    
    exportSummaryBtn.textContent = 'Baixar Resumo por Dia (CSV)';
    exportSummaryBtn.disabled = false;
}

// --- FUNÇÃO PARA EXPORTAR RELATÓRIO DETALHADO ---
async function exportDetailToCSV() {
    exportDetailBtn.textContent = 'Gerando relatório...';
    exportDetailBtn.disabled = true;

    const { data, error } = await supabase
        .from('itens_pedido')
        .select('*, pedidos!inner(vivenciando_nome, created_at, status), produtos(nome, preco)')
        .eq('pedidos.status', 'entregue');
    
    if (error) {
        alert('Erro ao gerar o relatório.');
        console.error(error);
        exportDetailBtn.disabled = false;
        exportDetailBtn.textContent = 'Baixar Relatório Detalhado (CSV)';
        return;
    }

    let csvContent = "Data;Hora;Comprador;Produto;Quantidade;Preco Unitario;Subtotal\n";
    data.forEach(item => {
        const date = new Date(item.pedidos.created_at);
        const subtotal = item.quantidade * item.produtos.preco;
        const row = [
            date.toLocaleDateString('pt-BR'),
            date.toLocaleTimeString('pt-BR'),
            `"${item.pedidos.vivenciando_nome}"`,
            `"${item.produtos.nome}"`,
            item.quantidade,
            item.produtos.preco.toFixed(2).replace('.', ','),
            subtotal.toFixed(2).replace('.', ',')
        ].join(';');
        csvContent += row + "\n";
    });

    downloadCSV(csvContent, 'relatorio_detalhado_ejc');

    exportDetailBtn.textContent = 'Baixar Relatório Detalhado (CSV)';
    exportDetailBtn.disabled = false;
}

// --- FUNÇÃO AUXILIAR PARA BAIXAR O ARQUIVO ---
function downloadCSV(content, baseFileName) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${baseFileName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- LISTENERS E CARREGAMENTO INICIAL ---
supabase.channel('pedidos_dashboard_updates')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, loadDashboardData)
  .subscribe();

exportSummaryBtn.addEventListener('click', exportSummaryToCSV);
exportDetailBtn.addEventListener('click', exportDetailToCSV);
loadDashboardData();