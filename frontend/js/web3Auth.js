// frontend/js/web3Auth.js

const BACKEND_URL = "https://neuroarte-dao.onrender.com";

async function authenticateWithWeb3() {
  try {
    if (!window.ethereum) {
      alert('⚠️ Instale MetaMask para continuar');
      return null;
    }

    console.log('🔌 Conectando à carteira...');
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });
    const wallet = accounts[0];
    console.log('✅ Carteira conectada:', wallet);

    console.log('🔐 Solicitando desafio...');
    const challengeResponse = await fetch(`${BACKEND_URL}/api/auth/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet })
    });

    const { message, timestamp } = await challengeResponse.json();
    console.log('📝 Desafio recebido:', message);

    console.log('✍️ Pedindo assinatura...');
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, wallet]
    });
    console.log('✅ Mensagem assinada');

    console.log('🔍 Verificando assinatura no backend...');
    const verifyResponse = await fetch(`${BACKEND_URL}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet,
        message,
        signature
      })
    });

    const verifyData = await verifyResponse.json();

    if (verifyData.success) {
      console.log('🎉 Autenticação bem-sucedida!');
      
      localStorage.setItem('authToken', verifyData.token);
      localStorage.setItem('userWallet', wallet);

      return {
        token: verifyData.token,
        wallet: verifyData.wallet
      };
    } else {
      alert('❌ Falha na autenticação: ' + verifyData.error);
      return null;
    }

  } catch (error) {
    console.error('❌ Erro:', error);
    alert('Erro ao autenticar. Verifique o console.');
    return null;
  }
}

function getAuthToken() {
  return localStorage.getItem('authToken');
}

function getUserWallet() {
  return localStorage.getItem('userWallet');
}

function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userWallet');
  console.log('✅ Desconectado');
}

async function authenticatedFetch(url, options = {}) {
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers
  });
}

