// backend/auth.js
const jwt = require('jsonwebtoken');
const { verifyMessage } = require('ethers');

const JWT_SECRET = process.env.JWT_SECRET || 'seu-segredo-super-secreto-123';

// ============ WHITELIST DE CURADORES ============
// Em produção, isso viria de um banco de dados
const curatorWhitelist = new Set([
  '0xe9efc721405e1026b1ee91c07b2534e1796632a4'.toLowerCase(),
  '0x59a42f0b0a6c5e0ab24c09fa4101d2df85d3e391'.toLowerCase()
  // Adicione mais curadores aqui
]);

function isCurator(wallet) {
  return curatorWhitelist.has(wallet.toLowerCase());
}

function addCurator(wallet) {
  curatorWhitelist.add(wallet.toLowerCase());
  console.log(`✅ Curador adicionado: ${wallet}`);
}

function removeCurator(wallet) {
  curatorWhitelist.delete(wallet.toLowerCase());
  console.log(`🗑️ Curador removido: ${wallet}`);
}

function generateChallenge(wallet) {
  const timestamp = Date.now();
  const message = `Autenticar em NeuroArte DAO\nWallet: ${wallet}\nTimestamp: ${timestamp}`;
  return { message, timestamp };
}

function verifySignatureAndCreateJWT(wallet, message, signature) {
  try {
    const recoveredAddress = verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== wallet.toLowerCase()) {
      return { success: false, error: 'Assinatura inválida' };
    }

    const token = jwt.sign(
      { 
        wallet: wallet.toLowerCase(), 
        timestamp: Date.now(),
        isCurator: isCurator(wallet.toLowerCase()) // ← ADIÇÃO: flag de curador
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return { success: true, token };
  } catch (error) {
    console.error('Erro ao verificar assinatura:', error);
    return { success: false, error: 'Erro ao verificar assinatura' };
  }
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

// ============ MIDDLEWARE PARA APENAS CURADORES ============
function curatorMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (!decoded.isCurator) {
      return res.status(403).json({ error: 'Apenas curadores podem acessar curadoria' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

module.exports = { 
  generateChallenge, 
  verifySignatureAndCreateJWT, 
  authMiddleware,
  curatorMiddleware,
  isCurator,
  addCurator,
  removeCurator,
  curatorWhitelist
};
