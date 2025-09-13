import supabase from './supabaseclient.js'; // Lembre-se de verificar se este caminho está correto

const pendingOrdersList = document.getElementById('pending-orders-list');
const notificationSound = document.getElementById('notification-sound');
let knownOrderIds = new Set(); // Guarda os IDs dos pedidos que já vimos
let isInitialLoad = true; // Flag para não tocar o som no carregamento inicial

async function fetchAndRenderOrders() {
    console.log('--- Verificando Pedidos ---'); // Espião: nos avisa que a função começou

    const { data: pedidos, error } = await supabase.from('pedidos')
        .select(`id, created_at, vivenciando_nome, itens_pedido (*, produtos (nome))`)
        .eq('status', 'pendente').order('created_at', { ascending: true });

    if (error) { console.error("Erro:", error); pendingOrdersList.innerHTML = '<p>Erro ao carregar pedidos.</p>'; return; }
    
    // LÓGICA PARA TOCAR O SOM DE NOTIFICAÇÃO
    if (isInitialLoad) {
        console.log('Primeira carga da página. Registrando IDs iniciais.');
        pedidos.forEach(p => knownOrderIds.add(p.id));
        isInitialLoad = false;
    } else {
        console.log('IDs conhecidos ANTES da verificação:', Array.from(knownOrderIds));
        console.log('Pedidos recebidos do Supabase (IDs):', pedidos.map(p => p.id));

        const newOrders = pedidos.filter(p => !knownOrderIds.has(p.id));

        console.log('Novos pedidos ENCONTRADOS (IDs):', newOrders.map(p => p.id)); // <-- ESTE É O LOG MAIS IMPORTANTE

        if (newOrders.length > 0) {
            console.log('TOCANDO O SOM!'); // <-- SE ESTA MENSAGEM NÃO APARECER, O SOM NÃO TOCA
            notificationSound.play().catch(e => console.warn("O navegador bloqueou o som. O usuário precisa interagir com a página primeiro."));
            newOrders.forEach(p => knownOrderIds.add(p.id));
        } else {
            console.log('Nenhum pedido novo detectado. Não tocar o som.');
        }
    }
    
    // O resto do código continua igual para renderizar a lista...
    if (pedidos.length === 0) { pendingOrdersList.innerHTML = '<p style="text-align: center;">Nenhum pedido pendente.</p>'; return; }
    
    pendingOrdersList.innerHTML = '';
    pedidos.forEach((pedido, index) => {
        const pedidoCard = document.createElement('div');
        pedidoCard.className = 'order-card';
        pedidoCard.dataset.id = pedido.id;
        pedidoCard.dataset.name = pedido.vivenciando_nome;
        const itensHtml = pedido.itens_pedido.map(item => `<li>${item.quantidade}x ${item.produtos.nome}</li>`).join('');
        pedidoCard.innerHTML = `
            <h3>Pedido #${index + 1}: ${pedido.vivenciando_nome}</h3>
            <p class="order-meta">Recebido às: ${new Date(pedido.created_at).toLocaleTimeString('pt-BR')}</p>
            <ul>${itensHtml}</ul>
            <div class="order-actions">
                <button class="btn-main-action btn-secondary">Marcar como Entregue</button>
                <button class="btn-edit">Editar Nome</button>
                <button class="btn-remove">Remover</button>
            </div>
        `;
        pendingOrdersList.appendChild(pedidoCard);
    });
}

// LÓGICA COMPLETA DOS BOTÕES (SUBSTITUA SEU BLOCO VAZIO POR ESTE)
pendingOrdersList.addEventListener('click', async (e) => {
    const card = e.target.closest('.order-card');
    if (!card) return;

    const pedidoId = card.dataset.id;
    const currentName = card.dataset.name;

    // Ação de remover com animação
    if (e.target.classList.contains('btn-remove')) {
        if (confirm("Tem certeza que deseja REMOVER este pedido?")) {
            card.classList.add('removing');
            setTimeout(async () => {
                const { error } = await supabase.from('pedidos').delete().eq('id', pedidoId);
                if (error) {
                    alert('Erro ao remover o pedido.');
                    card.classList.remove('removing');
                }
            }, 400);
        }
    }

    // Ação de editar
    if (e.target.classList.contains('btn-edit')) {
        const novoNome = prompt("Digite o novo nome para este pedido:", currentName);
        if (novoNome && novoNome.trim() !== "") {
            const { error } = await supabase.from('pedidos').update({ vivenciando_nome: novoNome.trim() }).eq('id', pedidoId);
            if (error) { alert('Erro ao atualizar o nome.'); }
        }
    }

    // Ação de marcar como entregue com animação
    if (e.target.classList.contains('btn-secondary')) {
        card.classList.add('removing');
        setTimeout(async () => {
            const { error } = await supabase.from('pedidos').update({ status: 'entregue' }).eq('id', pedidoId);
            if (error) {
                alert('Erro ao atualizar status.');
                card.classList.remove('removing');
            }
        }, 400);
    }
});

// Listener do Supabase Realtime
supabase.channel('pedidos')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, fetchAndRenderOrders)
  .subscribe();

// Carrega os pedidos iniciais
fetchAndRenderOrders();