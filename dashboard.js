import supabase from './supabaseclient.js';

// Elementos da DOM
const totalArrecadadoEl = document.getElementById('total-arrecadado');
const maisVendidosEl = document.getElementById('produtos-mais-vendidos');
const horariosPicoEl = document.getElementById('horarios-pico');
const exportBtn = document.getElementById('export-btn');

// Função principal que carrega todos os dados
async function loadDashboardData() {
    // Busca todos os pedidos concluídos com seus itens e produtos
    const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select('created_at, itens_pedido(*, produtos(preco))')
        .eq('status', 'entregue');

    if (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
        return;
    }

    // 1. Calcular Valor Total Arrecadado
    let total = 0;
    pedidos.forEach(pedido => {
        pedido.itens_pedido.forEach(item => {
            total += item.quantidade * item.produtos.preco;
        });
    });
    totalArrecadadoEl.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;

    // 2. Buscar Produtos Mais Vendidos (usando nossa função RPC)
    const { data: maisVendidos, error: rpcError } = await supabase.rpc('get_produtos_mais_vendidos');
    if (rpcError) {
        console.error("Erro ao buscar produtos mais vendidos:", rpcError);
        maisVendidosEl.innerHTML = '<li>Erro ao carregar dados.</li>';
    } else {
        maisVendidosEl.innerHTML = maisVendidos.map(produto => 
            `<li>${produto.nome_produto} - <strong>${produto.total_vendido} unidades</strong></li>`
        ).join('');
    }

    // 3. Calcular Horários de Pico
    const hourlyCounts = {};
    pedidos.forEach(pedido => {
        const hour = new Date(pedido.created_at).getHours();
        hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
    });
    
    // Ordenar e formatar os horários de pico
    const sortedHours = Object.entries(hourlyCounts).sort((a, b) => b[1] - a[1]);
    horariosPicoEl.innerHTML = sortedHours.map(([hour, count]) => 
        `<li>${String(hour).padStart(2, '0')}:00 - ${String(parseInt(hour) + 1).padStart(2, '0')}:00: <strong>${count} pedidos</strong></li>`
    ).join('');
}

// Função para exportar os dados para CSV
async function exportToCSV() {
    exportBtn.textContent = 'Gerando relatório...';
    exportBtn.disabled = true;

    // Busca todos os itens de pedidos concluídos
    const { data, error } = await supabase
        .from('itens_pedido')
        .select('*, pedidos!inner(vivenciando_nome, created_at, status), produtos(nome, preco)')
        .eq('pedidos.status', 'entregue');
    
    if (error) {
        alert('Erro ao gerar o relatório.');
        console.error(error);
        return;
    }

    let csvContent = "Data;Hora;Comprador;Produto;Quantidade;Preco Unitario;Subtotal\n";
    data.forEach(item => {
        const date = new Date(item.pedidos.created_at);
        const dataFormatada = date.toLocaleDateString('pt-BR');
        const horaFormatada = date.toLocaleTimeString('pt-BR');
        const subtotal = item.quantidade * item.produtos.preco;
        const row = [
            dataFormatada,
            horaFormatada,
            `"${item.pedidos.vivenciando_nome}"`,
            `"${item.produtos.nome}"`,
            item.quantidade,
            item.produtos.preco.toFixed(2).replace('.', ','),
            subtotal.toFixed(2).replace('.', ',')
        ].join(';');
        csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_pedidos_ejc_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    exportBtn.textContent = 'Exportar Relatório Completo (CSV)';
    exportBtn.disabled = false;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', loadDashboardData);
exportBtn.addEventListener('click', exportToCSV);