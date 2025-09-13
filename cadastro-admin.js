import supabase from './supabaseclient.js';

// --- ATENÇÃO: PASSO DE SEGURANÇA CRÍTICO ---
// Defina aqui o seu código secreto. Apenas quem tiver este código poderá se cadastrar.
// TROQUE ESTE VALOR por algo longo, aleatório e difícil de adivinhar.
const CODIGO_SECRETO_DE_CADASTRO = 'EJC-2025-PIAUÍ-SECRETO'; 

const signupForm = document.getElementById('signup-form');
const messageElement = document.getElementById('message');

signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const inviteCode = document.getElementById('invite-code').value;

    // 1. Validação do Código de Convite
    if (inviteCode !== CODIGO_SECRETO_DE_CADASTRO) {
        messageElement.textContent = 'Código de Convite inválido!';
        messageElement.style.color = 'red';
        return;
    }

    messageElement.textContent = 'Processando...';
    messageElement.style.color = 'gray';

    // 2. Cadastro do novo usuário no Supabase Auth
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        messageElement.textContent = `Erro ao cadastrar: ${error.message}`;
        messageElement.style.color = 'red';
        console.error('Erro no cadastro:', error);
    } else if (data.user) {
        messageElement.textContent = 'Cadastro realizado com sucesso! Você já pode fazer o login.';
        messageElement.style.color = 'green';
        signupForm.reset(); // Limpa o formulário
    }
});