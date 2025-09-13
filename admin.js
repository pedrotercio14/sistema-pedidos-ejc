import supabase from './supabaseclient.js';

// Verificação de login (continua igual)
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
    window.location.href = '/login.html';
}

// Elementos da DOM (continua igual)
const logoutButton = document.getElementById('logout-button');
const addProductForm = document.getElementById('add-product-form');
const adminProductList = document.getElementById('admin-product-list');

// Função para carregar os produtos, agora mostrando o estoque
async function loadAdminProducts() {
    const { data: produtos, error } = await supabase.from('produtos').select('*').order('nome');
    if (error) { console.error('Erro ao carregar produtos:', error); return; }

    adminProductList.innerHTML = '';
    produtos.forEach(p => {
        const productDiv = document.createElement('div');
        productDiv.className = 'product-card';
        productDiv.style = 'text-align: left;';
        productDiv.innerHTML = `
            <h3>${p.nome}</h3>
            <p>Preço: R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')}</p>
            <p>Estoque: <strong style="font-size: 1.2em;">${p.estoque}</strong> unidades</p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
                <button class="toggle-status-btn" data-id="${p.id}" data-current-status="${p.disponivel}" style="background-color: ${p.disponivel ? '#28a745' : '#6c757d'}; color: white;">${p.disponivel ? 'Disponível' : 'Indisponível'}</button>
                <button class="adjust-stock-btn" data-id="${p.id}" data-current-stock="${p.estoque}">Ajustar Estoque</button>
            </div>
        `;
        adminProductList.appendChild(productDiv);
    });
}

// Evento para adicionar produto, agora incluindo o estoque
addProductForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const nome = document.getElementById('product-name').value;
    const preco = document.getElementById('product-price').value;
    const estoque = document.getElementById('product-stock').value; // Pega o valor do estoque

    const { error } = await supabase.from('produtos').insert({ nome, preco, estoque }); // Insere com o estoque

    if (error) {
        alert('Falha ao adicionar o produto.');
    } else {
        document.getElementById('add-product-form').reset();
        loadAdminProducts();
    }
});

// Event listener para os botões dos cards
adminProductList.addEventListener('click', async (event) => {
    const target = event.target;
    const productId = target.dataset.id;

    // Lógica para ativar/desativar produto (continua a mesma)
    if (target.classList.contains('toggle-status-btn')) {
        const currentStatus = target.dataset.currentStatus === 'true';
        const { error } = await supabase.from('produtos').update({ disponivel: !currentStatus }).eq('id', productId);
        if(error) { console.error('Erro ao atualizar status:', error); } else { loadAdminProducts(); }
    }

    // NOVA LÓGICA PARA AJUSTAR O ESTOQUE
    if (target.classList.contains('adjust-stock-btn')) {
        const currentStock = target.dataset.currentStock;
        const ajuste = prompt(`Estoque atual de "${target.closest('.product-card').querySelector('h3').textContent}": ${currentStock}.\n\nDigite o valor para somar ou subtrair (ex: 10 para adicionar, -5 para remover):`);
        
        if (ajuste && !isNaN(parseInt(ajuste))) {
            const novoEstoque = parseInt(currentStock) + parseInt(ajuste);
            if (novoEstoque < 0) {
                alert("O estoque não pode ser negativo.");
                return;
            }
            const { error } = await supabase.from('produtos').update({ estoque: novoEstoque }).eq('id', productId);
            if (error) alert('Erro ao ajustar estoque.');
            else loadAdminProducts();
        }
    }
});

// Logout e carregamento inicial (continuam os mesmos)
logoutButton.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '/login.html';
});
loadAdminProducts();