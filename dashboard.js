import supabase from './supabaseclient.js';

// Elementos da DOM
const totalArrecadadoEl = document.getElementById('total-arrecadado');
const maisVendidosEl = document.getElementById('produtos-mais-vendidos');
const horariosPicoEl = document.getElementById('horarios-pico');
const exportSummaryBtn = document.getElementById('export-summary-btn');
const exportDetailBtn = document.getElementById('export-detail-btn');

// Função para carregar dados do dashboard (continua a mesma)
async function loadDashboardData() {
    // ... (a lógica desta função não muda)
}

// --- NOVA FUNÇÃO: EXPORTAR RESUMO POR DIA ---
async function exportSummaryToCSV() {
    exportSummaryBtn.textContent = 'Gerando resumo...';
    exportSummaryBtn.disabled = true;

    // Busca todos os pedidos concluídos para processamento
    const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select('created_at, itens_pedido(*, produtos(preco))')
        .eq('status', 'entregue');
    
    if (error || !pedidos) {
        alert('Erro ao buscar dados para o resumo.');
        console.error(error);
        return;
    }

    // Processa os dados para agrupar por dia
    const dailySummary = {}; // Ex: { '13/09/2025': { total: 150.50, itens: 75 }, ... }

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

// --- FUNÇÃO ANTIGA RENOMEADA: EXPORTAR RELATÓRIO DETALHADO ---
async function exportDetailToCSV() {
    exportDetailBtn.textContent = 'Gerando relatório...';
    exportDetailBtn.disabled = true;

    const { data, error } = await supabase
        .from('itens_pedido')
        .select('*, pedidos!inner(vivenciando_nome, created_at, status), produtos(nome, preco)')
        .eq('pedidos.status', 'entregue');
    
    if (error) { alert('Erro ao gerar o relatório.'); console.error(error); return; }

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


// Listener do Supabase Realtime e carregamento inicial (sem mudanças)
supabase.channel('pedidos_dashboard_updates')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, loadDashboardData)
  .subscribe();

// Event Listeners para os novos botões
document.addEventListener('DOMContentLoaded', loadDashboardData);
exportSummaryBtn.addEventListener('click', exportSummaryToCSV);
exportDetailBtn.addEventListener('click', exportDetailToCSV);