import supabase from './supabaseclient.js';

const completedOrdersList = document.getElementById('completed-orders-list');

async function fetchCompletedOrders() {
    const { data: pedidos, error } = await supabase.from('pedidos')
        .select(`*, itens_pedido (*, produtos (nome))`)
        .eq('status', 'entregue') // A MUDANÇA ESTÁ AQUI: busca por status 'entregue'
        .order('created_at', { ascending: false }); // Mostra os mais recentes primeiro

    if (error) {
        console.error("Erro ao buscar histórico:", error);
        completedOrdersList.innerHTML = '<p>Ocorreu um erro ao carregar o histórico.</p>';
        return;
    }
    if (pedidos.length === 0) {
        completedOrdersList.innerHTML = '<p style="text-align: center;">Nenhum pedido concluído foi encontrado.</p>';
        return;
    }

    completedOrdersList.innerHTML = pedidos.map(pedido => `
        <div class="order-card" style="background: #e9f5e9; border-left-color: #28a745;">
            <h3>Pedido para: ${pedido.vivenciando_nome}</h3>
            <p class="order-meta">Recebido em: ${new Date(pedido.created_at).toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'})}</p>
            <ul>
                ${pedido.itens_pedido.map(item => `<li>${item.quantidade}x ${item.produtos.nome}</li>`).join('')}
            </ul>
        </div>
    `).join('');
}

// Carrega o histórico quando a página abre
fetchCompletedOrders();