import supabase from './supabaseclient.js';

// --- ELEMENTOS DA PÁGINA E VARIÁVEL DO CARRINHO ---
const vivenciandoNomeInput = document.getElementById('vivenciando-nome');
const productList = document.getElementById('product-list');
const cartItemsList = document.getElementById('cart-items');
const submitOrderBtn = document.getElementById('submit-order');
let cart = [];

// --- 1. FUNÇÃO PARA CARREGAR OS PRODUTOS DA LOJA ---
async function loadProducts() {
    const { data, error } = await supabase.from('produtos')
        .select('*')
        .eq('disponivel', true)
        .gt('estoque', 0) // Mostra apenas produtos com estoque > 0
        .order('nome');
    
    if (error) {
        console.error('Erro ao carregar produtos:', error);
        productList.innerHTML = '<p>Erro ao carregar produtos.</p>';
        return;
    }
    if (data.length === 0) {
        productList.innerHTML = '<p>Nenhum produto disponível no momento.</p>';
        return;
    }
    
    productList.innerHTML = '';
    data.forEach(p => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <h3>${p.nome}</h3>
            <p>R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')}</p>
            <button data-id="${p.id}" data-name="${p.nome}" data-price="${p.preco}">Adicionar</button>`;
        productList.appendChild(productCard);
    });
}

// --- 2. FUNÇÃO PARA ATUALIZAR A VISUALIZAÇÃO DO CARRINHO ---
function updateCartView() {
    if (cart.length === 0) {
        cartItemsList.innerHTML = '<li>Carrinho vazio</li>';
        return;
    }

    let totalPedido = 0;
    cartItemsList.innerHTML = cart.map(item => {
        const totalItem = item.price * item.quantity;
        totalPedido += totalItem;
        return `
            <li>
                <span class="item-info">${item.name}</span>
                <div class="quantity-controls">
                    <button class="btn-decrease" data-id="${item.id}">-</button>
                    <span>${item.quantity}</span>
                    <button class="btn-increase" data-id="${item.id}">+</button>
                </div>
                <strong>R$ ${totalItem.toFixed(2).replace('.', ',')}</strong>
                <button class="btn-remove-item" data-id="${item.id}" style="margin-left: 15px;">×</button>
            </li>
        `;
    }).join('');

    const totalLi = document.createElement('li');
    totalLi.style.cssText = `display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 2px solid #333; font-size: 1.2em;`;
    totalLi.innerHTML = `<span><strong>Total</strong></span><strong>R$ ${totalPedido.toFixed(2).replace('.', ',')}</strong>`;
    cartItemsList.appendChild(totalLi);
}

// --- 3. EVENT LISTENER PARA ADICIONAR PRODUTOS AO CARRINHO ---
productList.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON') return;

    const button = e.target;
    const productId = button.dataset.id;
    const productName = button.dataset.name;
    const productPrice = parseFloat(button.dataset.price);

    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ id: productId, name: productName, price: productPrice, quantity: 1 });
    }

    // Feedback visual
    button.textContent = 'Adicionado ✓';
    button.style.backgroundColor = '#28a745';
    button.style.color = 'white';
    button.disabled = true;

    setTimeout(() => {
        button.textContent = 'Adicionar';
        button.style.backgroundColor = 'transparent';
        button.style.color = 'var(--primary-color)';
        button.disabled = false;
    }, 1500);

    updateCartView();
});

// --- 4. EVENT LISTENER PARA GERENCIAR O CARRINHO (AUMENTAR, DIMINUIR, REMOVER) ---
cartItemsList.addEventListener('click', (e) => {
    const target = e.target;
    const productId = target.dataset.id;
    if (!productId) return;

    const item = cart.find(i => i.id === productId);
    if (!item) return;

    if (target.classList.contains('btn-increase')) {
        item.quantity++;
    }
    if (target.classList.contains('btn-decrease')) {
        item.quantity--;
        if (item.quantity === 0) {
            cart = cart.filter(i => i.id !== productId);
        }
    }
    if (target.classList.contains('btn-remove-item')) {
        cart = cart.filter(i => i.id !== productId);
    }
    
    updateCartView();
});

// --- 5. EVENT LISTENER PARA FINALIZAR O PEDIDO (COM VERIFICAÇÃO DE ESTOQUE) ---
submitOrderBtn.addEventListener('click', async () => {
    const nome = vivenciandoNomeInput.value.trim();
    if (!nome) { alert('Digite o nome de quem está pedindo.'); return; }
    if (cart.length === 0) { alert('O carrinho está vazio.'); return; }

    submitOrderBtn.disabled = true;
    submitOrderBtn.textContent = 'Verificando estoque...';

    try {
        const productIds = cart.map(item => item.id);
        const { data: produtosEmEstoque, error: stockError } = await supabase
            .from('produtos')
            .select('id, nome, estoque')
            .in('id', productIds);

        if (stockError) throw new Error("Erro ao verificar o estoque.");

        for (const item of cart) {
            const produto = produtosEmEstoque.find(p => p.id === item.id);
            if (!produto || produto.estoque < item.quantity) {
                throw new Error(`Estoque insuficiente para "${produto.nome}". Disponível: ${produto.estoque}`);
            }
        }
        
        submitOrderBtn.textContent = 'Registrando pedido...';

        const { data: pedidoData, error: pedidoError } = await supabase
            .from('pedidos').insert({ vivenciando_nome: nome }).select('id').single();
        if (pedidoError) throw new Error("Não foi possível registrar o pedido.");

        const pedidoId = pedidoData.id;
        const itensParaInserir = cart.map(item => ({ pedido_id: pedidoId, produto_id: item.id, quantidade: item.quantity }));
        const { error: itensError } = await supabase.from('itens_pedido').insert(itensParaInserir);
        if (itensError) throw new Error("Não foi possível registrar os itens do pedido.");
        
        const updatePromises = cart.map(item => {
            const produto = produtosEmEstoque.find(p => p.id === item.id);
            const novoEstoque = produto.estoque - item.quantity;
            return supabase.from('produtos').update({ estoque: novoEstoque }).eq('id', item.id);
        });
        await Promise.all(updatePromises);
        
        alert('Pedido realizado com sucesso!');
        cart = [];
        vivenciandoNomeInput.value = '';
        updateCartView();
        loadProducts();

    } catch (error) {
        alert(`ERRO: ${error.message}`);
    } finally {
        submitOrderBtn.disabled = false;
        submitOrderBtn.textContent = 'Finalizar Pedido';
    }
});

// --- 6. INICIALIZAÇÃO DA PÁGINA ---
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    updateCartView();
});